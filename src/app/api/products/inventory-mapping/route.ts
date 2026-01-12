import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista produse cu status mapare inventar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const mappingStatus = searchParams.get("mappingStatus"); // all, mapped, unmapped
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    if (mappingStatus === "mapped") {
      where.inventoryItemId = { not: null };
    } else if (mappingStatus === "unmapped") {
      where.inventoryItemId = null;
    }

    const [products, total, mappedCount, unmappedCount] = await Promise.all([
      prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { inventoryItemId: 'asc' }, // Unmapped first (null comes first in asc)
          { sku: 'asc' },
        ],
        select: {
          id: true,
          sku: true,
          title: true,
          price: true,
          stock: true,
          isActive: true,
          inventoryItemId: true,
          inventoryItem: {
            select: {
              id: true,
              sku: true,
              name: true,
              currentStock: true,
              unit: true,
              isComposite: true,
            },
          },
          images: {
            take: 1,
            orderBy: { position: 'asc' },
            select: { url: true },
          },
        },
      }),
      prisma.masterProduct.count({ where }),
      prisma.masterProduct.count({ where: { inventoryItemId: { not: null } } }),
      prisma.masterProduct.count({ where: { inventoryItemId: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        stats: {
          total: mappedCount + unmappedCount,
          mapped: mappedCount,
          unmapped: unmappedCount,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la citire";
    console.error("Error fetching product mappings:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// PUT - Mapează produs la articol inventar
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, inventoryItemId } = body;

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: "ID-ul produsului este obligatoriu",
      }, { status: 400 });
    }

    // Verify product exists
    const product = await prisma.masterProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Produsul nu a fost găsit",
      }, { status: 404 });
    }

    // If inventoryItemId is provided, verify it exists
    if (inventoryItemId) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
      });

      if (!inventoryItem) {
        return NextResponse.json({
          success: false,
          error: "Articolul de inventar nu a fost găsit",
        }, { status: 404 });
      }
    }

    // Update the mapping
    const updated = await prisma.masterProduct.update({
      where: { id: productId },
      data: {
        inventoryItemId: inventoryItemId || null,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            sku: true,
            name: true,
            currentStock: true,
            unit: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: inventoryItemId
        ? `Produsul a fost mapat la "${updated.inventoryItem?.name}"`
        : "Maparea a fost eliminată",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la actualizare";
    console.error("Error updating product mapping:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// POST - Bulk mapping (auto-match by SKU)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "auto-match") {
      // Get all unmapped products
      const unmappedProducts = await prisma.masterProduct.findMany({
        where: { inventoryItemId: null },
        select: { id: true, sku: true },
      });

      // Get all inventory items
      const inventoryItems = await prisma.inventoryItem.findMany({
        select: { id: true, sku: true },
      });

      // Create a map of SKU (lowercase) -> inventoryItemId
      const skuToInventoryId = new Map(
        inventoryItems.map(item => [item.sku.toLowerCase(), item.id])
      );

      // Match products to inventory items by SKU
      const matchedPairs: { productId: string; inventoryItemId: string }[] = [];
      for (const product of unmappedProducts) {
        const inventoryId = skuToInventoryId.get(product.sku.toLowerCase());
        if (inventoryId) {
          matchedPairs.push({ productId: product.id, inventoryItemId: inventoryId });
        }
      }

      // Bulk update
      if (matchedPairs.length > 0) {
        await prisma.$transaction(
          matchedPairs.map(pair =>
            prisma.masterProduct.update({
              where: { id: pair.productId },
              data: { inventoryItemId: pair.inventoryItemId },
            })
          )
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          matched: matchedPairs.length,
          unmatched: unmappedProducts.length - matchedPairs.length,
        },
        message: `${matchedPairs.length} produse au fost mapate automat pe baza SKU-ului`,
      });
    }

    return NextResponse.json({
      success: false,
      error: "Acțiune necunoscută",
    }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la procesare";
    console.error("Error in bulk mapping:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
