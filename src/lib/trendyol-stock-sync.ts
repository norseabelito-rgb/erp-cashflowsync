/**
 * Trendyol Stock & Price Sync Service
 *
 * Syncs stock levels and prices from ERP to Trendyol for all products
 * with an approved trendyolBarcode.
 */

import { TrendyolClient } from "./trendyol";
import prisma from "./db";

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

/**
 * Syncs stock and prices for all products with trendyolBarcode to Trendyol
 */
export async function syncAllProductsToTrendyol(): Promise<SyncResult> {
  console.log("[Trendyol Sync] Starting full stock & price sync...");

  // 1. Get settings
  const settings = await prisma.settings.findFirst();
  if (!settings?.trendyolApiKey || !settings?.trendyolApiSecret || !settings?.trendyolSupplierId) {
    console.log("[Trendyol Sync] API credentials not configured");
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ["Trendyol API credentials not configured"]
    };
  }

  // 2. Get all products with trendyolBarcode that are approved
  const products = await prisma.masterProduct.findMany({
    where: {
      trendyolBarcode: { not: null },
      trendyolStatus: "approved" // Only sync approved products
    },
    include: {
      inventoryItem: true // For stock calculation from linked InventoryItem
    }
  });

  console.log(`[Trendyol Sync] Found ${products.length} approved products to sync`);

  if (products.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // 3. Build sync items
  const currencyRate = settings.trendyolCurrencyRate
    ? parseFloat(settings.trendyolCurrencyRate.toString())
    : 5.0; // Default RON to EUR rate

  console.log(`[Trendyol Sync] Using currency rate: ${currencyRate} RON/EUR`);

  const items: StockSyncItem[] = products.map(product => {
    // Get stock from linked InventoryItem if available
    const inventoryStock = product.inventoryItem
      ? Number(product.inventoryItem.currentStock)
      : 0;

    // Fall back to MasterProduct.stock if no inventory item linked
    const finalStock = inventoryStock > 0 ? inventoryStock : Math.max(0, product.stock);

    // Convert prices from RON to EUR
    const priceRon = parseFloat(product.price?.toString() || "0");
    const priceEur = priceRon / currencyRate;

    return {
      barcode: product.trendyolBarcode!,
      quantity: Math.max(0, finalStock), // Ensure non-negative
      salePrice: Math.round(priceEur * 100) / 100, // Round to 2 decimals
      listPrice: Math.round(priceEur * 100) / 100  // Same for now
    };
  });

  // 4. Send to Trendyol in batches (max 100 per request)
  const client = new TrendyolClient({
    supplierId: settings.trendyolSupplierId,
    apiKey: settings.trendyolApiKey,
    apiSecret: settings.trendyolApiSecret,
    isTestMode: settings.trendyolIsTestMode ?? false
  });

  const BATCH_SIZE = 100;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  let lastBatchId: string | undefined;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    console.log(`[Trendyol Sync] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

    try {
      const result = await client.updatePriceAndInventory(batch);

      if (result.success) {
        synced += batch.length;
        lastBatchId = result.batchRequestId;
        console.log(`[Trendyol Sync] Batch ${batchNumber} succeeded, batchRequestId: ${result.batchRequestId}`);
      } else {
        failed += batch.length;
        const errorMsg = `Batch ${batchNumber}: ${result.error}`;
        errors.push(errorMsg);
        console.error(`[Trendyol Sync] Batch ${batchNumber} failed:`, result.error);
      }
    } catch (error) {
      failed += batch.length;
      const errorMsg = `Batch ${batchNumber}: ${error instanceof Error ? error.message : "Unknown error"}`;
      errors.push(errorMsg);
      console.error(`[Trendyol Sync] Batch ${batchNumber} exception:`, error);
    }
  }

  // 5. Update last synced timestamp for successfully synced products
  if (synced > 0) {
    const syncedBarcodes = items.slice(0, synced).map(i => i.barcode);
    await prisma.masterProduct.updateMany({
      where: {
        trendyolBarcode: { in: syncedBarcodes }
      },
      data: {
        trendyolLastSyncedAt: new Date()
      }
    });
    console.log(`[Trendyol Sync] Updated trendyolLastSyncedAt for ${synced} products`);
  }

  console.log(`[Trendyol Sync] Complete. Synced: ${synced}, Failed: ${failed}`);

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
    batchRequestId: lastBatchId
  };
}

/**
 * Syncs a single product to Trendyol by product ID
 */
export async function syncSingleProductToTrendyol(
  productId: string
): Promise<SyncResult> {
  console.log(`[Trendyol Sync] Syncing single product: ${productId}`);

  const product = await prisma.masterProduct.findUnique({
    where: { id: productId },
    include: { inventoryItem: true }
  });

  if (!product?.trendyolBarcode || product.trendyolStatus !== "approved") {
    console.log(`[Trendyol Sync] Product ${productId} not found or not approved on Trendyol`);
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ["Product not found or not approved on Trendyol"]
    };
  }

  // Get settings
  const settings = await prisma.settings.findFirst();
  if (!settings?.trendyolApiKey || !settings?.trendyolApiSecret || !settings?.trendyolSupplierId) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ["Trendyol API credentials not configured"]
    };
  }

  // Calculate stock from linked InventoryItem
  const inventoryStock = product.inventoryItem
    ? Number(product.inventoryItem.currentStock)
    : 0;
  const finalStock = inventoryStock > 0 ? inventoryStock : Math.max(0, product.stock);

  // Convert price
  const currencyRate = settings.trendyolCurrencyRate
    ? parseFloat(settings.trendyolCurrencyRate.toString())
    : 5.0;
  const priceRon = parseFloat(product.price?.toString() || "0");
  const priceEur = priceRon / currencyRate;

  // Build sync item
  const item: StockSyncItem = {
    barcode: product.trendyolBarcode,
    quantity: Math.max(0, finalStock),
    salePrice: Math.round(priceEur * 100) / 100,
    listPrice: Math.round(priceEur * 100) / 100
  };

  // Send to Trendyol
  const client = new TrendyolClient({
    supplierId: settings.trendyolSupplierId,
    apiKey: settings.trendyolApiKey,
    apiSecret: settings.trendyolApiSecret,
    isTestMode: settings.trendyolIsTestMode ?? false
  });

  try {
    const result = await client.updatePriceAndInventory([item]);

    if (result.success) {
      // Update last synced timestamp
      await prisma.masterProduct.update({
        where: { id: productId },
        data: { trendyolLastSyncedAt: new Date() }
      });

      console.log(`[Trendyol Sync] Product ${productId} synced successfully`);
      return {
        success: true,
        synced: 1,
        failed: 0,
        errors: [],
        batchRequestId: result.batchRequestId
      };
    } else {
      console.error(`[Trendyol Sync] Product ${productId} sync failed:`, result.error);
      return {
        success: false,
        synced: 0,
        failed: 1,
        errors: [result.error || "Unknown error"]
      };
    }
  } catch (error) {
    console.error(`[Trendyol Sync] Product ${productId} sync exception:`, error);
    return {
      success: false,
      synced: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
