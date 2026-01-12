import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// POST - Ajustare stoc pentru un articol
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
    const { itemId, type, quantity, reason, notes } = body;

    // Validare câmpuri obligatorii
    if (!itemId || !type || quantity === undefined) {
      return NextResponse.json({
        success: false,
        error: "ID articol, tip și cantitate sunt obligatorii",
      }, { status: 400 });
    }

    // Validare tip ajustare
    if (!["ADJUSTMENT_PLUS", "ADJUSTMENT_MINUS"].includes(type)) {
      return NextResponse.json({
        success: false,
        error: "Tipul ajustării trebuie să fie ADJUSTMENT_PLUS sau ADJUSTMENT_MINUS",
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

    const previousStock = Number(item.currentStock);
    const adjustmentQty = type === "ADJUSTMENT_PLUS" ? Math.abs(quantity) : -Math.abs(quantity);
    const newStock = previousStock + adjustmentQty;

    // Nu permitem stoc negativ
    if (newStock < 0) {
      return NextResponse.json({
        success: false,
        error: `Stocul nu poate fi negativ. Stoc curent: ${previousStock}, ajustare: ${adjustmentQty}`,
      }, { status: 400 });
    }

    // Actualizează stocul și creează mișcarea
    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newStock },
      }),
      prisma.inventoryStockMovement.create({
        data: {
          itemId,
          type,
          quantity: adjustmentQty,
          previousStock,
          newStock,
          reason: reason || (type === "ADJUSTMENT_PLUS" ? "Ajustare pozitivă" : "Ajustare negativă"),
          notes,
          userId: session.user.id,
          userName: session.user.name || session.user.email,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        item: updatedItem,
        movement,
      },
      message: `Stocul a fost ${type === "ADJUSTMENT_PLUS" ? "crescut" : "scăzut"} cu ${Math.abs(quantity)} unități`,
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
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (itemId) {
      where.itemId = itemId;
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
