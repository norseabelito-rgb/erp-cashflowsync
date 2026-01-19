import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = 'force-dynamic';

// POST - Execuție transfer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canExecute = await hasPermission(session.user.id, "transfers.execute");
    if (!canExecute) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Obține transferul cu articolele
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                isComposite: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferul nu a fost găsit" }, { status: 404 });
    }

    if (transfer.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Poți executa doar transferurile în status DRAFT" },
        { status: 400 }
      );
    }

    // Verifică accesul la ambele depozite
    const hasFromAccess = await hasWarehouseAccess(session.user.id, transfer.fromWarehouseId);
    const hasToAccess = await hasWarehouseAccess(session.user.id, transfer.toWarehouseId);

    if (!hasFromAccess || !hasToAccess) {
      return NextResponse.json(
        { error: "Nu ai acces la unul sau ambele depozite" },
        { status: 403 }
      );
    }

    // Verifică dacă depozitele sunt active
    if (!transfer.fromWarehouse.isActive || !transfer.toWarehouse.isActive) {
      return NextResponse.json(
        { error: "Nu poți executa un transfer dacă unul din depozite este inactiv" },
        { status: 400 }
      );
    }

    // Verifică stocul disponibil pentru fiecare articol
    const stockChecks = await Promise.all(
      transfer.items.map(async (item) => {
        if (item.item.isComposite) {
          return {
            itemId: item.itemId,
            sku: item.item.sku,
            valid: false,
            reason: "Nu poți transfera articole compuse",
          };
        }

        const stock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: item.itemId,
            },
          },
          select: { currentStock: true },
        });

        const available = Number(stock?.currentStock || 0);
        const required = Number(item.quantity);

        return {
          itemId: item.itemId,
          sku: item.item.sku,
          valid: available >= required,
          available,
          required,
          reason: available < required
            ? `Stoc insuficient. Disponibil: ${available}, Cerut: ${required}`
            : null,
        };
      })
    );

    const invalidItems = stockChecks.filter(check => !check.valid);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          error: "Nu se poate executa transferul - stoc insuficient",
          details: invalidItems,
        },
        { status: 400 }
      );
    }

    // Execută transferul în tranzacție
    const result = await prisma.$transaction(async (tx) => {
      const movements: any[] = [];
      const itemUpdates: any[] = [];

      for (const transferItem of transfer.items) {
        const quantity = Number(transferItem.quantity);

        // Obține stocul curent din depozitul sursă
        const fromStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: transferItem.itemId,
            },
          },
        });

        // Obține stocul curent din depozitul destinație
        const toStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.toWarehouseId,
              itemId: transferItem.itemId,
            },
          },
        });

        const fromStockBefore = Number(fromStock?.currentStock || 0);
        const toStockBefore = Number(toStock?.currentStock || 0);
        const fromStockAfter = fromStockBefore - quantity;
        const toStockAfter = toStockBefore + quantity;

        // Actualizează stocul în depozitul sursă
        await tx.warehouseStock.update({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: transferItem.itemId,
            },
          },
          data: { currentStock: fromStockAfter },
        });

        // Actualizează sau creează stocul în depozitul destinație
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.toWarehouseId,
              itemId: transferItem.itemId,
            },
          },
          create: {
            warehouseId: transfer.toWarehouseId,
            itemId: transferItem.itemId,
            currentStock: toStockAfter,
          },
          update: {
            currentStock: toStockAfter,
          },
        });

        // Creează mișcarea de stoc - ieșire din sursă
        const movementOut = await tx.inventoryStockMovement.create({
          data: {
            itemId: transferItem.itemId,
            type: "TRANSFER",
            quantity: -quantity,
            previousStock: fromStockBefore,
            newStock: fromStockAfter,
            warehouseId: transfer.fromWarehouseId,
            transferId: transfer.id,
            reason: `Transfer către ${transfer.toWarehouse.name}`,
            notes: `Transfer #${transfer.transferNumber}`,
            userId: session.user.id,
            userName: session.user.name || session.user.email || undefined,
          },
        });

        // Creează mișcarea de stoc - intrare în destinație
        const movementIn = await tx.inventoryStockMovement.create({
          data: {
            itemId: transferItem.itemId,
            type: "TRANSFER",
            quantity: quantity,
            previousStock: toStockBefore,
            newStock: toStockAfter,
            warehouseId: transfer.toWarehouseId,
            transferId: transfer.id,
            reason: `Transfer din ${transfer.fromWarehouse.name}`,
            notes: `Transfer #${transfer.transferNumber}`,
            userId: session.user.id,
            userName: session.user.name || session.user.email || undefined,
          },
        });

        movements.push(movementOut, movementIn);

        // Actualizează snapshot-urile pe linia de transfer
        await tx.warehouseTransferItem.update({
          where: { id: transferItem.id },
          data: {
            fromStockBefore,
            fromStockAfter,
            toStockBefore,
            toStockAfter,
          },
        });

        itemUpdates.push({
          itemId: transferItem.itemId,
          fromStockBefore,
          fromStockAfter,
          toStockBefore,
          toStockAfter,
        });
      }

      // Actualizează stocul total în InventoryItem pentru fiecare articol
      const uniqueItemIds = [...new Set(transfer.items.map(i => i.itemId))];
      for (const itemId of uniqueItemIds) {
        const totalStock = await tx.warehouseStock.aggregate({
          where: { itemId },
          _sum: { currentStock: true },
        });

        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: totalStock._sum.currentStock || 0 },
        });
      }

      // Actualizează status-ul transferului
      const completedTransfer = await tx.warehouseTransfer.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedById: session.user.id,
          completedByName: session.user.name || session.user.email || undefined,
          completedAt: new Date(),
        },
        include: {
          fromWarehouse: {
            select: { id: true, code: true, name: true },
          },
          toWarehouse: {
            select: { id: true, code: true, name: true },
          },
          items: {
            include: {
              item: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      });

      return {
        transfer: completedTransfer,
        movements: movements.length,
        itemUpdates,
      };
    });

    return NextResponse.json({
      success: true,
      transfer: result.transfer,
      summary: {
        itemsTransferred: result.transfer.items.length,
        stockMovementsCreated: result.movements,
      },
    });
  } catch (error) {
    console.error("Error executing transfer:", error);
    return NextResponse.json(
      { error: "Eroare la execuția transferului" },
      { status: 500 }
    );
  }
}
