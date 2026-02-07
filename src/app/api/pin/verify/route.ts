import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyPIN } from "@/lib/pin-service";

/**
 * POST /api/pin/verify
 * Verify PIN and return session token for exception operations
 *
 * Body: { pin: string }
 * Returns: { valid: boolean, expiresAt?: string, sessionToken?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { valid: false, error: "PIN is required" },
        { status: 400 }
      );
    }

    const result = await verifyPIN(pin, session.user.id);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error || "Invalid PIN"
      });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: result.expiresAt.toISOString(),
      sessionToken: result.sessionToken
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/pin/verify:", error);
    return NextResponse.json(
      { valid: false, error: "Error verifying PIN" },
      { status: 500 }
    );
  }
}
