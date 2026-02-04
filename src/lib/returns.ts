/**
 * Returns Management - Business Logic
 *
 * Handles:
 * - Scanning return AWBs
 * - Mapping to original orders via FanCourier tracking
 * - Return status tracking
 */

import prisma from "@/lib/db";
import { processStockReturnForOrder } from "@/lib/stock";

export interface ScanReturnResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "warning";
  returnAwb?: {
    id: string;
    returnAwbNumber: string;
    originalAwbNumber: string | null;
    orderNumber: string | null;
    orderId: string | null;
    status: string;
  };
}

/**
 * Scan a return AWB and map it to the original order
 *
 * Strategy:
 * 1. Check if return AWB already scanned
 * 2. Search for AWB in our database (might be one of our original AWBs in return status)
 * 3. If not found directly, search for AWBs with return status and check if this is their return shipment
 * 4. Create ReturnAWB record with mapping
 */
export async function scanReturnAWB(
  returnAwbNumber: string,
  userId: string,
  userName: string
): Promise<ScanReturnResult> {
  // Clean the AWB number (handle barcode prefix)
  const cleanAwbNumber = returnAwbNumber.trim();
  const awbPrefix =
    cleanAwbNumber.length > 13
      ? cleanAwbNumber.substring(0, 13)
      : cleanAwbNumber;

  // 1. Check if already scanned
  const existing = await prisma.returnAWB.findFirst({
    where: {
      OR: [
        { returnAwbNumber: cleanAwbNumber },
        { returnAwbNumber: awbPrefix },
      ],
    },
    include: {
      originalAwb: true,
      order: true,
    },
  });

  if (existing) {
    return {
      success: false,
      message: `AWB de retur ${cleanAwbNumber} a fost deja scanat pe ${existing.scannedAt.toLocaleDateString("ro-RO")}`,
      type: "error",
      returnAwb: {
        id: existing.id,
        returnAwbNumber: existing.returnAwbNumber,
        originalAwbNumber: existing.originalAwb?.awbNumber || null,
        orderNumber: existing.order?.shopifyOrderNumber || null,
        orderId: existing.orderId,
        status: existing.status,
      },
    };
  }

  // 2. Check if this AWB is actually one of our original AWBs (in return status)
  const directMatch = await prisma.aWB.findFirst({
    where: {
      OR: [{ awbNumber: cleanAwbNumber }, { awbNumber: awbPrefix }],
    },
    include: {
      order: true,
    },
  });

  if (directMatch) {
    // This is our original AWB - check if it's in return status
    const isReturnStatus = [
      "returned",
      "S6",
      "S7",
      "S15",
      "S16",
      "S33",
      "S43",
    ].some((s) =>
      directMatch.currentStatus?.toLowerCase().includes(s.toLowerCase())
    );

    if (isReturnStatus) {
      // Create return record for our own AWB
      const returnRecord = await prisma.returnAWB.create({
        data: {
          returnAwbNumber: cleanAwbNumber,
          originalAwbId: directMatch.id,
          orderId: directMatch.orderId,
          scannedBy: userId,
          scannedByName: userName,
          status: "received",
        },
        include: {
          originalAwb: true,
          order: true,
        },
      });

      // Readăugăm stocul în inventar
      let stockMessage = "";
      if (directMatch.orderId) {
        try {
          const stockResult = await processStockReturnForOrder(directMatch.orderId, returnRecord.id);
          if (stockResult.alreadyProcessed) {
            stockMessage = " Stocul fusese deja procesat.";
          } else if (stockResult.success && stockResult.processed > 0) {
            // Actualizăm status la stock_returned
            await prisma.returnAWB.update({
              where: { id: returnRecord.id },
              data: { status: "stock_returned" },
            });
            console.log(`[Returns] Stoc readăugat: ${stockResult.processed} mișcări pentru comanda ${directMatch.orderId}`);
            stockMessage = ` Stocul a fost actualizat (${stockResult.processed} produse).`;
          } else if (stockResult.errors.length > 0) {
            stockMessage = ` ATENȚIE: Erori la stoc - ${stockResult.errors.join("; ")}`;
          } else {
            stockMessage = " Stocul nu a necesitat actualizare.";
          }
        } catch (stockError: any) {
          console.error("[Returns] Eroare la readăugarea stocului:", stockError);
          stockMessage = ` EROARE la stoc: ${stockError.message}. Verifică manual!`;
        }
      }

      return {
        success: true,
        message: `Retur scanat! Comanda ${directMatch.order?.shopifyOrderNumber || directMatch.orderId}.${stockMessage}`,
        type: "success",
        returnAwb: {
          id: returnRecord.id,
          returnAwbNumber: returnRecord.returnAwbNumber,
          originalAwbNumber: directMatch.awbNumber,
          orderNumber: directMatch.order?.shopifyOrderNumber || null,
          orderId: directMatch.orderId,
          status: returnRecord.status,
        },
      };
    }
  }

  // 3. Search for AWBs in return status - this might be a FanCourier return AWB
  // When FanCourier creates a return, they generate a new AWB number
  // We need to find orders with RETURNED status and no return scan yet
  const pendingReturns = await prisma.aWB.findMany({
    where: {
      currentStatus: {
        in: [
          "returned",
          "RETURNED",
          "S6",
          "S7",
          "S15",
          "S16",
          "S33",
          "S43",
          "Refuz primire",
          "Retur",
        ],
      },
      returnAwbs: {
        none: {},
      },
    },
    include: {
      order: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50, // Limit to recent returns
  });

  if (pendingReturns.length > 0) {
    // We have pending returns - create an unlinked return record
    // User can manually link it or we can try to match via FanCourier API later
    const returnRecord = await prisma.returnAWB.create({
      data: {
        returnAwbNumber: cleanAwbNumber,
        scannedBy: userId,
        scannedByName: userName,
        status: "received",
        notes: `Scanat manual. ${pendingReturns.length} comenzi in retur neprocesat.`,
      },
    });

    return {
      success: true,
      message: `AWB de retur ${cleanAwbNumber} scanat. Exista ${pendingReturns.length} comenzi in retur - selecteaza comanda originala pentru mapare.`,
      type: "warning",
      returnAwb: {
        id: returnRecord.id,
        returnAwbNumber: returnRecord.returnAwbNumber,
        originalAwbNumber: null,
        orderNumber: null,
        orderId: null,
        status: returnRecord.status,
      },
    };
  }

  // 4. No pending returns found - still record the scan for later processing
  const returnRecord = await prisma.returnAWB.create({
    data: {
      returnAwbNumber: cleanAwbNumber,
      scannedBy: userId,
      scannedByName: userName,
      status: "received",
      notes: "AWB scanat - nu s-a gasit comanda originala automat",
    },
  });

  return {
    success: true,
    message: `AWB ${cleanAwbNumber} inregistrat. Comanda originala trebuie mapata manual.`,
    type: "warning",
    returnAwb: {
      id: returnRecord.id,
      returnAwbNumber: returnRecord.returnAwbNumber,
      originalAwbNumber: null,
      orderNumber: null,
      orderId: null,
      status: returnRecord.status,
    },
  };
}

/**
 * Get list of scanned returns
 */
export async function getScannedReturns(options?: {
  status?: string;
  limit?: number;
  unmappedOnly?: boolean;
}) {
  const whereClause: Record<string, unknown> = {};

  if (options?.status) {
    whereClause.status = options.status;
  }

  if (options?.unmappedOnly) {
    whereClause.orderId = null;
  }

  return prisma.returnAWB.findMany({
    where: whereClause,
    include: {
      originalAwb: {
        include: {
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true,
              customerFirstName: true,
              customerLastName: true,
              totalPrice: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          shopifyOrderNumber: true,
          customerFirstName: true,
          customerLastName: true,
          totalPrice: true,
        },
      },
    },
    orderBy: {
      scannedAt: "desc",
    },
    take: options?.limit || 100,
  });
}

/**
 * Get pending returns (AWBs in return status without a return scan)
 */
export async function getPendingReturns() {
  return prisma.aWB.findMany({
    where: {
      currentStatus: {
        in: [
          "returned",
          "RETURNED",
          "S6",
          "S7",
          "S15",
          "S16",
          "S33",
          "S43",
          "Refuz primire",
          "Retur",
        ],
      },
      returnAwbs: {
        none: {},
      },
    },
    include: {
      order: {
        select: {
          id: true,
          shopifyOrderNumber: true,
          customerFirstName: true,
          customerLastName: true,
          shippingCity: true,
          totalPrice: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

/**
 * Link a return AWB to an order
 */
export async function linkReturnToOrder(
  returnAwbId: string,
  orderId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  const returnAwb = await prisma.returnAWB.findUnique({
    where: { id: returnAwbId },
  });

  if (!returnAwb) {
    return { success: false, message: "Return AWB nu a fost gasit" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { awb: true },
  });

  if (!order) {
    return { success: false, message: "Comanda nu a fost gasita" };
  }

  await prisma.returnAWB.update({
    where: { id: returnAwbId },
    data: {
      orderId: orderId,
      originalAwbId: order.awb?.id || null,
      processedBy: userId,
      processedByName: userName,
      processedAt: new Date(),
    },
  });

  // Readăugăm stocul în inventar
  try {
    const stockResult = await processStockReturnForOrder(orderId, returnAwbId);

    if (stockResult.alreadyProcessed) {
      return {
        success: true,
        message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}. Stocul fusese deja procesat anterior.`,
      };
    }

    if (stockResult.success && stockResult.processed > 0) {
      // Actualizăm status la stock_returned
      await prisma.returnAWB.update({
        where: { id: returnAwbId },
        data: { status: "stock_returned" },
      });

      console.log(`[Returns] Stoc readăugat: ${stockResult.processed} mișcări pentru comanda ${orderId}`);
      return {
        success: true,
        message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}. Stocul a fost actualizat (${stockResult.processed} produse).`,
      };
    }

    if (stockResult.errors.length > 0) {
      console.error("[Returns] Erori la procesarea stocului:", stockResult.errors);
      return {
        success: true,
        message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}. ATENȚIE: Stocul NU a fost actualizat complet - ${stockResult.errors.join("; ")}`,
      };
    }

    // Nicio mișcare procesată (posibil produse fără SKU)
    return {
      success: true,
      message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}. Stocul nu a necesitat actualizare (produse fără SKU în inventar).`,
    };
  } catch (stockError: any) {
    console.error("[Returns] Eroare la readăugarea stocului:", stockError);
    return {
      success: true,
      message: `Return AWB mapat la comanda ${order.shopifyOrderNumber}. EROARE la stoc: ${stockError.message}. Verifică manual!`,
    };
  }
}
