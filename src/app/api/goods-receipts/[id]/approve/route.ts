import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { transitionNIR } from "@/lib/reception-workflow";

export const dynamic = 'force-dynamic';

/**
 * POST - Approve NIR for stock transfer
 * Transition: VERIFICAT -> APROBAT
 *
 * Permission: reception.verify
 *
 * Note: Will fail if hasDifferences = true and differences not approved by manager
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canVerify = await hasPermission(session.user.id, "reception.verify");
    if (!canVerify) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    const result = await transitionNIR(
      id,
      'APROBAT',
      {
        userId: session.user.id,
        userName: session.user.name || session.user.email || ''
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log(`[NIR] ${id} aprobat de ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: result.nir,
      message: 'NIR aprobat. Poate fi transferat in stoc.'
    });
  } catch (error: any) {
    console.error("Error approving NIR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la aprobarea NIR" },
      { status: 500 }
    );
  }
}
