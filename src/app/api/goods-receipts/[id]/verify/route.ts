import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { transitionNIR } from "@/lib/reception-workflow";

export const dynamic = 'force-dynamic';

/**
 * POST - Office marks NIR as verified
 * Transition: TRIMIS_OFFICE -> VERIFICAT
 *
 * Permission: reception.verify
 *
 * Note: If hasDifferences = true, returns warning that manager approval needed
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
      'VERIFICAT',
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

    console.log(`[NIR] ${id} verificat de Office (${session.user.email})`);

    // Warn if differences need manager approval
    const response: any = {
      success: true,
      data: result.nir,
      message: 'NIR verificat cu succes'
    };

    if (result.hasDifferences) {
      response.warning = 'NIR-ul are diferente. Este necesara aprobarea managerului inainte de aprobare.';
      response.requiresManagerApproval = true;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error verifying NIR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la verificarea NIR" },
      { status: 500 }
    );
  }
}
