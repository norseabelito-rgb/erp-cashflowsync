import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { generateOblioIntercompanyInvoice } from "@/lib/intercompany-service";
import prisma from "@/lib/db";

/**
 * POST /api/intercompany/invoices/[id]/oblio - Retry Oblio invoice generation
 *
 * Creates Oblio invoice for an existing intercompany settlement that
 * failed to generate initially (e.g., missing series configuration).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canGenerate = await hasPermission(session.user.id, "intercompany.generate");
    if (!canGenerate) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a genera decontari" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if settlement exists and doesn't already have Oblio invoice
    const settlement = await prisma.intercompanyInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        oblioInvoiceId: true,
        invoiceNumber: true,
      },
    });

    if (!settlement) {
      return NextResponse.json(
        { success: false, error: "Decontarea nu a fost gasita" },
        { status: 404 }
      );
    }

    if (settlement.oblioInvoiceId) {
      return NextResponse.json(
        { success: false, error: "Factura Oblio exista deja" },
        { status: 400 }
      );
    }

    // Generate Oblio invoice
    const result = await generateOblioIntercompanyInvoice(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      oblioInvoiceId: result.oblioInvoiceId,
      oblioInvoiceNumber: result.oblioInvoiceNumber,
      oblioSeriesName: result.oblioSeriesName,
      oblioLink: result.oblioLink,
    });
  } catch (error: any) {
    console.error("[Intercompany Oblio Retry] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la generarea facturii Oblio" },
      { status: 500 }
    );
  }
}
