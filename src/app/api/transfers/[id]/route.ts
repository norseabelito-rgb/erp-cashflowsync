import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Detalii transfer
export async function GET(
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
                currentStock: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferul nu a fost găsit" }, { status: 404 });
    }

    // Verifică accesul la cel puțin unul din depozite
    const hasFromAccess = await hasWarehouseAccess(session.user.id, transfer.fromWarehouseId);
    const hasToAccess = await hasWarehouseAccess(session.user.id, transfer.toWarehouseId);

    if (!hasFromAccess && !hasToAccess) {
      return NextResponse.json({ error: "Nu ai acces la acest transfer" }, { status: 403 });
    }

    // Adaugă stocul curent din depozitul sursă pentru fiecare articol
    const itemsWithStock = await Promise.all(
      transfer.items.map(async (transferItem) => {
        const warehouseStock = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: transfer.fromWarehouseId,
              itemId: transferItem.itemId,
            },
          },
          select: { currentStock: true },
        });

        return {
          ...transferItem,
          sourceStock: warehouseStock?.currentStock || 0,
        };
      })
    );

    return NextResponse.json({
      ...transfer,
      items: itemsWithStock,
    });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea transferului" },
      { status: 500 }
    );
  }
}

// PUT - Actualizare transfer (doar DRAFT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "transfers.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { items, notes } = body;

    // Verifică existența și status-ul transferului
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferul nu a fost găsit" }, { status: 404 });
    }

    if (transfer.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Poți modifica doar transferurile în status DRAFT" },
        { status: 400 }
      );
    }

    // Verifică accesul la depozitul sursă
    const hasAccess = await hasWarehouseAccess(session.user.id, transfer.fromWarehouseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la depozitul sursă" }, { status: 403 });
    }

    // Actualizează transferul
    const updated = await prisma.$transaction(async (tx) => {
      // Șterge articolele vechi
      await tx.warehouseTransferItem.deleteMany({
        where: { transferId: id },
      });

      // Adaugă articolele noi
      const updatedTransfer = await tx.warehouseTransfer.update({
        where: { id },
        data: {
          notes,
          items: {
            create: items.map((item: { itemId: string; quantity: number; notes?: string }) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
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

      return updatedTransfer;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating transfer:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea transferului" },
      { status: 500 }
    );
  }
}

// DELETE - Ștergere transfer (doar DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCancel = await hasPermission(session.user.id, "transfers.cancel");
    if (!canCancel) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică existența și status-ul transferului
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferul nu a fost găsit" }, { status: 404 });
    }

    if (transfer.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Poți șterge doar transferurile în status DRAFT" },
        { status: 400 }
      );
    }

    // Șterge transferul
    await prisma.warehouseTransfer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transfer:", error);
    return NextResponse.json(
      { error: "Eroare la ștergerea transferului" },
      { status: 500 }
    );
  }
}
