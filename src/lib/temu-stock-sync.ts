/**
 * Temu Stock Sync Service
 *
 * Syncs stock levels from ERP to Temu for all mapped products.
 * Uses TemuStore for multi-store support.
 *
 * IMPORTANT: Stock Source of Truth
 * ================================
 * This service uses InventoryItem.currentStock as the ONLY source for stock levels.
 * DO NOT use Product.stockQuantity - it is deprecated and will be removed.
 * DO NOT use MasterProduct.stock - it is a legacy field.
 *
 * After Phase 7.8 Stock Unification, all stock changes (from NIR, transfers, adjustments)
 * flow through InventoryItem.currentStock via the transfer-stock API.
 *
 * @see Phase 7.8 Stock Unification
 * @see .planning/phases/07.8-stock-unification/
 * @verified 2026-02-06 - Uses InventoryItem.currentStock correctly
 */

import { createTemuClientFromStore } from "./temu";
import prisma from "./db";
import { TemuStore } from "@prisma/client";

export interface TemuStockSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface TemuMultiStoreSyncResult {
  success: boolean;
  totalSynced: number;
  totalFailed: number;
  storeResults: {
    storeId: string;
    storeName: string;
    result: TemuStockSyncResult;
  }[];
}

/**
 * Get stock for a product from InventoryItem
 *
 * Uses InventoryItem.currentStock as the source of truth.
 * Returns 0 if no InventoryItem is linked (with warning).
 */
function getStockFromInventoryItem(
  inventoryItem: { currentStock: number | bigint | null } | null,
  productSku: string
): number {
  if (!inventoryItem) {
    console.warn(
      `[Temu Stock Sync] Product ${productSku} has no linked InventoryItem - using stock 0`
    );
    return 0;
  }

  return Math.max(0, Number(inventoryItem.currentStock || 0));
}

/**
 * Syncs stock to ALL active TemuStores
 * Used by cron job or manual sync
 */
export async function syncStockToAllTemuStores(): Promise<TemuMultiStoreSyncResult> {
  console.log("[Temu Stock Sync] Starting multi-store stock sync...");

  const stores = await prisma.temuStore.findMany({
    where: { isActive: true },
  });

  if (stores.length === 0) {
    console.log("[Temu Stock Sync] No active Temu stores configured");
    return {
      success: true,
      totalSynced: 0,
      totalFailed: 0,
      storeResults: [],
    };
  }

  console.log(`[Temu Stock Sync] Found ${stores.length} active stores`);

  const storeResults: TemuMultiStoreSyncResult["storeResults"] = [];
  let totalSynced = 0;
  let totalFailed = 0;

  for (const store of stores) {
    console.log(`[Temu Stock Sync] Processing store: ${store.name}`);
    const result = await syncStockToTemuStore(store);
    storeResults.push({
      storeId: store.id,
      storeName: store.name,
      result,
    });
    totalSynced += result.synced;
    totalFailed += result.failed;
  }

  console.log(
    `[Temu Stock Sync] Multi-store sync complete. Total synced: ${totalSynced}, Total failed: ${totalFailed}`
  );

  return {
    success: totalFailed === 0,
    totalSynced,
    totalFailed,
    storeResults,
  };
}

/**
 * Syncs stock for all mapped products to a specific TemuStore
 *
 * Queries products that have a temuSkuId mapping and syncs their
 * InventoryItem.currentStock to Temu.
 */
