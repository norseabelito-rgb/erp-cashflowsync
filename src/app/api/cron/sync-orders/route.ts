import { NextRequest, NextResponse } from "next/server";
import { syncAllStoresOrders } from "@/lib/shopify";
import { withCronLock } from "@/lib/cron-lock";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron Job: Sync Orders from Shopify
 *
 * Syncs orders from all connected Shopify stores.
 * Should be called every 15 minutes by external scheduler.
 *
 * Usage:
 *   GET /api/cron/sync-orders
 *   Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (MANDATORY)
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET) {
      console.error("[Sync Orders Cron] CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error: CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Sync Orders Cron] Called without valid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Sync Orders Cron] Starting at ${new Date().toISOString()}`);

    // Use cron lock to prevent concurrent execution
    const lockResult = await withCronLock("sync-orders", async () => {
      const result = await syncAllStoresOrders();
      console.log(`[Sync Orders Cron] Completed: ${result.synced} orders synced`);
      return result;
    });

    if (lockResult.skipped) {
      console.log(`[Sync Orders Cron] Skipped: ${lockResult.reason}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: lockResult.reason,
        timestamp: new Date().toISOString(),
      });
    }

    const result = lockResult.result!;
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        synced: result.synced,
        errors: result.errors,
        stores: result.stores,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sync Orders Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
