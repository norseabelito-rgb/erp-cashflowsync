/**
 * Trendyol Order Sync Service
 *
 * Syncs TrendyolOrder records to the main Order table for unified
 * invoice/AWB workflow. Called from:
 * - Webhook handler (real-time)
 * - Manual import/sync actions
 */

import prisma from "@/lib/db";
import { Order, TrendyolOrder, Settings, Store, Prisma } from "@prisma/client";
import { mapTrendyolToInternalStatus } from "@/lib/trendyol-status";

// Type for TrendyolOrder with line items included
type TrendyolOrderWithItems = TrendyolOrder & {
  lineItems: Array<{
    id: string;
    trendyolOrderId: string;
    trendyolProductId: string;
    barcode: string;
    title: string;
    quantity: number;
    price: Prisma.Decimal;
    merchantSku: string | null;
    productColor: string | null;
    productSize: string | null;
    localSku: string | null;
    masterProductId: string | null;
    isMapped: boolean;
  }>;
};

/**
 * Extract first name from full name
 */
function extractFirstName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

/**
 * Extract last name from full name
 */
function extractLastName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(1).join(" ") || "";
}

/**
 * Convert currency code - Trendyol uses EUR/TRY, Order uses RON
 * For now, we store the original currency
 */
function convertCurrency(trendyolCurrency: string): string {
  // Keep original currency for now - conversion can be done at invoice level
  return trendyolCurrency || "EUR";
}

/**
 * Find or create a virtual store for Trendyol orders
 */
export async function findOrCreateTrendyolStore(settings: Settings): Promise<Store> {
  const storeFrontCode = (settings as any).trendyolStoreFrontCode || "RO";
  const supplierId = settings.trendyolSupplierId || "unknown";
  const storeName = `Trendyol ${storeFrontCode}`;
  const shopifyDomain = `trendyol-${supplierId}`;

  // Try to find existing Trendyol store by domain pattern
  let store = await prisma.store.findFirst({
    where: {
      shopifyDomain: shopifyDomain,
    },
  });

  if (!store) {
    // Create virtual store for Trendyol
    const companyId = (settings as any).trendyolCompanyId;

    store = await prisma.store.create({
      data: {
        name: storeName,
        shopifyDomain: shopifyDomain,
        accessToken: "", // Not used for Trendyol
        isActive: true,
        companyId: companyId || null,
      },
    });

    console.log(`[Trendyol Sync] Created virtual store: ${storeName} (ID: ${store.id})`);
  }

  return store;
}

/**
 * Create LineItems from TrendyolOrder line items
 */
async function createLineItemsFromTrendyol(
  orderId: string,
  trendyolItems: TrendyolOrderWithItems["lineItems"]
): Promise<void> {
  const lineItemsData = trendyolItems.map((item, index) => ({
    orderId,
    shopifyLineItemId: `trendyol-${item.trendyolProductId}-${index}`,
    title: item.title,
    variantTitle: [item.productColor, item.productSize].filter(Boolean).join(" / ") || null,
    sku: item.localSku || item.merchantSku || item.barcode,
    quantity: item.quantity,
    price: item.price,
    barcode: item.barcode,
    masterProductId: item.masterProductId,
  }));

  await prisma.lineItem.createMany({
    data: lineItemsData,
  });
}

/**
 * Update an existing Order from TrendyolOrder data
 * Only updates status and relevant fields, preserves local modifications
 */
async function updateOrderFromTrendyol(
  existingOrder: Order,
  trendyolOrder: TrendyolOrderWithItems
): Promise<Order> {
  const newStatus = mapTrendyolToInternalStatus(trendyolOrder.status);

  // Only update if status changed
  if (existingOrder.status !== newStatus) {
    return await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: newStatus as any,
        updatedAt: new Date(),
      },
    });
  }

  return existingOrder;
}

/**
 * Syncs a TrendyolOrder to the main Order table
 *
 * @param trendyolOrder - The TrendyolOrder record with line items
 * @param settings - Application settings with Trendyol config
 * @returns The created or updated Order record
 */
