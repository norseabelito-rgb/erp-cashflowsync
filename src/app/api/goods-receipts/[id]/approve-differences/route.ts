import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { approveDifferences } from "@/lib/reception-workflow";

export const dynamic = 'force-dynamic';

/**
 * POST - Manager approves differences on a NIR
 * This is required before APROBAT transition when hasDifferences = true
 *
 * Permission: reception.approve_differences (George action)
 *
 * Only available when:
 * - status = VERIFICAT
 * - hasDifferences = true
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

    const canApprove = await hasPermission(session.user.id, "reception.approve_differences");
    if (!canApprove) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    const result = await approveDifferences(
      id,
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

    console.log(`[NIR] ${id} diferente aprobate de manager (${session.user.email})`);

    return NextResponse.json({
      success: true,
      data: result.nir,
      message: 'Diferentele au fost aprobate. NIR-ul poate fi aprobat pentru transfer in stoc.'
    });
  } catch (error: any) {
    console.error("Error approving NIR differences:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la aprobarea diferentelor" },
      { status: 500 }
    );
  }
}
