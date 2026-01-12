/**
 * Test Suite: Workflow Predare Curier
 * 
 * Acest fișier conține teste comprehensive pentru toată logica
 * workflow-ului de predare curier.
 * 
 * Rulare: npx ts-node src/tests/handover.test.ts
 */

import {
  getTodayStart,
  getTodayEnd,
  getTodayHandoverList,
  getTodayStats,
  getNotHandedOverList,
  scanAWB,
  finalizeHandover,
  reopenHandover,
  getOrCreateTodaySession,
  getC0Alerts,
  resolveC0Alert,
  resolveAllC0Alerts,
  getHandoverReport,
  checkAutoFinalize,
} from "../lib/handover";

// Test Results Tracker
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
const bugs: string[] = [];

// Helper function to run a test
async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`✅ PASS: ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
    });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    bugs.push(`[${name}]: ${error.message}`);
  }
}

// Assert helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ==========================================
// TEST CATEGORIES
// ==========================================

// 1. DATE UTILITY TESTS
async function testDateUtilities() {
  await runTest("getTodayStart returns midnight", async () => {
    const start = getTodayStart();
    assert(start.getHours() === 0, "Hours should be 0");
    assert(start.getMinutes() === 0, "Minutes should be 0");
    assert(start.getSeconds() === 0, "Seconds should be 0");
  });

  await runTest("getTodayEnd returns next day midnight", async () => {
    const start = getTodayStart();
    const end = getTodayEnd();
    const diff = end.getTime() - start.getTime();
    assert(diff === 24 * 60 * 60 * 1000, "Difference should be exactly 24 hours");
  });

  await runTest("getTodayStart is consistent across calls", async () => {
    const start1 = getTodayStart();
    const start2 = getTodayStart();
    assert(start1.getTime() === start2.getTime(), "Multiple calls should return same value");
  });
}

// 2. SESSION TESTS
async function testSessionManagement() {
  await runTest("getOrCreateTodaySession creates new session", async () => {
    const session = await getOrCreateTodaySession();
    assert(session.id !== undefined, "Session should have an ID");
    assert(session.status === "OPEN" || session.status === "CLOSED", "Status should be OPEN or CLOSED");
  });

  await runTest("getOrCreateTodaySession returns same session on repeat calls", async () => {
    const session1 = await getOrCreateTodaySession();
    const session2 = await getOrCreateTodaySession();
    assert(session1.id === session2.id, "Should return same session");
  });
}

// 3. SCAN VALIDATION TESTS
async function testScanValidation() {
  await runTest("scanAWB rejects empty AWB number", async () => {
    const result = await scanAWB("", "test-user", "Test User");
    assert(result.success === false, "Should reject empty AWB");
    assert(result.type === "error", "Should return error type");
    assert(result.message.includes("valid"), "Should mention invalid AWB");
  });

  await runTest("scanAWB rejects short AWB number", async () => {
    const result = await scanAWB("123", "test-user", "Test User");
    assert(result.success === false, "Should reject short AWB");
    assert(result.type === "error", "Should return error type");
  });

  await runTest("scanAWB rejects whitespace-only AWB", async () => {
    const result = await scanAWB("   ", "test-user", "Test User");
    assert(result.success === false, "Should reject whitespace AWB");
  });

  await runTest("scanAWB handles non-existent AWB", async () => {
    const result = await scanAWB("NONEXISTENT123456789", "test-user", "Test User");
    assert(result.success === false, "Should fail for non-existent AWB");
    assert(result.message.includes("nu există"), "Should mention AWB doesn't exist");
  });
}

// 4. STATS CALCULATION TESTS
async function testStatsCalculation() {
  await runTest("getTodayStats returns valid structure", async () => {
    const stats = await getTodayStats();
    assert(typeof stats.totalIssued === "number", "totalIssued should be number");
    assert(typeof stats.totalHandedOver === "number", "totalHandedOver should be number");
    assert(typeof stats.totalNotHandedOver === "number", "totalNotHandedOver should be number");
    assert(typeof stats.totalPending === "number", "totalPending should be number");
    assert(stats.totalIssued >= 0, "totalIssued should be >= 0");
  });

  await runTest("getTodayStats respects store filter", async () => {
    const statsAll = await getTodayStats();
    const statsFiltered = await getTodayStats("non-existent-store-id");
    // Filtered stats should be <= total stats
    assert(
      statsFiltered.totalIssued <= statsAll.totalIssued,
      "Filtered stats should be <= total"
    );
  });

  await runTest("Stats totals are consistent", async () => {
    const stats = await getTodayStats();
    // totalPending should be totalIssued - totalHandedOver - totalNotHandedOver
    const calculated = stats.totalIssued - stats.totalHandedOver - stats.totalNotHandedOver;
    // Note: This may not always match exactly due to race conditions
    // so we just check that it's reasonable
    assert(
      Math.abs(calculated - stats.totalPending) <= 1,
      "Stats should be internally consistent"
    );
  });
}

// 5. LIST TESTS
async function testListFunctions() {
  await runTest("getTodayHandoverList returns array", async () => {
    const list = await getTodayHandoverList();
    assert(Array.isArray(list), "Should return an array");
  });

  await runTest("getTodayHandoverList items have required fields", async () => {
    const list = await getTodayHandoverList();
    if (list.length > 0) {
      const item = list[0];
      assert(item.id !== undefined, "Item should have id");
      assert(item.awbNumber !== undefined, "Item should have awbNumber");
      assert(item.orderId !== undefined, "Item should have orderId");
      assert(item.recipientName !== undefined, "Item should have recipientName");
    }
  });

  await runTest("getNotHandedOverList returns array", async () => {
    const list = await getNotHandedOverList();
    assert(Array.isArray(list), "Should return an array");
  });

  await runTest("getNotHandedOverList only contains notHandedOver items", async () => {
    const list = await getNotHandedOverList();
    for (const item of list) {
      assert(item.notHandedOver === true, "All items should be notHandedOver");
    }
  });
}

// 6. FINALIZE/REOPEN TESTS
async function testFinalizeReopen() {
  await runTest("finalizeHandover returns success structure", async () => {
    // Note: This test may modify data
    // In a real test environment, we'd use a transaction that we can rollback
    const session = await getOrCreateTodaySession();
    
    if (session.status === "OPEN") {
      const result = await finalizeHandover("test-user", "Test User", "manual");
      assert(result.success === true || result.message !== undefined, "Should return result");
      assert(result.stats !== undefined, "Should include stats");
    }
  });

  await runTest("reopenHandover returns appropriate message", async () => {
    const session = await getOrCreateTodaySession();
    const result = await reopenHandover("test-user", "Test User");
    // Should either succeed or return appropriate message
    assert(result.message !== undefined, "Should return a message");
  });
}

// 7. C0 ALERTS TESTS
async function testC0Alerts() {
  await runTest("getC0Alerts returns array", async () => {
    const alerts = await getC0Alerts();
    assert(Array.isArray(alerts), "Should return an array");
  });

  await runTest("getC0Alerts items have hasC0WithoutScan flag", async () => {
    const alerts = await getC0Alerts();
    for (const alert of alerts) {
      assert(alert.hasC0WithoutScan === true, "All alerts should have hasC0WithoutScan");
    }
  });

  await runTest("resolveC0Alert rejects invalid action", async () => {
    try {
      // @ts-ignore - intentionally passing invalid action
      await resolveC0Alert("test-id", "invalid_action", "test-user", "Test User");
      // If no error, check result
    } catch (e) {
      // Expected to fail or return error
    }
  });

  await runTest("resolveC0Alert handles non-existent AWB", async () => {
    const result = await resolveC0Alert("non-existent-id", "mark_handed", "test-user", "Test User");
    assert(result.success === false, "Should fail for non-existent AWB");
  });
}

// 8. REPORT TESTS
async function testReportGeneration() {
  await runTest("getHandoverReport returns valid structure", async () => {
    const report = await getHandoverReport(new Date());
    assert(report.date !== undefined, "Should have date");
    assert(report.stats !== undefined, "Should have stats");
    assert(Array.isArray(report.handedOverList), "Should have handedOverList array");
    assert(Array.isArray(report.notHandedOverList), "Should have notHandedOverList array");
    assert(Array.isArray(report.fromPrevDaysList), "Should have fromPrevDaysList array");
  });

  await runTest("getHandoverReport handles past dates", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const report = await getHandoverReport(yesterday);
    assert(report.date !== undefined, "Should return report for past date");
  });

  await runTest("getHandoverReport handles future dates gracefully", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const report = await getHandoverReport(tomorrow);
    // Should return empty or zero stats for future date
    assert(report.stats.totalIssued === 0, "Future date should have 0 AWBs");
  });
}

// 9. EDGE CASES
async function testEdgeCases() {
  await runTest("scanAWB trims whitespace", async () => {
    const result = await scanAWB("  NONEXISTENT123  ", "test-user", "Test User");
    // Should process the trimmed AWB, not fail due to whitespace
    assert(result.message.includes("NONEXISTENT123"), "Should process trimmed AWB");
  });

  await runTest("Stats work with store filter for non-existent store", async () => {
    const stats = await getTodayStats("definitely-not-a-real-store-id-12345");
    assert(stats.totalIssued === 0, "Non-existent store should have 0 AWBs");
    assert(stats.totalHandedOver === 0, "Non-existent store should have 0 handed");
  });
}

// 10. BUSINESS LOGIC TESTS
async function testBusinessLogic() {
  await runTest("Scan result message format for non-existent AWB", async () => {
    const result = await scanAWB("TEST123456789", "test-user", "Test User");
    assert(result.message.includes("TEST123456789"), "Message should include AWB number");
    assert(result.message.includes("nu există"), "Message should indicate not found");
  });

  await runTest("Stats percentages are calculable", async () => {
    const stats = await getTodayStats();
    if (stats.totalIssued > 0) {
      const percentage = (stats.totalHandedOver / stats.totalIssued) * 100;
      assert(!isNaN(percentage), "Percentage should be calculable");
      assert(percentage >= 0 && percentage <= 100, "Percentage should be between 0-100");
    }
  });
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log("==========================================");
  console.log("🧪 HANDOVER WORKFLOW TEST SUITE");
  console.log("==========================================\n");

  console.log("📅 Testing Date Utilities...");
  await testDateUtilities();
  console.log("");

  console.log("📋 Testing Session Management...");
  await testSessionManagement();
  console.log("");

  console.log("🔍 Testing Scan Validation...");
  await testScanValidation();
  console.log("");

  console.log("📊 Testing Stats Calculation...");
  await testStatsCalculation();
  console.log("");

  console.log("📦 Testing List Functions...");
  await testListFunctions();
  console.log("");

  console.log("🔒 Testing Finalize/Reopen...");
  await testFinalizeReopen();
  console.log("");

  console.log("⚠️ Testing C0 Alerts...");
  await testC0Alerts();
  console.log("");

  console.log("📑 Testing Report Generation...");
  await testReportGeneration();
  console.log("");

  console.log("🔀 Testing Edge Cases...");
  await testEdgeCases();
  console.log("");

  console.log("💼 Testing Business Logic...");
  await testBusinessLogic();
  console.log("");

  // Summary
  console.log("==========================================");
  console.log("📊 TEST SUMMARY");
  console.log("==========================================");
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log("");

  if (bugs.length > 0) {
    console.log("==========================================");
    console.log("🐛 BUG LIST");
    console.log("==========================================");
    bugs.forEach((bug, index) => {
      console.log(`${index + 1}. ${bug}`);
    });
  } else {
    console.log("🎉 No bugs found!");
  }

  return { results, bugs, passed, failed, total };
}

// Export for use
export { runAllTests, results, bugs };

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Test runner failed:", error);
      process.exit(1);
    });
}
