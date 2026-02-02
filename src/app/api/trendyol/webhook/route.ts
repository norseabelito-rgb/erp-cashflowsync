import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEPRECATED: Use /api/trendyol/webhook/[storeId] instead
 *
 * This endpoint is deprecated. Each TrendyolStore now has its own webhook URL:
 * POST /api/trendyol/webhook/{storeId}
 *
 * Configure your webhook in Trendyol to use the store-specific URL from Settings.
 */

export async function POST() {
  console.warn("[Trendyol Webhook] DEPRECATED: Using old webhook endpoint without storeId");

  return NextResponse.json(
    {
      success: false,
      error: "Deprecated endpoint",
      message: "Please use /api/trendyol/webhook/{storeId} instead. Configure the store-specific webhook URL in Settings > Magazine Trendyol.",
    },
    { status: 410 } // 410 Gone
  );
}

export async function GET() {
  return NextResponse.json({
    success: false,
    deprecated: true,
    message: "This endpoint is deprecated. Use /api/trendyol/webhook/{storeId} instead.",
    timestamp: new Date().toISOString(),
  });
}
