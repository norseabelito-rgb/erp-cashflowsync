import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ShopifyClient, syncSingleOrder } from "@/lib/shopify";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: params.id },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Magazinul nu a fost găsit" },
        { status: 404 }
      );
    }

    if (!store.isActive) {
      return NextResponse.json(
        { error: "Magazinul nu este activ" },
        { status: 400 }
      );
    }

    const client = new ShopifyClient(
      store.shopifyDomain,
      store.accessToken,
      store.id
    );

    // Obținem ultima comandă sincronizată pentru acest magazin
    const lastOrder = await prisma.order.findFirst({
      where: { storeId: store.id },
      orderBy: { shopifyCreatedAt: "desc" },
    });

    const orders = await client.getOrders({
      limit: 250,
      created_at_min: lastOrder
        ? new Date(lastOrder.shopifyCreatedAt.getTime() - 60000).toISOString()
        : undefined,
    });

    let synced = 0;
    const errors: string[] = [];

    for (const shopifyOrder of orders) {
      try {
        await syncSingleOrder(shopifyOrder, store.id);
        synced++;
      } catch (error: any) {
        errors.push(`Eroare la comanda ${shopifyOrder.name}: ${error.message}`);
      }
    }

    return NextResponse.json({ synced, errors });
  } catch (error: any) {
    console.error("Error syncing store:", error);
    return NextResponse.json(
      { error: `Eroare la sincronizare: ${error.message}` },
      { status: 500 }
    );
  }
}