export async function syncStockToTemuStore(
  store: TemuStore
): Promise<TemuStockSyncResult> {
  console.log(`[Temu Stock Sync] Starting sync for store: ${store.name}`);

  // Get all MasterProducts that have a Temu SKU mapping
  // This assumes TemuOrderLineItem.masterProductId links products
  // that are available on Temu
  const mappedProducts = await prisma.masterProduct.findMany({
    where: {
      // Products linked to Temu order line items are considered "on Temu"
      temuOrderLineItems: {
        some: {
          temuOrder: {
            temuStoreId: store.id,
          },
        },
      },
    },
    include: {
      inventoryItem: {
        select: {
          currentStock: true,
        },
      },
      temuOrderLineItems: {
        where: {
          temuOrder: {
            temuStoreId: store.id,
          },
        },
        select: {
          skuId: true,
        },
        take: 1,
      },
    },
  });

  console.log(
    `[Temu Stock Sync] Found ${mappedProducts.length} mapped products for store ${store.name}`
  );

  if (mappedProducts.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // Build stock update items
  // Group by skuId to avoid duplicates
  const skuStockMap = new Map<string, number>();

  for (const product of mappedProducts) {
    const temuSkuId = product.temuOrderLineItems[0]?.skuId;
    if (!temuSkuId) continue;

    // Get stock from InventoryItem (source of truth)
    const stock = getStockFromInventoryItem(
      product.inventoryItem,
      product.sku || product.id
    );

    // Keep the highest stock if multiple products map to same Temu SKU
    if (!skuStockMap.has(temuSkuId) || skuStockMap.get(temuSkuId)! < stock) {
      skuStockMap.set(temuSkuId, stock);
    }
  }

  const items = Array.from(skuStockMap.entries()).map(([skuId, quantity]) => ({
    skuId,
    quantity,
  }));

  console.log(
    `[Temu Stock Sync] Syncing ${items.length} unique SKUs to ${store.name}`
  );

  if (items.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // Send to Temu in batches
  const client = createTemuClientFromStore({
    appKey: store.appKey,
    appSecret: store.appSecret,
    accessToken: store.accessToken,
    region: store.region,
  });

  const BATCH_SIZE = 100;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    console.log(
      `[Temu Stock Sync] [${store.name}] Processing batch ${batchNumber}/${totalBatches}`
    );

    try {
      const result = await client.updateStock(batch);

      if (result.success) {
        synced += batch.length;
      } else {
        failed += batch.length;
        errors.push(`Batch ${batchNumber}: ${result.error}`);
        console.error(
          `[Temu Stock Sync] [${store.name}] Batch ${batchNumber} failed:`,
          result.error
        );
      }
    } catch (error) {
      failed += batch.length;
      const errorMsg = `Batch ${batchNumber}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      errors.push(errorMsg);
      console.error(
        `[Temu Stock Sync] [${store.name}] Batch ${batchNumber} exception:`,
        error
      );
    }
  }

  console.log(
    `[Temu Stock Sync] [${store.name}] Complete. Synced: ${synced}, Failed: ${failed}`
  );

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
  };
}

/**
 * Syncs stock for a single product to all active TemuStores
 */
export async function syncSingleProductStockToTemu(
  productId: string
): Promise<TemuMultiStoreSyncResult> {
  const stores = await prisma.temuStore.findMany({
    where: { isActive: true },
  });

  if (stores.length === 0) {
    return {
      success: true,
      totalSynced: 0,
      totalFailed: 0,
      storeResults: [],
    };
  }

  // Get product with InventoryItem
  const product = await prisma.masterProduct.findUnique({
    where: { id: productId },
    include: {
      inventoryItem: {
        select: {
          currentStock: true,
        },
      },
      temuOrderLineItems: {
        select: {
          skuId: true,
          temuOrder: {
            select: {
              temuStoreId: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return {
      success: false,
      totalSynced: 0,
      totalFailed: 0,
      storeResults: [
        {
          storeId: "all",
          storeName: "All Stores",
          result: {
            success: false,
            synced: 0,
            failed: 0,
            errors: ["Product not found"],
          },
        },
      ],
    };
  }

  // Get stock from InventoryItem (source of truth)
  const stock = getStockFromInventoryItem(
    product.inventoryItem,
    product.sku || productId
  );

  const storeResults: TemuMultiStoreSyncResult["storeResults"] = [];
  let totalSynced = 0;
  let totalFailed = 0;

  // Sync to each store where this product has been sold
  for (const store of stores) {
    // Find Temu SKU for this store
    const temuLineItem = product.temuOrderLineItems.find(
      (li) => li.temuOrder?.temuStoreId === store.id
    );

    if (!temuLineItem?.skuId) {
      storeResults.push({
        storeId: store.id,
        storeName: store.name,
        result: {
          success: true,
          synced: 0,
          failed: 0,
          errors: [],
        },
      });
      continue;
    }

    try {
      const client = createTemuClientFromStore({
        appKey: store.appKey,
        appSecret: store.appSecret,
        accessToken: store.accessToken,
        region: store.region,
      });

      const result = await client.updateStock([
        {
          skuId: temuLineItem.skuId,
          quantity: stock,
        },
      ]);

      if (result.success) {
        storeResults.push({
          storeId: store.id,
          storeName: store.name,
          result: {
            success: true,
            synced: 1,
            failed: 0,
            errors: [],
          },
        });
        totalSynced += 1;
      } else {
        storeResults.push({
          storeId: store.id,
          storeName: store.name,
          result: {
            success: false,
            synced: 0,
            failed: 1,
            errors: [result.error || "Unknown error"],
          },
        });
        totalFailed += 1;
      }
    } catch (error) {
      storeResults.push({
        storeId: store.id,
        storeName: store.name,
        result: {
          success: false,
          synced: 0,
          failed: 1,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        },
      });
      totalFailed += 1;
    }
  }

  return {
    success: totalFailed === 0,
    totalSynced,
    totalFailed,
    storeResults,
  };
}
