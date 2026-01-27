import prisma from "./db";
import { ShopifyClient } from "./shopify";
import { convertDescriptionToHtml } from "./utils";

// Local enum pentru status (nu depinde de Prisma generate)
const BulkPublishStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

type ChannelProgress = {
  name: string;
  total: number;
  done: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
};

type ChannelProgressMap = Record<string, ChannelProgress>;

/**
 * Convertește URL Google Drive în URL public accesibil de Shopify
 */
function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;

  let fileId: string | null = null;

  // Format: /api/drive-image/FILE_ID (format intern)
  if (url.includes("/api/drive-image/")) {
    fileId = url.split("/api/drive-image/")[1];
  }
  // Format: https://drive.google.com/file/d/FILE_ID/view
  else if (url.includes("drive.google.com")) {
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
  }
  // Doar ID-ul (20+ caractere alfanumerice)
  else if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    fileId = url;
  }
  // URL extern valid (https://...), returnează direct
  else if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  if (fileId) {
    // Folosim lh3.googleusercontent.com care permite download direct
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url;
}

/**
 * Procesează un job de publicare bulk
 * Funcționează în background și salvează progresul în DB
 */
export async function processBulkPublishJob(jobId: string): Promise<void> {
  // 1. Încarcă job-ul din DB
  const job = await (prisma as any).bulkPublishJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    console.error(`BulkPublishJob ${jobId} not found`);
    return;
  }

  if (job.status !== BulkPublishStatus.PENDING && job.status !== BulkPublishStatus.RUNNING) {
    console.log(`BulkPublishJob ${jobId} is not pending/running, skipping`);
    return;
  }

  // 2. Setează status = RUNNING, startedAt = now()
  await (prisma as any).bulkPublishJob.update({
    where: { id: jobId },
    data: {
      status: BulkPublishStatus.RUNNING,
      startedAt: job.startedAt || new Date(),
    },
  });

  const productIds = job.productIds as string[];
  const channelIds = job.channelIds as string[];

  // Încarcă canalele (doar SHOPIFY)
  const channels = await prisma.channel.findMany({
    where: {
      id: { in: channelIds },
      type: "SHOPIFY",
    },
    include: {
      store: true,
    },
  });

  if (channels.length === 0) {
    await (prisma as any).bulkPublishJob.update({
      where: { id: jobId },
      data: {
        status: BulkPublishStatus.FAILED,
        errorMessage: "Nu există canale Shopify valide selectate",
        completedAt: new Date(),
      },
    });
    return;
  }

  // Încarcă produsele
  const products = await prisma.masterProduct.findMany({
    where: { id: { in: productIds } },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
      channels: true,
    },
  });

  // Inițializează progresul per canal
  const channelProgress: ChannelProgressMap = {};
  for (const channel of channels) {
    channelProgress[channel.id] = {
      name: channel.name,
      total: products.length,
      done: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };
  }

  const totalItems = products.length * channels.length;

  await (prisma as any).bulkPublishJob.update({
    where: { id: jobId },
    data: {
      totalItems,
      channelProgress: channelProgress as any,
    },
  });

  let processedItems = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  // 3. Pentru fiecare canal Shopify
  for (const channel of channels) {
    // Verifică dacă job-ul a fost anulat
    const currentJob = await (prisma as any).bulkPublishJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (currentJob?.status === BulkPublishStatus.CANCELLED) {
      console.log(`BulkPublishJob ${jobId} was cancelled, stopping`);
      return;
    }

    if (!channel.store) {
      channelProgress[channel.id].failed = products.length;
      channelProgress[channel.id].errors.push("Canalul nu are magazin Shopify asociat");
      processedItems += products.length;
      failedCount += products.length;

      await (prisma as any).bulkPublishJob.update({
        where: { id: jobId },
        data: {
          processedItems,
          failedCount,
          channelProgress: channelProgress as any,
          currentChannelId: channel.id,
        },
      });
      continue;
    }

    // Inițializează ShopifyClient
    const shopifyClient = new ShopifyClient(
      channel.store.shopifyDomain,
      channel.store.accessToken,
      channel.store.id
    );

    // Update currentChannelId pentru resume
    await (prisma as any).bulkPublishJob.update({
      where: { id: jobId },
      data: {
        currentChannelId: channel.id,
        currentProductIdx: 0,
      },
    });

    // Pentru fiecare produs
    for (let productIdx = 0; productIdx < products.length; productIdx++) {
      const product = products[productIdx];

      // Verifică din nou dacă job-ul a fost anulat
      if (productIdx % 10 === 0) {
        const checkJob = await (prisma as any).bulkPublishJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });
        if (checkJob?.status === BulkPublishStatus.CANCELLED) {
          console.log(`BulkPublishJob ${jobId} was cancelled mid-processing`);
          return;
        }
      }

      try {
        // Verifică dacă avem deja externalId în DB
        const existingChannel = product.channels.find((c) => c.channelId === channel.id);
        let shopifyProductId = existingChannel?.externalId;

        // Dacă NU avem externalId, caută în Shopify după SKU
        if (!shopifyProductId) {
          const existingProduct = await shopifyClient.findProductBySku(product.sku);
          if (existingProduct) {
            shopifyProductId = existingProduct.id.toString();
            // Salvează externalId găsit în DB pentru viitor
            if (existingChannel) {
              await prisma.masterProductChannel.update({
                where: { id: existingChannel.id },
                data: { externalId: shopifyProductId },
              });
            }
          }
        }

        // Pregătește datele produsului pentru Shopify
        const productImages = product.images
          .map((img) => ({
            src: convertGoogleDriveUrl(img.url),
            position: img.position,
            alt: product.title,
          }))
          .filter((img) => img.src && !img.src.includes("undefined"));

        const productData = {
          title: product.title,
          body_html: convertDescriptionToHtml(product.description) || "",
          tags: product.tags || [],
          variants: [
            {
              sku: product.sku,
              price: product.price?.toString() || "0",
              compare_at_price: product.compareAtPrice?.toString() || undefined,
              barcode: product.barcode || undefined,
              weight: product.weight ? Number(product.weight) : undefined,
              weight_unit: "kg" as const,
              inventory_management: null as null,
            },
          ],
          images: productImages,
        };

        if (shopifyProductId) {
          // UPDATE produs existent
          await shopifyClient.updateProduct(shopifyProductId, productData);
          updatedCount++;
          channelProgress[channel.id].updated++;
        } else {
          // CREATE produs nou
          const newProduct = await shopifyClient.createProduct(productData);
          shopifyProductId = newProduct.id.toString();
          createdCount++;
          channelProgress[channel.id].created++;
        }

        // Salvează/actualizează MasterProductChannel
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
            externalId: shopifyProductId,
            isPublished: true,
            isActive: true,
            lastSyncedAt: new Date(),
            syncError: null,
          },
          update: {
            externalId: shopifyProductId,
            isPublished: true,
            isActive: true,
            lastSyncedAt: new Date(),
            syncError: null,
          },
        });

        channelProgress[channel.id].done++;
      } catch (error: any) {
        console.error(`Error publishing product ${product.sku} to channel ${channel.name}:`, error);
        failedCount++;
        channelProgress[channel.id].failed++;
        channelProgress[channel.id].errors.push(`${product.sku}: ${error.message}`);

        // Salvează eroarea în DB
        try {
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
              isPublished: false,
              isActive: false,
              syncError: error.message,
            },
            update: {
              syncError: error.message,
            },
          });
        } catch (dbErr) {
          console.error("Error saving sync error to DB:", dbErr);
        }

        channelProgress[channel.id].done++;
      }

      processedItems++;

      // Salvează progresul în DB la fiecare produs
      await (prisma as any).bulkPublishJob.update({
        where: { id: jobId },
        data: {
          processedItems,
          createdCount,
          updatedCount,
          failedCount,
          channelProgress: channelProgress as any,
          currentProductIdx: productIdx + 1,
        },
      });
    }
  }

  // 4. Finalizare job
  const finalStatus =
    failedCount === 0
      ? BulkPublishStatus.COMPLETED
      : failedCount === totalItems
        ? BulkPublishStatus.FAILED
        : BulkPublishStatus.COMPLETED_WITH_ERRORS;

  await (prisma as any).bulkPublishJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      channelProgress: channelProgress as any,
    },
  });

  console.log(
    `BulkPublishJob ${jobId} completed: ${createdCount} created, ${updatedCount} updated, ${failedCount} failed`
  );
}

/**
 * Verifică dacă există un job în curs pentru acest user
 */
export async function getActiveJobForUser(userId?: string): Promise<string | null> {
  const activeJob = await (prisma as any).bulkPublishJob.findFirst({
    where: {
      status: { in: [BulkPublishStatus.PENDING, BulkPublishStatus.RUNNING] },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return activeJob?.id || null;
}
