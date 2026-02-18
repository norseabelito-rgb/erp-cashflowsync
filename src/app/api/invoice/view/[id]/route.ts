import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Public endpoint to view an invoice PDF
 * URL: /api/invoice/view/{invoiceId}
 * No auth required - invoice IDs (cuid) are non-guessable
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        pdfData: true,
        invoiceSeriesName: true,
        invoiceNumber: true,
      },
    });

    if (!invoice || !invoice.pdfData) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    const filename = `Factura_${invoice.invoiceSeriesName || ""}${invoice.invoiceNumber || ""}.pdf`;

    return new NextResponse(invoice.pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Invoice View] Error:", error);
    return NextResponse.json(
      { error: "Eroare la afisarea facturii" },
      { status: 500 }
    );
  }
}
