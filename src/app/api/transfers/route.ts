import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess, getUserWarehouses } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// Generare număr transfer unic
async function generateTransferNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Găsește ultimul număr din ziua curentă
  const lastTransfer = await prisma.warehouseTransfer.findFirst({
    where: {
      transferNumber: { startsWith: `TRF-${dateStr}` },
    },
    orderBy: { transferNumber: "desc" },
  });

  let sequence = 1;
  if (lastTransfer) {
    const lastSequence = parseInt(lastTransfer.transferNumber.split("-")[2] || "0");
    sequence = lastSequence + 1;
  }

  return `TRF-${dateStr}-${sequence.toString().padStart(3, "0")}`;
}

// GET - Lista transferurilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "transfers.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const fromWarehouseId = searchParams.get("fromWarehouseId");
    const toWarehouseId = searchParams.get("toWarehouseId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Obține depozitele la care utilizatorul are acces
    const userWarehouseIds = await getUserWarehouses(session.user.id);

    const where: any = {
      OR: [
        { fromWarehouseId: { in: userWarehouseIds } },
        { toWarehouseId: { in: userWarehouseIds } },
      ],
    };

    if (status) {
      where.status = status;
    }

    if (fromWarehouseId) {
      where.fromWarehouseId = fromWarehouseId;
    }

    if (toWarehouseId) {
      where.toWarehouseId = toWarehouseId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      prisma.warehouseTransfer.findMany({
        where,
        include: {
          fromWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          toWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.warehouseTransfer.count({ where }),
    ]);

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea transferurilor" },
      { status: 500 }
    );
  }
}

// POST - Creare transfer nou
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "transfers.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { fromWarehouseId, toWarehouseId, items, notes } = body;

    // Validări
    if (!fromWarehouseId || !toWarehouseId) {
      return NextResponse.json(
        { error: "Depozitul sursă și destinație sunt obligatorii" },
        { status: 400 }
      );
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Depozitul sursă și destinație trebuie să fie diferite" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Transferul trebuie să conțină cel puțin un articol" },
        { status: 400 }
      );
    }

    // Verifică accesul la depozite
    const hasFromAccess = await hasWarehouseAccess(session.user.id, fromWarehouseId);
    const hasToAccess = await hasWarehouseAccess(session.user.id, toWarehouseId);

    if (!hasFromAccess || !hasToAccess) {
      return NextResponse.json(
        { error: "Nu ai acces la unul sau ambele depozite" },
        { status: 403 }
      );
    }

    // Verifică existența depozitelor
    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ]);

    if (!fromWarehouse || !toWarehouse) {
      return NextResponse.json({ error: "Unul sau ambele depozite nu au fost găsite" }, { status: 404 });
    }

    if (!fromWarehouse.isActive || !toWarehouse.isActive) {
      return NextResponse.json(
        { error: "Nu poți transfera din/către un depozit inactiv" },
        { status: 400 }
      );
    }

    // Validează articolele
    for (const item of items) {
      if (!item.itemId || !item.quantity || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { error: "Fiecare articol trebuie să aibă itemId și o cantitate pozitivă" },
          { status: 400 }
        );
      }
    }

    // Generează numărul de transfer
    const transferNumber = await generateTransferNumber();

    // Creează transferul
    const transfer = await prisma.warehouseTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        status: "DRAFT",
        notes,
        createdById: session.user.id,
        createdByName: session.user.name || session.user.email || undefined,
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

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error("Error creating transfer:", error);
    return NextResponse.json(
      { error: "Eroare la crearea transferului" },
      { status: 500 }
    );
  }
}
