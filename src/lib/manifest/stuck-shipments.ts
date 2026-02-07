/**
 * Stuck Shipments Service
 *
 * Identifies AWBs that are "stuck" - older than N days without resolution.
 * Resolution means: delivered (S2), returned (S6/S7/etc), or cancelled.
 *
 * Used for daily monitoring of shipments that need attention.
 */

import prisma from "../db";

// Status codes that indicate "resolved" (not stuck)
const RESOLVED_STATUS_CODES = [
  // Delivered
  "S2", "2", "livrat", "delivered",
  // Returned
  "S6", "S7", "S15", "S16", "S33", "S43",
  "refuz", "retur", "returned",
  // Cancelled
  "cancelled", "anulat"
];

export interface StuckShipment {
  id: string;
  awbNumber: string;
  orderNumber: string | null;
  shopifyOrderNumber: string | null;
  invoiceSeries: string | null;
  invoiceNumber: string | null;
  customerPhone: string | null;
  customerName: string | null;
  createdAt: Date;
  lastStatusUpdate: Date | null;
  currentStatus: string | null;
  statusCode: string | null;
  daysOld: number;
}

export interface StuckShipmentsResult {
  shipments: StuckShipment[];
  total: number;
  minDays: number;
}

/**
 * Get AWBs that are older than X days and not resolved
 *
 * @param minDays - Minimum age in days to be considered "stuck" (default: 3)
 * @param limit - Max results to return (default: 100)
 * @param offset - Offset for pagination (default: 0)
 */
export async function getStuckShipments({
  minDays = 3,
  limit = 100,
  offset = 0
}: {
  minDays?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<StuckShipmentsResult> {
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minDays);
  cutoffDate.setHours(0, 0, 0, 0);

  // Find AWBs older than cutoff that aren't resolved
  const awbs = await prisma.aWB.findMany({
    where: {
      createdAt: {
        lt: cutoffDate
      },
      // Has an AWB number (was successfully created)
      awbNumber: { not: null },
      // Invoice not cancelled
      order: {
        invoice: {
          OR: [
            { status: { not: "cancelled" } },
            { status: null }
          ]
        }
      }
    },
    include: {
      order: {
        include: {
          invoice: {
            select: {
              invoiceSeriesName: true,
              invoiceNumber: true,
              paymentStatus: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 100, // Fetch extra to filter
    skip: offset
  });

  // Filter out resolved statuses
  const stuckAwbs = awbs.filter(awb => {
    // Use fanCourierStatusCode first, then currentStatus
    const statusCode = awb.fanCourierStatusCode || awb.currentStatus || "";
    const isResolved = RESOLVED_STATUS_CODES.some(code =>
      statusCode.toLowerCase().includes(code.toLowerCase())
    );
    return !isResolved;
  });

  // Map to result format
  const shipments: StuckShipment[] = stuckAwbs.slice(0, limit).map(awb => {
    const order = awb.order;

    // Extract phone from order
    const phone = order?.customerPhone || null;

    // Build customer name from firstName + lastName
    const firstName = order?.customerFirstName || "";
    const lastName = order?.customerLastName || "";
    const name = `${firstName} ${lastName}`.trim() || null;

    // Calculate days since creation
    const daysOld = Math.floor(
      (Date.now() - new Date(awb.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: awb.id,
      awbNumber: awb.awbNumber || "",
      orderNumber: order?.shopifyOrderId || null,
      shopifyOrderNumber: order?.shopifyOrderNumber || null,
      invoiceSeries: order?.invoice?.invoiceSeriesName || null,
      invoiceNumber: order?.invoice?.invoiceNumber || null,
      customerPhone: phone,
      customerName: name,
      createdAt: awb.createdAt,
      lastStatusUpdate: awb.currentStatusDate || null,
      currentStatus: awb.currentStatus || null,
      statusCode: awb.fanCourierStatusCode || null,
      daysOld
    };
  });

  // Get total count (approximate - includes resolved that we filter)
  const totalCount = await prisma.aWB.count({
    where: {
      createdAt: { lt: cutoffDate },
      awbNumber: { not: null }
    }
  });

  return {
    shipments,
    total: totalCount,
    minDays
  };
}

/**
 * Export stuck shipments to CSV format
 */
export function stuckShipmentsToCSV(shipments: StuckShipment[]): string {
  const headers = [
    "AWB",
    "Nr. Comanda",
    "Shopify Order",
    "Serie Factura",
    "Nr. Factura",
    "Telefon Client",
    "Nume Client",
    "Zile Vechi",
    "Status Curent",
    "Data Creare"
  ];

  const rows = shipments.map(s => [
    s.awbNumber,
    s.orderNumber || "",
    s.shopifyOrderNumber || "",
    s.invoiceSeries || "",
    s.invoiceNumber || "",
    s.customerPhone || "",
    s.customerName || "",
    s.daysOld.toString(),
    s.currentStatus || "",
    new Date(s.createdAt).toLocaleDateString("ro-RO")
  ]);

  // Escape CSV values
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvRows = [
    headers.join(","),
    ...rows.map(row => row.map(escape).join(","))
  ];

  return csvRows.join("\n");
}
