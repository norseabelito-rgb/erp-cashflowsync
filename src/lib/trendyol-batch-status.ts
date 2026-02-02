/**
 * Trendyol Batch Status Utilities
 *
 * Provides functions to check batch request status and parse error messages
 * for user-friendly display.
 */

import prisma from "./db";
import { TrendyolClient, createTrendyolClientFromStore } from "./trendyol";

// ============ TYPES ============

export interface BatchItem {
  barcode: string;
  status: "SUCCESS" | "FAILED" | "PROCESSING";
  failureReasons?: string[];
  productTitle?: string;
  sku?: string;
}

export interface BatchError {
  barcode: string;
  code?: string;
  message: string;
  field?: string;
  details?: string;
}

export interface BatchStatusResult {
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  totalItems: number;
  successCount: number;
  failedCount: number;
  items: BatchItem[];
  errors: BatchError[];
  rawResponse?: unknown;
}

// Common Trendyol error codes and their Romanian translations
const ERROR_TRANSLATIONS: Record<string, string> = {
  "BARCODE_ALREADY_EXISTS": "Codul de bare exista deja in sistem",
  "INVALID_CATEGORY": "Categoria selectata nu este valida",
  "INVALID_BRAND": "Brandul selectat nu este valid",
  "MISSING_REQUIRED_ATTRIBUTE": "Lipseste un atribut obligatoriu",
  "INVALID_ATTRIBUTE_VALUE": "Valoarea atributului nu este valida",
  "INVALID_IMAGE_URL": "URL-ul imaginii nu este valid sau nu poate fi accesat",
  "IMAGE_DOWNLOAD_FAILED": "Imaginea nu a putut fi descarcata",
  "IMAGE_SIZE_TOO_SMALL": "Imaginea este prea mica (minim 500x500 px)",
  "IMAGE_SIZE_TOO_LARGE": "Imaginea este prea mare (maxim 10MB)",
  "TITLE_TOO_LONG": "Titlul produsului este prea lung (max 100 caractere)",
  "DESCRIPTION_TOO_LONG": "Descrierea produsului este prea lunga",
  "INVALID_PRICE": "Pretul nu este valid",
  "PRICE_TOO_LOW": "Pretul este sub minimul permis",
  "INVALID_STOCK": "Cantitatea de stoc nu este valida",
  "INVALID_VAT_RATE": "Cota TVA nu este valida (0, 1, 8, 10, 18, 20)",
  "PRODUCT_MAIN_ID_EXISTS": "SKU-ul exista deja in contul Trendyol",
  "STOCK_CODE_EXISTS": "Codul de stoc exista deja",
  "INVALID_DIMENSION": "Dimensiunile produsului nu sunt valide",
  "INVALID_CARGO_COMPANY": "Firma de curierat nu este valida",
  "SELLER_NOT_ACTIVE": "Contul de vanzator nu este activ",
  "CATEGORY_NOT_ALLOWED": "Nu aveti permisiunea de a vinde in aceasta categorie",
  "BRAND_NOT_ALLOWED": "Nu aveti permisiunea de a vinde acest brand",
};

// ============ FUNCTIONS ============

/**
 * Translates a Trendyol error message to Romanian
 */
function translateError(errorCode: string | undefined, originalMessage: string): string {
  if (errorCode && ERROR_TRANSLATIONS[errorCode]) {
    return ERROR_TRANSLATIONS[errorCode];
  }

  // Try to find a matching translation by checking if the message contains known patterns
  const lowerMessage = originalMessage.toLowerCase();

  if (lowerMessage.includes("barcode") && lowerMessage.includes("exist")) {
    return ERROR_TRANSLATIONS["BARCODE_ALREADY_EXISTS"];
  }
  if (lowerMessage.includes("image") && (lowerMessage.includes("download") || lowerMessage.includes("url"))) {
    return ERROR_TRANSLATIONS["IMAGE_DOWNLOAD_FAILED"];
  }
  if (lowerMessage.includes("image") && lowerMessage.includes("size")) {
    return ERROR_TRANSLATIONS["IMAGE_SIZE_TOO_SMALL"];
  }
  if (lowerMessage.includes("category") && lowerMessage.includes("invalid")) {
    return ERROR_TRANSLATIONS["INVALID_CATEGORY"];
  }
  if (lowerMessage.includes("brand") && lowerMessage.includes("invalid")) {
    return ERROR_TRANSLATIONS["INVALID_BRAND"];
  }
  if (lowerMessage.includes("attribute") && lowerMessage.includes("required")) {
    return ERROR_TRANSLATIONS["MISSING_REQUIRED_ATTRIBUTE"];
  }
  if (lowerMessage.includes("productmainid") || (lowerMessage.includes("sku") && lowerMessage.includes("exist"))) {
    return ERROR_TRANSLATIONS["PRODUCT_MAIN_ID_EXISTS"];
  }

  // Return original message if no translation found
  return originalMessage;
}

/**
 * Parses batch result items and extracts human-readable error messages
 */
