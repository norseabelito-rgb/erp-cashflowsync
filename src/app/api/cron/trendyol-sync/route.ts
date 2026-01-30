/**
 * Cron Endpoint for Trendyol Stock & Price Sync
 *
 * Called by Vercel Cron or external scheduler to sync all products to Trendyol.
 *
 * To configure in vercel.json, add a crons array with path "/api/cron/trendyol-sync"
 * and schedule every 15 minutes.
 */

import { syncAllProductsToTrendyol } from "@/lib/trendyol-stock-sync";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for batch sync

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel's internal cron calls (they don't send auth header but come from trusted source)
  const isVercelCron = request.headers.get("x-vercel-cron") === "true";

  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[Trendyol Cron] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Trendyol Cron] Starting scheduled stock sync...");

  try {
    const result = await syncAllProductsToTrendyol();

    console.log("[Trendyol Cron] Stock sync completed:", {
      success: result.success,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      batchRequestId: result.batchRequestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Trendyol Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
