/**
 * Intercompany Settlement Service
 *
 * Serviciu pentru gestionarea decontărilor intercompany.
 * Aquaterra (firma primară) facturează firmele secundare pentru comenzile procesate.
 *
 * IMPORTANT: Settlement calculates using ACQUISITION PRICE (costPrice from InventoryItem),
 * NOT customer order prices. This is the core business logic for intercompany invoicing.
 */

import prisma from "./db";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Base interface for settlement preview
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

// Extended preview with cost-based calculations and order selection
interface AggregatedProduct {
  sku: string;
  title: string;
  quantity: number;
  totalCostPrice: number; // Sum of (costPrice * quantity)
  unitCostPrice: number; // Average unit cost
  hasCostPrice: boolean; // false if any quantity lacks cost price
}

interface SettlementOrderInfo {
  id: string;
  orderNumber: string;
  totalPrice: number; // What customer paid
  costTotal: number; // Acquisition price total for this order
  processedAt: Date;
  productCount: number;
  paymentType: "cod" | "online";
  selected: boolean; // For UI selection
}

export interface SettlementPreviewExtended extends Omit<SettlementPreview, "orders"> {
  warnings: string[]; // Products without costPrice
  orders: SettlementOrderInfo[];
  totals: {
    orderCount: number;
    subtotal: number; // Sum of costPrice
    markupPercent: number;
    markupAmount: number;
    total: number; // With markup
  };
}

interface SettlementResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Batch-fetch cost prices from InventoryItem for given SKUs
 * Uses two-step lookup:
 * 1. Try to get costPrice via MasterProduct -> InventoryItem
 * 2. Fallback to direct SKU match in InventoryItem
 */
async function getCostPricesForSkus(skus: string[]): Promise<Map<string, number | null>> {
  if (skus.length === 0) return new Map();

  const items = await prisma.inventoryItem.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, costPrice: true },
  });

  return new Map(items.map((i) => [i.sku, i.costPrice ? Number(i.costPrice) : null]));
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
 * - Au AWB livrat și încasat (pentru ramburs) SAU sunt plătite online
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
    paymentType: "cod" | "online";
    lineItems: Array<{
      sku: string | null;
      title: string;
      quantity: number;
      price: Decimal;
    }>;
  }>
