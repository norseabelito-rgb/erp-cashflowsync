import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista articolelor din inventar
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
    const isComposite = searchParams.get("isComposite");
    const isActive = searchParams.get("isActive");
    const supplierId = searchParams.get("supplierId");
    const lowStock = searchParams.get("lowStock") === "true";
    const excludeMapped = searchParams.get("excludeMapped") === "true";
    const warehouseId = searchParams.get("warehouseId"); // Filtru per depozit
    const includeWarehouseStock = searchParams.get("includeWarehouseStock") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    // Filtrare după text (SKU sau nume)
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filtrare după tip (compus/individual)
    if (isComposite !== null && isComposite !== undefined && isComposite !== "") {
      where.isComposite = isComposite === "true";
    }

    // Filtrare după status activ
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    // Filtrare după furnizor
    if (supplierId) {
      where.supplierId = supplierId;
    }

    // Filtrare stoc scăzut (sub minStock)
    if (lowStock) {
      where.AND = [
        { isComposite: false }, // Doar articolele individuale au stoc
        { minStock: { not: null } },
      ];
    }

    // Exclude articolele deja mapate la produse
    if (excludeMapped) {
      where.mappedProducts = { none: {} };
    }

    // Filtrare după depozit specific (doar articole cu stoc în acel depozit)
    if (warehouseId) {
      where.warehouseStocks = {
        some: {
          warehouseId: warehouseId,
        },
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          recipeComponents: {
            include: {
              componentItem: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  currentStock: true,
                  unit: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              mappedProducts: true,
              stockMovements: true,
            },
          },
          // Include stocuri per depozit dacă cerut
          ...(includeWarehouseStock && {
            warehouseStocks: {
              include: {
                warehouse: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                warehouse: {
                  sortOrder: "asc" as const,
                },
              },
            },
          }),
        },
        orderBy: [
          { name: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Filtru stoc scăzut post-query (pentru comparație Decimal)
    let filteredItems = items;
    if (lowStock) {
      filteredItems = items.filter(item => {
        if (item.minStock === null) return false;
        return Number(item.currentStock) <= Number(item.minStock);
      });
    }

    // Statistici
    const stats = await prisma.inventoryItem.aggregate({
      where: { isActive: true },
      _count: true,
      _sum: {
        currentStock: true,
      },
    });

    const compositeCount = await prisma.inventoryItem.count({
      where: { isActive: true, isComposite: true },
    });

    // Get all non-composite items with minStock set and count those with low stock
    const itemsForLowStock = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        isComposite: false,
        minStock: { not: null },
      },
      select: {
        currentStock: true,
        minStock: true,
      },
    });
    const lowStockCount = itemsForLowStock.filter(
      (item) => item.minStock !== null && Number(item.currentStock) <= Number(item.minStock)
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        items: filteredItems,
        pagination: {
          page,
          limit,
          total: lowStock ? filteredItems.length : total,
          totalPages: Math.ceil((lowStock ? filteredItems.length : total) / limit),
        },
        stats: {
          totalItems: stats._count,
          compositeItems: compositeCount,
          individualItems: stats._count - compositeCount,
          lowStockItems: lowStockCount,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea articolelor",
    }, { status: 500 });
  }
}

