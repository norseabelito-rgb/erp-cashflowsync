import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

// POST - Sincronizează stocurile articolelor cu depozitul principal
// Acest endpoint asociază toate articolele care nu au stoc în niciun depozit cu depozitul principal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică dacă utilizatorul este super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "Doar super admin poate rula sincronizarea" }, { status: 403 });
    }

    // Găsește depozitul principal
    const primaryWarehouse = await prisma.warehouse.findFirst({
      where: { isPrimary: true },
    });

    if (!primaryWarehouse) {
      return NextResponse.json({
        success: false,
        error: "Nu există depozit principal. Creează un depozit și setează-l ca principal.",
      }, { status: 400 });
    }

    console.log(`Syncing stocks to primary warehouse: ${primaryWarehouse.name} (${primaryWarehouse.id})`);

    // Găsește toate articolele non-compuse care nu au stoc în niciun depozit
    const itemsWithoutWarehouseStock = await prisma.inventoryItem.findMany({
      where: {
        isComposite: false,
        warehouseStocks: {
          none: {},
        },
      },
      select: {
        id: true,
        sku: true,
        currentStock: true,
        minStock: true,
      },
    });

    console.log(`Found ${itemsWithoutWarehouseStock.length} items without warehouse stock`);

    let syncedItems = 0;
    let syncedWithStock = 0;

    for (const item of itemsWithoutWarehouseStock) {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: primaryWarehouse.id,
          itemId: item.id,
          currentStock: item.currentStock,
          minStock: item.minStock,
        },
      });
      syncedItems++;
      if (Number(item.currentStock) > 0) {
        syncedWithStock++;
      }
    }

    console.log(`Synced ${syncedItems} items to primary warehouse`);

    // Actualizează mișcările de stoc care nu au warehouseId
    const updatedMovements = await prisma.inventoryStockMovement.updateMany({
      where: { warehouseId: null },
      data: { warehouseId: primaryWarehouse.id },
    });

    console.log(`Updated ${updatedMovements.count} stock movements`);

    // Actualizează recepțiile care nu au warehouseId
    const updatedReceipts = await prisma.goodsReceipt.updateMany({
      where: { warehouseId: null },
      data: { warehouseId: primaryWarehouse.id },
    });

    console.log(`Updated ${updatedReceipts.count} goods receipts`);

    return NextResponse.json({
      success: true,
      message: "Sincronizarea a fost efectuată cu succes",
      results: {
        warehouse: {
          id: primaryWarehouse.id,
          code: primaryWarehouse.code,
          name: primaryWarehouse.name,
        },
        syncedItems,
        syncedWithStock,
        updatedMovements: updatedMovements.count,
        updatedReceipts: updatedReceipts.count,
      },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la sincronizare",
    }, { status: 500 });
  }
}

// GET - Verifică statusul sincronizării
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const primaryWarehouse = await prisma.warehouse.findFirst({
      where: { isPrimary: true },
    });

    // Numără articolele fără stoc în depozite
    const itemsWithoutWarehouseStock = await prisma.inventoryItem.count({
      where: {
        isComposite: false,
        warehouseStocks: {
          none: {},
        },
      },
    });

    // Numără articolele cu stoc în depozite
    const itemsWithWarehouseStock = await prisma.inventoryItem.count({
      where: {
        isComposite: false,
        warehouseStocks: {
          some: {},
        },
      },
    });

    // Mișcări fără depozit
    const movementsWithoutWarehouse = await prisma.inventoryStockMovement.count({
      where: { warehouseId: null },
    });

    // Recepții fără depozit
    const receiptsWithoutWarehouse = await prisma.goodsReceipt.count({
      where: { warehouseId: null },
    });

    return NextResponse.json({
      hasPrimaryWarehouse: !!primaryWarehouse,
      primaryWarehouse: primaryWarehouse ? {
        id: primaryWarehouse.id,
        code: primaryWarehouse.code,
        name: primaryWarehouse.name,
      } : null,
      stats: {
        itemsWithoutWarehouseStock,
        itemsWithWarehouseStock,
        movementsWithoutWarehouse,
        receiptsWithoutWarehouse,
      },
      needsSync: itemsWithoutWarehouseStock > 0 || movementsWithoutWarehouse > 0 || receiptsWithoutWarehouse > 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Eroare la verificare",
    }, { status: 500 });
  }
}
