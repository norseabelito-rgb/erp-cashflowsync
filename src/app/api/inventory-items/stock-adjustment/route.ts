import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";
import { syncItemTotalStock } from "@/lib/inventory-stock";

export const dynamic = 'force-dynamic';

// POST - Ajustare stoc pentru un articol într-un depozit specific
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, warehouseId, type, quantity, reason, notes } = body;

    // Validare câmpuri obligatorii
    if (!itemId || !warehouseId || !type || quantity === undefined) {
      return NextResponse.json({
        success: false,
        error: "ID articol, ID depozit, tip și cantitate sunt obligatorii",
      }, { status: 400 });
    }

    // Validare tip ajustare
    if (!["ADJUSTMENT_PLUS", "ADJUSTMENT_MINUS"].includes(type)) {
      return NextResponse.json({
        success: false,
        error: "Tipul ajustării trebuie să fie ADJUSTMENT_PLUS sau ADJUSTMENT_MINUS",
      }, { status: 400 });
    }

    // Verifică accesul la depozit
    const canAccessWarehouse = await hasWarehouseAccess(session.user.id, warehouseId);
    if (!canAccessWarehouse) {
      return NextResponse.json({
        success: false,
        error: "Nu ai acces la acest depozit",
      }, { status: 403 });
    }

    // Verifică dacă depozitul există și este activ
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      return NextResponse.json({
        success: false,
        error: "Depozitul nu a fost găsit",
      }, { status: 404 });
    }

    if (!warehouse.isActive) {
      return NextResponse.json({
        success: false,
        error: "Nu poți ajusta stocul într-un depozit inactiv",
      }, { status: 400 });
    }

    // Verifică dacă articolul există
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({
        success: false,
        error: "Articolul nu a fost găsit",
      }, { status: 404 });
    }

    // Articolele compuse nu au stoc propriu
    if (item.isComposite) {
      return NextResponse.json({
        success: false,
        error: "Articolele compuse nu au stoc propriu. Ajustează stocul componentelor.",
      }, { status: 400 });
    }

    // Obține stocul curent din depozit
    const warehouseStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
    });

    const previousStock = Number(warehouseStock?.currentStock || 0);
    const adjustmentQty = type === "ADJUSTMENT_PLUS" ? Math.abs(quantity) : -Math.abs(quantity);
    const newStock = previousStock + adjustmentQty;

    // Nu permitem stoc negativ
    if (newStock < 0) {
      return NextResponse.json({
        success: false,
        error: `Stocul nu poate fi negativ. Stoc curent în depozit: ${previousStock}, ajustare: ${adjustmentQty}`,
      }, { status: 400 });
    }

    // Actualizează stocul în depozit și creează mișcarea
    const result = await prisma.$transaction(async (tx) => {
      // Actualizează sau creează stocul în depozit
      const updatedWarehouseStock = await tx.warehouseStock.upsert({
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
          warehouseId,
          type,
          quantity: adjustmentQty,
          previousStock,
          newStock,
          reason: reason || (type === "ADJUSTMENT_PLUS" ? "Ajustare pozitivă" : "Ajustare negativă"),
          notes,
          userId: session.user.id,
          userName: session.user.name || session.user.email,
        },
      });

      return { warehouseStock: updatedWarehouseStock, movement };
    });

    // Sincronizează stocul total în InventoryItem
    const totalStock = await syncItemTotalStock(itemId);

    // Reîncarcă articolul cu stocul actualizat
    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json({
      success: true,
      data: {
        item: updatedItem,
        warehouseStock: result.warehouseStock,
        movement: result.movement,
        totalStock,
      },
      message: `Stocul în ${warehouse.name} a fost ${type === "ADJUSTMENT_PLUS" ? "crescut" : "scăzut"} cu ${Math.abs(quantity)} unități`,
    });
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la ajustarea stocului",
    }, { status: 500 });
  }
}

// GET - Istoricul mișcărilor de stoc
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const warehouseId = searchParams.get("warehouseId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (itemId) {
      where.itemId = itemId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      prisma.inventoryStockMovement.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryStockMovement.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        movements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea mișcărilor de stoc",
    }, { status: 500 });
  }
}
