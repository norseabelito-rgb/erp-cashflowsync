import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, getPrimaryWarehouse } from "@/lib/permissions";
import { notifyNIRStockTransferred } from "@/lib/notification-service";

export const dynamic = 'force-dynamic';

/**
 * POST - Transfer NIR items to stock (final step)
 * Transition: APROBAT -> IN_STOC
 *
 * This is the final step that actually adds inventory.
 *
 * Steps:
 * 1. Validate NIR status is APROBAT
 * 2. Get primary warehouse
 * 3. For each GoodsReceiptItem: add stock via WarehouseStock + InventoryStockMovement
 * 4. Update NIR status to IN_STOC
 *
 * Permission: reception.verify
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canVerify = await hasPermission(session.user.id, "reception.verify");
    if (!canVerify) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Get NIR with items
    const nir = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true
          }
        },
        supplier: true
      }
    });

    if (!nir) {
      return NextResponse.json(
        { success: false, error: 'NIR nu a fost gasit' },
        { status: 404 }
      );
    }

    // Idempotency check - already processed
    if (nir.status === 'IN_STOC') {
      return NextResponse.json({
        success: true,
        message: 'Stocul a fost deja transferat',
        alreadyProcessed: true
      });
    }

    // Validate status
    if (nir.status !== 'APROBAT') {
      return NextResponse.json(
        { success: false, error: `NIR-ul trebuie sa fie in status APROBAT. Status actual: ${nir.status}` },
        { status: 400 }
      );
    }

    if (nir.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NIR-ul nu are articole' },
        { status: 400 }
      );
    }

    // Get primary warehouse
    const warehouse = await getPrimaryWarehouse();
    if (!warehouse) {
      return NextResponse.json(
        { success: false, error: 'Nu exista depozit principal configurat' },
        { status: 400 }
      );
    }

    // Process stock transfer in transaction
    const movements: Array<{
      itemId: string;
      sku: string;
      name: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const lineItem of nir.items) {
        const item = lineItem.item;
        const quantity = Number(lineItem.quantity);

        // Get current warehouse stock
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: warehouse.id,
              itemId: item.id
            }
          }
        });

        const previousWarehouseStock = Number(warehouseStock?.currentStock || 0);
        const newWarehouseStock = previousWarehouseStock + quantity;

        // Update or create WarehouseStock
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_itemId: {
              warehouseId: warehouse.id,
              itemId: item.id
            }
          },
          create: {
            warehouseId: warehouse.id,
            itemId: item.id,
            currentStock: newWarehouseStock
          },
          update: {
            currentStock: newWarehouseStock
          }
        });

        // Get current item total stock
        const previousItemStock = Number(item.currentStock);
        const newItemStock = previousItemStock + quantity;

        // Update InventoryItem.currentStock
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: newItemStock,
            // Update cost price if provided on receipt
            ...(lineItem.unitCost && { costPrice: lineItem.unitCost })
          }
        });

        // Create stock movement record
        await tx.inventoryStockMovement.create({
          data: {
            itemId: item.id,
            type: 'RECEIPT',
            quantity: quantity, // Positive for incoming stock
            previousStock: previousItemStock,
            newStock: newItemStock,
            warehouseId: warehouse.id,
            receiptId: nir.id,
            reason: `Intrare NIR ${nir.receiptNumber}${nir.documentNumber ? ` (Fact. ${nir.documentNumber})` : ''}`,
            userId: session.user.id,
            userName: session.user.name || session.user.email
          }
        });

        movements.push({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          quantity,
          previousStock: previousItemStock,
          newStock: newItemStock
        });
      }

      // Update NIR status to IN_STOC
      await tx.goodsReceipt.update({
        where: { id },
        data: {
          status: 'IN_STOC',
          transferredToStockAt: new Date(),
          warehouseId: warehouse.id
        }
      });
    });

    console.log("\n" + "=".repeat(60));
    console.log("NIR TRANSFER STOC COMPLET");
    console.log("=".repeat(60));
    console.log(`NIR: ${nir.receiptNumber}`);
    console.log(`Factura: ${nir.documentNumber || "-"}`);
    console.log(`Furnizor: ${nir.supplier?.name || "-"}`);
    console.log(`Depozit: ${warehouse.name} (${warehouse.code})`);
    console.log(`Articole transferate: ${movements.length}`);
    movements.forEach((m) => {
      console.log(`   - ${m.sku}: +${m.quantity} (${m.previousStock} -> ${m.newStock})`);
    });
    console.log("=".repeat(60) + "\n");

    // Fire-and-forget notification to warehouse user
    notifyNIRStockTransferred(id).catch(err => {
      console.error('Failed to send stock transferred notification:', err);
    });

    return NextResponse.json({
      success: true,
      data: {
        nirId: nir.id,
        receiptNumber: nir.receiptNumber,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name
      },
      movements,
      message: `Stocul a fost transferat din NIR ${nir.receiptNumber}. ${movements.length} articole actualizate.`
    });
  } catch (error: any) {
    console.error("Error transferring NIR to stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la transferul in stoc" },
      { status: 500 }
    );
  }
}
