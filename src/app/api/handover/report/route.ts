import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHandoverReport } from "@/lib/handover";

/**
 * GET /api/handover/report
 * Generează raportul pentru o zi specifică
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canViewReport = await hasPermission(session.user.id, "handover.report");
    if (!canViewReport) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vedea rapoartele" },
        { status: 403 }
      );
    }

    // Parametri
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const storeId = searchParams.get("storeId") || undefined;

    // Parsăm data (default: azi)
    let date: Date;
    if (dateStr) {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return NextResponse.json({
          success: false,
          error: "Data invalidă. Folosește formatul YYYY-MM-DD.",
        });
      }
    } else {
      date = new Date();
    }

    const report = await getHandoverReport(date, storeId);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error in GET /api/handover/report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}
