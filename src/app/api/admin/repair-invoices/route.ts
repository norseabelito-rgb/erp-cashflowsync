import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min - paginarea prin Oblio poate dura

/**
 * GET /api/admin/repair-invoices
 * Paginam prin TOATE facturile din Oblio si le filtram pe cele unde
 * numele clientului == numele firmei emitente (auto-facturare).
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
      const oblioClient = createOblioClient(company);
      if (!oblioClient) continue;

      // Variante ale numelui firmei pentru matching (case-insensitive)
      const companyNames = new Set(
        [company.name, company.cif, company.oblioCif]
          .filter(Boolean)
          .map((n) => n!.toLowerCase().trim())
      );

      // Paginam prin TOATE facturile necancelate din Oblio
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const listResult = await oblioClient.listInvoices({
          canceled: 0,
          limitPerPage: limit,
          offset,
        });

        if (!listResult.success || !listResult.data || listResult.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const oblioInv of listResult.data) {
          // Extragem numele clientului de pe factura
          const clientName = (
            oblioInv.client?.name ||
            oblioInv.clientName ||
            oblioInv.client ||
            ""
          ).toString().toLowerCase().trim();

          const clientCif = (
            oblioInv.client?.cif ||
            oblioInv.clientCif ||
            ""
          ).toString().toLowerCase().trim();

          // Verificam daca clientul e firma emitenta
          const isAutoInvoice =
            companyNames.has(clientName) ||
            (clientCif && companyNames.has(clientCif));

          if (!isAutoInvoice) continue;

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
            oblioClient: oblioInv.client?.name || oblioInv.clientName || oblioInv.client || "N/A",
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
