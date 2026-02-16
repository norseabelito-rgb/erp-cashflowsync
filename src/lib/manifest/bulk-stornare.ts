/**
 * Bulk Stornare Service
 *
 * Processes return manifests by cancelling all associated invoices in Oblio.
 * Each item is processed independently - failures don't stop the batch.
 * Results are tracked per item with error messages.
 */

import prisma from "../db";
import { ManifestStatus, ManifestItemStatus, CancellationSource } from "@prisma/client";
import { createOblioClient } from "../oblio";

export interface BulkStornareResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: Array<{
    itemId: string;
    awbNumber: string;
    invoiceNumber: string | null;
    error: string;
  }>;
}

/**
 * Process a return manifest - cancel all linked invoices in Oblio
 *
 * Preconditions:
 * - Manifest must be in CONFIRMED status
 * - Only items with invoiceId are processed
 * - Each invoice is cancelled individually (no transaction rollback)
 *
 * @param manifestId - ID of the return manifest to process
 * @param userId - User performing the operation (for audit)
 */
export async function processReturnManifestStornare(
  manifestId: string,
  userId: string
): Promise<BulkStornareResult> {
  // Get manifest with items and invoices
  const manifest = await prisma.courierManifest.findUnique({
    where: { id: manifestId },
    include: {
      items: {
        include: {
          invoice: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  if (!manifest) {
    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 1,
      skippedCount: 0,
      errors: [{ itemId: "", awbNumber: "", invoiceNumber: null, error: "Manifest not found" }]
    };
  }

  if (manifest.status !== ManifestStatus.CONFIRMED) {
    return {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 1,
      skippedCount: 0,
      errors: [{
        itemId: "",
        awbNumber: "",
        invoiceNumber: null,
        error: `Manifest must be CONFIRMED before processing (current: ${manifest.status})`
      }]
    };
  }

  const result: BulkStornareResult = {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: []
  };

  // Process each item independently
  for (const item of manifest.items) {
    result.totalProcessed++;

    // Skip items without invoice
    if (!item.invoiceId || !item.invoice) {
      result.skippedCount++;
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: "No invoice linked to this AWB"
        }
      });
      continue;
    }

    const invoice = item.invoice;

    // Skip already cancelled invoices
    if (invoice.status === "cancelled" || invoice.cancelledAt) {
      result.skippedCount++;
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.PROCESSED,
          processedAt: new Date(),
          errorMessage: "Invoice already cancelled"
        }
      });
      continue;
    }

    // Skip invoices without company (can't get Oblio credentials)
    if (!invoice.company) {
      result.errorCount++;
      result.errors.push({
        itemId: item.id,
        awbNumber: item.awbNumber,
        invoiceNumber: invoice.invoiceNumber,
        error: "Invoice has no company association"
      });
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: "Invoice has no company association"
        }
      });
      continue;
    }

    // Create Oblio client for the invoice's company
    const oblioClient = createOblioClient(invoice.company);
    if (!oblioClient) {
      result.errorCount++;
      result.errors.push({
        itemId: item.id,
        awbNumber: item.awbNumber,
        invoiceNumber: invoice.invoiceNumber,
        error: "Oblio credentials not configured for company"
      });
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: "Oblio credentials not configured"
        }
      });
      continue;
    }

    // Stornare invoice in Oblio (emite factură inversă)
    try {
      const stornoResult = await oblioClient.stornoInvoice(
        invoice.invoiceSeriesName || "",
        invoice.invoiceNumber || ""
      );

      if (stornoResult.success) {
        result.successCount++;

        // Update invoice and manifest item
        await prisma.$transaction([
          prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancelReason: `Return manifest ${manifestId}`,
              cancellationSource: CancellationSource.MANIFEST_RETURN,
              cancelledFromManifestId: manifestId,
              stornoNumber: stornoResult.invoiceNumber || null,
              stornoSeries: stornoResult.invoiceSeries || null,
            }
          }),
          prisma.manifestItem.update({
            where: { id: item.id },
            data: {
              status: ManifestItemStatus.PROCESSED,
              processedAt: new Date()
            }
          })
        ]);

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId,
            action: "invoice.cancelled_bulk",
            entityType: "Invoice",
            entityId: invoice.id,
            metadata: {
              manifestId,
              awbNumber: item.awbNumber,
              invoiceNumber: invoice.invoiceNumber,
              invoiceSeries: invoice.invoiceSeriesName,
              source: "manifest_return"
            }
          }
        });
      } else {
        result.errorCount++;
        result.errors.push({
          itemId: item.id,
          awbNumber: item.awbNumber,
          invoiceNumber: invoice.invoiceNumber,
          error: stornoResult.error || "Oblio stornare failed"
        });

        await prisma.manifestItem.update({
          where: { id: item.id },
          data: {
            status: ManifestItemStatus.ERROR,
            errorMessage: stornoResult.error || "Oblio stornare failed"
          }
        });
      }
    } catch (error: any) {
      result.errorCount++;
      result.errors.push({
        itemId: item.id,
        awbNumber: item.awbNumber,
        invoiceNumber: invoice.invoiceNumber,
        error: error.message
      });

      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: error.message
        }
      });
    }
  }

  // Update manifest status to PROCESSED
  await prisma.courierManifest.update({
    where: { id: manifestId },
    data: {
      status: ManifestStatus.PROCESSED,
      processedAt: new Date()
    }
  });

  // Overall success if at least one item succeeded
  result.success = result.successCount > 0;

  return result;
}
