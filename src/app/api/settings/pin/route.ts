import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { setPIN, isPINConfigured, verifyPIN } from "@/lib/pin-service";

/**
 * GET /api/settings/pin
 * Check if PIN is configured
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, "settings.security");
    if (!canManage) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a gestiona setarile de securitate" },
        { status: 403 }
      );
    }

    const configured = await isPINConfigured();

    return NextResponse.json({
      success: true,
      configured
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/settings/pin:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/pin
 * Set or change PIN
 *
 * Body: { newPin: string, currentPin?: string }
 * If PIN is already set, currentPin is required
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, "settings.security");
    if (!canManage) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a gestiona setarile de securitate" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { newPin, currentPin } = body;

    if (!newPin || typeof newPin !== "string") {
      return NextResponse.json(
        { success: false, error: "New PIN is required" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Check if PIN is already configured
    const isConfigured = await isPINConfigured();

    if (isConfigured) {
      // Require current PIN to change
      if (!currentPin) {
        return NextResponse.json(
          { success: false, error: "Current PIN is required to change PIN" },
          { status: 400 }
        );
      }

      // Verify current PIN
      const verification = await verifyPIN(currentPin, session.user.id);
      if (!verification.valid) {
        return NextResponse.json(
          { success: false, error: "Current PIN is incorrect" },
          { status: 400 }
        );
      }
    }

    // Set new PIN
    const result = await setPIN(newPin, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isConfigured ? "PIN changed successfully" : "PIN set successfully"
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/settings/pin:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
