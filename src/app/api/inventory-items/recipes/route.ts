import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista articolelor compuse și statusul rețetelor
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
    const search = searchParams.get("search") || "";
    const hasRecipe = searchParams.get("hasRecipe");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {
      isComposite: true,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
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
          _count: {
            select: {
              mappedProducts: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Filtrare după status rețetă
    let filteredItems = items;
    if (hasRecipe === "true") {
      filteredItems = items.filter(item => item.recipeComponents.length > 0);
    } else if (hasRecipe === "false") {
      filteredItems = items.filter(item => item.recipeComponents.length === 0);
    }

    // Calculează costul și capacitatea de producție
    const itemsWithCost = filteredItems.map(item => {
      let recipeCost = 0;
      let canProduce = Infinity;

      for (const comp of item.recipeComponents) {
        const componentCost = Number(comp.componentItem.costPrice || 0);
        const componentStock = Number(comp.componentItem.currentStock);
        const quantity = Number(comp.quantity);

        recipeCost += componentCost * quantity;

        if (quantity > 0) {
          const possibleUnits = Math.floor(componentStock / quantity);
          canProduce = Math.min(canProduce, possibleUnits);
        }
      }

      return {
        ...item,
        recipeCost: item.recipeComponents.length > 0 ? recipeCost : null,
        canProduce: item.recipeComponents.length > 0 ? (canProduce === Infinity ? 0 : canProduce) : null,
        hasRecipe: item.recipeComponents.length > 0,
      };
    });

    // Statistici
    const allComposites = await prisma.inventoryItem.count({
      where: { isComposite: true, isActive: true },
    });

    const withRecipes = await prisma.inventoryItem.count({
      where: {
        isComposite: true,
        isActive: true,
        recipeComponents: { some: {} },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: itemsWithCost,
        pagination: {
          page,
          limit,
          total: hasRecipe ? filteredItems.length : total,
          totalPages: Math.ceil((hasRecipe ? filteredItems.length : total) / limit),
        },
        stats: {
          totalComposite: allComposites,
          withRecipes,
          withoutRecipes: allComposites - withRecipes,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea rețetelor",
    }, { status: 500 });
  }
}

// PUT - Actualizare rețetă
export async function PUT(request: NextRequest) {
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
    const { compositeItemId, components } = body;

    if (!compositeItemId) {
      return NextResponse.json({
        success: false,
        error: "ID-ul articolului compus este obligatoriu",
      }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: compositeItemId },
    });

    if (!item) {
      return NextResponse.json({
        success: false,
        error: "Articolul nu a fost găsit",
      }, { status: 404 });
    }

    if (!item.isComposite) {
      return NextResponse.json({
        success: false,
        error: "Doar articolele compuse pot avea rețete",
      }, { status: 400 });
    }

    // Șterge componentele existente
    await prisma.inventoryRecipeComponent.deleteMany({
      where: { compositeItemId },
    });

    // Creează componentele noi
    if (components && components.length > 0) {
      for (const comp of components) {
        if (comp.componentItemId === compositeItemId) {
          return NextResponse.json({
            success: false,
            error: "Un articol nu poate fi componentă în propria rețetă",
          }, { status: 400 });
        }

        const componentItem = await prisma.inventoryItem.findUnique({
          where: { id: comp.componentItemId },
        });

        if (!componentItem) {
          return NextResponse.json({
            success: false,
            error: `Componenta cu ID ${comp.componentItemId} nu a fost găsită`,
          }, { status: 400 });
        }

        if (componentItem.isComposite) {
          return NextResponse.json({
            success: false,
            error: `Articolul "${componentItem.name}" este compus și nu poate fi folosit ca ingredient`,
          }, { status: 400 });
        }
      }

      await prisma.inventoryRecipeComponent.createMany({
        data: components.map((comp: any, index: number) => ({
          compositeItemId,
          componentItemId: comp.componentItemId,
          quantity: comp.quantity,
          unit: comp.unit || null,
          sortOrder: index,
        })),
      });
    }

    const updatedItem = await prisma.inventoryItem.findUnique({
      where: { id: compositeItemId },
      include: {
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
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: components?.length > 0
        ? `Rețeta a fost actualizată cu ${components.length} componente`
        : "Rețeta a fost ștearsă",
    });
  } catch (error: any) {
    console.error("Error updating recipe:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la actualizarea rețetei",
    }, { status: 500 });
  }
}
