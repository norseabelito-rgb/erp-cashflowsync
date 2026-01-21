/**
 * Intercompany Settlement Service
 *
 * Serviciu pentru gestionarea decontărilor intercompany.
 * Aquaterra (firma primară) facturează firmele secundare pentru comenzile procesate.
 */

import prisma from "./db";
import { Decimal } from "@prisma/client/runtime/library";

interface SettlementPreview {
  companyId: string;
  companyName: string;
  companyCode: string;
  periodStart: Date;
  periodEnd: Date;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    processedAt: Date;
  }>;
  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    unitCost: number;
    markup: number;
    lineTotal: number;
  }>;
  totalOrders: number;
  totalItems: number;
  subtotal: number;
  markup: number;
  markupAmount: number;
  total: number;
}

interface SettlementResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Obține firma primară (Aquaterra) - cea care deține stocul și facturează
 */
export async function getPrimaryCompany() {
  return prisma.company.findFirst({
    where: { isPrimary: true, isActive: true },
  });
}

/**
 * Obține toate firmele secundare
 */
export async function getSecondaryCompanies() {
  return prisma.company.findMany({
    where: { isPrimary: false, isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Obține comenzile eligibile pentru decontare pentru o firmă
 * Comenzi care:
 * - Sunt facturate pe firma secundară (billingCompanyId)
 * - Au status pending pentru decontare (intercompanyStatus = "pending")
 * - Au AWB livrat și încasat (pentru ramburs)
 */
export async function getEligibleOrdersForSettlement(
  companyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<
  Array<{
    id: string;
    orderNumber: string;
    totalPrice: Decimal;
    processedAt: Date;
    lineItems: Array<{
      sku: string | null;
      title: string;
      quantity: number;
      price: Decimal;
    }>;
  }>
> {
  const whereClause: any = {
    billingCompanyId: companyId,
    intercompanyStatus: "pending",
    // Comanda trebuie să fie livrată și încasată
    awb: {
      isCollected: true, // Ramburs încasat
    },
  };

  if (periodStart) {
    whereClause.invoice = {
      ...whereClause.invoice,
      issuedAt: { gte: periodStart },
    };
  }
  if (periodEnd) {
    whereClause.invoice = {
      ...whereClause.invoice,
      issuedAt: { ...(whereClause.invoice?.issuedAt || {}), lte: periodEnd },
    };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      lineItems: {
        select: {
          sku: true,
          title: true,
          quantity: true,
          price: true,
        },
      },
      invoice: {
        select: {
          issuedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.shopifyOrderNumber || order.id,
    totalPrice: order.totalPrice,
    processedAt: order.invoice?.issuedAt || order.createdAt,
    lineItems: order.lineItems,
  }));
}

/**
 * Generează un preview al decontării pentru o firmă
 */
export async function generateSettlementPreview(
  companyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SettlementPreview | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Firma nu a fost găsită");
  }

  if (company.isPrimary) {
    throw new Error("Nu se poate genera decontare pentru firma primară");
  }

  const orders = await getEligibleOrdersForSettlement(companyId, periodStart, periodEnd);

  if (orders.length === 0) {
    return null;
  }

  // Agregăm produsele din toate comenzile
  const productMap = new Map<
    string,
    {
      sku: string;
      title: string;
      quantity: number;
      totalValue: number;
    }
  >();

  for (const order of orders) {
    for (const item of order.lineItems) {
      const key = item.sku || item.title;
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
        existing.totalValue += Number(item.price) * item.quantity;
      } else {
        productMap.set(key, {
          sku: item.sku || "N/A",
          title: item.title,
          quantity: item.quantity,
          totalValue: Number(item.price) * item.quantity,
        });
      }
    }
  }

  // Calculăm markup-ul
  const markup = Number(company.intercompanyMarkup) || 10;
  const subtotal = Array.from(productMap.values()).reduce((sum, p) => sum + p.totalValue, 0);
  const markupAmount = (subtotal * markup) / 100;
  const total = subtotal + markupAmount;

  const lineItems = Array.from(productMap.values()).map((p) => ({
    sku: p.sku,
    title: p.title,
    quantity: p.quantity,
    unitCost: p.totalValue / p.quantity,
    markup,
    lineTotal: (p.totalValue * (1 + markup / 100)),
  }));

  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    periodStart: periodStart || orders[0].processedAt,
    periodEnd: periodEnd || orders[orders.length - 1].processedAt,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalPrice: Number(o.totalPrice),
      processedAt: o.processedAt,
    })),
    lineItems,
    totalOrders: orders.length,
    totalItems: lineItems.reduce((sum, li) => sum + li.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    markup,
    markupAmount: Math.round(markupAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Generează factura intercompany
 */
export async function generateIntercompanyInvoice(
  companyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SettlementResult> {
  try {
    const preview = await generateSettlementPreview(companyId, periodStart, periodEnd);

    if (!preview) {
      return {
        success: false,
        error: "Nu există comenzi eligibile pentru decontare",
      };
    }

    const primaryCompany = await getPrimaryCompany();

    if (!primaryCompany) {
      return {
        success: false,
        error: "Nu există firmă primară configurată",
      };
    }

    // Generăm număr unic pentru factura intercompany
    const year = new Date().getFullYear();
    const count = await prisma.intercompanyInvoice.count({
      where: {
        invoiceNumber: { startsWith: `IC-${year}` },
      },
    });
    const invoiceNumber = `IC-${year}-${String(count + 1).padStart(5, "0")}`;

    // Creăm factura intercompany
    const intercompanyInvoice = await prisma.intercompanyInvoice.create({
      data: {
        issuedByCompanyId: primaryCompany.id,
        receivedByCompanyId: companyId,
        periodStart: preview.periodStart,
        periodEnd: preview.periodEnd,
        invoiceNumber,
        totalValue: preview.total,
        totalItems: preview.totalOrders,
        status: "pending",
        lineItems: JSON.stringify(preview.lineItems),
        issuedAt: new Date(),
      },
    });

    // Legăm comenzile de factura intercompany
    for (const order of preview.orders) {
      await prisma.intercompanyOrderLink.create({
        data: {
          intercompanyInvoiceId: intercompanyInvoice.id,
          orderId: order.id,
        },
      });

      // Marcăm comanda ca decontată
      await prisma.order.update({
        where: { id: order.id },
        data: { intercompanyStatus: "settled" },
      });
    }

    console.log(
      `📋 Factură intercompany generată: ${invoiceNumber} pentru ${preview.companyName} - ${preview.total} RON`
    );

    return {
      success: true,
      invoiceId: intercompanyInvoice.id,
      invoiceNumber,
    };
  } catch (error: any) {
    console.error("Eroare la generarea facturii intercompany:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Marchează o factură intercompany ca plătită
 */
export async function markIntercompanyInvoiceAsPaid(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const invoice = await prisma.intercompanyInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: "Factura nu a fost găsită" };
    }

    if (invoice.status === "paid") {
      return { success: false, error: "Factura este deja plătită" };
    }

    await prisma.intercompanyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Obține lista facturilor intercompany
 */
export async function getIntercompanyInvoices(filters?: {
  companyId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.companyId) {
    where.receivedByCompanyId = filters.companyId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const [invoices, total] = await Promise.all([
    prisma.intercompanyInvoice.findMany({
      where,
      include: {
        issuedByCompany: {
          select: { id: true, name: true, code: true },
        },
        receivedByCompany: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.intercompanyInvoice.count({ where }),
  ]);

  return { invoices, total };
}

/**
 * Rulează decontarea săptămânală pentru toate firmele secundare
 * Aceasta e funcția apelată de cron job
 */
export async function runWeeklySettlement(): Promise<{
  processed: number;
  failed: number;
  results: Array<{
    companyId: string;
    companyName: string;
    success: boolean;
    invoiceNumber?: string;
    error?: string;
  }>;
}> {
  const secondaryCompanies = await getSecondaryCompanies();
  const results: Array<{
    companyId: string;
    companyName: string;
    success: boolean;
    invoiceNumber?: string;
    error?: string;
  }> = [];

  let processed = 0;
  let failed = 0;

  // Calculăm perioada (săptămâna anterioară)
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setHours(0, 0, 0, 0);

  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 7);

  for (const company of secondaryCompanies) {
    console.log(`\n📊 Procesare decontare pentru ${company.name}...`);

    const result = await generateIntercompanyInvoice(company.id, periodStart, periodEnd);

    results.push({
      companyId: company.id,
      companyName: company.name,
      success: result.success,
      invoiceNumber: result.invoiceNumber,
      error: result.error,
    });

    if (result.success) {
      processed++;
    } else if (result.error !== "Nu există comenzi eligibile pentru decontare") {
      failed++;
    }
  }

  console.log(`\n✅ Decontare săptămânală completă: ${processed} facturi generate, ${failed} erori`);

  return { processed, failed, results };
}
