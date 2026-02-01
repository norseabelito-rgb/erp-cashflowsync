/**
 * Trendyol Order Sync Service
 *
 * Syncs TrendyolOrder records to the main Order table for unified
 * invoice/AWB workflow. Called from:
 * - Webhook handler (real-time)
 * - Manual import/sync actions
 *
 * NOTE: Uses TrendyolStore.companyId for multi-company support.
 * The old Settings.trendyolCompanyId is deprecated.
 */

import prisma from "@/lib/db";
import { Order, TrendyolOrder, Store, Prisma } from "@prisma/client";
import { mapTrendyolToInternalStatus } from "@/lib/trendyol-status";

// Type for TrendyolStore data needed for sync
export type TrendyolStoreForSync = {
  id: string;
  name: string;
  supplierId: string;
  companyId: string;
  storeFrontCode: string;
  company: { id: string; name: string } | null;
};

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
 * Uses TrendyolStore data for multi-company support
 */
export async function findOrCreateTrendyolVirtualStore(trendyolStore: TrendyolStoreForSync): Promise<Store> {
  const shopifyDomain = `trendyol-${trendyolStore.supplierId}`;

  // Try to find existing Trendyol store by domain pattern
  let store = await prisma.store.findFirst({
    where: {
      shopifyDomain: shopifyDomain,
    },
  });

  if (!store) {
    // Create virtual store for Trendyol
    store = await prisma.store.create({
      data: {
        name: trendyolStore.name,
        shopifyDomain: shopifyDomain,
        accessToken: "", // Not used for Trendyol
        isActive: true,
        companyId: trendyolStore.companyId,
      },
    });

    console.log(`[Trendyol Sync] Created virtual store: ${trendyolStore.name} (ID: ${store.id})`);
  } else if (store.companyId !== trendyolStore.companyId) {
    // Update company if changed
    store = await prisma.store.update({
      where: { id: store.id },
      data: { companyId: trendyolStore.companyId },
    });
    console.log(`[Trendyol Sync] Updated virtual store company: ${store.id} -> ${trendyolStore.companyId}`);
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
 * @param trendyolStore - TrendyolStore data for company resolution
 * @returns The created or updated Order record
 */
export async function syncTrendyolOrderToMainOrder(
  trendyolOrder: TrendyolOrderWithItems,
  trendyolStore: TrendyolStoreForSync
): Promise<Order> {
  // 1. Find or create Store for Trendyol (virtual store)
  const store = await findOrCreateTrendyolVirtualStore(trendyolStore);

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

  // 3. Create new Order - use TrendyolStore.companyId for billing
  const order = await prisma.order.create({
    data: {
      shopifyOrderId: trendyolOrder.trendyolOrderId,
      shopifyOrderNumber: trendyolOrder.trendyolOrderNumber,
      source: "trendyol",
      storeId: store.id,
      billingCompanyId: trendyolStore.companyId,

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
      shippingCountry: trendyolStore.storeFrontCode === "RO" ? "RO" : trendyolStore.storeFrontCode,

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
          trendyolStoreId: trendyolStore.id,
          trendyolStoreName: trendyolStore.name,
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
    `[Trendyol Sync] Created Order ${order.id} for Trendyol order ${trendyolOrder.trendyolOrderNumber} (Store: ${trendyolStore.name}, Company: ${trendyolStore.companyId})`
  );

  return order;
}

/**
 * Sync all unlinked TrendyolOrders to main Order table
 * Uses TrendyolStore for each order's company resolution
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

  // Find all TrendyolOrders that don't have a linked Order
  // Include the TrendyolStore for company resolution
  const unlinkedOrders = await prisma.trendyolOrder.findMany({
    where: {
      orderId: null,
    },
    include: {
      lineItems: true,
      trendyolStore: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  console.log(`[Trendyol Sync] Found ${unlinkedOrders.length} unlinked Trendyol orders`);

  for (const trendyolOrder of unlinkedOrders) {
    try {
      // Skip orders without a TrendyolStore (shouldn't happen but be safe)
      if (!trendyolOrder.trendyolStore) {
        result.errors.push(
          `Order ${trendyolOrder.trendyolOrderNumber}: No TrendyolStore linked`
        );
        continue;
      }

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
        // Create new Order using TrendyolStore for company resolution
        const trendyolStore = trendyolOrder.trendyolStore;
        await syncTrendyolOrderToMainOrder(
          trendyolOrder as TrendyolOrderWithItems,
          {
            id: trendyolStore.id,
            name: trendyolStore.name,
            supplierId: trendyolStore.supplierId,
            companyId: trendyolStore.companyId,
            storeFrontCode: trendyolStore.storeFrontCode,
            company: trendyolStore.company,
          }
        );
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
