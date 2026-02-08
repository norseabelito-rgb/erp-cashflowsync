/**
 * Delivery Manifest Service
 *
 * Fetches delivery manifest from FanCourier API or parses uploaded CSV.
 * Links delivered AWBs to invoices for automatic payment marking.
 *
 * FanCourier API: Uses getAllAWBsForDate() and filters by S2 (delivered) status.
 */

import prisma from "../db";
import { ManifestStatus, ManifestType, ManifestItemStatus } from "@prisma/client";
import { FanCourierAPI } from "../fancourier";

// Status codes that indicate delivery
const DELIVERED_STATUS_CODES = ["S2", "2", "livrat", "delivered"];

export interface DeliveryManifestResult {
  success: boolean;
  manifestId?: string;
  itemCount?: number;
  skippedCount?: number;
  error?: string;
  debug?: unknown;
}

/**
 * Fetch delivery manifest from FanCourier API for a specific date
 * Creates a CourierManifest with DELIVERY type containing delivered AWBs
 *
 * @param date - Date to fetch deliveries for (YYYY-MM-DD format)
 * @param companyId - Company ID to get FanCourier credentials
 */
export async function fetchDeliveryManifest(
  date: string,
  companyId: string
): Promise<DeliveryManifestResult> {
  try {
    // Get company with FanCourier credentials
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        fancourierClientId: true,
        fancourierUsername: true,
        fancourierPassword: true
      }
    });

    if (!company?.fancourierClientId || !company?.fancourierUsername || !company?.fancourierPassword) {
      return {
        success: false,
        error: "FanCourier credentials not configured for this company"
      };
    }

    // Initialize FanCourier client
    const fanCourier = new FanCourierAPI({
      clientId: company.fancourierClientId,
      username: company.fancourierUsername,
      password: company.fancourierPassword
    });

    // Fetch all AWBs for the date
    const response = await fanCourier.getAllAWBsForDate(date);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to fetch AWBs from FanCourier"
      };
    }

    // Log first AWB structure for debugging (if any AWBs returned)
    if (response.data.length > 0) {
      console.log("[DeliveryManifest] Sample AWB structure:", JSON.stringify(response.data[0], null, 2).substring(0, 500));
    }
    console.log(`[DeliveryManifest] Fetched ${response.data.length} total AWBs for ${date}`);

    // Filter for delivered AWBs (S2 status)
    // FanCourier API returns data in nested structure: awb.info.lastEventId contains status code
    const deliveredAwbs = response.data.filter(awb => {
      // Check multiple possible field paths for status code
      // 1. Nested under info (FanCourier v2 API structure)
      // 2. Top level (legacy or alternative structure)
      const statusCode =
        awb.info?.lastEventId ||      // FanCourier v2: info.lastEventId = "S2"
        awb.info?.status ||           // Alternative: info.status
        awb.info?.lastStatus ||       // Alternative: info.lastStatus
        awb.lastEventId ||            // Top level variant
        awb.status_code ||            // Legacy: status_code
        awb.statusCode ||             // Legacy: statusCode
        awb.status ||                 // Legacy: status
        "";

      const isDelivered = DELIVERED_STATUS_CODES.some(code =>
        String(statusCode).toLowerCase().includes(code.toLowerCase())
      );

      return isDelivered;
    });

    console.log(`[DeliveryManifest] Found ${deliveredAwbs.length} delivered AWBs (status S2)`);

    if (deliveredAwbs.length === 0) {
      // Include sample AWB structure in response for debugging
      const sampleAwb = response.data[0] || null;
      const sampleKeys = sampleAwb ? Object.keys(sampleAwb) : [];

      return {
        success: false,
        error: `No delivered AWBs found for ${date}. Total AWBs: ${response.data.length}.`,
        debug: {
          sampleAwb: sampleAwb ? JSON.parse(JSON.stringify(sampleAwb)) : null,
          topLevelKeys: sampleKeys,
          totalFetched: response.data.length
        }
      };
    }

    // Create manifest from delivered AWBs
    return await createDeliveryManifestFromAwbs(deliveredAwbs, date);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching delivery manifest:", error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Parse CSV content for delivery manifest (manual upload fallback)
 * Expected columns: AWB, Status (or similar)
 *
 * @param csvContent - Raw CSV content
 * @param date - Manifest date
 */
