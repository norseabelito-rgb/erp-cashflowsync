import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getScannedReturns, getPendingReturns } from "@/lib/returns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "handover.scan");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza retururile" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const unmappedOnly = searchParams.get("unmappedOnly") === "true";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 100;

    const [scannedReturns, pendingReturns] = await Promise.all([
      getScannedReturns({ status, unmappedOnly, limit }),
      getPendingReturns(),
    ]);

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayScans = scannedReturns.filter(
      (r) => new Date(r.scannedAt) >= today
    );
    const unmappedCount = scannedReturns.filter((r) => !r.orderId).length;

    return NextResponse.json({
      success: true,
      data: {
        scannedReturns,
        pendingReturns,
        stats: {
          totalScannedToday: todayScans.length,
          totalUnmapped: unmappedCount,
          totalPendingReturns: pendingReturns.length,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/returns:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Eroare la incarcarea retururilor";
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
