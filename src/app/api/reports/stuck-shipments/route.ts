import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getStuckShipments, stuckShipmentsToCSV } from "@/lib/manifest/stuck-shipments";

/**
 * GET /api/reports/stuck-shipments
 * Get stuck shipments report (AWBs >N days without resolution)
 *
 * Query params:
 * - minDays: Minimum days to be considered stuck (default: 3)
 * - limit: Max results (default: 100)
 * - offset: Pagination offset (default: 0)
 * - format: "json" (default) or "csv"
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission for viewing reports
    const canView = await hasPermission(session.user.id, "tracking.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza rapoartele" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const minDays = parseInt(searchParams.get("minDays") || "3");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const format = searchParams.get("format") || "json";

    const result = await getStuckShipments({ minDays, limit, offset });

    // CSV export
    if (format === "csv") {
      const csv = stuckShipmentsToCSV(result.shipments);
      const date = new Date().toISOString().split("T")[0];

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="stuck-shipments-${date}.csv"`
        }
      });
    }

    // JSON response
    return NextResponse.json({
      success: true,
      data: {
        shipments: result.shipments,
        total: result.total,
        minDays: result.minDays,
        limit,
        offset
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in GET /api/reports/stuck-shipments:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
