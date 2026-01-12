import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST - Agregă produsele din AWB-urile selectate (preview pentru picking list)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { awbIds } = body;

    if (!awbIds || !Array.isArray(awbIds) || awbIds.length === 0) {
      return NextResponse.json(
        { error: "Selectează cel puțin un AWB" },
        { status: 400 }
      );
    }

    // Obținem AWB-urile cu LineItems
    const awbs = await prisma.aWB.findMany({
      where: {
        id: { in: awbIds },
      },
      include: {
        order: {
          include: {
            lineItems: {
              select: {
                sku: true,
                barcode: true,
                title: true,
                variantTitle: true,
                quantity: true,
                imageUrl: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (awbs.length === 0) {
      return NextResponse.json(
        { error: "Nu s-au găsit AWB-uri valide" },
        { status: 404 }
      );
    }

    // Agregăm produsele
    const productMap = new Map<string, {
      sku: string;
      barcode: string | null;
      title: string;
      variantTitle: string | null;
      quantity: number;
      imageUrl: string | null;
      location: string | null;
      awbCount: number;  // În câte AWB-uri apare
    }>();

    for (const awb of awbs) {
      const seenInThisAwb = new Set<string>();
      
      for (const item of awb.order.lineItems) {
        const key = `${item.sku}|${item.variantTitle || ""}`;
        
        if (productMap.has(key)) {
          const existing = productMap.get(key)!;
          existing.quantity += item.quantity;
          if (!seenInThisAwb.has(key)) {
            existing.awbCount += 1;
            seenInThisAwb.add(key);
          }
        } else {
          productMap.set(key, {
            sku: item.sku || `UNKNOWN-${Date.now()}`,
            barcode: item.barcode,
            title: item.title,
            variantTitle: item.variantTitle,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            location: item.location,
            awbCount: 1,
          });
          seenInThisAwb.add(key);
        }
      }
    }

    // Convertim în array și sortăm după locație, apoi SKU
    const products = Array.from(productMap.values()).sort((a, b) => {
      // Mai întâi după locație (cele fără locație la final)
      if (a.location && !b.location) return -1;
      if (!a.location && b.location) return 1;
      if (a.location && b.location) {
        const locCompare = a.location.localeCompare(b.location);
        if (locCompare !== 0) return locCompare;
      }
      // Apoi după SKU
      return a.sku.localeCompare(b.sku);
    });

    // Statistici
    const stats = {
      totalAwbs: awbs.length,
      totalProducts: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      productsWithBarcode: products.filter((p) => p.barcode).length,
      productsWithLocation: products.filter((p) => p.location).length,
    };

    return NextResponse.json({
      products,
      stats,
      awbNumbers: awbs.map((a) => a.awbNumber).filter(Boolean),
    });
  } catch (error: any) {
    console.error("Error aggregating products:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
