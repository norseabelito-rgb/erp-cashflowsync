import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getNotHandedOverList } from "@/lib/handover";

/**
 * GET /api/handover/not-handed
 * Returnează Lista 2 (AWB-uri nepredate din toate zilele)
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

    const awbs = await getNotHandedOverList(storeId);

    return NextResponse.json({
      success: true,
      data: {
        awbs,
        total: awbs.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/handover/not-handed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}
