import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// POST - Preview transfer (verificare stoc disponibil)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "transfers.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Obține transferul cu articolele
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
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
                minStock: true,
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
        { error: "Poți previzualiza doar transferurile în status DRAFT" },
        { status: 400 }
      );
    }

    // Verifică accesul la depozitul sursă
    const hasAccess = await hasWarehouseAccess(session.user.id, transfer.fromWarehouseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la depozitul sursă" }, { status: 403 });
    }

    // Verifică stocul pentru fiecare articol
    const previewItems = await Promise.all(
      transfer.items.map(async (transferItem) => {
        // Stoc în depozitul sursă
        const fromStock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: transferItem.itemId,
            },
          },
          select: { currentStock: true, minStock: true },
        });

        // Stoc în depozitul destinație
        const toStock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.toWarehouseId,
              itemId: transferItem.itemId,
            },
          },
          select: { currentStock: true },
        });

        const currentFromStock = Number(fromStock?.currentStock || 0);
        const currentToStock = Number(toStock?.currentStock || 0);
        const quantity = Number(transferItem.quantity);
        const minStock = Number(fromStock?.minStock || transferItem.item.minStock || 0);

        const newFromStock = currentFromStock - quantity;
        const newToStock = currentToStock + quantity;

        const hasSufficientStock = currentFromStock >= quantity;
        const willBeBelowMinStock = minStock > 0 && newFromStock < minStock;

        return {
          item: transferItem.item,
          quantity,
          fromWarehouse: {
            currentStock: currentFromStock,
            newStock: newFromStock,
            minStock,
          },
          toWarehouse: {
            currentStock: currentToStock,
            newStock: newToStock,
          },
          status: {
            hasSufficientStock,
            willBeBelowMinStock,
            isValid: hasSufficientStock,
          },
        };
      })
    );

    // Rezumat
    const validItems = previewItems.filter(item => item.status.isValid);
    const invalidItems = previewItems.filter(item => !item.status.isValid);
    const warningItems = previewItems.filter(item => item.status.willBeBelowMinStock);

    const canExecute = invalidItems.length === 0;

    return NextResponse.json({
      transfer: {
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        fromWarehouse: transfer.fromWarehouse,
        toWarehouse: transfer.toWarehouse,
        notes: transfer.notes,
      },
      items: previewItems,
      summary: {
        totalItems: previewItems.length,
        validItems: validItems.length,
        invalidItems: invalidItems.length,
        warningItems: warningItems.length,
        canExecute,
      },
      errors: invalidItems.map(item => ({
        sku: item.item.sku,
        name: item.item.name,
        reason: `Stoc insuficient. Disponibil: ${item.fromWarehouse.currentStock}, Cerut: ${item.quantity}`,
      })),
      warnings: warningItems
        .filter(item => item.status.isValid)
        .map(item => ({
          sku: item.item.sku,
          name: item.item.name,
          reason: `După transfer, stocul va fi sub minim. Nou stoc: ${item.fromWarehouse.newStock}, Minim: ${item.fromWarehouse.minStock}`,
        })),
    });
  } catch (error) {
    console.error("Error previewing transfer:", error);
    return NextResponse.json(
      { error: "Eroare la previzualizarea transferului" },
      { status: 500 }
    );
  }
}
