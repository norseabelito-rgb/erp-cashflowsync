import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Detalii produs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.masterProduct.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { position: "asc" }
        },
        channels: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
                store: {
                  select: {
                    id: true,
                    name: true,
                    shopifyDomain: true,
                  }
                }
              }
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

    // Lookup stoc din tabelul Product (inventar) după SKU (case-insensitive)
    const inventoryProduct = await prisma.product.findFirst({
      where: { 
        sku: { 
          equals: product.sku, 
          mode: "insensitive" 
        } 
      },
      select: { stockQuantity: true },
    });

    // Adaugă stocul real din inventar
    const productWithStock = {
      ...product,
      stock: inventoryProduct?.stockQuantity ?? product.stock,
    };

    // Obține toate canalele disponibile (pentru a ști ce canale nu sunt încă adăugate)
    const allChannels = await prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        store: {
          select: { shopifyDomain: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      product: productWithStock,
      allChannels,
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
