import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUnmappedTrendyolProducts, mapTrendyolProduct } from "@/lib/trendyol";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Lista produse nemapate
export async function GET(request: NextRequest) {
  try {
    const unmapped = await getUnmappedTrendyolProducts();

    // Get all mappings for reference
    const mappings = await prisma.trendyolProductMapping.findMany({
      include: {
        masterProduct: {
          select: { id: true, sku: true, title: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Get suggestions for unmapped products
    const suggestions = await Promise.all(
      unmapped.map(async (item) => {
        // Try to find similar products by title
        const similar = await prisma.masterProduct.findMany({
          where: {
            OR: [
              { sku: { contains: item.barcode, mode: "insensitive" } },
              { title: { contains: item.title.split(" ")[0], mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, sku: true, title: true },
        });

        return {
          ...item,
          suggestions: similar,
        };
      })
    );

    return NextResponse.json({
      success: true,
      unmapped: suggestions,
      mappings,
      stats: {
        totalUnmapped: unmapped.length,
        totalMapped: mappings.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching unmapped products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Mapează un produs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { barcode, localSku } = body;

    if (!barcode || !localSku) {
      return NextResponse.json(
        { success: false, error: "Barcode și SKU local sunt obligatorii" },
        { status: 400 }
      );
    }

    await mapTrendyolProduct(barcode, localSku, session?.user?.id);

    return NextResponse.json({
      success: true,
      message: `Produs ${barcode} mapat la ${localSku}`,
    });
  } catch (error: any) {
    console.error("Error mapping product:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge o mapare
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: "Barcode este obligatoriu" },
        { status: 400 }
      );
    }

    // Delete mapping
    await prisma.trendyolProductMapping.deleteMany({
      where: { barcode },
    });

    // Reset order items
    await prisma.trendyolOrderItem.updateMany({
      where: { barcode },
      data: {
        localSku: null,
        masterProductId: null,
        isMapped: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Mapare pentru ${barcode} ștearsă`,
    });
  } catch (error: any) {
    console.error("Error deleting mapping:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
