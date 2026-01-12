import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { scanAWB, getOrCreateTodaySession } from "@/lib/handover";

/**
 * POST /api/handover/scan
 * Scanează un AWB pentru predare
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canScan = await hasPermission(session.user.id, "handover.scan");
    if (!canScan) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a scana AWB-uri" },
        { status: 403 }
      );
    }

    // Verificăm dacă sesiunea e deschisă
    const handoverSession = await getOrCreateTodaySession();
    if (handoverSession.status === "CLOSED") {
      return NextResponse.json({
        success: false,
        message: "Predarea pentru azi a fost finalizată. Redeschide predarea pentru a continua.",
        type: "error",
      });
    }

    const body = await request.json();
    const { awbNumber } = body;

    if (!awbNumber) {
      return NextResponse.json({
        success: false,
        message: "Numărul AWB este obligatoriu",
        type: "error",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await scanAWB(awbNumber, session.user.id, userName);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/handover/scan:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Eroare la scanare",
        type: "error",
      },
      { status: 500 }
    );
  }
}
