import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { markIntercompanyInvoiceAsPaid } from "@/lib/intercompany-service";

/**
 * POST /api/intercompany/invoices/[id]/mark-paid - Marchează factura ca plătită
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canMarkPaid = await hasPermission(session.user.id, "intercompany.mark_paid");
    if (!canMarkPaid) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a marca plățile" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await markIntercompanyInvoiceAsPaid(id);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Factura a fost marcată ca plătită",
    });
  } catch (error: any) {
    console.error("Error marking invoice as paid:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