export async function parseDeliveryManifestCSV(
  csvContent: string,
  date: string
): Promise<DeliveryManifestResult> {
  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      return { success: false, error: "CSV file is empty or has no data rows" };
    }

    // Parse header to find AWB column
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const awbIndex = header.findIndex(h =>
      ["awb", "awb_number", "awbnumber", "nr_awb", "colet"].includes(h)
    );

    if (awbIndex === -1) {
      return { success: false, error: "Could not find AWB column in CSV" };
    }

    // Parse data rows
    const awbs: { awbNumber: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
      if (cols[awbIndex]) {
        awbs.push({ awbNumber: cols[awbIndex] });
      }
    }

    if (awbs.length === 0) {
      return { success: false, error: "No valid AWB numbers found in CSV" };
    }

    return await createDeliveryManifestFromAwbs(awbs, date);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error parsing delivery manifest CSV:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Internal: Create manifest from AWB list
 * Handles both FanCourier API structure (awb.info.awbNumber) and flat structure (awb.awbNumber)
 */
async function createDeliveryManifestFromAwbs(
  awbList: Array<{ awbNumber?: string; awb?: string; info?: { awbNumber?: string; barcodes?: string[] }; [key: string]: unknown }>,
  date: string
): Promise<DeliveryManifestResult> {
  // Extract AWB numbers - handle both nested (info.awbNumber/barcodes[0]) and flat structure
  const awbNumbers = awbList.map(a => {
    // FanCourier API v2: use barcodes[0] or info.awbNumber
    const nestedAwb = a.info?.barcodes?.[0] || a.info?.awbNumber;
    // Flat structure fallback
    const flatAwb = a.awbNumber || a.awb;
    return String(nestedAwb || flatAwb || "");
  }).filter(Boolean);

  // Find existing AWBs in database to link to orders and invoices
  const existingAwbs = await prisma.aWB.findMany({
    where: {
      awbNumber: { in: awbNumbers }
    },
    include: {
      order: {
        include: {
          invoice: true
        }
      }
    }
  });

  const awbMap = new Map(existingAwbs.map(a => [a.awbNumber, a]));

  // Check which AWBs are already in a non-processed delivery manifest
  const existingManifestItems = await prisma.manifestItem.findMany({
    where: {
      manifest: {
        type: ManifestType.DELIVERY,
        status: { not: ManifestStatus.PROCESSED }
      },
      awbNumber: { in: awbNumbers }
    },
    select: { awbNumber: true }
  });

  const existingInManifest = new Set(existingManifestItems.map(i => i.awbNumber));

  // Build manifest items, skipping those already in a manifest
  const manifestItems: Array<{
    awbNumber: string;
    orderId: string | null;
    invoiceId: string | null;
    status: ManifestItemStatus;
  }> = [];

  let skippedCount = 0;

  for (const awbNumber of awbNumbers) {
    if (existingInManifest.has(awbNumber)) {
      skippedCount++;
      continue;
    }

    const awb = awbMap.get(awbNumber);
    manifestItems.push({
      awbNumber,
      orderId: awb?.order?.id || null,
      invoiceId: awb?.order?.invoice?.id || null,
      status: ManifestItemStatus.PENDING
    });
  }

  if (manifestItems.length === 0) {
    return {
      success: false,
      error: "All AWBs are already in pending manifests",
      skippedCount
    };
  }

  // Create the manifest
  const manifest = await prisma.courierManifest.create({
    data: {
      type: ManifestType.DELIVERY,
      status: ManifestStatus.DRAFT,
      documentDate: new Date(date),
      items: {
        create: manifestItems
      }
    }
  });

  return {
    success: true,
    manifestId: manifest.id,
    itemCount: manifestItems.length,
    skippedCount
  };
}

/**
 * Get delivery manifest by ID with all items
 */
export async function getDeliveryManifest(manifestId: string) {
  return prisma.courierManifest.findUnique({
    where: { id: manifestId },
    include: {
      items: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceSeriesName: true,
              status: true,
              paymentStatus: true,
              paidAt: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              shopifyOrderNumber: true,
              totalPrice: true
            }
          }
        },
        orderBy: { awbNumber: 'asc' }
      },
      confirmedBy: {
        select: { id: true, name: true }
      }
    }
  });
}

/**
 * List delivery manifests with pagination
 */
export async function listDeliveryManifests({
  status,
  limit = 20,
  offset = 0
}: {
  status?: ManifestStatus;
  limit?: number;
  offset?: number;
} = {}) {
  const where: { type: ManifestType; status?: ManifestStatus } = {
    type: ManifestType.DELIVERY
  };

  if (status) {
    where.status = status;
  }

  const [manifests, total] = await Promise.all([
    prisma.courierManifest.findMany({
      where,
      include: {
        items: {
          select: { id: true, status: true }
        },
        confirmedBy: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.courierManifest.count({ where })
  ]);

  return {
    manifests: manifests.map(m => ({
      ...m,
      itemCount: m.items.length,
      processedCount: m.items.filter(i => i.status === ManifestItemStatus.PROCESSED).length,
      errorCount: m.items.filter(i => i.status === ManifestItemStatus.ERROR).length
    })),
    total,
    limit,
    offset
  };
}
