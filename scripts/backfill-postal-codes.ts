#!/usr/bin/env tsx
/**
 * Backfill Postal Codes Script
 *
 * Populează codurile poștale pentru comenzile existente folosind
 * nomenclatorul FanCourier.
 *
 * Folosire:
 *   npm run backfill:postal-codes
 *
 * Sau direct cu tsx:
 *   npx tsx scripts/backfill-postal-codes.ts
 *
 * Opțiuni (variabile de mediu):
 *   LIMIT=500          - Numărul maxim de comenzi de procesat (default: 500)
 *   ONLY_MISSING=true  - Procesează doar comenzile fără cod poștal (default: true)
 */

import prisma from "../src/lib/db";
import { backfillPostalCodes } from "../src/lib/fancourier";

async function main() {
  const limit = parseInt(process.env.LIMIT || "500", 10);
  const onlyMissing = process.env.ONLY_MISSING !== "false";

  console.log("");
  console.log("=".repeat(60));
  console.log("📮 BACKFILL CODURI POȘTALE - SCRIPT");
  console.log("=".repeat(60));
  console.log("");
  console.log(`📋 Configurare:`);
  console.log(`   - Limită comenzi: ${limit}`);
  console.log(`   - Doar fără cod poștal: ${onlyMissing ? "DA" : "NU"}`);
  console.log("");

  try {
    const result = await backfillPostalCodes({
      limit,
      onlyMissing,
    });

    console.log("");
    console.log("📊 Rezultat final JSON:");
    console.log(JSON.stringify({
      total: result.total,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
    }, null, 2));

    await prisma.$disconnect();

    process.exit(result.errors > result.total / 2 ? 1 : 0);
  } catch (error) {
    console.error("❌ Eroare:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
