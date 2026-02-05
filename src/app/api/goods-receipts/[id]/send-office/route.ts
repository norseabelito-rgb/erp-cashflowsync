import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { transitionNIR } from "@/lib/reception-workflow";

export const dynamic = 'force-dynamic';

/**
 * POST - Send NIR to Office for verification
 * Transition: GENERAT -> TRIMIS_OFFICE
 *
 * Required: supplierInvoiceId must be set
 * Permission: inventory.edit
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

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    const result = await transitionNIR(
      id,
      'TRIMIS_OFFICE',
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

    console.log(`[NIR] ${id} trimis la Office de ${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: result.nir,
      message: 'NIR trimis la Office pentru verificare'
    });
  } catch (error: any) {
    console.error("Error sending NIR to office:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la trimiterea NIR" },
      { status: 500 }
    );
  }
}
