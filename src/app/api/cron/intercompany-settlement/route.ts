import { NextRequest, NextResponse } from "next/server";
import { runWeeklySettlement } from "@/lib/intercompany-service";
import { withCronLock } from "@/lib/cron-lock";

/**
 * POST /api/cron/intercompany-settlement - Cron job pentru decontare săptămânală
 *
 * Acest endpoint trebuie protejat și apelat doar de un cron job extern (ex: Vercel Cron, GitHub Actions)
 * sau manual de un administrator.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificăm secretul pentru cron jobs (MANDATORY)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[INTERCOMPANY CRON] CRON_SECRET environment variable not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error: CRON_SECRET not set" },
        { status: 500 }
      );
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("🕐 CRON JOB: Decontare Intercompany Săptămânală");
    console.log("=".repeat(60));
    console.log(`📅 Data: ${new Date().toISOString()}`);

    // Use cron lock to prevent concurrent execution (critical for preventing duplicate invoices)
    const lockResult = await withCronLock("intercompany-settlement", async () => {
      const result = await runWeeklySettlement();
      console.log("\n" + "=".repeat(60));
      console.log("📊 REZULTAT CRON JOB:");
      console.log(`   ✅ Procesate: ${result.processed}`);
      console.log(`   ❌ Erori: ${result.failed}`);
      console.log("=".repeat(60) + "\n");
      return result;
    }, 30 * 60 * 1000); // 30 minute TTL for settlement jobs

    if (lockResult.skipped) {
      console.log(`[INTERCOMPANY CRON] Skipped: ${lockResult.reason}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: lockResult.reason,
      });
    }

    const result = lockResult.result!;
    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      results: result.results,
    });
  } catch (error: any) {
    console.error("Eroare la cron job decontare:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Permitem și GET pentru testare manuală (cu autorizare)
export async function GET(request: NextRequest) {
  return POST(request);
}
