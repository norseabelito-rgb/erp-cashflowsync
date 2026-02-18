import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min - paginarea prin Oblio poate dura

/**
 * GET /api/admin/repair-invoices
 * Citeste facturile afectate din DB (instant, fara Oblio).
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

    const [pendingInvoices, erroredInvoices, repairedCount, lastScan] = await Promise.all([
      prisma.repairInvoice.findMany({
        where: { status: "pending" },
        include: { company: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.repairInvoice.findMany({
        where: { status: "error" },
        include: { company: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.repairInvoice.count({ where: { status: "repaired" } }),
      prisma.repairInvoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const mapInvoice = (ri: typeof pendingInvoices[0] & { errorMessage?: string | null }) => ({
      id: ri.id,
      invoiceNumber: ri.invoiceNumber,
      invoiceSeriesName: ri.invoiceSeriesName,
      orderId: ri.orderId,
      orderNumber: ri.orderNumber,
      oblioClient: ri.oblioClient,
      correctCustomer: ri.correctCustomer,
      total: Number(ri.total),
      currency: ri.currency,
      issuedAt: ri.issuedAt?.toISOString() || "",
      companyName: ri.company.name,
      errorMessage: ri.errorMessage || null,
    });

    const invoices = pendingInvoices.map(mapInvoice);
    const errors = erroredInvoices.map(mapInvoice);

    return NextResponse.json({
      success: true,
      total: invoices.length,
      errorCount: errors.length,
      repairedCount,
      lastScanAt: lastScan?.createdAt?.toISOString() || null,
      invoices,
      errors,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/repair-invoices:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/repair-invoices
 * Scaneaza TOATE facturile din Oblio, gaseste auto-facturarile
 * si le salveaza in DB (upsert). Proceseaza in batch-uri,
 * fara acumulare in memorie.
 */
export async function POST() {
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

    let totalFound = 0;
    let totalNew = 0;

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

        // Procesam batch-ul curent - upsert in DB imediat, fara acumulare
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

          // Gaseste comanda legata
          let orderId: string | null = null;
          let orderNumber = "-";
          let correctCustomer = "N/A";

          // Incearca sa gaseasca factura in DB
          const dbInvoice = await prisma.invoice.findFirst({
            where: {
              invoiceSeriesName: seriesName,
              invoiceNumber: number,
              companyId: company.id,
              status: "issued",
            },
            include: { order: true },
          });

          if (dbInvoice?.order) {
            orderId = dbInvoice.order.id;
            orderNumber = dbInvoice.order.shopifyOrderNumber;
            correctCustomer =
              [dbInvoice.order.customerFirstName, dbInvoice.order.customerLastName]
                .filter(Boolean)
                .join(" ") || "Client";
          } else {
            // Fallback: extrage numarul comenzii din mentions
            const mentions = oblioInv.mentions || oblioInv.observations || "";
            const orderMatch = mentions.match(/#(\d+)/);
            if (orderMatch) {
              const shopifyNum = `#${orderMatch[1]}`;
              orderNumber = shopifyNum;
              // Cauta comanda doar in store-urile companiei curente
              const order = await prisma.order.findFirst({
                where: {
                  shopifyOrderNumber: shopifyNum,
                  store: { companyId: company.id },
                },
              });
              if (order) {
                orderId = order.id;
                correctCustomer =
                  [order.customerFirstName, order.customerLastName]
                    .filter(Boolean)
                    .join(" ") || "Client";
              } else {
                // Fallback: cauta comanda in TOATE store-urile (ex: Construim Destine)
                const orderAny = await prisma.order.findFirst({
                  where: { shopifyOrderNumber: shopifyNum },
                });
                if (orderAny) {
                  orderId = orderAny.id;
                  correctCustomer =
                    [orderAny.customerFirstName, orderAny.customerLastName]
                      .filter(Boolean)
                      .join(" ") || "Client";
                }
              }
            }
          }

          const oblioClientName =
            oblioInv.client?.name || oblioInv.clientName || oblioInv.client || "N/A";
          const issuedAt = oblioInv.issueDate ? new Date(oblioInv.issueDate) : null;

          // Upsert - nu creeaza duplicat daca ruleaza scan-ul de mai multe ori
          const result = await prisma.repairInvoice.upsert({
            where: {
              invoiceSeriesName_invoiceNumber_companyId: {
                invoiceSeriesName: seriesName,
                invoiceNumber: number,
                companyId: company.id,
              },
            },
            create: {
              invoiceNumber: number,
              invoiceSeriesName: seriesName,
              companyId: company.id,
              orderId,
              orderNumber,
              oblioClient: String(oblioClientName),
              correctCustomer,
              total: oblioInv.total ? Number(oblioInv.total) : 0,
              currency: oblioInv.currency || "RON",
              issuedAt,
            },
            update: {
              // Actualizeaza doar daca nu e deja reparat
              ...(orderId ? { orderId } : {}),
              orderNumber,
              correctCustomer,
            },
          });

          totalFound++;
          // Daca tocmai a fost creat (createdAt ~= updatedAt), e nou
          if (
            Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000
          ) {
            totalNew++;
          }
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
      totalFound,
      totalNew,
      message: `Scan complet. ${totalFound} facturi afectate gasite, ${totalNew} noi.`,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/repair-invoices:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
