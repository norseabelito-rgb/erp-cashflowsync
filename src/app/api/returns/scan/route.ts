import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { scanReturnAWB } from "@/lib/returns";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission (reuse handover.scan for return scanning)
    const canScan = await hasPermission(session.user.id, "handover.scan");
    if (!canScan) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a scana retururi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { awbNumber } = body;

    if (!awbNumber) {
      return NextResponse.json({
        success: false,
        message: "Numarul AWB este obligatoriu",
        type: "error",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await scanReturnAWB(awbNumber, session.user.id, userName);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error in POST /api/returns/scan:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Eroare la scanare retur";
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        type: "error",
      },
      { status: 500 }
    );
  }
}