> {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (periodStart) {
    dateFilter.gte = periodStart;
  }
  if (periodEnd) {
    dateFilter.lte = periodEnd;
  }

  const orders = await prisma.order.findMany({
    where: {
      billingCompanyId: companyId,
      intercompanyStatus: "pending",
      OR: [
        { awb: { isCollected: true } }, // COD orders with AWB collected
        { financialStatus: "paid" }, // Online paid orders
      ],
      ...(Object.keys(dateFilter).length > 0
        ? {
            invoice: {
              issuedAt: dateFilter,
            },
          }
        : {}),
    },
    include: {
      lineItems: {
        select: {
          sku: true,
          title: true,
          quantity: true,
          price: true,
        },
      },
      awb: {
        select: {
          isCollected: true,
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
    paymentType: order.awb?.isCollected === true ? "cod" : "online",
    lineItems: order.lineItems,
  }));
}

/**
 * Calculate settlement preview for selected orders using ACQUISITION PRICE (costPrice)
 *
 * Key business logic:
 * - Uses InventoryItem.costPrice, NOT order lineItem.price
 * - Markup is applied to total subtotal, not per-line
 * - Products without costPrice generate warnings but are included (with 0 value)
 */
export async function calculateSettlementFromOrders(
  companyId: string,
  orderIds: string[]
): Promise<SettlementPreviewExtended | null> {
  // Fetch company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Firma nu a fost gasita");
  }

  if (company.isPrimary) {
    throw new Error("Nu se poate genera decontare pentru firma primara");
  }

  // Fetch orders with line items
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      billingCompanyId: companyId,
      intercompanyStatus: "pending",
    },
    include: {
      lineItems: {
        select: {
          sku: true,
          title: true,
          quantity: true,
          price: true,
        },
      },
      awb: {
        select: { isCollected: true },
      },
      invoice: {
        select: { issuedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) {
    return null;
  }

  // Get all unique SKUs from orders
  const allSkus = new Set<string>();
  for (const order of orders) {
    for (const item of order.lineItems) {
      if (item.sku) allSkus.add(item.sku);
    }
  }

  // Batch fetch cost prices from InventoryItem
  const costPriceMap = await getCostPricesForSkus(Array.from(allSkus));
  const warnings: string[] = [];
  const warnedSkus = new Set<string>();

  // Aggregate products with costPrice
  const productMap = new Map<string, AggregatedProduct>();

  // Process each order and calculate cost totals
  const orderInfos: SettlementOrderInfo[] = [];

  for (const order of orders) {
    let orderCostTotal = 0;

    for (const item of order.lineItems) {
      const key = item.sku || item.title;
      const costPrice = item.sku ? (costPriceMap.get(item.sku) ?? null) : null;

      if (costPrice === null && !warnedSkus.has(key)) {
        warnedSkus.add(key);
        warnings.push(`${key}: Pret achizitie lipsa`);
      }

      const lineTotal = (costPrice || 0) * item.quantity;
      orderCostTotal += lineTotal;

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
        existing.totalCostPrice += lineTotal;
        existing.unitCostPrice = existing.totalCostPrice / existing.quantity;
        if (costPrice === null) existing.hasCostPrice = false;
      } else {
        productMap.set(key, {
          sku: item.sku || "N/A",
          title: item.title,
          quantity: item.quantity,
          totalCostPrice: lineTotal,
          unitCostPrice: costPrice || 0,
          hasCostPrice: costPrice !== null,
        });
      }
    }

    orderInfos.push({
      id: order.id,
      orderNumber: order.shopifyOrderNumber || order.id,
      totalPrice: Number(order.totalPrice),
      costTotal: Math.round(orderCostTotal * 100) / 100,
      processedAt: order.invoice?.issuedAt || order.createdAt,
      productCount: order.lineItems.reduce((sum, li) => sum + li.quantity, 0),
      paymentType: order.awb?.isCollected === true ? "cod" : "online",
      selected: true,
    });
  }

  // Calculate totals with markup applied to subtotal (not per-line)
  const markup = Number(company.intercompanyMarkup) || 10;
  const subtotal = Array.from(productMap.values()).reduce((sum, p) => sum + p.totalCostPrice, 0);
  const markupAmount = Math.round(((subtotal * markup) / 100) * 100) / 100;
  const total = Math.round((subtotal + markupAmount) * 100) / 100;

  // Build line items from aggregated products
  const lineItems = Array.from(productMap.values()).map((p) => ({
    sku: p.sku,
    title: p.title,
    quantity: p.quantity,
    unitCost: Math.round(p.unitCostPrice * 100) / 100,
    markup,
    lineTotal: Math.round(p.totalCostPrice * (1 + markup / 100) * 100) / 100,
  }));

  // Determine period from orders
  const sortedByDate = [...orderInfos].sort(
    (a, b) => a.processedAt.getTime() - b.processedAt.getTime()
  );
  const periodStart = sortedByDate[0]?.processedAt || new Date();
  const periodEnd = sortedByDate[sortedByDate.length - 1]?.processedAt || new Date();

  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    periodStart,
    periodEnd,
    orders: orderInfos,
    lineItems,
    totalOrders: orders.length,
    totalItems: lineItems.reduce((sum, li) => sum + li.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    markup,
    markupAmount,
    total,
    warnings,
    totals: {
      orderCount: orders.length,
      subtotal: Math.round(subtotal * 100) / 100,
      markupPercent: markup,
      markupAmount,
      total,
    },
  };
}

/**
 * Generează un preview al decontării pentru o firmă
 *
 * UPDATED: Now uses InventoryItem.costPrice instead of order lineItem.price
 * Markup is applied to total subtotal, not per-line
 */
export async function generateSettlementPreview(
  companyId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SettlementPreviewExtended | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Firma nu a fost gasita");
  }

  if (company.isPrimary) {
    throw new Error("Nu se poate genera decontare pentru firma primara");
  }

  const orders = await getEligibleOrdersForSettlement(companyId, periodStart, periodEnd);

  if (orders.length === 0) {
    return null;
  }

  // Get all unique SKUs from orders
  const allSkus = new Set<string>();
  for (const order of orders) {
    for (const item of order.lineItems) {
      if (item.sku) allSkus.add(item.sku);
    }
  }

  // Batch fetch cost prices from InventoryItem
  const costPriceMap = await getCostPricesForSkus(Array.from(allSkus));
  const warnings: string[] = [];
  const warnedSkus = new Set<string>();

  // Aggregate products with costPrice
  const productMap = new Map<string, AggregatedProduct>();

  // Process each order and calculate cost totals
  const orderInfos: SettlementOrderInfo[] = [];

  for (const order of orders) {
    let orderCostTotal = 0;

    for (const item of order.lineItems) {
      const key = item.sku || item.title;
      const costPrice = item.sku ? (costPriceMap.get(item.sku) ?? null) : null;

      if (costPrice === null && !warnedSkus.has(key)) {
        warnedSkus.add(key);
        warnings.push(`${key}: Pret achizitie lipsa`);
      }

      const lineTotal = (costPrice || 0) * item.quantity;
      orderCostTotal += lineTotal;

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
        existing.totalCostPrice += lineTotal;
        existing.unitCostPrice = existing.totalCostPrice / existing.quantity;
        if (costPrice === null) existing.hasCostPrice = false;
      } else {
        productMap.set(key, {
          sku: item.sku || "N/A",
          title: item.title,
          quantity: item.quantity,
          totalCostPrice: lineTotal,
          unitCostPrice: costPrice || 0,
          hasCostPrice: costPrice !== null,
        });
      }
    }

    orderInfos.push({
      id: order.id,
      orderNumber: order.orderNumber,
      totalPrice: Number(order.totalPrice),
      costTotal: Math.round(orderCostTotal * 100) / 100,
      processedAt: order.processedAt,
      productCount: order.lineItems.reduce((sum, li) => sum + li.quantity, 0),
      paymentType: order.paymentType,
      selected: true, // Default pre-selected
    });
  }

  // Calculate totals with markup applied to subtotal (not per-line)
  const markup = Number(company.intercompanyMarkup) || 10;
  const subtotal = Array.from(productMap.values()).reduce((sum, p) => sum + p.totalCostPrice, 0);
  const markupAmount = Math.round(((subtotal * markup) / 100) * 100) / 100;
  const total = Math.round((subtotal + markupAmount) * 100) / 100;

  // Build line items from aggregated products
  const lineItems = Array.from(productMap.values()).map((p) => ({
    sku: p.sku,
    title: p.title,
    quantity: p.quantity,
    unitCost: Math.round(p.unitCostPrice * 100) / 100,
    markup,
    lineTotal: Math.round(p.totalCostPrice * (1 + markup / 100) * 100) / 100,
  }));

  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    periodStart: periodStart || orders[0].processedAt,
    periodEnd: periodEnd || orders[orders.length - 1].processedAt,
    orders: orderInfos,
    lineItems,
    totalOrders: orders.length,
    totalItems: lineItems.reduce((sum, li) => sum + li.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    markup,
    markupAmount,
    total,
    warnings,
    totals: {
      orderCount: orders.length,
      subtotal: Math.round(subtotal * 100) / 100,
      markupPercent: markup,
      markupAmount,
      total,
    },
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
        error: "Nu exista comenzi eligibile pentru decontare",
      };
    }

    const primaryCompany = await getPrimaryCompany();

    if (!primaryCompany) {
      return {
        success: false,
        error: "Nu exista firma primara configurata",
      };
    }

    // Executăm totul într-o tranzacție atomică pentru a preveni race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Generăm număr unic pentru factura intercompany (în tranzacție pentru atomicitate)
      const year = new Date().getFullYear();
      const count = await tx.intercompanyInvoice.count({
        where: {
          invoiceNumber: { startsWith: `IC-${year}` },
        },
      });
      const invoiceNumber = `IC-${year}-${String(count + 1).padStart(5, "0")}`;

      // Creăm factura intercompany
      // For intercompany settlements, VAT is typically 0 (same legal entity or exempt)
      const intercompanyInvoice = await tx.intercompanyInvoice.create({
        data: {
          issuedByCompanyId: primaryCompany.id,
          receivedByCompanyId: companyId,
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
          invoiceNumber,
          totalValue: new Decimal(preview.total),
          totalVat: new Decimal(0),
          totalWithVat: new Decimal(preview.total),
          totalItems: preview.totalOrders,
          status: "pending",
          lineItems: JSON.stringify(preview.lineItems),
          markupPercent: new Decimal(preview.markup),
          issuedAt: new Date(),
        },
      });

      // Legăm comenzile de factura intercompany și le marcăm ca decontate
      for (const order of preview.orders) {
        await tx.intercompanyOrderLink.create({
          data: {
            intercompanyInvoiceId: intercompanyInvoice.id,
            orderId: order.id,
          },
        });

        // Marcăm comanda ca decontată
        await tx.order.update({
          where: { id: order.id },
          data: { intercompanyStatus: "settled" },
        });
      }

      return { invoiceId: intercompanyInvoice.id, invoiceNumber };
    });

    console.log(
      `Factura intercompany generata: ${result.invoiceNumber} pentru ${preview.companyName} - ${preview.total} RON`
    );

    return {
      success: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
    };
  } catch (error: unknown) {
    console.error("Eroare la generarea facturii intercompany:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscuta";
    return {
      success: false,
      error: errorMessage,
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
      return { success: false, error: "Factura nu a fost gasita" };
    }

    if (invoice.status === "paid") {
      return { success: false, error: "Factura este deja platita" };
    }

    await prisma.intercompanyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscuta";
    return { success: false, error: errorMessage };
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
  const where: Prisma.IntercompanyInvoiceWhereInput = {};

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
          select: { includedOrders: true },
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
    console.log(`Procesare decontare pentru ${company.name}...`);

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
    } else if (result.error !== "Nu exista comenzi eligibile pentru decontare") {
      failed++;
    }
  }

  console.log(`Decontare saptamanala completa: ${processed} facturi generate, ${failed} erori`);

  return { processed, failed, results };
}
