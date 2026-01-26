import { NextRequest, NextResponse } from "next/server";
import { backfillPostalCodes } from "@/lib/fancourier";

/**
 * POST /api/cron/backfill-postal-codes
 *
 * Populează codurile poștale pentru comenzile existente
 * folosind nomenclatorul FanCourier.
 *
 * Query params:
 *   - limit: numărul maxim de comenzi (default: 500)
 *   - onlyMissing: "true" sau "false" (default: true)
 *
 * Requires CRON_SECRET header for security
 */
export async function POST(request: NextRequest) {
  try {
    // Verificăm secretul pentru securitate
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET nu este configurat");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parsăm parametrii
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "500", 10);
    const onlyMissing = searchParams.get("onlyMissing") !== "false";

    console.log(`📮 Backfill postal codes: limit=${limit}, onlyMissing=${onlyMissing}`);

    // Rulăm backfill-ul
    const result = await backfillPostalCodes({
      limit,
      onlyMissing,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Eroare la backfill postal codes:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET pentru verificare rapidă
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "/api/cron/backfill-postal-codes",
    method: "POST",
    description: "Populează codurile poștale pentru comenzi din nomenclatorul FanCourier",
    params: {
      limit: "numărul maxim de comenzi (default: 500)",
      onlyMissing: "procesează doar comenzile fără cod poștal (default: true)",
    },
    authentication: "Bearer {CRON_SECRET}",
    example: "curl -X POST -H 'Authorization: Bearer {secret}' /api/cron/backfill-postal-codes?limit=100",
  });
}
