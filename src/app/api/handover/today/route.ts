import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getTodayHandoverList,
  getTodayStats,
  getOrCreateTodaySession,
} from "@/lib/handover";

/**
 * GET /api/handover/today
 * Returnează Lista 1 (AWB-uri de predat azi) + statistici + status sesiune
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canView = await hasPermission(session.user.id, "handover.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesară" },
        { status: 403 }
      );
    }

    // Parametri opționali
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || undefined;

    // Obținem datele
    const [awbs, stats, handoverSession] = await Promise.all([
      getTodayHandoverList(storeId),
      getTodayStats(storeId),
      getOrCreateTodaySession(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        awbs,
        stats,
        session: handoverSession,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/handover/today:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}