export async function syncTrendyolOrderToMainOrder(
  trendyolOrder: TrendyolOrderWithItems,
  settings: Settings
): Promise<Order> {
  // 1. Find or create Store for Trendyol (virtual store)
  const store = await findOrCreateTrendyolStore(settings);

  // 2. Check if Order already exists for this Trendyol order
  const existingOrder = await prisma.order.findFirst({
    where: {
      shopifyOrderId: trendyolOrder.trendyolOrderId,
      source: "trendyol",
    },
  });

  if (existingOrder) {
    // Update status only
    const updatedOrder = await updateOrderFromTrendyol(existingOrder, trendyolOrder);

    // Ensure TrendyolOrder is linked
    if (!trendyolOrder.orderId) {
      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: { orderId: updatedOrder.id },
      });
    }

    return updatedOrder;
  }

  // 3. Create new Order
  const companyId = (settings as any).trendyolCompanyId;

  const order = await prisma.order.create({
    data: {
      shopifyOrderId: trendyolOrder.trendyolOrderId,
      shopifyOrderNumber: trendyolOrder.trendyolOrderNumber,
      source: "trendyol",
      storeId: store.id,
      billingCompanyId: companyId || null,

      // Customer data
      customerEmail: trendyolOrder.customerEmail,
      customerPhone: trendyolOrder.customerPhone,
      customerFirstName: extractFirstName(trendyolOrder.customerName),
      customerLastName: extractLastName(trendyolOrder.customerName),

      // Shipping address
      shippingAddress1: trendyolOrder.customerAddress,
      shippingCity: trendyolOrder.customerCity,
      shippingProvince: trendyolOrder.customerDistrict || "",
      shippingZip: trendyolOrder.customerPostalCode || "",
      shippingCountry: "RO", // Default to RO for Trendyol RO marketplace

      // Financial
      totalPrice: trendyolOrder.totalPrice,
      subtotalPrice: trendyolOrder.totalPrice, // Trendyol total includes everything
      totalShipping: 0, // Trendyol handles shipping separately
      totalTax: 0, // Calculate if needed from items
      currency: convertCurrency(trendyolOrder.currency),

      // Status mapping
      status: mapTrendyolToInternalStatus(trendyolOrder.status) as any,
      financialStatus: "paid", // Trendyol orders are prepaid by customers

      // Timestamps
      shopifyCreatedAt: trendyolOrder.orderDate,
      shopifyUpdatedAt: trendyolOrder.orderDate,

      // Store raw data for reference
      rawData: {
        trendyol: {
          trendyolOrderId: trendyolOrder.trendyolOrderId,
          trendyolOrderNumber: trendyolOrder.trendyolOrderNumber,
          shipmentPackageId: trendyolOrder.shipmentPackageId,
          cargoProviderName: trendyolOrder.cargoProviderName,
          cargoTrackingNumber: trendyolOrder.cargoTrackingNumber,
        },
      },

      // Validations - default to passed for Trendyol (Trendyol validates)
      phoneValidation: "PASSED",
      addressValidation: "PASSED",
    },
  });

  // 4. Create LineItems
  if (trendyolOrder.lineItems && trendyolOrder.lineItems.length > 0) {
    await createLineItemsFromTrendyol(order.id, trendyolOrder.lineItems);
  }

  // 5. Link TrendyolOrder to Order
  await prisma.trendyolOrder.update({
    where: { id: trendyolOrder.id },
    data: { orderId: order.id },
  });

  console.log(
    `[Trendyol Sync] Created Order ${order.id} for Trendyol order ${trendyolOrder.trendyolOrderNumber}`
  );

  return order;
}

/**
 * Sync all unlinked TrendyolOrders to main Order table
 *
 * @returns Stats about the sync operation
 */
export async function syncAllTrendyolOrdersToMain(): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = { synced: 0, created: 0, updated: 0, errors: [] as string[] };

  const settings = await prisma.settings.findFirst();
  if (!settings) {
    result.errors.push("Settings not found");
    return result;
  }

  // Find all TrendyolOrders that don't have a linked Order
  const unlinkedOrders = await prisma.trendyolOrder.findMany({
    where: {
      orderId: null,
    },
    include: {
      lineItems: true,
    },
  });

  console.log(`[Trendyol Sync] Found ${unlinkedOrders.length} unlinked Trendyol orders`);

  for (const trendyolOrder of unlinkedOrders) {
    try {
      // Check if Order already exists but not linked
      const existingOrder = await prisma.order.findFirst({
        where: {
          shopifyOrderId: trendyolOrder.trendyolOrderId,
          source: "trendyol",
        },
      });

      if (existingOrder) {
        // Link existing Order
        await prisma.trendyolOrder.update({
          where: { id: trendyolOrder.id },
          data: { orderId: existingOrder.id },
        });
        result.updated++;
      } else {
        // Create new Order
        await syncTrendyolOrderToMainOrder(trendyolOrder as TrendyolOrderWithItems, settings);
        result.created++;
      }
      result.synced++;
    } catch (error: any) {
      result.errors.push(
        `Order ${trendyolOrder.trendyolOrderNumber}: ${error.message}`
      );
    }
  }

  console.log(
    `[Trendyol Sync] Completed: ${result.synced} synced (${result.created} created, ${result.updated} updated), ${result.errors.length} errors`
  );

  return result;
}

/**
 * Update Order status from Trendyol status change
 */
export async function updateOrderStatusFromTrendyol(
  trendyolOrderId: string,
  newTrendyolStatus: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find TrendyolOrder and linked Order
    const trendyolOrder = await prisma.trendyolOrder.findUnique({
      where: { trendyolOrderId },
      include: { order: true },
    });

    if (!trendyolOrder) {
      return { success: false, message: "Trendyol order not found" };
    }

    // Update TrendyolOrder status
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        status: newTrendyolStatus,
        lastSyncedAt: new Date(),
      },
    });

    // Update linked Order if exists
    if (trendyolOrder.order) {
      const newOrderStatus = mapTrendyolToInternalStatus(newTrendyolStatus);
      await prisma.order.update({
        where: { id: trendyolOrder.order.id },
        data: {
          status: newOrderStatus as any,
        },
      });
      return {
        success: true,
        message: `Updated order status to ${newOrderStatus}`,
      };
    }

    return {
      success: true,
      message: "Updated Trendyol order status (no linked Order)",
    };
  } catch (error: any) {
    console.error("[Trendyol Sync] Error updating status:", error);
    return { success: false, message: error.message };
  }
}
