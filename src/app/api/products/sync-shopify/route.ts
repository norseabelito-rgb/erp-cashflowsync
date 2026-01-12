import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShopifyClient } from "@/lib/shopify";

/**
 * Convertește URL-ul imaginii în URL public Google Drive
 * Folosim lh3.googleusercontent.com care e mai compatibil cu Shopify
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

// POST - Sincronizare toate produsele cu Shopify
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

    // Obține toate produsele cu canale Shopify active
    const productChannels = await prisma.masterProductChannel.findMany({
      where: {
        isActive: true,
        channel: {
          type: "SHOPIFY",
          isActive: true,
        },
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { position: "asc" },
            },
          },
        },
        channel: {
          include: {
            store: true,
          },
        },
      },
    });

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
      skipped: 0,
    };

    // Grupează după store pentru a reutiliza clientul
    const byStore = new Map<string, typeof productChannels>();
    for (const pc of productChannels) {
      if (!pc.channel.store) continue;
      const storeId = pc.channel.store.id;
      if (!byStore.has(storeId)) {
        byStore.set(storeId, []);
      }
      byStore.get(storeId)!.push(pc);
    }

    // Procesează fiecare store
    for (const [storeId, channels] of byStore) {
      const store = channels[0].channel.store!;
      const shopifyClient = new ShopifyClient(
        store.shopifyDomain,
        store.accessToken,
        store.id
      );

      for (const pc of channels) {
        try {
          const product = pc.product;
          const overrides = (pc.overrides as Record<string, any>) || {};

          // Calculează valorile finale
          const finalTitle = overrides.title || product.title;
          const finalDescription = overrides.description || product.description;
          const finalPrice = overrides.price || Number(product.price);
          const finalCompareAtPrice = overrides.compareAtPrice || 
            (product.compareAtPrice ? Number(product.compareAtPrice) : undefined);

          // Pregătește imaginile cu URL-uri publice
          const images = product.images
            .map((img, idx) => {
              const publicUrl = getPublicGoogleDriveUrl(img.url);
              if (!publicUrl) return null;
              return {
                src: publicUrl,
                position: idx + 1,
                alt: product.title,
              };
            })
            .filter((img): img is { src: string; position: number; alt: string } => img !== null);

          if (!pc.externalId) {
            // Creează produs nou în Shopify
            const shopifyProduct = await shopifyClient.createProduct({
              title: finalTitle,
              body_html: finalDescription || undefined,
              tags: product.tags || [],
              variants: [{
                sku: product.sku,
                price: String(finalPrice),
                compare_at_price: finalCompareAtPrice ? String(finalCompareAtPrice) : undefined,
                barcode: product.barcode || undefined,
                weight: product.weight ? Number(product.weight) : undefined,
                weight_unit: "kg",
                inventory_management: null,
              }],
              images,
            });

            // Actualizează externalId în DB
            await prisma.masterProductChannel.update({
              where: { id: pc.id },
              data: {
                externalId: String(shopifyProduct.id),
                externalOverrides: {
                  shopifyProductId: shopifyProduct.id,
                  shopifyVariantId: shopifyProduct.variants[0]?.id,
                },
                lastSyncedAt: new Date(),
              },
            });

            results.created++;
            console.log(`Created in Shopify: ${product.sku} -> ${shopifyProduct.id}`);

          } else {
            // Actualizează produs existent în Shopify
            await shopifyClient.updateProduct(pc.externalId, {
              title: finalTitle,
              body_html: finalDescription || undefined,
              tags: product.tags || [],
              variants: [{
                sku: product.sku,
                price: String(finalPrice),
                compare_at_price: finalCompareAtPrice ? String(finalCompareAtPrice) : undefined,
              }],
            });

            // Actualizează timestamp
            await prisma.masterProductChannel.update({
              where: { id: pc.id },
              data: { lastSyncedAt: new Date() },
            });

            results.updated++;
            console.log(`Updated in Shopify: ${product.sku}`);
          }

        } catch (error: any) {
          const errorMsg = `${pc.product.sku}: ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`Sync error for ${pc.product.sku}:`, error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronizare completă: ${results.created} create, ${results.updated} actualizate, ${results.errors.length} erori`,
      results,
    });

  } catch (error: any) {
    console.error("Shopify sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
