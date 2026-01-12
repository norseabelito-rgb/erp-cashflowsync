import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getC0Alerts,
  resolveC0Alert,
  resolveAllC0Alerts,
} from "@/lib/handover";

/**
 * GET /api/handover/c0-alerts
 * Returnează AWB-urile cu C0 dar fără scanare internă
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "handover.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesară" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || undefined;

    const alerts = await getC0Alerts(storeId);

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/handover/c0-alerts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/handover/c0-alerts
 * Rezolvă o alertă C0 sau toate alertele
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canScan = await hasPermission(session.user.id, "handover.scan");
    if (!canScan) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesară" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { awbId, action, applyToAll, storeId } = body;

    // Validare
    if (!action || !["mark_handed", "ignore"].includes(action)) {
      return NextResponse.json({
        success: false,
        message: "Acțiune invalidă. Folosește 'mark_handed' sau 'ignore'.",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";

    if (applyToAll) {
      const result = await resolveAllC0Alerts(action, session.user.id, userName, storeId);
      return NextResponse.json(result);
    }

    if (!awbId) {
      return NextResponse.json({
        success: false,
        message: "ID-ul AWB-ului este obligatoriu.",
      });
    }

    const result = await resolveC0Alert(awbId, action, session.user.id, userName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/handover/c0-alerts:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}
