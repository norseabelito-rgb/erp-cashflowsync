import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Detalii depozit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "warehouses.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică accesul la depozit
    const hasAccess = await hasWarehouseAccess(session.user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la acest depozit" }, { status: 403 });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockLevels: true,
            stockMovements: true,
            goodsReceipts: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea depozitului" },
      { status: 500 }
    );
  }
}

// PUT - Actualizare depozit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "warehouses.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică accesul la depozit
    const hasAccess = await hasWarehouseAccess(session.user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la acest depozit" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, address, isActive, sortOrder } = body;

    // Verifică existența depozitului
    const existing = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    // Verifică unicitatea codului
    if (code && code !== existing.code) {
      const duplicateCode = await prisma.warehouse.findUnique({
        where: { code },
      });
      if (duplicateCode) {
        return NextResponse.json(
          { error: "Un depozit cu acest cod există deja" },
          { status: 400 }
        );
      }
    }

    // Nu permite dezactivarea depozitului principal
    if (existing.isPrimary && isActive === false) {
      return NextResponse.json(
        { error: "Nu poți dezactiva depozitul principal. Setează mai întâi alt depozit ca principal." },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        description,
        address,
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea depozitului" },
      { status: 500 }
    );
  }
}

// DELETE - Ștergere depozit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canDelete = await hasPermission(session.user.id, "warehouses.delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică existența depozitului
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockLevels: true,
            transfersFrom: { where: { status: { not: "CANCELLED" } } },
            transfersTo: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    // Nu permite ștergerea depozitului principal
    if (warehouse.isPrimary) {
      return NextResponse.json(
        { error: "Nu poți șterge depozitul principal. Setează mai întâi alt depozit ca principal." },
        { status: 400 }
      );
    }

    // Verifică dacă are stoc
    const hasStock = await prisma.warehouseStock.findFirst({
      where: {
        warehouseId: id,
        currentStock: { gt: 0 },
      },
    });

    if (hasStock) {
      return NextResponse.json(
        { error: "Nu poți șterge un depozit care are stoc. Transferă mai întâi stocul în alt depozit." },
        { status: 400 }
      );
    }

    // Verifică dacă are transferuri active
    if (warehouse._count.transfersFrom > 0 || warehouse._count.transfersTo > 0) {
      return NextResponse.json(
        { error: "Nu poți șterge un depozit care are transferuri active." },
        { status: 400 }
      );
    }

    // Șterge depozitul
    await prisma.warehouse.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Eroare la ștergerea depozitului" },
      { status: 500 }
    );
  }
}
