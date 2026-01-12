import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncAWBsFromFanCourier } from "@/lib/fancourier";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de tracking AWB
    const canTrack = await hasPermission(session.user.id, "awb.track");
    if (!canTrack) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a actualiza statusul AWB-urilor" },
        { status: 403 }
      );
    }

    const result = await syncAWBsFromFanCourier();
    
    return NextResponse.json({
      success: true,
      updated: result.updated,
      checked: result.checked,
      statusChanges: result.statusChanges,
      errors: result.errors,
      details: result.details,
    });
  } catch (error: any) {
    console.error("Error refreshing AWB statuses:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
