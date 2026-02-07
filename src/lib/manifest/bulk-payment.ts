/**
 * Bulk Payment Marking Service
 *
 * Processes delivery manifests by marking all associated invoices as paid in Oblio.
 * Each item is processed independently - failures don't stop the batch.
 * Uses Oblio collectInvoice API with "Ramburs" payment type for COD.
 */

import prisma from "../db";
import { ManifestStatus, ManifestItemStatus, PaymentSource } from "@prisma/client";
import { createOblioClient } from "../oblio";

export interface BulkPaymentResult {
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
 * Process a delivery manifest - mark all linked invoices as paid in Oblio
 *
 * Preconditions:
 * - Manifest must be in CONFIRMED status
 * - Only items with invoiceId are processed
 * - Each invoice is collected individually (no transaction rollback)
 *
 * @param manifestId - ID of the delivery manifest to process
 * @param userId - User performing the operation (for audit)
 * @param collectType - Payment type for Oblio (default: "Ramburs" for COD)
 */
export async function processDeliveryManifestPayment(
  manifestId: string,
  userId: string,
  collectType: string = "Ramburs"
): Promise<BulkPaymentResult> {
  // Get manifest with items and invoices
  const manifest = await prisma.courierManifest.findUnique({
    where: { id: manifestId },
    include: {
      items: {
        include: {
          invoice: {
            include: {
              company: true,
              order: true
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

  const result: BulkPaymentResult = {
    success: true,
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: []
  };

  // Use manifest document date as collection date
  const collectDate = manifest.documentDate.toISOString().split("T")[0];

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

    // Skip already paid invoices
    if (invoice.paymentStatus === "paid" || invoice.paidAt) {
      result.skippedCount++;
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.PROCESSED,
          processedAt: new Date(),
          errorMessage: "Invoice already marked as paid"
        }
      });
      continue;
    }

    // Skip cancelled invoices
    if (invoice.status === "cancelled") {
      result.skippedCount++;
      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: "Invoice is cancelled"
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

    // Mark invoice as paid in Oblio
    try {
      const collectResult = await oblioClient.collectInvoice(
        invoice.invoiceSeriesName || "",
        invoice.invoiceNumber || "",
        collectType,
        collectDate
      );

      if (collectResult.success) {
        result.successCount++;

        // Calculate paid amount from order total
        const paidAmount = invoice.order?.totalPrice || 0;

        // Update invoice and manifest item
        await prisma.$transaction([
          prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              paymentStatus: "paid",
              paidAt: manifest.documentDate,
              paidAmount: paidAmount,
              paymentSource: PaymentSource.MANIFEST_DELIVERY,
              paidFromManifestId: manifestId
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
            action: "invoice.paid_bulk",
            entityType: "Invoice",
            entityId: invoice.id,
            metadata: {
              manifestId,
              awbNumber: item.awbNumber,
              invoiceNumber: invoice.invoiceNumber,
              invoiceSeries: invoice.invoiceSeriesName,
              collectType,
              collectDate,
              source: "manifest_delivery"
            }
          }
        });
      } else {
        result.errorCount++;
        result.errors.push({
          itemId: item.id,
          awbNumber: item.awbNumber,
          invoiceNumber: invoice.invoiceNumber,
          error: collectResult.error || "Oblio collect failed"
        });

        await prisma.manifestItem.update({
          where: { id: item.id },
          data: {
            status: ManifestItemStatus.ERROR,
            errorMessage: collectResult.error || "Oblio collect failed"
          }
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errorCount++;
      result.errors.push({
        itemId: item.id,
        awbNumber: item.awbNumber,
        invoiceNumber: invoice.invoiceNumber,
        error: errorMessage
      });

      await prisma.manifestItem.update({
        where: { id: item.id },
        data: {
          status: ManifestItemStatus.ERROR,
          errorMessage: errorMessage
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
