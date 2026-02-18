import { NextRequest, NextResponse } from "next/server";
import { processScheduledSMS } from "@/lib/daktela-sms";
import { withCronLock } from "@/lib/cron-lock";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use cron lock to prevent concurrent SMS processing
    const lockResult = await withCronLock("send-sms", async () => {
      return await processScheduledSMS();
    });

    if (lockResult.skipped) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: lockResult.reason,
      });
    }

    return NextResponse.json({
      success: true,
      ...lockResult.result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CRON send-sms] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
