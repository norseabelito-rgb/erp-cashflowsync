import { NextRequest, NextResponse } from "next/server";
import { runWeeklySettlement } from "@/lib/intercompany-service";

/**
 * POST /api/cron/intercompany-settlement - Cron job pentru decontare săptămânală
 *
 * Acest endpoint trebuie protejat și apelat doar de un cron job extern (ex: Vercel Cron, GitHub Actions)
 * sau manual de un administrator.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificăm secretul pentru cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("🕐 CRON JOB: Decontare Intercompany Săptămânală");
    console.log("=".repeat(60));
    console.log(`📅 Data: ${new Date().toISOString()}`);

    const result = await runWeeklySettlement();

    console.log("\n" + "=".repeat(60));
    console.log("📊 REZULTAT CRON JOB:");
    console.log(`   ✅ Procesate: ${result.processed}`);
    console.log(`   ❌ Erori: ${result.failed}`);
    console.log("=".repeat(60) + "\n");

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
