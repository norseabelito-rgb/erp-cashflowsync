import prisma from "./db";

type DocumentPrefix = 'PC' | 'PV' | 'NIR';

// Type for transaction client - using any until Prisma client is regenerated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any;

/**
 * Generate document number with format: PREFIX-DD/MM/YYYY-NNNN
 * Daily auto-increment, resets to 0001 each day
 *
 * @param prefix - Document type prefix (PC, PV, NIR)
 * @param tx - Optional transaction client for atomicity
 */
export async function generateDocumentNumber(
  prefix: DocumentPrefix,
  tx?: TransactionClient
): Promise<string> {
  const db = tx || prisma;
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const dateStr = `${day}/${month}/${year}`;
  const searchPrefix = `${prefix}-${dateStr}`;

  // Find last document number for today
  // Using any type until Prisma client is regenerated with new models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastDoc: any = null;

  if (prefix === 'PC') {
    // PurchaseOrder model - added in 07.9-01
    lastDoc = await db.purchaseOrder.findFirst({
      where: { documentNumber: { startsWith: searchPrefix } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true }
    });
  } else if (prefix === 'PV') {
    // ReceptionReport model - added in 07.9-01
    lastDoc = await db.receptionReport.findFirst({
      where: { reportNumber: { startsWith: searchPrefix } },
      orderBy: { reportNumber: 'desc' },
      select: { reportNumber: true }
    });
  } else {
    // NIR - GoodsReceipt (existing model)
    // Use new format for reception workflow: NIR-DD/MM/YYYY-NNNN
    lastDoc = await db.goodsReceipt.findFirst({
      where: { receiptNumber: { startsWith: searchPrefix } },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true }
    });
  }

  let nextNumber = 1;
  if (lastDoc) {
    const docNumber = prefix === 'PC'
      ? lastDoc.documentNumber
      : prefix === 'PV'
        ? lastDoc.reportNumber
        : lastDoc.receiptNumber;

    if (docNumber) {
      const parts = docNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
  }

  return `${searchPrefix}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Generate unique label code for purchase order scanning
 * Format: PO-{purchaseOrderId-short}-{timestamp}-{random}
 */
export function generateLabelCode(purchaseOrderId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${purchaseOrderId.substring(0, 8)}-${timestamp}-${random}`;
}
