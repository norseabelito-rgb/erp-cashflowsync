/**
 * Return Manifest Service
 *
 * Generates and manages return manifests from scanned ReturnAWBs.
 * A return manifest links return AWBs to their original outbound AWBs
 * and associated invoices for bulk stornare processing.
 */

import prisma from "../db";
import { ManifestStatus, ManifestType, ManifestItemStatus } from "@prisma/client";

export interface ReturnManifestItem {
  returnAwbNumber: string;
  originalAwbNumber: string | null;
  orderId: string | null;
  orderNumber: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceSeries: string | null;
}

export interface GenerateManifestResult {
  success: boolean;
  manifestId?: string;
  itemCount?: number;
  error?: string;
}

/**
 * Generate a return manifest from scanned ReturnAWBs for a specific date range
 * Only includes returns that haven't been added to a manifest yet
 *
 * @param documentDate - The date for the manifest (defaults to today)
 * @param returnAwbIds - Optional specific ReturnAWB IDs to include
 */
export async function generateReturnManifest(
  documentDate?: Date,
  returnAwbIds?: string[]
): Promise<GenerateManifestResult> {
  try {
    const manifestDate = documentDate || new Date();

    // Find ReturnAWBs that:
    // 1. Are in specified list (if provided) OR all unprocessed
    // 2. Have status 'received' or 'processed' (not yet in manifest)
    // 3. Are NOT already in a non-processed manifest
    const existingManifestItems = await prisma.manifestItem.findMany({
      where: {
        manifest: {
          type: ManifestType.RETURN,
          status: { not: ManifestStatus.PROCESSED }
        }
      },
      select: { awbNumber: true }
    });

    const existingAwbNumbers = new Set(existingManifestItems.map(i => i.awbNumber));

    const whereCondition: any = {
      status: { in: ['received', 'processed'] }
    };

    if (returnAwbIds && returnAwbIds.length > 0) {
      whereCondition.id = { in: returnAwbIds };
    }

    const returnAwbs = await prisma.returnAWB.findMany({
      where: whereCondition,
      include: {
        originalAwb: {
          include: {
            order: {
              include: {
                invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 }
              }
            }
          }
        },
        order: {
          include: {
            invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 }
          }
        }
      },
      orderBy: { scannedAt: 'desc' }
    });

    // Filter out AWBs already in a manifest
    const newReturns = returnAwbs.filter(
      r => !existingAwbNumbers.has(r.returnAwbNumber)
    );

    if (newReturns.length === 0) {
      return {
        success: false,
        error: "No new returns available for manifest generation"
      };
    }

    // Create manifest with items
    const manifest = await prisma.courierManifest.create({
      data: {
        type: ManifestType.RETURN,
        status: ManifestStatus.DRAFT,
        documentDate: manifestDate,
        items: {
          create: newReturns.map(returnAwb => {
            // Prefer order from direct link, fallback to originalAwb.order
            const order = returnAwb.order || returnAwb.originalAwb?.order;
            const invoice = order?.invoices?.[0];

            return {
              awbNumber: returnAwb.returnAwbNumber,
              originalAwb: returnAwb.originalAwb?.awbNumber || null,
              orderId: order?.id || null,
              invoiceId: invoice?.id || null,
              status: ManifestItemStatus.PENDING
            };
          })
        }
      },
      include: {
        items: true
      }
    });

    return {
      success: true,
      manifestId: manifest.id,
      itemCount: manifest.items.length
    };
  } catch (error: any) {
    console.error("Error generating return manifest:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get return manifest by ID with all items and related data
 */
export async function getReturnManifest(manifestId: string) {
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
              cancelledAt: true
            }
          },
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true
            }
          }
        },
        orderBy: { awbNumber: 'asc' }
      },
      confirmedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });
}

/**
 * List return manifests with pagination
 */
export async function listReturnManifests({
  status,
  limit = 20,
  offset = 0
}: {
  status?: ManifestStatus;
  limit?: number;
  offset?: number;
} = {}) {
  const where: any = {
    type: ManifestType.RETURN
  };

  if (status) {
    where.status = status;
  }

  const [manifests, total] = await Promise.all([
    prisma.courierManifest.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            status: true
          }
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

/**
 * Update manifest status (for workflow transitions)
 */
export async function updateManifestStatus(
  manifestId: string,
  status: ManifestStatus,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status };

    if (status === ManifestStatus.CONFIRMED && userId) {
      updateData.confirmedAt = new Date();
      updateData.confirmedById = userId;
    }

    if (status === ManifestStatus.PROCESSED) {
      updateData.processedAt = new Date();
    }

    await prisma.courierManifest.update({
      where: { id: manifestId },
      data: updateData
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
