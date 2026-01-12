import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { reopenHandover, getOrCreateTodaySession } from "@/lib/handover";

/**
 * POST /api/handover/reopen
 * Redeschide predarea pentru azi
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canFinalize = await hasPermission(session.user.id, "handover.finalize");
    if (!canFinalize) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a redeschide predarea" },
        { status: 403 }
      );
    }

    // Verificăm dacă sesiunea e deja deschisă
    const handoverSession = await getOrCreateTodaySession();
    if (handoverSession.status === "OPEN") {
      return NextResponse.json({
        success: false,
        message: "Predarea este deja deschisă.",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await reopenHandover(session.user.id, userName);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/handover/reopen:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Eroare la redeschidere" },
      { status: 500 }
    );
  }
}
