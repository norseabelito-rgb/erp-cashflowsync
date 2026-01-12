import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Lista produselor cu canale
export async function GET(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare produse
    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza produse" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const channelId = searchParams.get("channelId");
    const hasTrendyolCategory = searchParams.get("hasTrendyolCategory");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Construiește where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filtrare pentru produse cu categorii mapate la Trendyol
    if (hasTrendyolCategory === "true") {
      where.category = {
        trendyolCategoryId: { not: null }
      };
    }

    // Dacă filtrăm după canal, includem doar produsele care au acel canal
    if (channelId) {
      where.channels = {
        some: { channelId }
      };
    }

    const [products, total] = await Promise.all([
      prisma.masterProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: { 
              id: true, 
              name: true,
              trendyolCategoryId: true,
              trendyolCategoryName: true
            }
          },
          images: {
            orderBy: { position: "asc" },
            take: 1, // Doar imaginea principală pentru listă
          },
          channels: {
            include: {
              channel: {
                select: { id: true, name: true, type: true }
              }
            }
          }
        }
      }),
      prisma.masterProduct.count({ where })
    ]);

    // Lookup stocuri din tabelul Product (inventar) după SKU (case-insensitive)
    // Prisma nu suportă mode: "insensitive" cu "in", deci facem OR pentru fiecare SKU
    const skus = products.map(p => p.sku);
    
    const inventoryProducts = await prisma.product.findMany({
      where: { 
        OR: skus.map(sku => ({
          sku: { equals: sku, mode: "insensitive" as const }
        }))
      },
      select: { sku: true, stockQuantity: true },
    });
    
    // Map cu lowercase keys pentru lookup case-insensitive
    const stockBySku = new Map<string, number>();
    for (const inv of inventoryProducts) {
      stockBySku.set(inv.sku.toLowerCase(), inv.stockQuantity);
    }

    // Adaugă stocul real la fiecare produs (lookup case-insensitive)
    const productsWithStock = products.map(p => {
      const foundStock = stockBySku.get(p.sku.toLowerCase());
      return {
        ...p,
        stock: foundStock ?? p.stock,
      };
    });

    // Obține toate canalele pentru header-ul tabelului
    const channels = await prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true }
    });

    return NextResponse.json({
      success: true,
      products: productsWithStock,
      channels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crează produs nou
export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de creare produse
    const canCreate = await hasPermission(session.user.id, "products.create");
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a crea produse" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sku,
      title,
      description,
      price,
      compareAtPrice,
      tags,
      categoryId,
      driveFolderUrl,
      channelIds, // Array de channel IDs unde să fie publicat
      stock, // Stocul din inventar
    } = body;

    // Validări
    if (!sku?.trim()) {
      return NextResponse.json(
        { success: false, error: "SKU-ul este obligatoriu" },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Titlul este obligatoriu" },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || price < 0) {
      return NextResponse.json(
        { success: false, error: "Prețul este obligatoriu și trebuie să fie pozitiv" },
        { status: 400 }
      );
    }

    // Verifică dacă SKU-ul există deja
    const existing = await prisma.masterProduct.findUnique({
      where: { sku: sku.trim().toUpperCase() }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Există deja un produs cu acest SKU" },
        { status: 400 }
      );
    }

    // Creează produsul
    const product = await prisma.masterProduct.create({
      data: {
        sku: sku.trim().toUpperCase(),
        title: title.trim(),
        description: description?.trim() || null,
        price,
        compareAtPrice: compareAtPrice || null,
        tags: tags || [],
        categoryId: categoryId || null,
        driveFolderUrl: driveFolderUrl?.trim() || null,
        stock: stock || 0,
        // Creează asocierile cu canalele
        channels: channelIds?.length > 0 ? {
          create: channelIds.map((channelId: string) => ({
            channelId,
            isPublished: true,
            isActive: true,
          }))
        } : undefined,
      },
      include: {
        category: true,
        channels: {
          include: {
            channel: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      product,
      message: "Produs creat cu succes",
    });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizează produs master
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      price,
      compareAtPrice,
      tags,
      categoryId,
      driveFolderUrl,
      isActive,
      // Pentru propagare la canale cu override
      propagateToChannels, // true/false
      channelsToUpdate, // Array de channelIds care să fie actualizate
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul produsului este obligatoriu" },
        { status: 400 }
      );
    }

    // Actualizează produsul master
    const product = await prisma.masterProduct.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price !== undefined && { price }),
        ...(compareAtPrice !== undefined && { compareAtPrice: compareAtPrice || null }),
        ...(tags !== undefined && { tags }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(driveFolderUrl !== undefined && { driveFolderUrl: driveFolderUrl?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: true,
        channels: {
          include: {
            channel: true
          }
        }
      }
    });

    // Dacă trebuie să propagăm modificările la canale
    if (propagateToChannels && channelsToUpdate?.length > 0) {
      // Resetează override-urile pentru canalele specificate
      await prisma.masterProductChannel.updateMany({
        where: {
          productId: id,
          channelId: { in: channelsToUpdate }
        },
        data: {
          overrides: {},
          lastSyncedAt: null, // Marchează pentru re-sync
        }
      });
    }

    return NextResponse.json({
      success: true,
      product,
      message: "Produs actualizat cu succes",
    });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge produs (și din toate canalele)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul produsului este obligatoriu" },
        { status: 400 }
      );
    }

    const product = await prisma.masterProduct.findUnique({
      where: { id },
      include: {
        channels: {
          include: {
            channel: {
              include: { store: true }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produsul nu există" },
        { status: 404 }
      );
    }

    // TODO: Șterge produsele din Shopify pentru fiecare canal
    // Acest lucru va fi implementat când adăugăm sync-ul cu Shopify

    // Șterge produsul (cascade șterge și channels și images)
    await prisma.masterProduct.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Produs șters cu succes",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
