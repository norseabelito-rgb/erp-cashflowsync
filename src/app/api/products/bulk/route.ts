import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ShopifyClient } from "@/lib/shopify";

/**
 * Convertește URL-ul imaginii în URL public Google Drive
 */
function getPublicGoogleDriveUrl(url: string): string | null {
  let fileId: string | null = null;

  if (url.includes("/api/drive-image/")) {
    fileId = url.split("/api/drive-image/")[1];
  } else if (url.includes("drive.google.com")) {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }
  } else if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    fileId = url;
  } else if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return null;
}

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
        // Publică produsele pe un canal (cu push real pe Shopify)
        const { channelId } = data;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: "Specifică canalul" },
            { status: 400 }
          );
        }

        // Obține canalul cu store-ul asociat
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          include: { store: true }
        });

        if (!channel) {
          return NextResponse.json(
            { success: false, error: "Canalul nu a fost găsit" },
            { status: 404 }
          );
        }

        // Verifică dacă e Shopify și are store configurat
        const isShopify = channel.type === "SHOPIFY" && channel.store;
        let shopifyClient: ShopifyClient | null = null;

        if (isShopify && channel.store) {
          shopifyClient = new ShopifyClient(
            channel.store.shopifyDomain,
            channel.store.accessToken,
            channel.store.id
          );
        }

        // Obține toate produsele cu imagini
        const products = await prisma.masterProduct.findMany({
          where: { id: { in: productIds } },
          include: {
            images: { orderBy: { position: "asc" } },
            channels: { where: { channelId } }
          }
        });

        let created = 0;
        let updated = 0;
        let errors: string[] = [];

        for (const product of products) {
          try {
            const existingChannel = product.channels[0];
            let externalId: string | null = existingChannel?.externalId || null;

            // Dacă e Shopify, facem push real
            if (shopifyClient) {
              const productData = {
                title: product.title,
                body_html: product.description || undefined,
                tags: product.tags || [],
                variants: [{
                  sku: product.sku,
                  price: String(Number(product.price)),
                  compare_at_price: product.compareAtPrice ? String(Number(product.compareAtPrice)) : undefined,
                  barcode: product.barcode || undefined,
                  weight: product.weight ? Number(product.weight) : undefined,
                  weight_unit: "kg" as const,
                  inventory_management: null as null,
                }],
                images: product.images
                  .map((img, idx) => {
                    const publicUrl = getPublicGoogleDriveUrl(img.url);
                    if (!publicUrl) return null;
                    return {
                      src: publicUrl,
                      position: idx + 1,
                      alt: product.title,
                    };
                  })
                  .filter((img): img is { src: string; position: number; alt: string } => img !== null),
              };

              if (externalId) {
                // Actualizare produs existent în Shopify
                await shopifyClient.updateProduct(externalId, productData);
              } else {
                // Creare produs nou în Shopify
                const shopifyProduct = await shopifyClient.createProduct(productData);
                externalId = String(shopifyProduct.id);
              }
            }

            // Actualizează sau creează înregistrarea în DB
            if (existingChannel) {
              await prisma.masterProductChannel.update({
                where: { productId_channelId: { productId: product.id, channelId } },
                data: {
                  isPublished: true,
                  isActive: true,
                  externalId,
                  lastSyncedAt: externalId ? new Date() : null,
                  syncError: null,
                }
              });
              updated++;
            } else {
              await prisma.masterProductChannel.create({
                data: {
                  productId: product.id,
                  channelId,
                  isPublished: true,
                  isActive: true,
                  externalId,
                  lastSyncedAt: externalId ? new Date() : null,
                }
              });
              created++;
            }
          } catch (err: any) {
            const errorMsg = `${product.sku}: ${err.message}`;
            errors.push(errorMsg);
            console.error(`Error publishing product ${product.sku}:`, err);

            // Salvează eroarea în DB pentru produs
            try {
              const existingChannel = product.channels[0];
              if (existingChannel) {
                await prisma.masterProductChannel.update({
                  where: { productId_channelId: { productId: product.id, channelId } },
                  data: { syncError: err.message }
                });
              } else {
                await prisma.masterProductChannel.create({
                  data: {
                    productId: product.id,
                    channelId,
                    isPublished: false,
                    isActive: false,
                    syncError: err.message,
                  }
                });
              }
            } catch (dbErr) {
              console.error("Error saving sync error:", dbErr);
            }
          }
        }

        result = {
          created,
          updated,
          errors: errors.length > 0 ? errors : undefined,
          total: products.length,
          success: created + updated,
          failed: errors.length,
        };
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

    // Construiește mesajul în funcție de rezultat
    let message = "Operație completată cu succes";
    if (result.errors?.length > 0) {
      message = `${result.success} produse publicate, ${result.failed} erori: ${result.errors.slice(0, 3).join("; ")}${result.errors.length > 3 ? ` (+${result.errors.length - 3} altele)` : ""}`;
    } else if (result.created !== undefined || result.updated !== undefined) {
      const parts = [];
      if (result.created > 0) parts.push(`${result.created} create`);
      if (result.updated > 0) parts.push(`${result.updated} actualizate`);
      if (parts.length > 0) message = parts.join(", ");
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      message,
    });
  } catch (error: any) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
