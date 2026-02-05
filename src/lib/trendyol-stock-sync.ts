/**
 * Trendyol Stock & Price Sync Service
 *
 * Syncs stock levels and prices from ERP to Trendyol for all products
 * with an approved trendyolBarcode.
 *
 * Supports multiple TrendyolStores per company.
 *
 * IMPORTANT: Stock Source of Truth
 * ================================
 * This service uses InventoryItem.currentStock as the primary source for stock levels.
 * DO NOT use Product.stockQuantity - it is deprecated and will be removed.
 * DO NOT use MasterProduct.stock for new code - it's only used as a legacy fallback.
 *
 * After Phase 7.8 Stock Unification, all stock changes (from NIR, transfers, adjustments)
 * flow through InventoryItem.currentStock via the transfer-stock API.
 *
 * @see Phase 7.8 Stock Unification
 * @see .planning/phases/07.8-stock-unification/
 * @verified 2026-02-06 - Uses InventoryItem.currentStock correctly
 */

import { TrendyolClient, createTrendyolClientFromStore } from "./trendyol";
import prisma from "./db";
import { TrendyolStore } from "@prisma/client";

interface StockSyncItem {
  barcode: string;
  quantity: number;
  salePrice: number;
  listPrice: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  batchRequestId?: string;
}

export interface MultiStoreSyncResult {
  success: boolean;
  totalSynced: number;
  totalFailed: number;
  storeResults: {
    storeId: string;
    storeName: string;
    result: SyncResult;
  }[];
}

/**
 * Syncs stock and prices to ALL active TrendyolStores
 * Used by cron job
 */
export async function syncAllProductsToAllStores(): Promise<MultiStoreSyncResult> {
  console.log("[Trendyol Sync] Starting multi-store stock & price sync...");

  const stores = await prisma.trendyolStore.findMany({
    where: { isActive: true },
  });

  if (stores.length === 0) {
    console.log("[Trendyol Sync] No active Trendyol stores configured");
    return {
      success: true,
      totalSynced: 0,
      totalFailed: 0,
      storeResults: [],
    };
  }

  console.log(`[Trendyol Sync] Found ${stores.length} active stores`);

  const storeResults: MultiStoreSyncResult["storeResults"] = [];
  let totalSynced = 0;
  let totalFailed = 0;

  for (const store of stores) {
    console.log(`[Trendyol Sync] Processing store: ${store.name}`);
    const result = await syncAllProductsToTrendyolStore(store);
    storeResults.push({
      storeId: store.id,
      storeName: store.name,
      result,
    });
    totalSynced += result.synced;
    totalFailed += result.failed;
  }

  console.log(`[Trendyol Sync] Multi-store sync complete. Total synced: ${totalSynced}, Total failed: ${totalFailed}`);

  return {
    success: totalFailed === 0,
    totalSynced,
    totalFailed,
    storeResults,
  };
}

/**
 * Syncs stock and prices for all products to a specific TrendyolStore
 */
