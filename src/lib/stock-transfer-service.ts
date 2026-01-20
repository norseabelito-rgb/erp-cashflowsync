/**
 * Stock Transfer Service
 *
 * Serviciu pentru verificarea stocului și propunerea de transferuri
 * când produsele nu sunt disponibile în depozitul operațional.
 */

import prisma from "./db";

interface StockCheckResult {
  hasAllStock: boolean;
  missingItems: Array<{
    sku: string;
    title: string;
    requiredQuantity: number;
    availableInOperational: number;
    missingQuantity: number;
    alternativeWarehouses: Array<{
      warehouseId: string;
      warehouseName: string;
      warehouseCode: string;
      availableQuantity: number;
    }>;
  }>;
}

interface TransferProposal {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
  }>;
}

/**
 * Obține depozitul operațional (de unde se expediază)
 */
export async function getOperationalWarehouse() {
  return prisma.warehouse.findFirst({
    where: { isOperational: true, isActive: true },
  });
}

/**
 * Verifică dacă stocul pentru o comandă este disponibil în depozitul operațional
 */
export async function checkStockForOrder(orderId: string): Promise<StockCheckResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lineItems: {
        include: {
          masterProduct: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Comanda nu a fost găsită");
  }

  const operationalWarehouse = await getOperationalWarehouse();

  if (!operationalWarehouse) {
    throw new Error("Nu există depozit operațional configurat");
  }

  const result: StockCheckResult = {
    hasAllStock: true,
    missingItems: [],
  };

  for (const lineItem of order.lineItems) {
    // Căutăm item-ul în inventar pe baza SKU sau masterProductId
    let inventoryItem = null;

    if (lineItem.masterProductId) {
      inventoryItem = await prisma.inventoryItem.findFirst({
        where: { masterProductId: lineItem.masterProductId },
      });
    }

    if (!inventoryItem && lineItem.sku) {
      inventoryItem = await prisma.inventoryItem.findFirst({
        where: { sku: lineItem.sku },
      });
    }

    if (!inventoryItem) {
      // Produsul nu există în inventar - considerăm că nu avem stoc
      result.hasAllStock = false;
      result.missingItems.push({
        sku: lineItem.sku || "N/A",
        title: lineItem.title,
        requiredQuantity: lineItem.quantity,
        availableInOperational: 0,
        missingQuantity: lineItem.quantity,
        alternativeWarehouses: [],
      });
      continue;
    }

    // Verificăm stocul în depozitul operațional
    const stockInOperational = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId: operationalWarehouse.id,
          itemId: inventoryItem.id,
        },
      },
    });

    const availableInOperational = Number(stockInOperational?.currentStock || 0);
    const requiredQuantity = lineItem.quantity;

    if (availableInOperational >= requiredQuantity) {
      // Stocul e suficient
      continue;
    }

    // Stocul e insuficient - căutăm în alte depozite
    result.hasAllStock = false;

    const alternativeStock = await prisma.warehouseStock.findMany({
      where: {
        itemId: inventoryItem.id,
        currentStock: { gt: 0 },
        warehouseId: { not: operationalWarehouse.id },
        warehouse: { isActive: true },
      },
      include: { warehouse: true },
      orderBy: { currentStock: "desc" },
    });

    result.missingItems.push({
      sku: lineItem.sku || inventoryItem.sku,
      title: lineItem.title,
      requiredQuantity,
      availableInOperational,
      missingQuantity: requiredQuantity - availableInOperational,
      alternativeWarehouses: alternativeStock.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseCode: s.warehouse.code,
        availableQuantity: Number(s.currentStock),
      })),
    });
  }

  return result;
}

/**
 * Propune un transfer pentru a acoperi lipsurile de stoc
 * Returnează transferul creat în stare DRAFT
 */
