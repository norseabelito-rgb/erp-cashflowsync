import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShopifyClient } from "@/lib/shopify";

// POST /api/products/backfill-handles - Populează externalHandle pentru produsele existente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "products.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Găsește toate canalele publicate care au externalId dar NU au externalHandle
    const channelsToUpdate = await prisma.masterProductChannel.findMany({
      where: {
        externalId: { not: null },
        OR: [
          { externalHandle: null },
          { externalHandle: "" },
        ],
      },
      include: {
        channel: {
          include: {
            store: true,
          },
        },
      },
    });

    if (channelsToUpdate.length === 0) {
      return NextResponse.json({
        message: "Toate produsele au deja handle-uri populate",
        updated: 0
      });
    }

    // Grupează pe store pentru eficiență
    const byStore: Record<string, typeof channelsToUpdate> = {};
    for (const ch of channelsToUpdate) {
      const storeId = ch.channel?.store?.id;
      if (storeId && ch.channel?.store) {
        if (!byStore[storeId]) byStore[storeId] = [];
        byStore[storeId].push(ch);
      }
    }

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Pentru fiecare store, fetch produsele și actualizează handle-urile
    for (const [storeId, channels] of Object.entries(byStore)) {
      const store = channels[0].channel?.store;
      if (!store) continue;

      const shopifyClient = new ShopifyClient(
        store.shopifyDomain,
        store.accessToken,
        store.id
      );

      // Procesăm în batch-uri de 50
      for (let i = 0; i < channels.length; i += 50) {
        const batch = channels.slice(i, i + 50);

        await Promise.all(
          batch.map(async (ch) => {
            try {
              if (!ch.externalId) return;

              const product = await shopifyClient.getProduct(ch.externalId);
              if (product?.handle) {
                await prisma.masterProductChannel.update({
                  where: { id: ch.id },
                  data: { externalHandle: product.handle },
                });
                updated++;
              }
            } catch (err: any) {
              failed++;
              errors.push(`${ch.externalId}: ${err.message}`);
            }
          })
        );

        // Mică pauză între batch-uri pentru a nu depăși rate limits
        if (i + 50 < channels.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    return NextResponse.json({
      message: `Backfill complet`,
      updated,
      failed,
      errors: errors.slice(0, 10), // Primele 10 erori
    });
  } catch (error: any) {
    console.error("Error backfilling handles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
