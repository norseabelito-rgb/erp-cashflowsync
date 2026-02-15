import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/repair-invoices
 * Interogheaza Oblio pentru a gasi facturile emise gresit (client = firma emitenta).
 * Cauta facturile unde CIF-ul clientului == CIF-ul firmei emitente.
 */
export async function GET() {
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
        { error: "Doar super admin poate accesa aceasta pagina" },
        { status: 403 }
      );
    }

    // Gaseste toate companiile cu credentiale Oblio
    const companies = await prisma.company.findMany({
      where: {
        oblioEmail: { not: null },
        oblioSecretToken: { not: null },
      },
    });

    const allAffected: Array<{
      id: string;
      invoiceNumber: string;
      invoiceSeriesName: string;
      orderId: string | null;
      orderNumber: string;
      oblioClient: string;
      correctCustomer: string;
      total: number;
      currency: string;
      issuedAt: string;
      companyName: string;
    }> = [];

    for (const company of companies) {
      const cif = company.oblioCif || company.cif;
      if (!cif) continue;

      const oblioClient = createOblioClient(company);
      if (!oblioClient) continue;

      // Interogam Oblio: facturile unde clientul are CIF-ul firmei
      // Paginam prin toate rezultatele
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const listResult = await oblioClient.listInvoices({
          client: cif,
          canceled: 0, // doar cele necancelate
          limitPerPage: limit,
          offset,
        });

        if (!listResult.success || !listResult.data || listResult.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const oblioInv of listResult.data) {
          const seriesName = oblioInv.seriesName;
          const number = oblioInv.number?.toString();

          if (!seriesName || !number) continue;

          // Gaseste factura in DB
          const dbInvoice = await prisma.invoice.findFirst({
            where: {
              invoiceSeriesName: seriesName,
              invoiceNumber: number,
              companyId: company.id,
              status: "issued",
            },
            include: {
              order: true,
            },
          });

          const orderNumber = dbInvoice?.order?.shopifyOrderNumber || oblioInv.mentions || "-";
          const correctCustomer = dbInvoice?.order
            ? [dbInvoice.order.customerFirstName, dbInvoice.order.customerLastName]
                .filter(Boolean)
                .join(" ") || "Client"
            : "N/A (fara comanda in DB)";

          allAffected.push({
            id: dbInvoice?.id || `oblio-${seriesName}-${number}`,
            invoiceNumber: number,
            invoiceSeriesName: seriesName,
            orderId: dbInvoice?.orderId || null,
            orderNumber,
            oblioClient: oblioInv.client?.name || oblioInv.clientName || "N/A",
            correctCustomer,
            total: oblioInv.total ? Number(oblioInv.total) : 0,
            currency: oblioInv.currency || "RON",
            issuedAt: oblioInv.issueDate || "",
            companyName: company.name,
          });
        }

        if (listResult.data.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

        // Pauza intre paginile Oblio
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      success: true,
      total: allAffected.length,
      invoices: allAffected,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/repair-invoices:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
