import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

// POST - Migrare date către sistemul multi-warehouse
// Acest endpoint trebuie apelat o singură dată după deploy
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
      return NextResponse.json({ error: "Doar super admin poate rula migrarea" }, { status: 403 });
    }

    // Verifică dacă migrarea a fost deja făcută
    const existingWarehouse = await prisma.warehouse.findFirst();
    if (existingWarehouse) {
      return NextResponse.json({
        success: false,
        error: "Migrarea a fost deja efectuată. Există deja depozite în sistem.",
        existingWarehouse: {
          id: existingWarehouse.id,
          code: existingWarehouse.code,
          name: existingWarehouse.name,
        },
      }, { status: 400 });
    }

    console.log("Starting warehouse migration...");

    // 1. Creează depozitul principal default
    const primaryWarehouse = await prisma.warehouse.create({
      data: {
        code: "DEP-PRINCIPAL",
        name: "Depozit Principal",
        description: "Depozitul principal creat automat la migrare",
        isPrimary: true,
        isActive: true,
        sortOrder: 0,
      },
    });

    console.log(`Created primary warehouse: ${primaryWarehouse.id}`);

    // 2. Migrează stocurile din InventoryItem.currentStock -> WarehouseStock
    const itemsWithStock = await prisma.inventoryItem.findMany({
      where: {
        isComposite: false,
        currentStock: { gt: 0 },
      },
      select: {
        id: true,
        sku: true,
        currentStock: true,
        minStock: true,
      },
    });

    console.log(`Found ${itemsWithStock.length} items with stock to migrate`);

    let migratedStocks = 0;
    for (const item of itemsWithStock) {
      await prisma.warehouseStock.create({
        data: {
          warehouseId: primaryWarehouse.id,
          itemId: item.id,
          currentStock: item.currentStock,
          minStock: item.minStock,
        },
      });
      migratedStocks++;
    }

    console.log(`Migrated ${migratedStocks} stock records`);

    // 3. Actualizează mișcările de stoc existente cu warehouseId
    const updatedMovements = await prisma.inventoryStockMovement.updateMany({
      where: { warehouseId: null },
      data: { warehouseId: primaryWarehouse.id },
    });

    console.log(`Updated ${updatedMovements.count} stock movements`);

    // 4. Actualizează recepțiile existente cu warehouseId
    const updatedReceipts = await prisma.goodsReceipt.updateMany({
      where: { warehouseId: null },
      data: { warehouseId: primaryWarehouse.id },
    });

    console.log(`Updated ${updatedReceipts.count} goods receipts`);

    // 5. Dă acces la depozit tuturor utilizatorilor activi
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let grantedAccess = 0;
    for (const u of activeUsers) {
      await prisma.userWarehouseAccess.create({
        data: {
          userId: u.id,
          warehouseId: primaryWarehouse.id,
          grantedBy: session.user.id,
        },
      });
      grantedAccess++;
    }

    console.log(`Granted warehouse access to ${grantedAccess} users`);

    return NextResponse.json({
      success: true,
      message: "Migrarea a fost efectuată cu succes",
      results: {
        warehouse: {
          id: primaryWarehouse.id,
          code: primaryWarehouse.code,
          name: primaryWarehouse.name,
        },
        migratedStocks,
        updatedMovements: updatedMovements.count,
        updatedReceipts: updatedReceipts.count,
        grantedAccess,
      },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la migrare",
    }, { status: 500 });
  }
}

// GET - Verifică statusul migrării
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const warehouseCount = await prisma.warehouse.count();
    const primaryWarehouse = await prisma.warehouse.findFirst({
      where: { isPrimary: true },
    });

    const warehouseStockCount = await prisma.warehouseStock.count();
    const movementsWithWarehouse = await prisma.inventoryStockMovement.count({
      where: { warehouseId: { not: null } },
    });
    const movementsWithoutWarehouse = await prisma.inventoryStockMovement.count({
      where: { warehouseId: null },
    });

    return NextResponse.json({
      migrationCompleted: warehouseCount > 0,
      stats: {
        warehouseCount,
        primaryWarehouse: primaryWarehouse ? {
          id: primaryWarehouse.id,
          code: primaryWarehouse.code,
          name: primaryWarehouse.name,
        } : null,
        warehouseStockCount,
        movementsWithWarehouse,
        movementsWithoutWarehouse,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Eroare la verificare",
    }, { status: 500 });
  }
}