// POST - Creare articol nou în inventar
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
    const {
      sku,
      name,
      description,
      currentStock,
      minStock,
      unit,
      unitsPerBox,
      boxUnit,
      costPrice,
      isComposite,
      supplierId,
      recipeComponents, // Array de { componentItemId, quantity, unit }
    } = body;

    // Validare câmpuri obligatorii
    if (!sku || !name) {
      return NextResponse.json({
        success: false,
        error: "SKU și numele sunt obligatorii",
      }, { status: 400 });
    }

    // Verifică dacă SKU-ul există deja
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { sku },
    });

    if (existingItem) {
      return NextResponse.json({
        success: false,
        error: `SKU-ul "${sku}" există deja`,
      }, { status: 400 });
    }

    // Creează articolul
    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name,
        description,
        currentStock: isComposite ? 0 : (currentStock || 0),
        minStock,
        unit: unit || "buc",
        unitsPerBox,
        boxUnit,
        costPrice,
        isComposite: isComposite || false,
        supplierId,
        // Creează componentele rețetei dacă e produs compus
        ...(isComposite && recipeComponents?.length > 0 && {
          recipeComponents: {
            create: recipeComponents.map((comp: any, index: number) => ({
              componentItemId: comp.componentItemId,
              quantity: comp.quantity,
              unit: comp.unit,
              sortOrder: index,
            })),
          },
        }),
      },
      include: {
        supplier: true,
        recipeComponents: {
          include: {
            componentItem: true,
          },
        },
      },
    });

    // Dacă are stoc inițial, creează mișcare de stoc
    if (!isComposite && currentStock && currentStock > 0) {
      await prisma.inventoryStockMovement.create({
        data: {
          itemId: item.id,
          type: "ADJUSTMENT_PLUS",
          quantity: currentStock,
          previousStock: 0,
          newStock: currentStock,
          reason: "Stoc inițial la creare articol",
          userId: session.user.id,
          userName: session.user.name || session.user.email,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la crearea articolului",
    }, { status: 500 });
  }
}

// PUT - Actualizare articol existent
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
    const {
      id,
      name,
      description,
      minStock,
      unit,
      unitsPerBox,
      boxUnit,
      costPrice,
      isActive,
      supplierId,
      recipeComponents,
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul articolului este obligatoriu",
      }, { status: 400 });
    }

    // Verifică dacă articolul există
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json({
        success: false,
        error: "Articolul nu a fost găsit",
      }, { status: 404 });
    }

    // Actualizează articolul
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name,
        description,
        minStock,
        unit,
        unitsPerBox,
        boxUnit,
        costPrice,
        isActive,
        supplierId,
      },
      include: {
        supplier: true,
        recipeComponents: {
          include: {
            componentItem: true,
          },
        },
      },
    });

    // Actualizează componentele rețetei dacă e produs compus
    if (existingItem.isComposite && recipeComponents !== undefined) {
      // Șterge componentele existente
      await prisma.inventoryRecipeComponent.deleteMany({
        where: { compositeItemId: id },
      });

      // Creează componentele noi
      if (recipeComponents?.length > 0) {
        await prisma.inventoryRecipeComponent.createMany({
          data: recipeComponents.map((comp: any, index: number) => ({
            compositeItemId: id,
            componentItemId: comp.componentItemId,
            quantity: comp.quantity,
            unit: comp.unit,
            sortOrder: index,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la actualizarea articolului",
    }, { status: 500 });
  }
}

// DELETE - Ștergere articol (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul articolului este obligatoriu",
      }, { status: 400 });
    }

    // Verifică dacă articolul există
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mappedProducts: true,
            stockMovements: true,
            usedInRecipes: true,
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({
        success: false,
        error: "Articolul nu a fost găsit",
      }, { status: 404 });
    }

    // Verifică dependențe
    if (existingItem._count.mappedProducts > 0) {
      return NextResponse.json({
        success: false,
        error: `Articolul este mapat la ${existingItem._count.mappedProducts} produse. Demapează-le mai întâi.`,
      }, { status: 400 });
    }

    if (existingItem._count.usedInRecipes > 0) {
      return NextResponse.json({
        success: false,
        error: `Articolul este folosit în ${existingItem._count.usedInRecipes} rețete. Elimină-l din rețete mai întâi.`,
      }, { status: 400 });
    }

    // Delete related stock movements first
    await prisma.inventoryStockMovement.deleteMany({
      where: { itemId: id },
    });

    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Articolul a fost șters",
    });
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la ștergerea articolului",
    }, { status: 500 });
  }
}
