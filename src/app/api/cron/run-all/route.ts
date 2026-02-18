import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Unified CRON endpoint - runs different jobs based on the "job" parameter
 *
 * Usage:
 * - GET /api/cron/run-all?job=ads-sync       - Sync ads (every 30 min)
 * - GET /api/cron/run-all?job=ads-alerts     - Check alerts (every 15 min)
 * - GET /api/cron/run-all?job=ads-rollback   - Rollback actions (every hour)
 * - GET /api/cron/run-all?job=handover       - Finalize handover (at 20:00)
 * - GET /api/cron/run-all?job=backup         - Automatic backup (at configured time)
 * - GET /api/cron/run-all?job=sync-orders    - Sync Shopify orders (every 15 min)
 * - GET /api/cron/run-all?job=sync-awb       - Sync AWB status (every 30 min)
 * - GET /api/cron/run-all?job=send-sms      - Send scheduled SMS (every 15 min)
 * - GET /api/cron/run-all?job=all            - Run all jobs (for testing)
 *
 * Can be called from:
 * - cron-job.org (free)
 * - Upstash QStash
 * - Railway health check (limited)
 * - Manual trigger from admin
 */
export async function GET(request: NextRequest) {
  try {
    // Verifică autorizarea (MANDATORY)
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET) {
      console.error("[CRON RUN-ALL] CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error: CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const job = searchParams.get("job") || "all";
    const baseUrl = new URL(request.url).origin;

    console.log(`[CRON RUN-ALL] Starting job: ${job} at ${new Date().toISOString()}`);

    const results: Record<string, { success: boolean; data?: unknown; error?: string; skipped?: boolean }> = {};

    // Helper function to call internal endpoints
    const callEndpoint = async (path: string, params: Record<string, string> = {}) => {
      const url = new URL(path, baseUrl);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    };

    // Run jobs based on parameter
    if (job === "ads-sync" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/ads-sync", { mode: "light" });
        results["ads-sync"] = { success: true, data };
        console.log(`[CRON RUN-ALL] ads-sync: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["ads-sync"] = { success: false, error };
        console.error(`[CRON RUN-ALL] ads-sync: FAILED -`, error);
      }
    }

    if (job === "ads-alerts" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/ads-alerts");
        results["ads-alerts"] = { success: true, data };
        console.log(`[CRON RUN-ALL] ads-alerts: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["ads-alerts"] = { success: false, error };
        console.error(`[CRON RUN-ALL] ads-alerts: FAILED -`, error);
      }
    }

    if (job === "ads-rollback" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/ads-rollback");
        results["ads-rollback"] = { success: true, data };
        console.log(`[CRON RUN-ALL] ads-rollback: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["ads-rollback"] = { success: false, error };
        console.error(`[CRON RUN-ALL] ads-rollback: FAILED -`, error);
      }
    }

    if (job === "handover" || job === "all") {
      // Only run handover finalization after 20:00
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 20 || job === "handover") {
        try {
          const data = await callEndpoint("/api/cron/handover-finalize");
          results["handover"] = { success: true, data };
          console.log(`[CRON RUN-ALL] handover: SUCCESS`);
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : "Unknown error";
          results["handover"] = { success: false, error };
          console.error(`[CRON RUN-ALL] handover: FAILED -`, error);
        }
      } else {
        results["handover"] = { success: true, skipped: true, data: "Only runs after 20:00" };
      }
    }

    if (job === "backup" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/backup");
        results["backup"] = { success: true, data };
        console.log(`[CRON RUN-ALL] backup: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["backup"] = { success: false, error };
        console.error(`[CRON RUN-ALL] backup: FAILED -`, error);
      }
    }

    if (job === "sync-orders" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/sync-orders");
        results["sync-orders"] = { success: true, data };
        console.log(`[CRON RUN-ALL] sync-orders: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["sync-orders"] = { success: false, error };
        console.error(`[CRON RUN-ALL] sync-orders: FAILED -`, error);
      }
    }

    if (job === "sync-awb" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/sync-awb");
        results["sync-awb"] = { success: true, data };
        console.log(`[CRON RUN-ALL] sync-awb: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["sync-awb"] = { success: false, error };
        console.error(`[CRON RUN-ALL] sync-awb: FAILED -`, error);
      }
    }

    if (job === "send-sms" || job === "all") {
      try {
        const data = await callEndpoint("/api/cron/send-scheduled-sms");
        results["send-sms"] = { success: true, data };
        console.log(`[CRON RUN-ALL] send-sms: SUCCESS`);
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Unknown error";
        results["send-sms"] = { success: false, error };
        console.error(`[CRON RUN-ALL] send-sms: FAILED -`, error);
      }
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const failedCount = Object.values(results).filter(r => !r.success).length;

    console.log(`[CRON RUN-ALL] Completed: ${successCount} success, ${failedCount} failed`);

    return NextResponse.json({
      success: failedCount === 0,
      timestamp: new Date().toISOString(),
      job,
      summary: {
        successful: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CRON RUN-ALL] Fatal error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Also support POST for services that prefer it
export async function POST(request: NextRequest) {
  return GET(request);
}
