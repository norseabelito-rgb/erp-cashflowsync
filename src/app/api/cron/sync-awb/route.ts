import { NextRequest, NextResponse } from "next/server";
import { syncAWBsFromFanCourier } from "@/lib/fancourier";
import { withCronLock } from "@/lib/cron-lock";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron Job: Sync AWB Status from FanCourier
 *
 * Updates AWB tracking status for all pending shipments.
 * Should be called every 30 minutes by external scheduler.
 *
 * Usage:
 *   GET /api/cron/sync-awb
 *   Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (MANDATORY)
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET) {
      console.error("[Sync AWB Cron] CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error: CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Sync AWB Cron] Called without valid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Sync AWB Cron] Starting at ${new Date().toISOString()}`);

    // Use cron lock to prevent concurrent execution
    const lockResult = await withCronLock("sync-awb", async () => {
      const result = await syncAWBsFromFanCourier();
      console.log(
        `[Sync AWB Cron] Completed: ${result.checked} checked, ${result.statusChanges} status changes`
      );
      return result;
    });

    if (lockResult.skipped) {
      console.log(`[Sync AWB Cron] Skipped: ${lockResult.reason}`);
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
        checked: result.checked,
        updated: result.updated,
        statusChanges: result.statusChanges,
        errors: result.errors,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Sync AWB Cron] Error:", error);
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