export async function syncAllProductsToTrendyolStore(
  store: TrendyolStore
): Promise<SyncResult> {
  console.log(`[Trendyol Sync] Starting sync for store: ${store.name}`);

  // Get all products with trendyolBarcode that are approved
  const products = await prisma.masterProduct.findMany({
    where: {
      trendyolBarcode: { not: null },
      trendyolStatus: "approved",
    },
    include: {
      inventoryItem: true,
    },
  });

  console.log(`[Trendyol Sync] Found ${products.length} approved products to sync`);

  if (products.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // Build sync items with currency conversion
  const currencyRate = store.currencyRate
    ? parseFloat(store.currencyRate.toString())
    : 5.0; // Default RON to EUR rate

  console.log(`[Trendyol Sync] Using currency rate: ${currencyRate}`);

  const items: StockSyncItem[] = products.map((product) => {
    // PRIMARY: Get stock from linked InventoryItem (source of truth after Phase 7.8)
    const inventoryStock = product.inventoryItem
      ? Number(product.inventoryItem.currentStock)
      : 0;

    // DEPRECATED FALLBACK: MasterProduct.stock is legacy - remove after all products have InventoryItem
    // TODO: After migration complete, remove this fallback and require InventoryItem for all synced products
    let finalStock = inventoryStock;
    if (inventoryStock === 0 && product.stock > 0) {
      console.warn(
        `[Trendyol Sync] DEPRECATED: Product ${product.sku || product.id} has no InventoryItem stock, ` +
        `falling back to MasterProduct.stock (${product.stock}). Link InventoryItem to fix.`
      );
      finalStock = Math.max(0, product.stock);
    }

    // Convert prices from RON to target currency
    const priceRon = parseFloat(product.price?.toString() || "0");
    const priceConverted = priceRon / currencyRate;

    return {
      barcode: product.trendyolBarcode!,
      quantity: Math.max(0, finalStock),
      salePrice: Math.round(priceConverted * 100) / 100,
      listPrice: Math.round(priceConverted * 100) / 100,
    };
  });

  // Send to Trendyol in batches
  const client = createTrendyolClientFromStore(store);

  const BATCH_SIZE = 100;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  let lastBatchId: string | undefined;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    console.log(`[Trendyol Sync] [${store.name}] Processing batch ${batchNumber}/${totalBatches}`);

    try {
      const result = await client.updatePriceAndInventory(batch);

      if (result.success) {
        synced += batch.length;
        lastBatchId = result.batchRequestId;
      } else {
        failed += batch.length;
        errors.push(`Batch ${batchNumber}: ${result.error}`);
        console.error(`[Trendyol Sync] [${store.name}] Batch ${batchNumber} failed:`, result.error);
      }
    } catch (error) {
      failed += batch.length;
      const errorMsg = `Batch ${batchNumber}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMsg);
      console.error(`[Trendyol Sync] [${store.name}] Batch ${batchNumber} exception:`, error);
    }
  }

  // Update last synced timestamp for successfully synced products
  if (synced > 0) {
    const syncedBarcodes = items.slice(0, synced).map((i) => i.barcode);
    await prisma.masterProduct.updateMany({
      where: {
        trendyolBarcode: { in: syncedBarcodes },
      },
      data: {
        trendyolLastSyncedAt: new Date(),
      },
    });
  }

  console.log(`[Trendyol Sync] [${store.name}] Complete. Synced: ${synced}, Failed: ${failed}`);

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
    batchRequestId: lastBatchId,
  };
}

/**
 * Legacy function - syncs to all stores
 * @deprecated Use syncAllProductsToAllStores instead
 */
export async function syncAllProductsToTrendyol(): Promise<SyncResult> {
  const result = await syncAllProductsToAllStores();
  return {
    success: result.success,
    synced: result.totalSynced,
    failed: result.totalFailed,
    errors: result.storeResults.flatMap((sr) => sr.result.errors),
  };
}

/**
 * Syncs a single product to a specific TrendyolStore
 */
export async function syncSingleProductToTrendyolStore(
  productId: string,
  store: TrendyolStore
): Promise<SyncResult> {
  console.log(`[Trendyol Sync] Syncing product ${productId} to store ${store.name}`);

  const product = await prisma.masterProduct.findUnique({
    where: { id: productId },
    include: { inventoryItem: true },
  });

  if (!product?.trendyolBarcode || product.trendyolStatus !== "approved") {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ["Product not found or not approved on Trendyol"],
    };
  }

  // PRIMARY: Get stock from linked InventoryItem (source of truth after Phase 7.8)
  const inventoryStock = product.inventoryItem
    ? Number(product.inventoryItem.currentStock)
    : 0;

  // DEPRECATED FALLBACK: MasterProduct.stock is legacy - remove after all products have InventoryItem
  let finalStock = inventoryStock;
  if (inventoryStock === 0 && product.stock > 0) {
    console.warn(
      `[Trendyol Sync] DEPRECATED: Product ${product.sku || productId} has no InventoryItem stock, ` +
      `falling back to MasterProduct.stock (${product.stock}). Link InventoryItem to fix.`
    );
    finalStock = Math.max(0, product.stock);
  }

  // Convert price
  const currencyRate = store.currencyRate
    ? parseFloat(store.currencyRate.toString())
    : 5.0;
  const priceRon = parseFloat(product.price?.toString() || "0");
  const priceConverted = priceRon / currencyRate;

  const item: StockSyncItem = {
    barcode: product.trendyolBarcode,
    quantity: Math.max(0, finalStock),
    salePrice: Math.round(priceConverted * 100) / 100,
    listPrice: Math.round(priceConverted * 100) / 100,
  };

  const client = createTrendyolClientFromStore(store);

  try {
    const result = await client.updatePriceAndInventory([item]);

    if (result.success) {
      await prisma.masterProduct.update({
        where: { id: productId },
        data: { trendyolLastSyncedAt: new Date() },
      });

      return {
        success: true,
        synced: 1,
        failed: 0,
        errors: [],
        batchRequestId: result.batchRequestId,
      };
    } else {
      return {
        success: false,
        synced: 0,
        failed: 1,
        errors: [result.error || "Unknown error"],
      };
    }
  } catch (error) {
    return {
      success: false,
      synced: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Syncs a single product to ALL active TrendyolStores
 */
export async function syncSingleProductToAllStores(
  productId: string
): Promise<MultiStoreSyncResult> {
  const stores = await prisma.trendyolStore.findMany({
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

  const storeResults: MultiStoreSyncResult["storeResults"] = [];
  let totalSynced = 0;
  let totalFailed = 0;

  for (const store of stores) {
    const result = await syncSingleProductToTrendyolStore(productId, store);
    storeResults.push({
      storeId: store.id,
      storeName: store.name,
      result,
    });
    totalSynced += result.synced;
    totalFailed += result.failed;
  }

  return {
    success: totalFailed === 0,
    totalSynced,
    totalFailed,
    storeResults,
  };
}

/**
 * Legacy function - syncs to first active store
 * @deprecated Use syncSingleProductToAllStores instead
 */
export async function syncSingleProductToTrendyol(
  productId: string
): Promise<SyncResult> {
  const result = await syncSingleProductToAllStores(productId);
  return {
    success: result.success,
    synced: result.totalSynced,
    failed: result.totalFailed,
    errors: result.storeResults.flatMap((sr) => sr.result.errors),
  };
}
