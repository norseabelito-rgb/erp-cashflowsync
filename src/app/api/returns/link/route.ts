import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { linkReturnToOrder } from "@/lib/returns";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canLink = await hasPermission(session.user.id, "handover.scan");
    if (!canLink) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a mapa retururile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { returnAwbId, orderId } = body;

    if (!returnAwbId || !orderId) {
      return NextResponse.json({
        success: false,
        message: "returnAwbId si orderId sunt obligatorii",
      });
    }

    const userName = session.user.name || session.user.email || "Unknown";
    const result = await linkReturnToOrder(
      returnAwbId,
      orderId,
      session.user.id,
      userName
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error in POST /api/returns/link:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Eroare la maparea returului";
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
