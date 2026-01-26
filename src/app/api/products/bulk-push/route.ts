import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShopifyClient } from "@/lib/shopify";

/**
 * Converts Google Drive URL to public URL using lh3.googleusercontent.com
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

interface StoreProgress {
  storeName: string;
  total: number;
  done: number;
  created: number;
  updated: number;
  errors: number;
  errorMessages: string[];
}

/**
 * POST /api/products/bulk-push
 * Start a bulk push job to sync ALL products to ALL Shopify stores
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "products.edit");
    if (!canManage) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    // Create job record
    const job = await prisma.bulkPushJob.create({
      data: { status: "pending" },
    });

    // Get ALL products
    const allProducts = await prisma.masterProduct.findMany({
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        channels: {
          include: {
            channel: true,
          },
        },
      },
    });

    // Get ALL active Shopify channels
    const shopifyChannels = await prisma.channel.findMany({
      where: {
        type: "SHOPIFY",
        isActive: true,
        store: {
          isNot: null,
        },
      },
      include: {
        store: true,
      },
    });

    if (shopifyChannels.length === 0) {
      await prisma.bulkPushJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: "Nu exista canale Shopify active configurate",
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        success: false,
        error: "Nu exista canale Shopify active",
        jobId: job.id,
      });
    }

    // Initialize progress JSON - one entry per store, total = all products
    const progress: Record<string, StoreProgress> = {};
    for (const channel of shopifyChannels) {
      if (!channel.store) continue;
      progress[channel.store.id] = {
        storeName: channel.store.name,
        total: allProducts.length,
        done: 0,
        created: 0,
        updated: 0,
        errors: 0,
        errorMessages: [],
      };
    }

    // Update job to running with initial progress
    await prisma.bulkPushJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        progress: progress,
      },
    });

    // Process each Shopify channel/store
    for (const channel of shopifyChannels) {
      if (!channel.store) continue;

      const store = channel.store;
      const storeId = store.id;

      const shopifyClient = new ShopifyClient(
        store.shopifyDomain,
        store.accessToken,
        store.id
      );

      let batchCount = 0;

      for (const product of allProducts) {
        try {
          // Check if product already has a channel mapping
          const existingChannel = product.channels.find(
            (pc) => pc.channelId === channel.id
          );

          const overrides = existingChannel
            ? ((existingChannel.overrides as Record<string, unknown>) || {})
            : {};

          // Calculate final values with overrides
          const finalTitle = (overrides.title as string) || product.title;
          const finalDescription =
            (overrides.description as string) || product.description;
          const finalPrice =
            (overrides.price as number) || Number(product.price);
          const finalCompareAtPrice =
            (overrides.compareAtPrice as number) ||
            (product.compareAtPrice
              ? Number(product.compareAtPrice)
              : undefined);

          // Prepare images with public URLs
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
            .filter(
              (img): img is { src: string; position: number; alt: string } =>
                img !== null
            );

          const externalId = existingChannel?.externalId;

          if (!externalId) {
            // Create new product in Shopify
            const shopifyProduct = await shopifyClient.createProduct({
              title: finalTitle,
              body_html: finalDescription || undefined,
              tags: product.tags || [],
              variants: [
                {
                  sku: product.sku,
                  price: String(finalPrice),
                  compare_at_price: finalCompareAtPrice
                    ? String(finalCompareAtPrice)
                    : undefined,
                  barcode: product.barcode || undefined,
                  weight: product.weight ? Number(product.weight) : undefined,
                  weight_unit: "kg",
                  inventory_management: null,
                },
              ],
              images,
            });

            // Create or update channel mapping
            await prisma.masterProductChannel.upsert({
              where: {
                productId_channelId: {
                  productId: product.id,
                  channelId: channel.id,
                },
              },
              create: {
                productId: product.id,
                channelId: channel.id,
                isActive: true,
                isPublished: true,
                externalId: String(shopifyProduct.id),
                externalOverrides: {
                  shopifyProductId: shopifyProduct.id,
                  shopifyVariantId: shopifyProduct.variants[0]?.id,
                },
                lastSyncedAt: new Date(),
              },
              update: {
                externalId: String(shopifyProduct.id),
                externalOverrides: {
                  shopifyProductId: shopifyProduct.id,
                  shopifyVariantId: shopifyProduct.variants[0]?.id,
                },
                lastSyncedAt: new Date(),
              },
            });

            progress[storeId].created++;
          } else {
            // Update existing product in Shopify
            await shopifyClient.updateProduct(externalId, {
              title: finalTitle,
              body_html: finalDescription || undefined,
              tags: product.tags || [],
              variants: [
                {
                  sku: product.sku,
                  price: String(finalPrice),
                  compare_at_price: finalCompareAtPrice
                    ? String(finalCompareAtPrice)
                    : undefined,
                },
              ],
            });

            // Update timestamp
            if (existingChannel) {
              await prisma.masterProductChannel.update({
                where: { id: existingChannel.id },
                data: { lastSyncedAt: new Date() },
              });
            }

            progress[storeId].updated++;
          }

          progress[storeId].done++;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          progress[storeId].errors++;
          progress[storeId].errorMessages.push(
            `${product.sku}: ${errorMessage}`
          );
          progress[storeId].done++;
          console.error(`Bulk push error for ${product.sku}:`, errorMessage);
        }

        batchCount++;

        // Update progress in DB every 5 products
        if (batchCount % 5 === 0) {
          await prisma.bulkPushJob.update({
            where: { id: job.id },
            data: { progress: progress },
          });
        }
      }

      // Final update for this store
      await prisma.bulkPushJob.update({
        where: { id: job.id },
        data: { progress: progress },
      });
    }

    // Mark job as completed
    await prisma.bulkPushJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        progress: progress,
      },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Bulk push error:", errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
