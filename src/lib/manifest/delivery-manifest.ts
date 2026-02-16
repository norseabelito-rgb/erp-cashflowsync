/**
 * Delivery Manifest Service
 *
 * Queries locally-synced AWB data (updated by auto-sync) to find delivered AWBs.
 * Links delivered AWBs to invoices for automatic payment marking.
 *
 * The FanCourier /reports/awb endpoint only returns creation data (no delivery status).
 * Delivery status comes from /reports/awb/tracking, which the auto-sync already stores
 * in the AWB table (fanCourierStatusCode, currentStatusDate).
 */

import prisma from "../db";
import { ManifestStatus, ManifestType, ManifestItemStatus } from "@prisma/client";

export interface DeliveryManifestResult {
  success: boolean;
  manifestId?: string;
  itemCount?: number;
  skippedCount?: number;
  error?: string;
}

/**
 * Create delivery manifest from AWBs delivered on a specific date.
 * Uses the local database (populated by auto-sync tracking) instead of
 * the FanCourier /reports/awb endpoint which doesn't include delivery status.
 *
 * @param date - Date to fetch deliveries for (YYYY-MM-DD format)
 * @param companyId - Company ID to filter AWBs
 */
export async function fetchDeliveryManifest(
  date: string,
  companyId: string
): Promise<DeliveryManifestResult> {
  try {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Query AWBs that were delivered (S2) on the selected date
    // Status is kept up-to-date by the auto-sync (trackAWB -> fanCourierStatusCode)
    const deliveredAwbs = await prisma.aWB.findMany({
      where: {
        companyId,
        fanCourierStatusCode: "S2",
        currentStatusDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        awbNumber: { not: null }
      },
      include: {
        order: {
          include: {
            invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 }
          }
        }
      }
    });

    console.log(`[DeliveryManifest] Found ${deliveredAwbs.length} delivered AWBs in DB for ${date} (company: ${companyId})`);

    if (deliveredAwbs.length === 0) {
      return {
        success: false,
        error: `Nu s-au gasit AWB-uri livrate pentru ${date}. Asigurati-va ca sincronizarea automata a rulat recent.`
      };
    }

    // Check which AWBs are already in a non-processed delivery manifest
    const awbNumbers = deliveredAwbs.map(a => a.awbNumber!);

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

    for (const awb of deliveredAwbs) {
      if (existingInManifest.has(awb.awbNumber!)) {
        skippedCount++;
        continue;
      }

      manifestItems.push({
        awbNumber: awb.awbNumber!,
        orderId: awb.order?.id || null,
        invoiceId: awb.order?.invoices?.[0]?.id || null,
        status: ManifestItemStatus.PENDING
      });
    }

    if (manifestItems.length === 0) {
      return {
        success: false,
        error: "Toate AWB-urile livrate sunt deja in manifeste existente.",
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating delivery manifest:", error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Parse CSV content for delivery manifest (manual upload fallback)
 * Expected columns: AWB (or similar)
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

    // Parse AWB numbers from CSV rows
    const awbNumbers: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
      if (cols[awbIndex]) {
        awbNumbers.push(cols[awbIndex]);
      }
    }

    if (awbNumbers.length === 0) {
      return { success: false, error: "No valid AWB numbers found in CSV" };
    }

    // Find AWBs in database
    const existingAwbs = await prisma.aWB.findMany({
      where: { awbNumber: { in: awbNumbers } },
      include: { order: { include: { invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 } } } }
    });

    const awbMap = new Map(existingAwbs.map(a => [a.awbNumber, a]));

    // Check which are already in manifests
    const existingManifestItems = await prisma.manifestItem.findMany({
      where: {
        manifest: { type: ManifestType.DELIVERY, status: { not: ManifestStatus.PROCESSED } },
        awbNumber: { in: awbNumbers }
      },
      select: { awbNumber: true }
    });
    const existingInManifest = new Set(existingManifestItems.map(i => i.awbNumber));

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
      return { success: false, error: "Toate AWB-urile din CSV sunt deja in manifeste.", skippedCount };
    }

    const manifest = await prisma.courierManifest.create({
      data: {
        type: ManifestType.DELIVERY,
        status: ManifestStatus.DRAFT,
        documentDate: new Date(date),
        items: { create: manifestItems }
      }
    });

    return { success: true, manifestId: manifest.id, itemCount: manifestItems.length, skippedCount };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error parsing delivery manifest CSV:", error);
    return { success: false, error: errorMessage };
  }
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
