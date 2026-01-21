import { NextRequest, NextResponse } from "next/server";
import { checkAutoFinalize } from "@/lib/handover";

/**
 * GET /api/cron/handover-finalize
 * 
 * CRON job pentru finalizarea automată a predării.
 * Trebuie apelat la fiecare minut.
 * 
 * Configurare în vercel.json sau cron.yaml:
 * - Schedule: "* * * * *" (la fiecare minut)
 * - URL: /api/cron/handover-finalize
 * 
 * Sau folosind un serviciu extern (cron-job.org, EasyCron, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificăm autorizarea (MANDATORY)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[HANDOVER CRON] CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error: CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const finalized = await checkAutoFinalize();

    if (finalized) {
      console.log("🔒 CRON: Predarea a fost finalizată automat");
      return NextResponse.json({
        success: true,
        message: "Predarea a fost finalizată automat",
        finalized: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Nu este momentul finalizării sau predarea este deja închisă",
      finalized: false,
    });
  } catch (error: any) {
    console.error("Error in CRON handover-finalize:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Configurare pentru Vercel Cron
export const dynamic = "force-dynamic";
export const maxDuration = 60;
