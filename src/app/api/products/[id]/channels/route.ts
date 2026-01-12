import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ShopifyClient } from "@/lib/shopify";

/**
 * Convertește URL-ul imaginii în URL public Google Drive
 * Input: "/api/drive-image/19Kcrvqyag_HgFq7hac-LEcDepREE-5Nd" sau URL complet
 * Output: URL care poate fi accesat de Shopify pentru download
 * 
 * NOTĂ: Folosim lh3.googleusercontent.com care e mai compatibil cu Shopify
 */
function getPublicGoogleDriveUrl(url: string): string | null {
  let fileId: string | null = null;
  
  // Extrage fileId din diferite formate
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
    // Doar ID-ul
    fileId = url;
  } else if (url.startsWith("https://") || url.startsWith("http://")) {
    // URL extern valid, returnează-l direct
    return url;
  }
  
  if (fileId) {
    // Folosim lh3.googleusercontent.com care permite download direct
    // Alternativ: https://drive.google.com/uc?export=download&id=
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  return null;
}

// GET - Lista canalelor unui produs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    const productChannels = await prisma.masterProductChannel.findMany({
      where: { productId },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      channels: productChannels,
    });
  } catch (error: any) {
    console.error("Error fetching product channels:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Adaugă produs pe un canal (și îl creează în Shopify dacă e cazul)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { channelId, isPublished = true, isActive = true, overrides = {} } = body;

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "ID-ul canalului este obligatoriu" },
        { status: 400 }
      );
    }

    // Verifică dacă există deja
    const existing = await prisma.masterProductChannel.findUnique({
      where: {
        productId_channelId: { productId, channelId }
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Produsul este deja pe acest canal" },
        { status: 400 }
      );
    }

    // Obține produsul și canalul cu store-ul asociat
    const [product, channel] = await Promise.all([
      prisma.masterProduct.findUnique({
        where: { id: productId },
        include: {
          images: {
            orderBy: { position: "asc" }
          }
        }
      }),
      prisma.channel.findUnique({
        where: { id: channelId },
        include: { store: true }
      })
    ]);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produsul nu a fost găsit" },
        { status: 404 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Canalul nu a fost găsit" },
        { status: 404 }
      );
    }

    let externalId: string | null = null;
    let externalData: any = null;

    // Dacă canalul e Shopify, creăm produsul în Shopify
    if (channel.type === "SHOPIFY" && channel.store) {
      try {
        const shopifyClient = new ShopifyClient(
          channel.store.shopifyDomain,
          channel.store.accessToken,
          channel.store.id
        );

        // Aplică override-uri dacă există
        const finalTitle = (overrides as any).title || product.title;
        const finalDescription = (overrides as any).description || product.description;
        const finalPrice = (overrides as any).price || Number(product.price);
        const finalCompareAtPrice = (overrides as any).compareAtPrice || (product.compareAtPrice ? Number(product.compareAtPrice) : undefined);

        // Creează produsul în Shopify
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
            inventory_management: null, // Nu urmărim stocul
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
        });

        externalId = String(shopifyProduct.id);
        externalData = {
          shopifyProductId: shopifyProduct.id,
          shopifyVariantId: shopifyProduct.variants[0]?.id,
          createdAt: shopifyProduct.created_at,
        };

        console.log(`Product ${product.sku} created in Shopify with ID: ${shopifyProduct.id}`);

      } catch (shopifyError: any) {
        console.error("Shopify create error:", shopifyError);
        return NextResponse.json(
          { success: false, error: `Eroare Shopify: ${shopifyError.message}` },
          { status: 500 }
        );
      }
    }

    // Creează înregistrarea în DB
    const productChannel = await prisma.masterProductChannel.create({
      data: {
        productId,
        channelId,
        isPublished,
        isActive,
        overrides,
        externalId,
        externalOverrides: externalData || {},
        lastSyncedAt: externalId ? new Date() : null,
      },
      include: {
        channel: true,
        product: true,
      }
    });

    return NextResponse.json({
      success: true,
      productChannel,
      message: externalId 
        ? `Produs adăugat pe canal și creat în Shopify (ID: ${externalId})`
        : "Produs adăugat pe canal",
    });
  } catch (error: any) {
    console.error("Error adding product to channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizează override-uri pentru un canal (și în Shopify dacă e cazul)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { 
      channelId, 
      isPublished, 
      isActive, 
      overrides,
      resetOverrides, // Array de câmpuri de resetat
      resetAll, // Resetează toate override-urile
      syncToShopify = true, // Dacă să sincronizeze la Shopify (default true)
    } = body;

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "ID-ul canalului este obligatoriu" },
        { status: 400 }
      );
    }

    // Obține înregistrarea existentă cu canal, store și produs
    const existing = await prisma.masterProductChannel.findUnique({
      where: {
        productId_channelId: { productId, channelId }
      },
      include: {
        channel: {
          include: { store: true }
        },
        product: {
          include: {
            images: {
              orderBy: { position: "asc" }
            }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produsul nu este pe acest canal" },
        { status: 404 }
      );
    }

    // Gestionează override-urile
    let newOverrides = existing.overrides as Record<string, any> || {};

    if (resetAll) {
      newOverrides = {};
    } else if (resetOverrides?.length > 0) {
      for (const field of resetOverrides) {
        delete newOverrides[field];
      }
    } else if (overrides) {
      // Merge override-uri noi cu cele existente
      newOverrides = { ...newOverrides, ...overrides };
      
      // Elimină override-urile care sunt null/undefined
      Object.keys(newOverrides).forEach(key => {
        if (newOverrides[key] === null || newOverrides[key] === undefined) {
          delete newOverrides[key];
        }
      });
    }

    // Dacă canalul e Shopify și avem externalId, actualizăm în Shopify
    if (syncToShopify && existing.channel.type === "SHOPIFY" && existing.channel.store && existing.externalId) {
      try {
        const shopifyClient = new ShopifyClient(
          existing.channel.store.shopifyDomain,
          existing.channel.store.accessToken,
          existing.channel.store.id
        );

        // Calculează valorile finale (master + overrides)
        const finalTitle = newOverrides.title || existing.product.title;
        const finalDescription = newOverrides.description || existing.product.description;
        const finalPrice = newOverrides.price || Number(existing.product.price);
        const finalCompareAtPrice = newOverrides.compareAtPrice || (existing.product.compareAtPrice ? Number(existing.product.compareAtPrice) : undefined);

        await shopifyClient.updateProduct(existing.externalId, {
          title: finalTitle,
          body_html: finalDescription || undefined,
          tags: existing.product.tags || [],
          variants: [{
            sku: existing.product.sku,
            price: String(finalPrice),
            compare_at_price: finalCompareAtPrice ? String(finalCompareAtPrice) : undefined,
          }],
        });

        console.log(`Product ${existing.product.sku} updated in Shopify`);

      } catch (shopifyError: any) {
        console.error("Shopify update error:", shopifyError);
        return NextResponse.json(
          { success: false, error: `Eroare Shopify: ${shopifyError.message}` },
          { status: 500 }
        );
      }
    }

    const productChannel = await prisma.masterProductChannel.update({
      where: {
        productId_channelId: { productId, channelId }
      },
      data: {
        ...(isPublished !== undefined && { isPublished }),
        ...(isActive !== undefined && { isActive }),
        overrides: newOverrides,
        lastSyncedAt: syncToShopify && existing.externalId ? new Date() : null,
      },
      include: {
        channel: true,
        product: true,
      }
    });

    return NextResponse.json({
      success: true,
      productChannel,
      message: "Canal actualizat",
    });
  } catch (error: any) {
    console.error("Error updating product channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge produsul de pe un canal (și din Shopify dacă e cazul)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "ID-ul canalului este obligatoriu" },
        { status: 400 }
      );
    }

    // Verifică dacă există
    const existing = await prisma.masterProductChannel.findUnique({
      where: {
        productId_channelId: { productId, channelId }
      },
      include: {
        channel: {
          include: { store: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produsul nu este pe acest canal" },
        { status: 404 }
      );
    }

    // Dacă canalul e Shopify și avem externalId, ștergem din Shopify
    if (existing.channel.type === "SHOPIFY" && existing.channel.store && existing.externalId) {
      try {
        const shopifyClient = new ShopifyClient(
          existing.channel.store.shopifyDomain,
          existing.channel.store.accessToken,
          existing.channel.store.id
        );

        await shopifyClient.deleteProduct(existing.externalId);
        console.log(`Product deleted from Shopify: ${existing.externalId}`);

      } catch (shopifyError: any) {
        // Logăm eroarea dar continuăm să ștergem local
        // Produsul poate să nu mai existe în Shopify
        console.error("Shopify delete error (continuing):", shopifyError.message);
      }
    }

    await prisma.masterProductChannel.delete({
      where: {
        productId_channelId: { productId, channelId }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Produs șters de pe canal",
    });
  } catch (error: any) {
    console.error("Error removing product from channel:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
