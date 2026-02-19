import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/repair-invoices/pdf?series=X&number=Y
 * Obtine link-ul PDF al unei facturi din Oblio.
 * Cauta compania care detine factura si returneaza URL-ul PDF-ului.
 * Super admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Doar super admin poate accesa PDF-uri" },
        { status: 403 }
      );
    }

    const series = request.nextUrl.searchParams.get("series");
    const number = request.nextUrl.searchParams.get("number");

    if (!series || !number) {
      return NextResponse.json(
        { error: "Parametrii series si number sunt obligatorii" },
        { status: 400 }
      );
    }

    // Try to find the invoice in DB to get company
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceSeriesName: series,
        invoiceNumber: number,
      },
      include: { company: true },
    });

    if (invoice?.company) {
      const oblioClient = createOblioClient(invoice.company);
      if (oblioClient) {
        const result = await oblioClient.getInvoicePDF(series, number);
        if (result.success && result.pdfUrl) {
          return NextResponse.json({ pdfUrl: result.pdfUrl });
        }
      }
    }

    // Fallback: try all companies with Oblio credentials
    const companies = await prisma.company.findMany({
      where: {
        oblioEmail: { not: null },
        oblioSecretToken: { not: null },
      },
    });

    for (const company of companies) {
      const oblioClient = createOblioClient(company);
      if (!oblioClient) continue;

      try {
        const result = await oblioClient.getInvoicePDF(series, number);
        if (result.success && result.pdfUrl) {
          return NextResponse.json({ pdfUrl: result.pdfUrl });
        }
      } catch {
        // Try next company
        continue;
      }
    }

    return NextResponse.json(
      { error: "Nu s-a putut obtine PDF-ul facturii" },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/repair-invoices/pdf:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