export async function proposeTransferForOrder(orderId: string): Promise<TransferProposal | null> {
  const stockCheck = await checkStockForOrder(orderId);

  if (stockCheck.hasAllStock) {
    return null; // Nu e necesar transfer
  }

  const operationalWarehouse = await getOperationalWarehouse();
  if (!operationalWarehouse) {
    throw new Error("Nu există depozit operațional");
  }

  // Grupăm lipsurile pe depozite sursă
  const transfersBySource = new Map<
    string,
    {
      warehouse: { id: string; name: string; code: string };
      items: Array<{ sku: string; title: string; quantity: number; itemId: string }>;
    }
  >();

  for (const missing of stockCheck.missingItems) {
    if (missing.alternativeWarehouses.length === 0) {
      // Nu avem stoc nicăieri - nu putem propune transfer
      continue;
    }

    // Căutăm inventoryItem pentru a-l adăuga în transfer
    let inventoryItem = await prisma.inventoryItem.findFirst({
      where: { sku: missing.sku },
    });

    if (!inventoryItem) {
      continue;
    }

    // Alegem depozitul cu cel mai mult stoc
    const bestSource = missing.alternativeWarehouses[0];
    const quantityToTransfer = Math.min(missing.missingQuantity, bestSource.availableQuantity);

    if (!transfersBySource.has(bestSource.warehouseId)) {
      transfersBySource.set(bestSource.warehouseId, {
        warehouse: {
          id: bestSource.warehouseId,
          name: bestSource.warehouseName,
          code: bestSource.warehouseCode,
        },
        items: [],
      });
    }

    transfersBySource.get(bestSource.warehouseId)!.items.push({
      sku: missing.sku,
      title: missing.title,
      quantity: quantityToTransfer,
      itemId: inventoryItem.id,
    });
  }

  if (transfersBySource.size === 0) {
    return null; // Nu s-a putut propune niciun transfer
  }

  // Creăm transferuri pentru fiecare sursă (de obicei va fi una singură)
  // Pentru simplitate, creăm un singur transfer de la primul depozit
  const [sourceId, sourceData] = transfersBySource.entries().next().value;

  // Generăm număr unic de transfer
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const count = await prisma.warehouseTransfer.count({
    where: {
      transferNumber: { startsWith: `TRF-${today}` },
    },
  });
  const transferNumber = `TRF-${today}-${String(count + 1).padStart(3, "0")}`;

  // Obținem comanda pentru a lega transferul
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  const transfer = await prisma.warehouseTransfer.create({
    data: {
      transferNumber,
      fromWarehouseId: sourceData.warehouse.id,
      toWarehouseId: operationalWarehouse.id,
      status: "DRAFT",
      isAutoProposed: true,
      notes: `Transfer automat propus pentru comanda ${order?.shopifyOrderNumber || order?.externalOrderNumber || orderId}`,
      items: {
        create: sourceData.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      items: {
        include: { item: true },
      },
    },
  });

  // Actualizăm comanda cu referința la transfer și schimbăm statusul
  await prisma.order.update({
    where: { id: orderId },
    data: {
      requiredTransferId: transfer.id,
      status: "WAIT_TRANSFER",
    },
  });

  console.log(`📦 Transfer propus automat: ${transferNumber} pentru comanda ${order?.shopifyOrderNumber || orderId}`);

  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    fromWarehouseId: transfer.fromWarehouseId,
    fromWarehouseName: transfer.fromWarehouse.name,
    toWarehouseId: transfer.toWarehouseId,
    toWarehouseName: transfer.toWarehouse.name,
    items: sourceData.items.map((item) => ({
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
    })),
  };
}

/**
 * Verifică și propune transfer la sincronizarea comenzii
 * Returnează true dacă comanda necesită transfer
 */
export async function checkAndProposeTransfer(orderId: string): Promise<{
  needsTransfer: boolean;
  transfer?: TransferProposal;
  error?: string;
}> {
  try {
    const stockCheck = await checkStockForOrder(orderId);

    if (stockCheck.hasAllStock) {
      return { needsTransfer: false };
    }

    // Verificăm dacă există deja un transfer pentru această comandă
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { requiredTransfer: true },
    });

    if (existingOrder?.requiredTransferId) {
      return {
        needsTransfer: true,
        transfer: {
          id: existingOrder.requiredTransfer!.id,
          transferNumber: existingOrder.requiredTransfer!.transferNumber,
          fromWarehouseId: existingOrder.requiredTransfer!.fromWarehouseId,
          fromWarehouseName: "",
          toWarehouseId: existingOrder.requiredTransfer!.toWarehouseId,
          toWarehouseName: "",
          items: [],
        },
      };
    }

    const transfer = await proposeTransferForOrder(orderId);

    if (!transfer) {
      return {
        needsTransfer: true,
        error: "Nu s-a putut propune un transfer - stocul nu e disponibil în niciun depozit",
      };
    }

    return {
      needsTransfer: true,
      transfer,
    };
  } catch (error: any) {
    console.error("Eroare la verificarea stocului:", error);
    return {
      needsTransfer: false,
      error: error.message,
    };
  }
}

/**
 * Aprobă un transfer propus și îl pune în stare PENDING
 */
export async function approveTransfer(
  transferId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      return { success: false, error: "Transferul nu a fost găsit" };
    }

    if (transfer.status !== "DRAFT") {
      return { success: false, error: "Transferul nu este în stare DRAFT" };
    }

    await prisma.warehouseTransfer.update({
      where: { id: transferId },
      data: {
        status: "PENDING",
        approvedById: userId,
        approvedByName: userName,
        approvedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Când un transfer e completat, deblocăm comenzile asociate
 */
export async function onTransferCompleted(transferId: string): Promise<void> {
  // Găsim comenzile care așteptau acest transfer
  const orders = await prisma.order.findMany({
    where: {
      requiredTransferId: transferId,
      status: "WAIT_TRANSFER",
    },
  });

  for (const order of orders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING", // Revin la status normal
      },
    });

    console.log(`✅ Comanda ${order.shopifyOrderNumber || order.id} deblocată după finalizarea transferului`);
  }
}
