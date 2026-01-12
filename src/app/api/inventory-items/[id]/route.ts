import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Detalii articol individual
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        supplier: true,
        recipeComponents: {
          include: {
            componentItem: {
              select: {
                id: true,
                sku: true,
                name: true,
                currentStock: true,
                unit: true,
                costPrice: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        usedInRecipes: {
          include: {
            compositeItem: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
          },
        },
        mappedProducts: {
          select: {
            id: true,
            sku: true,
            title: true,
            price: true,
            stock: true,
          },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            stockMovements: true,
            mappedProducts: true,
            receiptItems: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({
        success: false,
        error: "Articolul nu a fost găsit",
      }, { status: 404 });
    }

    // Calculează stocul disponibil pentru produse compuse
    let availableStock = null;
    if (item.isComposite && item.recipeComponents.length > 0) {
      // Stocul disponibil = min(stoc_component / cantitate_necesară)
      const stockPerComponent = item.recipeComponents.map(rc => {
        const componentStock = Number(rc.componentItem.currentStock);
        const requiredQty = Number(rc.quantity);
        return Math.floor(componentStock / requiredQty);
      });
      availableStock = Math.min(...stockPerComponent);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        availableStock,
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea articolului",
    }, { status: 500 });
  }
}
