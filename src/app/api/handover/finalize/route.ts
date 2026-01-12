import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { finalizeHandover, getOrCreateTodaySession } from "@/lib/handover";

/**
 * POST /api/handover/finalize
 * Finalizează manual predarea pentru azi
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
        { error: "Nu ai permisiunea de a finaliza predarea" },
        { status: 403 }
      );
    }

    // Verificăm dacă sesiunea e deja închisă
    const handoverSession = await getOrCreateTodaySession();
    if (handoverSession.status === "CLOSED") {
      return NextResponse.json({
        success: false,
        message: "Predarea pentru azi a fost deja finalizată.",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await finalizeHandover(session.user.id, userName, "manual");

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/handover/finalize:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Eroare la finalizare" },
      { status: 500 }
    );
  }
}
