import { NextRequest, NextResponse } from "next/server";
import { processScheduledSMS } from "@/lib/daktela-sms";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processScheduledSMS();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CRON send-sms] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
