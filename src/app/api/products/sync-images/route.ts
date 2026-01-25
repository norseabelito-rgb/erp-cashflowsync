import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  getDriveClient,
  extractFolderId,
  listProductFolders,
  listFolderImages,
  getPublicImageUrl,
  getThumbnailUrl,
  DriveFile,
} from "@/lib/google-drive";

interface SyncResult {
  sku: string;
  productId: string | null;
  imagesFound: number;
  imagesAdded: number;
  imagesSkipped: number;
  imagesUpdated: number;
  imagesRemoved: number;
  status: "synced" | "created" | "not_found" | "error";
  error?: string;
  errors: string[];
}

// GET - Status sincronizare și preview
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.googleDriveFolderUrl) {
      return NextResponse.json({
        success: false,
        error: "URL-ul folderului Google Drive nu este configurat",
        configured: false,
      });
    }

    if (!settings?.googleDriveCredentials) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Google Drive nu sunt configurate",
        configured: false,
      });
    }

    const folderId = extractFolderId(settings.googleDriveFolderUrl);
    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: "URL-ul folderului Google Drive este invalid",
      });
    }

    // Parsează credențialele
    let credentials;
    try {
      credentials = JSON.parse(settings.googleDriveCredentials);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Google Drive sunt invalide (JSON malformat)",
      });
    }

    // Inițializează clientul Drive
    const drive = getDriveClient(credentials);

    // Listează folderele (SKU-uri)
    const folders = await listProductFolders(drive, folderId);

    // Obține produsele master existente
    const masterProducts = await prisma.masterProduct.findMany({
      select: {
        id: true,
        sku: true,
        title: true,
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    const skuToProduct = new Map(masterProducts.map((p) => [p.sku.toUpperCase(), p]));

    // Construiește preview
    const preview = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const folder of folders) {
      const sku = folder.name.toUpperCase();
      const product = skuToProduct.get(sku);
      const images = await listFolderImages(drive, folder.id);

      preview.push({
        folderName: folder.name,
        sku,
        imagesCount: images.length,
        imageNames: images.map((img) => img.name),
        matched: !!product,
        productId: product?.id || null,
        productTitle: product?.title || null,
        currentImagesCount: product?.images?.length || 0,
      });

      if (product) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      configured: true,
      lastSync: settings.googleDriveLastSync,
      folderId,
      stats: {
        totalFolders: folders.length,
        matchedProducts: matchedCount,
        unmatchedFolders: unmatchedCount,
      },
      preview: preview.slice(0, 50), // Primele 50 pentru preview
    });
  } catch (error: any) {
    console.error("Error checking Drive sync:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la verificarea Google Drive",
    });
  }
}

// POST - Rulează sincronizarea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, specificSku } = body;

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.googleDriveFolderUrl || !settings?.googleDriveCredentials) {
      return NextResponse.json({
        success: false,
        error: "Google Drive nu este configurat complet",
      });
    }

    const folderId = extractFolderId(settings.googleDriveFolderUrl);
    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: "URL-ul folderului Google Drive este invalid",
      });
    }

    // Parsează credențialele
    let credentials;
    try {
      credentials = JSON.parse(settings.googleDriveCredentials);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Google Drive sunt invalide",
      });
    }

    const drive = getDriveClient(credentials);
    const results: SyncResult[] = [];

    // Listează folderele
    let folders = await listProductFolders(drive, folderId);

    // Dacă avem un SKU specific, filtrăm
    if (specificSku) {
      folders = folders.filter(
        (f) => f.name.toUpperCase() === specificSku.toUpperCase()
      );
    }

    console.log(`Syncing ${folders.length} folders...`);

    for (const folder of folders) {
      const sku = folder.name.toUpperCase();
      const result: SyncResult = {
        sku,
        productId: null,
        imagesFound: 0,
        imagesAdded: 0,
        imagesSkipped: 0,
        imagesUpdated: 0,
        imagesRemoved: 0,
        status: "not_found",
        errors: [],
      };

      try {
        // Găsește produsul master
        const product = await prisma.masterProduct.findFirst({
          where: { sku: { equals: sku, mode: "insensitive" } },
          include: {
            images: {
              orderBy: { position: "asc" },
            },
          },
        });

        if (!product) {
          result.status = "not_found";
          results.push(result);
          continue;
        }

        result.productId = product.id;

        // Listează imaginile din folder
        const driveImages = await listFolderImages(drive, folder.id);
        result.imagesFound = driveImages.length;

        if (dryRun) {
          result.status = "synced";
          results.push(result);
          continue;
        }

        // Fetch existing images for the product
        const existing = await prisma.masterProductImage.findMany({
          where: { productId: product.id },
          select: { url: true, position: true }
        });
        const existingUrls = new Set(existing.map(img => img.url));
        let nextPosition = existing.length > 0
          ? Math.max(...existing.map(img => img.position)) + 1
          : 0;

        console.log(`  [${folders.indexOf(folder) + 1}/${folders.length}] ${product.sku}: ${existing.length} existing, ${driveImages.length} in Drive`);

        // Create only new images (skip existing URLs)
        for (let i = 0; i < driveImages.length; i++) {
          const driveImg = driveImages[i];
          const imageUrl = getPublicImageUrl(driveImg.id);

          // Skip if URL already exists
          if (existingUrls.has(imageUrl)) {
            result.imagesSkipped++;
            continue;
          }

          const modifiedTime = driveImg.modifiedTime
            ? new Date(driveImg.modifiedTime)
            : null;

          try {
            await prisma.masterProductImage.create({
              data: {
                productId: product.id,
                url: imageUrl,
                filename: driveImg.name,
                position: nextPosition++,
                driveFileId: driveImg.id,
                driveModified: modifiedTime,
              },
            });
            result.imagesAdded++;
            console.log(`    + Added: ${driveImg.name} at position ${nextPosition - 1}`);
          } catch (error: any) {
            result.errors.push(`${driveImg.name}: ${error.message}`);
            console.error(`    x Failed: ${driveImg.name} - ${error.message}`);
          }
        }

        console.log(`    Summary: ${result.imagesAdded} added, ${result.imagesSkipped} skipped, ${result.errors.length} errors`);

        result.status = "synced";
      } catch (error: any) {
        console.error(`Error syncing ${sku}:`, error);
        result.status = "error";
        result.error = error.message;
      }

      results.push(result);
    }

    // Actualizează timestamp-ul sincronizării
    if (!dryRun) {
      await prisma.settings.update({
        where: { id: "default" },
        data: { googleDriveLastSync: new Date() },
      });
    }

    // Calculează statistici
    const stats = {
      total: results.length,
      synced: results.filter((r) => r.status === "synced").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      errors: results.filter((r) => r.status === "error").length,
      imagesAdded: results.reduce((sum, r) => sum + r.imagesAdded, 0),
      imagesSkipped: results.reduce((sum, r) => sum + r.imagesSkipped, 0),
      imagesUpdated: results.reduce((sum, r) => sum + r.imagesUpdated, 0),
      imagesRemoved: results.reduce((sum, r) => sum + r.imagesRemoved, 0),
      imageErrors: results.flatMap(r => r.errors).slice(0, 20), // First 20 errors
    };

    return NextResponse.json({
      success: true,
      dryRun,
      stats,
      results: results.slice(0, 100), // Primele 100 pentru response
    });
  } catch (error: any) {
    console.error("Error syncing images:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la sincronizarea imaginilor",
    });
  }
}
