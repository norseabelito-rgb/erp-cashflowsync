/**
 * Temu Order Sync Service
 *
 * Syncs TemuOrder records to the main Order table for unified
 * invoice/AWB workflow. Called from:
 * - Webhook handler (real-time)
 * - Manual import/sync actions
 *
 * NOTE: Uses TemuStore.companyId for multi-company support.
 */

import prisma from "@/lib/db";
import { Order, TemuOrder, Store, Prisma } from "@prisma/client";
import { mapTemuToInternalStatus } from "@/lib/temu-status";

// Type for TemuStore data needed for sync
export type TemuStoreForSync = {
  id: string;
  name: string;
  appKey: string;
  companyId: string;
  region: string;
  company: { id: string; name: string } | null;
};

// Type for TemuOrder with line items included
type TemuOrderWithItems = TemuOrder & {
  lineItems: Array<{
    id: string;
    temuOrderId: string;
    goodsId: string;
    skuId: string;
    title: string;
    quantity: number;
    price: Prisma.Decimal;
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
 * Convert currency code - Temu uses EUR typically
 * For now, we store the original currency
 */
function convertCurrency(temuCurrency: string): string {
  return temuCurrency || "EUR";
}

/**
 * Parse Temu shipping address from text to structured format
 * Temu address is stored as a single text field
 */
function parseTemuAddress(addressText: string): {
  address1: string;
  city: string;
  province: string;
  zip: string;
  country: string;
} {
  // Default parsing - address is typically a single text field
  // Format varies but usually: "Street, City, Province/State PostalCode, Country"
  const parts = addressText.split(",").map((p) => p.trim());

  if (parts.length >= 4) {
    return {
      address1: parts[0],
      city: parts[1],
      province: parts[2],
      zip: "", // May be embedded in province
      country: parts[3] || "RO",
    };
  } else if (parts.length >= 2) {
    return {
      address1: parts[0],
      city: parts[1],
      province: parts[2] || "",
      zip: "",
      country: parts[3] || "RO",
    };
  }

  return {
    address1: addressText,
    city: "",
    province: "",
    zip: "",
    country: "RO",
  };
}

/**
 * Find or create a virtual store for Temu orders
 * Uses TemuStore data for multi-company support
 */
export async function findOrCreateTemuVirtualStore(
  temuStore: TemuStoreForSync
): Promise<Store> {
  const shopifyDomain = `temu-${temuStore.appKey}`;

  // Try to find existing Temu store by domain pattern
  let store = await prisma.store.findFirst({
    where: {
      shopifyDomain: shopifyDomain,
    },
  });

  if (!store) {
    // Create virtual store for Temu
    store = await prisma.store.create({
      data: {
        name: temuStore.name,
        shopifyDomain: shopifyDomain,
        accessToken: "", // Not used for Temu
        isActive: true,
        companyId: temuStore.companyId,
      },
    });

    console.log(
      `[Temu Sync] Created virtual store: ${temuStore.name} (ID: ${store.id})`
    );
  } else if (store.companyId !== temuStore.companyId) {
    // Update company if changed
    store = await prisma.store.update({
      where: { id: store.id },
      data: { companyId: temuStore.companyId },
    });
    console.log(
      `[Temu Sync] Updated virtual store company: ${store.id} -> ${temuStore.companyId}`
    );
  }

  return store;
}

/**
 * Create LineItems from TemuOrder line items
 */
async function createLineItemsFromTemu(
  orderId: string,
  temuItems: TemuOrderWithItems["lineItems"]
): Promise<void> {
  const lineItemsData = temuItems.map((item, index) => ({
    orderId,
    shopifyLineItemId: `temu-${item.goodsId}-${item.skuId}-${index}`,
    title: item.title,
    variantTitle: null, // Temu doesn't provide variant info in the same way
    sku: item.localSku || item.skuId,
    quantity: item.quantity,
    price: item.price,
    barcode: item.skuId,
    masterProductId: item.masterProductId,
  }));

  await prisma.lineItem.createMany({
    data: lineItemsData,
  });
}

/**
 * Update an existing Order from TemuOrder data
 * Only updates status and relevant fields, preserves local modifications
 */
async function updateOrderFromTemu(
  existingOrder: Order,
  temuOrder: TemuOrderWithItems
): Promise<Order> {
  const newStatus = mapTemuToInternalStatus(temuOrder.status);

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
 * Syncs a TemuOrder to the main Order table
 *
 * @param temuOrder - The TemuOrder record with line items
 * @param temuStore - TemuStore data for company resolution
 * @returns The created or updated Order record
 */
export async function syncTemuOrderToMainOrder(
  temuOrder: TemuOrderWithItems,
  temuStore: TemuStoreForSync
): Promise<Order> {
  // 1. Find or create Store for Temu (virtual store)
  const store = await findOrCreateTemuVirtualStore(temuStore);

  // 2. Check if Order already exists for this Temu order
  const existingOrder = await prisma.order.findFirst({
    where: {
      shopifyOrderId: temuOrder.temuOrderId,
      source: "temu",
    },
  });

  if (existingOrder) {
    // Update status only
    const updatedOrder = await updateOrderFromTemu(existingOrder, temuOrder);

    // Ensure TemuOrder is linked and has temuStoreId set
    if (!temuOrder.orderId || !temuOrder.temuStoreId) {
      await prisma.temuOrder.update({
        where: { id: temuOrder.id },
        data: {
          orderId: updatedOrder.id,
          temuStoreId: temuStore.id,
        },
      });
    }

    return updatedOrder;
  }

  // 3. Parse shipping address
  const parsedAddress = parseTemuAddress(temuOrder.customerAddress);

  // 4. Create new Order - use TemuStore.companyId for billing
  const order = await prisma.order.create({
    data: {
      shopifyOrderId: temuOrder.temuOrderId,
      shopifyOrderNumber: temuOrder.temuOrderNumber,
      source: "temu",
      storeId: store.id,
      billingCompanyId: temuStore.companyId,

      // Customer data
      customerEmail: temuOrder.customerEmail,
      customerPhone: temuOrder.customerPhone,
      customerFirstName: extractFirstName(temuOrder.customerName),
      customerLastName: extractLastName(temuOrder.customerName),

      // Shipping address
      shippingAddress1: parsedAddress.address1,
      shippingCity: parsedAddress.city,
      shippingProvince: parsedAddress.province,
      shippingZip: parsedAddress.zip,
      shippingCountry: parsedAddress.country,

      // Financial
      totalPrice: temuOrder.totalPrice,
      subtotalPrice: temuOrder.totalPrice, // Temu total includes everything
      totalShipping: 0, // Temu handles shipping separately
      totalTax: 0, // Calculate if needed from items
      currency: convertCurrency(temuOrder.currency),

      // Status mapping
      status: mapTemuToInternalStatus(temuOrder.status) as any,
      financialStatus: "paid", // Temu orders are prepaid by customers

      // Timestamps
      shopifyCreatedAt: temuOrder.orderDate,
      shopifyUpdatedAt: temuOrder.orderDate,

      // Store raw data for reference
      rawData: {
        temu: {
          temuOrderId: temuOrder.temuOrderId,
          temuOrderNumber: temuOrder.temuOrderNumber,
          temuStoreId: temuStore.id,
          temuStoreName: temuStore.name,
        },
      },

      // Validations - default to passed for Temu (Temu validates)
      phoneValidation: "PASSED",
      addressValidation: "PASSED",
    },
  });

  // 5. Create LineItems
  if (temuOrder.lineItems && temuOrder.lineItems.length > 0) {
    await createLineItemsFromTemu(order.id, temuOrder.lineItems);
  }

  // 6. Link TemuOrder to Order and TemuStore
  await prisma.temuOrder.update({
    where: { id: temuOrder.id },
    data: {
      orderId: order.id,
      temuStoreId: temuStore.id,
    },
  });

  console.log(
    `[Temu Sync] Created Order ${order.id} for Temu order ${temuOrder.temuOrderNumber} (Store: ${temuStore.name}, Company: ${temuStore.companyId})`
  );

  return order;
}

/**
 * Sync Temu orders for a specific store
 * Fetches orders from Temu API and syncs them to the main Order table
 *
 * @param temuStore - TemuStore record with company info
 * @param options - Sync options (date range, etc.)
 * @returns Stats about the sync operation
 */
export async function syncTemuOrdersForStore(
  temuStore: TemuStoreForSync & {
    appSecret: string;
    accessToken: string;
  },
  options?: {
    startTime?: Date;
    endTime?: Date;
    pageSize?: number;
  }
): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = { synced: 0, created: 0, updated: 0, errors: [] as string[] };

  try {
    // Dynamic import to avoid circular dependencies
    const { createTemuClientFromStore } = await import("@/lib/temu");
    const client = createTemuClientFromStore({
      appKey: temuStore.appKey,
      appSecret: temuStore.appSecret,
      accessToken: temuStore.accessToken,
      region: temuStore.region,
    });

    // Fetch orders from Temu API
    const ordersResponse = await client.getOrders({
      pageSize: options?.pageSize || 50,
      startTime: options?.startTime?.getTime(),
      endTime: options?.endTime?.getTime(),
    });

    if (!ordersResponse.success || !ordersResponse.data?.orders) {
      result.errors.push(
        `Failed to fetch orders from Temu: ${ordersResponse.error || "Unknown error"}`
      );
      return result;
    }

    const orders = ordersResponse.data.orders;
    console.log(`[Temu Sync] Found ${orders.length} orders from Temu API`);

    // Process each order
    for (const temuOrderData of orders) {
      try {
        // 1. Upsert TemuOrder record
        const existingTemuOrder = await prisma.temuOrder.findUnique({
          where: { temuOrderId: temuOrderData.orderId },
          include: { lineItems: true },
        });

        let temuOrder: TemuOrderWithItems;

        if (existingTemuOrder) {
          // Update existing TemuOrder
          temuOrder = (await prisma.temuOrder.update({
            where: { id: existingTemuOrder.id },
            data: {
              status: temuOrderData.status,
              temuStoreId: temuStore.id,
            },
            include: { lineItems: true },
          })) as TemuOrderWithItems;
        } else {
          // Create new TemuOrder
          temuOrder = (await prisma.temuOrder.create({
            data: {
              temuOrderId: temuOrderData.orderId,
              temuOrderNumber: temuOrderData.orderNumber,
              orderDate: new Date(temuOrderData.orderDate),
              status: temuOrderData.status,
              customerName: temuOrderData.customerName,
              customerEmail: temuOrderData.customerEmail || null,
              customerPhone: temuOrderData.customerPhone || null,
              customerAddress: [
                temuOrderData.shippingAddress.address,
                temuOrderData.shippingAddress.city,
                temuOrderData.shippingAddress.province,
                temuOrderData.shippingAddress.postalCode,
                temuOrderData.shippingAddress.country,
              ]
                .filter(Boolean)
                .join(", "),
              totalPrice: temuOrderData.totalPrice,
              currency: temuOrderData.currency,
              temuStoreId: temuStore.id,
              lineItems: {
                create: temuOrderData.lines.map((line) => ({
                  goodsId: line.goodsId,
                  skuId: line.skuId,
                  title: line.title,
                  quantity: line.quantity,
                  price: line.price,
                  isMapped: false,
                })),
              },
            },
            include: { lineItems: true },
          })) as TemuOrderWithItems;
        }

        // 2. Sync to main Order table
        const existingOrder = await prisma.order.findFirst({
          where: {
            shopifyOrderId: temuOrderData.orderId,
            source: "temu",
          },
        });

        if (existingOrder) {
          await updateOrderFromTemu(existingOrder, temuOrder);
          result.updated++;
        } else {
          await syncTemuOrderToMainOrder(temuOrder, temuStore);
          result.created++;
        }
        result.synced++;
      } catch (error: any) {
        result.errors.push(
          `Order ${temuOrderData.orderNumber}: ${error.message}`
        );
      }
    }

    console.log(
      `[Temu Sync] Completed for ${temuStore.name}: ${result.synced} synced (${result.created} created, ${result.updated} updated), ${result.errors.length} errors`
    );
  } catch (error: any) {
    result.errors.push(`Sync failed: ${error.message}`);
    console.error(`[Temu Sync] Error for ${temuStore.name}:`, error);
  }

  return result;
}

/**
 * Sync all unlinked TemuOrders to main Order table
 * Uses TemuStore for each order's company resolution
 *
 * @returns Stats about the sync operation
 */
export async function syncAllTemuOrdersToMain(): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = { synced: 0, created: 0, updated: 0, errors: [] as string[] };

  // Find all TemuOrders that don't have a linked Order
  // Include the TemuStore for company resolution
  const unlinkedOrders = await prisma.temuOrder.findMany({
    where: {
      orderId: null,
    },
    include: {
      lineItems: true,
      temuStore: {
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

  console.log(`[Temu Sync] Found ${unlinkedOrders.length} unlinked Temu orders`);

  for (const temuOrder of unlinkedOrders) {
    try {
      // Skip orders without a TemuStore (shouldn't happen but be safe)
      if (!temuOrder.temuStore) {
        result.errors.push(
          `Order ${temuOrder.temuOrderNumber}: No TemuStore linked`
        );
        continue;
      }

      // Check if Order already exists but not linked
      const existingOrder = await prisma.order.findFirst({
        where: {
          shopifyOrderId: temuOrder.temuOrderId,
          source: "temu",
        },
      });

      if (existingOrder) {
        // Link existing Order
        await prisma.temuOrder.update({
          where: { id: temuOrder.id },
          data: { orderId: existingOrder.id },
        });
        result.updated++;
      } else {
        // Create new Order using TemuStore for company resolution
        const temuStore = temuOrder.temuStore;
        await syncTemuOrderToMainOrder(temuOrder as TemuOrderWithItems, {
          id: temuStore.id,
          name: temuStore.name,
          appKey: temuStore.appKey,
          companyId: temuStore.companyId,
          region: temuStore.region,
          company: temuStore.company,
        });
        result.created++;
      }
      result.synced++;
    } catch (error: any) {
      result.errors.push(
        `Order ${temuOrder.temuOrderNumber}: ${error.message}`
      );
    }
  }

  console.log(
    `[Temu Sync] Completed: ${result.synced} synced (${result.created} created, ${result.updated} updated), ${result.errors.length} errors`
  );

  return result;
}

/**
 * Update Order status from Temu status change
 */
export async function updateOrderStatusFromTemu(
  temuOrderId: string,
  newTemuStatus: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find TemuOrder and linked Order
    const temuOrder = await prisma.temuOrder.findUnique({
      where: { temuOrderId },
      include: { order: true },
    });

    if (!temuOrder) {
      return { success: false, message: "Temu order not found" };
    }

    // Update TemuOrder status
    await prisma.temuOrder.update({
      where: { id: temuOrder.id },
      data: {
        status: newTemuStatus,
        updatedAt: new Date(),
      },
    });

    // Update linked Order if exists
    if (temuOrder.order) {
      const newOrderStatus = mapTemuToInternalStatus(newTemuStatus);
      await prisma.order.update({
        where: { id: temuOrder.order.id },
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
      message: "Updated Temu order status (no linked Order)",
    };
  } catch (error: any) {
    console.error("[Temu Sync] Error updating status:", error);
    return { success: false, message: error.message };
  }
}
