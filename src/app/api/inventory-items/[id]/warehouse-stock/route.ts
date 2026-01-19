import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, getUserWarehouses } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Stocul unui articol per depozit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică dacă articolul există
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        currentStock: true,
        minStock: true,
        isComposite: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Articolul nu a fost găsit" }, { status: 404 });
    }

    // Articolele compuse nu au stoc per depozit
    if (item.isComposite) {
      return NextResponse.json({
        success: true,
        data: {
          item,
          warehouseStocks: [],
          message: "Articolele compuse nu au stoc per depozit",
        },
      });
    }

    // Obține depozitele la care utilizatorul are acces
    const userWarehouseIds = await getUserWarehouses(session.user.id);

    // Obține stocul per depozit (doar din depozitele accesibile)
    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: {
        itemId: id,
        ...(userWarehouseIds.length > 0 && {
          warehouseId: { in: userWarehouseIds },
        }),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            isPrimary: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        warehouse: {
          sortOrder: "asc",
        },
      },
    });

    // Calculează totalul
    const totalStock = warehouseStocks.reduce(
      (sum, ws) => sum + Number(ws.currentStock),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        item,
        warehouseStocks: warehouseStocks.map((ws) => ({
          warehouseId: ws.warehouseId,
          warehouse: ws.warehouse,
          currentStock: Number(ws.currentStock),
          minStock: ws.minStock ? Number(ws.minStock) : null,
        })),
        totalStock,
      },
    });
  } catch (error: any) {
    console.error("Error fetching warehouse stock:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcarea stocului per depozit" },
      { status: 500 }
    );
  }
}
