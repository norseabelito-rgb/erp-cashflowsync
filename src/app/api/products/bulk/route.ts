import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST - Operații bulk pe produse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productIds, data } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin un produs" },
        { status: 400 }
      );
    }

    let result: any;

    switch (action) {
      case "change-category": {
        // Schimbă categoria pentru produsele selectate
        const { categoryId } = data;
        
        await prisma.masterProduct.updateMany({
          where: { id: { in: productIds } },
          data: { categoryId: categoryId || null }
        });

        result = { updated: productIds.length };
        break;
      }

      case "add-tags": {
        // Adaugă tag-uri la produsele selectate
        const { tags } = data;
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return NextResponse.json(
            { success: false, error: "Specifică tag-urile de adăugat" },
            { status: 400 }
          );
        }

        // Pentru fiecare produs, adaugă tag-urile noi
        const products = await prisma.masterProduct.findMany({
          where: { id: { in: productIds } },
          select: { id: true, tags: true }
        });

        for (const product of products) {
          const existingTags = product.tags || [];
          const newTags = [...new Set([...existingTags, ...tags])];
          await prisma.masterProduct.update({
            where: { id: product.id },
            data: { tags: newTags }
          });
        }

        result = { updated: products.length, tagsAdded: tags };
        break;
      }

      case "remove-tags": {
        // Șterge tag-uri de la produsele selectate
        const { tags } = data;
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return NextResponse.json(
            { success: false, error: "Specifică tag-urile de șters" },
            { status: 400 }
          );
        }

        const products = await prisma.masterProduct.findMany({
          where: { id: { in: productIds } },
          select: { id: true, tags: true }
        });

        for (const product of products) {
          const existingTags = product.tags || [];
          const newTags = existingTags.filter(t => !tags.includes(t));
          await prisma.masterProduct.update({
            where: { id: product.id },
            data: { tags: newTags }
          });
        }

        result = { updated: products.length, tagsRemoved: tags };
        break;
      }

      case "publish-channel": {
        // Publică produsele pe un canal
        const { channelId } = data;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: "Specifică canalul" },
            { status: 400 }
          );
        }

        let created = 0;
        let updated = 0;

        for (const productId of productIds) {
          const existing = await prisma.masterProductChannel.findUnique({
            where: { productId_channelId: { productId, channelId } }
          });

          if (existing) {
            await prisma.masterProductChannel.update({
              where: { productId_channelId: { productId, channelId } },
              data: { isPublished: true, isActive: true }
            });
            updated++;
          } else {
            await prisma.masterProductChannel.create({
              data: {
                productId,
                channelId,
                isPublished: true,
                isActive: true,
              }
            });
            created++;
          }
        }

        result = { created, updated };
        break;
      }

      case "unpublish-channel": {
        // Depublică produsele de pe un canal (draft)
        const { channelId } = data;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: "Specifică canalul" },
            { status: 400 }
          );
        }

        await prisma.masterProductChannel.updateMany({
          where: {
            productId: { in: productIds },
            channelId
          },
          data: { isPublished: false }
        });

        result = { updated: productIds.length };
        break;
      }

      case "activate-channel": {
        // Activează sync pe un canal
        const { channelId } = data;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: "Specifică canalul" },
            { status: 400 }
          );
        }

        await prisma.masterProductChannel.updateMany({
          where: {
            productId: { in: productIds },
            channelId
          },
          data: { isActive: true }
        });

        result = { updated: productIds.length };
        break;
      }

      case "deactivate-channel": {
        // Dezactivează sync pe un canal
        const { channelId } = data;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: "Specifică canalul" },
            { status: 400 }
          );
        }

        await prisma.masterProductChannel.updateMany({
          where: {
            productId: { in: productIds },
            channelId
          },
          data: { isActive: false }
        });

        result = { updated: productIds.length };
        break;
      }

      case "delete": {
        // Șterge produsele
        // TODO: Șterge și din Shopify

        await prisma.masterProduct.deleteMany({
          where: { id: { in: productIds } }
        });

        result = { deleted: productIds.length };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Acțiune necunoscută: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      message: "Operație completată cu succes",
    });
  } catch (error: any) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
