import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Lista rețetelor sau rețeta unui produs specific
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const sku = searchParams.get("sku");

    // Dacă se cere rețeta unui produs specific
    if (productId || sku) {
      const where = productId ? { id: productId } : { sku: sku! };
      
      const product = await prisma.masterProduct.findUnique({
        where,
        include: {
          recipeAsParent: {
            include: {
              componentProduct: {
                select: {
                  id: true,
                  sku: true,
                  title: true,
                  barcode: true,
                  stock: true,
                  warehouseLocation: true,
                  isComposite: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!product) {
        return NextResponse.json({ error: "Produsul nu a fost găsit" }, { status: 404 });
      }

      return NextResponse.json({
        product: {
          id: product.id,
          sku: product.sku,
          title: product.title,
          isComposite: product.isComposite,
        },
        recipe: product.recipeAsParent.map((r) => ({
          id: r.id,
          componentId: r.componentProduct.id,
          componentSku: r.componentProduct.sku,
          componentTitle: r.componentProduct.title,
          componentBarcode: r.componentProduct.barcode,
          componentStock: r.componentProduct.stock,
          componentLocation: r.componentProduct.warehouseLocation,
          componentIsComposite: r.componentProduct.isComposite,
          quantity: Number(r.quantity),
          unit: r.unit,
          sortOrder: r.sortOrder,
        })),
      });
    }

    // Lista toate produsele compuse cu rețete
    const compositeProducts = await prisma.masterProduct.findMany({
      where: { isComposite: true },
      include: {
        recipeAsParent: {
          include: {
            componentProduct: {
              select: {
                id: true,
                sku: true,
                title: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({
      products: compositeProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        title: p.title,
        isComposite: p.isComposite,
        componentsCount: p.recipeAsParent.length,
        components: p.recipeAsParent.map((r) => ({
          sku: r.componentProduct.sku,
          title: r.componentProduct.title,
          quantity: Number(r.quantity),
          unit: r.unit,
        })),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Creează/actualizează rețeta unui produs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "products.edit");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, components } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId este necesar" }, { status: 400 });
    }

    // Verificăm că produsul există
    const product = await prisma.masterProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produsul nu a fost găsit" }, { status: 404 });
    }

    // Tranzacție pentru a actualiza rețeta
    await prisma.$transaction(async (tx) => {
      // Ștergem componente vechi
      await tx.productRecipe.deleteMany({
        where: { parentProductId: productId },
      });

      // Dacă nu avem componente, marcăm produsul ca non-compus
      if (!components || components.length === 0) {
        await tx.masterProduct.update({
          where: { id: productId },
          data: { isComposite: false },
        });
        return;
      }

      // Adăugăm componentele noi
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        
        // Verificăm că componentul există
        const componentProduct = await tx.masterProduct.findUnique({
          where: { id: comp.componentId },
        });

        if (!componentProduct) {
          throw new Error(`Componentul cu ID ${comp.componentId} nu a fost găsit`);
        }

        // Prevenim auto-referința
        if (comp.componentId === productId) {
          throw new Error("Un produs nu poate fi component al lui însuși");
        }

        await tx.productRecipe.create({
          data: {
            parentProductId: productId,
            componentProductId: comp.componentId,
            quantity: comp.quantity || 1,
            unit: comp.unit || "buc",
            sortOrder: i,
          },
        });
      }

      // Marcăm produsul ca compus
      await tx.masterProduct.update({
        where: { id: productId },
        data: { isComposite: true },
      });
    });

    // Returnăm rețeta actualizată
    const updatedProduct = await prisma.masterProduct.findUnique({
      where: { id: productId },
      include: {
        recipeAsParent: {
          include: {
            componentProduct: {
              select: {
                id: true,
                sku: true,
                title: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Rețeta a fost actualizată",
      product: {
        id: updatedProduct!.id,
        sku: updatedProduct!.sku,
        title: updatedProduct!.title,
        isComposite: updatedProduct!.isComposite,
        components: updatedProduct!.recipeAsParent.map((r) => ({
          componentId: r.componentProduct.id,
          componentSku: r.componentProduct.sku,
          componentTitle: r.componentProduct.title,
          quantity: Number(r.quantity),
          unit: r.unit,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error saving recipe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Șterge rețeta unui produs
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "products.edit");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId este necesar" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.productRecipe.deleteMany({
        where: { parentProductId: productId },
      });

      await tx.masterProduct.update({
        where: { id: productId },
        data: { isComposite: false },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Rețeta a fost ștearsă",
    });
  } catch (error: any) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