export function parseBatchErrors(batchResult: {
  status?: string;
  items?: Array<{
    status?: string;
    failureReasons?: string[];
    barcode?: string;
    productMainId?: string;
    stockCode?: string;
    errors?: Array<{ code?: string; message?: string; field?: string }>;
  }>;
}): { items: BatchItem[]; errors: BatchError[] } {
  const items: BatchItem[] = [];
  const errors: BatchError[] = [];

  if (!batchResult.items || !Array.isArray(batchResult.items)) {
    return { items, errors };
  }

  for (const item of batchResult.items) {
    const barcode = item.barcode || item.productMainId || item.stockCode || "unknown";
    const status = item.status?.toUpperCase() || "PROCESSING";

    // Determine item status
    let itemStatus: "SUCCESS" | "FAILED" | "PROCESSING" = "PROCESSING";
    if (status === "SUCCESS" || status === "CREATED" || status === "APPROVED") {
      itemStatus = "SUCCESS";
    } else if (status === "FAILED" || status === "ERROR" || status === "REJECTED") {
      itemStatus = "FAILED";
    }

    const batchItem: BatchItem = {
      barcode,
      status: itemStatus,
      failureReasons: [],
    };

    // Extract failure reasons
    const failureReasons: string[] = [];

    // From failureReasons array (string format)
    if (item.failureReasons && Array.isArray(item.failureReasons)) {
      for (const reason of item.failureReasons) {
        if (typeof reason === "string") {
          failureReasons.push(translateError(undefined, reason));
        } else if (typeof reason === "object" && reason !== null) {
          const msg = (reason as any).message || (reason as any).errorMessage || JSON.stringify(reason);
          failureReasons.push(translateError((reason as any).code, msg));
        }
      }
    }

    // From errors array (object format)
    if (item.errors && Array.isArray(item.errors)) {
      for (const error of item.errors) {
        const msg = error.message || "Eroare necunoscuta";
        failureReasons.push(translateError(error.code, msg));

        errors.push({
          barcode,
          code: error.code,
          message: translateError(error.code, msg),
          field: error.field,
        });
      }
    }

    // If we have failure reasons but no structured errors, create error entries
    if (itemStatus === "FAILED" && failureReasons.length > 0 && !item.errors) {
      for (const reason of failureReasons) {
        errors.push({
          barcode,
          message: reason,
        });
      }
    }

    batchItem.failureReasons = failureReasons;
    items.push(batchItem);
  }

  return { items, errors };
}

/**
 * Checks the status of a batch request from Trendyol
 *
 * @param batchRequestId - The batch request ID returned when publishing products
 * @param storeId - Optional TrendyolStore ID for multi-store support
 */
export async function checkBatchStatus(
  batchRequestId: string,
  storeId?: string
): Promise<BatchStatusResult> {
  let client: TrendyolClient;

  if (storeId) {
    // Try to get credentials from TrendyolStore
    const store = await prisma.trendyolStore.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Magazinul Trendyol specificat nu a fost gasit");
    }

    client = createTrendyolClientFromStore(store);
  } else {
    // Try TrendyolStore first, fall back to Settings
    const trendyolStore = await prisma.trendyolStore.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (trendyolStore) {
      client = createTrendyolClientFromStore(trendyolStore);
    } else {
      // Fall back to Settings credentials
      const settings = await prisma.settings.findFirst();

      if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
        throw new Error("Credentialele Trendyol nu sunt configurate");
      }

      client = new TrendyolClient({
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey,
        apiSecret: settings.trendyolApiSecret,
        isTestMode: settings.trendyolIsTestMode || false,
      });
    }
  }

  // Fetch batch status from Trendyol
  const result = await client.getBatchRequestResult(batchRequestId);

  if (!result.success) {
    throw new Error(result.error || "Nu s-a putut verifica statusul batch-ului");
  }

  const data = result.data as {
    status?: string;
    items?: Array<{
      status?: string;
      failureReasons?: string[];
      barcode?: string;
      productMainId?: string;
      stockCode?: string;
      errors?: Array<{ code?: string; message?: string; field?: string }>;
    }>;
  };

  // Parse the response
  const { items, errors } = parseBatchErrors(data);

  // Determine overall status
  const rawStatus = data.status?.toUpperCase() || "PROCESSING";
  let status: "IN_PROGRESS" | "COMPLETED" | "FAILED" = "IN_PROGRESS";

  if (rawStatus === "COMPLETED" || rawStatus === "FINISHED") {
    // Check if all items succeeded or if there were failures
    const hasFailures = items.some(item => item.status === "FAILED");
    status = hasFailures ? "FAILED" : "COMPLETED";
  } else if (rawStatus === "FAILED" || rawStatus === "ERROR") {
    status = "FAILED";
  }

  // Calculate counts
  const successCount = items.filter(item => item.status === "SUCCESS").length;
  const failedCount = items.filter(item => item.status === "FAILED").length;

  return {
    status,
    totalItems: items.length,
    successCount,
    failedCount,
    items,
    errors,
    rawResponse: data,
  };
}

/**
 * Updates MasterProduct records based on batch status results
 */
export async function updateProductsFromBatchStatus(
  batchRequestId: string,
  statusResult: BatchStatusResult
): Promise<{ updated: number; errors: string[] }> {
  const updateErrors: string[] = [];
  let updated = 0;

  for (const item of statusResult.items) {
    try {
      // Find product by barcode
      const product = await prisma.masterProduct.findFirst({
        where: {
          OR: [
            { trendyolBarcode: item.barcode },
            { sku: item.barcode },
          ],
          trendyolBatchId: batchRequestId,
        },
      });

      if (!product) {
        continue;
      }

      // Update based on status
      if (item.status === "SUCCESS") {
        await prisma.masterProduct.update({
          where: { id: product.id },
          data: {
            trendyolStatus: "approved",
            trendyolError: null,
            trendyolLastSyncedAt: new Date(),
          },
        });
        updated++;
      } else if (item.status === "FAILED") {
        await prisma.masterProduct.update({
          where: { id: product.id },
          data: {
            trendyolStatus: "rejected",
            trendyolError: item.failureReasons?.join("; ") || "Eroare necunoscuta",
          },
        });
        updated++;
      }
    } catch (error: any) {
      updateErrors.push(`${item.barcode}: ${error.message}`);
    }
  }

  return { updated, errors: updateErrors };
}
