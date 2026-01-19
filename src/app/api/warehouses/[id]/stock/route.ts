import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Stocul din depozit
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Verifică existența depozitului
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      select: { id: true, name: true, code: true },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    const where: any = {
      warehouseId: id,
    };

    // Filtrare după text (SKU sau nume articol)
    if (search) {
      where.item = {
        OR: [
          { sku: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Filtrare stoc scăzut
    if (lowStock) {
      where.AND = [
        { minStock: { not: null } },
        {
          OR: [
            { currentStock: { lte: prisma.raw('warehouse_stocks."minStock"') } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [stockItems, total] = await Promise.all([
      prisma.warehouseStock.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              isComposite: true,
              isActive: true,
              minStock: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { item: { name: "asc" } },
        ],
        skip,
        take: limit,
      }),
      prisma.warehouseStock.count({ where }),
    ]);

    // Transformă rezultatele pentru a include minStock efectiv
    const stockWithAlerts = stockItems.map(stock => ({
      ...stock,
      effectiveMinStock: stock.minStock || stock.item.minStock,
      isLowStock: stock.minStock
        ? Number(stock.currentStock) <= Number(stock.minStock)
        : stock.item.minStock
          ? Number(stock.currentStock) <= Number(stock.item.minStock)
          : false,
    }));

    return NextResponse.json({
      warehouse,
      items: stockWithAlerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching warehouse stock:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea stocului" },
      { status: 500 }
    );
  }
}

// POST - Ajustare stoc în depozit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canAdjust = await hasPermission(session.user.id, "inventory.adjust");
    if (!canAdjust) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id: warehouseId } = await params;

    // Verifică accesul la depozit
    const hasAccess = await hasWarehouseAccess(session.user.id, warehouseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la acest depozit" }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, type, quantity, reason, notes } = body;

    // Validări
    if (!itemId || !type || !quantity) {
      return NextResponse.json(
        { error: "itemId, type și quantity sunt obligatorii" },
        { status: 400 }
      );
    }

    if (!["ADJUSTMENT_PLUS", "ADJUSTMENT_MINUS"].includes(type)) {
      return NextResponse.json(
        { error: "Tipul trebuie să fie ADJUSTMENT_PLUS sau ADJUSTMENT_MINUS" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Cantitatea trebuie să fie un număr pozitiv" },
        { status: 400 }
      );
    }

    // Verifică existența depozitului
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    // Verifică existența articolului
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: "Articolul nu a fost găsit" }, { status: 404 });
    }

    if (item.isComposite) {
      return NextResponse.json(
        { error: "Nu poți ajusta stocul pentru articole compuse" },
        { status: 400 }
      );
    }

    // Obține sau creează înregistrarea de stoc pentru acest depozit
    let warehouseStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
    });

    const previousStock = warehouseStock ? Number(warehouseStock.currentStock) : 0;
    const adjustedQty = type === "ADJUSTMENT_PLUS" ? qty : -qty;
    const newStock = previousStock + adjustedQty;

    if (newStock < 0) {
      return NextResponse.json(
        { error: `Stocul nu poate fi negativ. Stoc actual: ${previousStock}, ajustare: ${adjustedQty}` },
        { status: 400 }
      );
    }

    // Transaction: actualizează stocul și creează mișcarea
    const result = await prisma.$transaction(async (tx) => {
      // Actualizează sau creează înregistrarea de stoc în depozit
      const updatedStock = await tx.warehouseStock.upsert({
        where: {
          warehouseId_itemId: {
            warehouseId,
            itemId,
          },
        },
        create: {
          warehouseId,
          itemId,
          currentStock: newStock,
        },
        update: {
          currentStock: newStock,
        },
      });

      // Creează mișcarea de stoc
      const movement = await tx.inventoryStockMovement.create({
        data: {
          itemId,
          type,
          quantity: adjustedQty,
          previousStock,
          newStock,
          warehouseId,
          reason,
          notes,
          userId: session.user.id,
          userName: session.user.name || session.user.email || undefined,
        },
      });

      // Actualizează stocul total în InventoryItem (suma din toate depozitele)
      const totalStock = await tx.warehouseStock.aggregate({
        where: { itemId },
        _sum: { currentStock: true },
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: totalStock._sum.currentStock || 0 },
      });

      return { stock: updatedStock, movement };
    });

    return NextResponse.json({
      success: true,
      previousStock,
      newStock,
      movement: result.movement,
    });
  } catch (error) {
    console.error("Error adjusting warehouse stock:", error);
    return NextResponse.json(
      { error: "Eroare la ajustarea stocului" },
      { status: 500 }
    );
  }
}
