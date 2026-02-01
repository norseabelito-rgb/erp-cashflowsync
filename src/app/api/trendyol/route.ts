import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { TrendyolClient, flattenCategories, generateBarcode, translateTurkishToRomanian } from "@/lib/trendyol";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Obține status conexiune și date cache
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "trendyol.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    // Check for TrendyolStore (new multi-store) - prioritate peste Settings
    const storeId = searchParams.get("storeId");
    const trendyolStores = await prisma.trendyolStore.findMany({
      where: { isActive: true },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Select store: by storeId param, or first active, or null
    const selectedStore = storeId
      ? trendyolStores.find(s => s.id === storeId)
      : trendyolStores[0];

    // Test conexiune
    if (action === "test") {
      // Headere complete pentru a trece de Cloudflare
      const browserHeaders = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,ro;q=0.8",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
      };

      // Primul test: verificăm dacă putem accesa internetul (folosim endpoint public)
      console.log("[Trendyol Test] Step 1: Testing basic connectivity to apigw.trendyol.com...");
      try {
        const testFetch = await fetch("https://apigw.trendyol.com/integration/product/brands?page=0&size=1", {
          headers: browserHeaders
        });
        console.log("[Trendyol Test] Basic connectivity status:", testFetch.status);
        const testText = await testFetch.text();
        console.log("[Trendyol Test] Response preview:", testText.substring(0, 200));
        
        if (testFetch.status === 403) {
          return NextResponse.json({
            success: false,
            error: "Cloudflare blochează request-urile. Încearcă să dezactivezi VPN/proxy sau contactează suportul Trendyol.",
            configured: false,
          });
        }
      } catch (netError: any) {
        console.error("[Trendyol Test] Network error:", netError.message);
        return NextResponse.json({
          success: false,
          error: `Eroare de rețea: ${netError.message}. Verifică conexiunea la internet.`,
          configured: false,
        });
      }

      // Use TrendyolStore first, fallback to Settings
      const credentials = selectedStore ? {
        supplierId: selectedStore.supplierId,
        apiKey: selectedStore.apiKey,
        apiSecret: selectedStore.apiSecret,
        isTestMode: selectedStore.isTestMode,
      } : settings?.trendyolSupplierId ? {
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey!,
        apiSecret: settings.trendyolApiSecret!,
        isTestMode: settings.trendyolIsTestMode || false,
      } : null;

      if (!credentials) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate. Adaugă un TrendyolStore în setări.",
          configured: false,
          stores: [],
        });
      }

      console.log("[Trendyol Test] Step 2: Using credentials:");
      console.log("  - Source:", selectedStore ? `TrendyolStore: ${selectedStore.name}` : "Settings (legacy)");
      console.log("  - SupplierId:", credentials.supplierId);
      console.log("  - ApiKey:", credentials.apiKey.substring(0, 5) + "...");
      console.log("  - ApiSecret:", credentials.apiSecret ? "***set***" : "***empty***");
      console.log("  - TestMode:", credentials.isTestMode);

      const client = new TrendyolClient(credentials);

      const result = await client.testConnection();

      console.log("[Trendyol Test] Result:", JSON.stringify(result, null, 2));

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
          configured: true,
        });
      }

      // Salvează automat storeFrontCode în baza de date dacă a fost detectat
      if (result.data?.storeFrontCode && settings && result.data.storeFrontCode !== settings.trendyolStoreFrontCode) {
        console.log("[Trendyol Test] Auto-saving storeFrontCode:", result.data.storeFrontCode);
        await prisma.settings.update({
          where: { id: "default" },
          data: { trendyolStoreFrontCode: result.data.storeFrontCode },
        });
      }

      return NextResponse.json({
        success: true,
        configured: true,
        data: result.data,
        // Multi-store info
        stores: trendyolStores.map(s => ({
          id: s.id,
          name: s.name,
          supplierId: s.supplierId,
          companyId: s.companyId,
          companyName: s.company.name,
        })),
        selectedStoreId: selectedStore?.id || null,
      });
    }

    // Categorii - folosesc storeFrontCode din setări
    if (action === "categories") {
      const storeFrontCode = settings?.trendyolStoreFrontCode || searchParams.get("storeFrontCode") || undefined;
      
      const client = new TrendyolClient({
        supplierId: "",
        apiKey: "",
        apiSecret: "",
      });

      console.log("[Trendyol API] Fetching categories with storeFrontCode:", storeFrontCode);
      
      const result = await client.getCategories(storeFrontCode);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
        });
      }

      // Flatten pentru UI
      const flattened = flattenCategories(result.data || []);

      return NextResponse.json({
        success: true,
        categories: result.data,
        flatCategories: flattened,
        total: flattened.length,
        storeFrontCode,
      });
    }

    // Atribute pentru o categorie
    if (action === "attributes") {
      const categoryId = searchParams.get("categoryId");
      const storeFrontCode = settings?.trendyolStoreFrontCode || searchParams.get("storeFrontCode") || undefined;
      
      if (!categoryId) {
        return NextResponse.json({
          success: false,
          error: "categoryId is required",
        });
      }

      const client = new TrendyolClient({
        supplierId: "",
        apiKey: "",
        apiSecret: "",
      });

      const result = await client.getCategoryAttributes(parseInt(categoryId), storeFrontCode);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
        });
      }

      return NextResponse.json({
        success: true,
        attributes: result.data,
      });
    }

    // Branduri
    if (action === "brands") {
      const search = searchParams.get("search");
      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "100");

      const client = new TrendyolClient({
        supplierId: "",
        apiKey: "",
        apiSecret: "",
      });

      let result;
      if (search) {
        result = await client.searchBrands(search);
      } else {
        result = await client.getBrands(page, size);
      }

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error,
        });
      }

      return NextResponse.json({
        success: true,
        brands: result.data,
      });
    }

    // Helper: get credentials from TrendyolStore or Settings
    const getCredentials = () => {
      if (selectedStore) {
        return {
          supplierId: selectedStore.supplierId,
          apiKey: selectedStore.apiKey,
          apiSecret: selectedStore.apiSecret,
          isTestMode: selectedStore.isTestMode,
          storeFrontCode: selectedStore.storeFrontCode,
        };
      }
      if (settings?.trendyolSupplierId && settings?.trendyolApiKey && settings?.trendyolApiSecret) {
        return {
          supplierId: settings.trendyolSupplierId,
          apiKey: settings.trendyolApiKey,
          apiSecret: settings.trendyolApiSecret,
          isTestMode: settings.trendyolIsTestMode || false,
          storeFrontCode: settings.trendyolStoreFrontCode || undefined,
        };
      }
      return null;
    };

    // Adrese expeditor (necesită autentificare)
    if (action === "addresses") {
      const creds = getCredentials();
      if (!creds) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient(creds);
      const result = await client.getSupplierAddresses();

      return NextResponse.json({
        success: result.success,
        addresses: result.data,
        error: result.error,
      });
    }

    // Cargo companies (firme de curierat)
    if (action === "cargo") {
      const creds = getCredentials();
      if (!creds) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient(creds);
      const result = await client.getCargoCompanies();

      return NextResponse.json({
        success: result.success,
        cargoCompanies: result.data,
        error: result.error,
      });
    }

    // Produsele din Trendyol
    if (action === "products") {
      const creds = getCredentials();
      if (!creds) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient(creds);

      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "50");
      const approved = searchParams.get("approved");
      const barcode = searchParams.get("barcode");

      // Folosește storeFrontCode din query param, TrendyolStore, sau Settings
      let storeFrontCode = searchParams.get("storeFrontCode") || creds.storeFrontCode || undefined;

      console.log("[Trendyol Products] storeFrontCode from creds:", creds.storeFrontCode);
      console.log("[Trendyol Products] storeFrontCode used:", storeFrontCode);

      // Prima încercare cu storeFrontCode-ul specificat (sau fără)
      let result = await client.getProducts({
        page,
        size,
        approved: approved ? approved === "true" : undefined,
        barcode: barcode || undefined,
        storeFrontCode,
      });

      // Dacă nu avem produse și nu am specificat storeFrontCode, încercăm cu RO
      if (result.success && result.data?.totalElements === 0 && !storeFrontCode) {
        console.log("[Trendyol Products] No products found, trying with storeFrontCode=RO");
        result = await client.getProducts({
          page,
          size,
          approved: approved ? approved === "true" : undefined,
          barcode: barcode || undefined,
          storeFrontCode: "RO",
        });
        
        if (result.success && result.data && result.data.totalElements > 0) {
          storeFrontCode = "RO";
          console.log("[Trendyol Products] Found products with RO, updating settings...");
          // Salvează automat storeFrontCode în setări
          await prisma.settings.update({
            where: { id: "default" },
            data: { trendyolStoreFrontCode: "RO" },
          });
        }
      }

      return NextResponse.json({
        success: result.success,
        products: result.data?.content || [],
        total: result.data?.totalElements || 0,
        storeFrontCode,
        error: result.error,
      });
    }

    // Get sync info (last synced time and count)
    if (action === "syncInfo") {
      const syncedProducts = await prisma.masterProduct.findMany({
        where: {
          trendyolBarcode: { not: null },
          trendyolLastSyncedAt: { not: null },
        },
        select: {
          trendyolLastSyncedAt: true,
        },
        orderBy: {
          trendyolLastSyncedAt: "desc",
        },
        take: 1,
      });

      const syncedCount = await prisma.masterProduct.count({
        where: {
          trendyolBarcode: { not: null },
          trendyolLastSyncedAt: { not: null },
        },
      });

      return NextResponse.json({
        success: true,
        lastSyncedAt: syncedProducts[0]?.trendyolLastSyncedAt || null,
        syncedCount,
      });
    }

    // Default - returnează statusul configurării
    // Considerat "configurat" dacă există TrendyolStore SAU Settings legacy
    const isConfigured = trendyolStores.length > 0 || !!(settings?.trendyolSupplierId && settings?.trendyolApiKey && settings?.trendyolApiSecret);

    return NextResponse.json({
      success: true,
      configured: isConfigured,
      isTestMode: selectedStore?.isTestMode || settings?.trendyolIsTestMode || false,
      // Multi-store support
      stores: trendyolStores.map(s => ({
        id: s.id,
        name: s.name,
        supplierId: s.supplierId,
        companyId: s.companyId,
        companyName: s.company.name,
        storeFrontCode: s.storeFrontCode,
      })),
      selectedStoreId: selectedStore?.id || null,
      // Legacy fallback info
      hasLegacyConfig: !!(settings?.trendyolSupplierId),
    });

  } catch (error: any) {
    console.error("Trendyol API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

// POST - Operații care modifică date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "trendyol.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    // Try TrendyolStore first (new multi-store), fallback to Settings (legacy)
    const trendyolStore = await prisma.trendyolStore.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const credentials = trendyolStore ? {
      supplierId: trendyolStore.supplierId,
      apiKey: trendyolStore.apiKey,
      apiSecret: trendyolStore.apiSecret,
      isTestMode: trendyolStore.isTestMode,
    } : settings?.trendyolSupplierId ? {
      supplierId: settings.trendyolSupplierId,
      apiKey: settings.trendyolApiKey!,
      apiSecret: settings.trendyolApiSecret!,
      isTestMode: settings.trendyolIsTestMode,
    } : null;

    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Trendyol nu sunt configurate",
      });
    }

    const client = new TrendyolClient(credentials);

    // Creare produs
    if (action === "createProduct") {
      const { product } = body;
      
      if (!product) {
        return NextResponse.json({
          success: false,
          error: "Product data is required",
        });
      }

      const result = await client.createProducts([product]);

      return NextResponse.json({
        success: result.success,
        batchRequestId: result.batchRequestId,
        error: result.error,
      });
    }

    // Update preț și stoc
    if (action === "updatePriceAndInventory") {
      const { items } = body;
      
      if (!items || !Array.isArray(items)) {
        return NextResponse.json({
          success: false,
          error: "Items array is required",
        });
      }

      const result = await client.updatePriceAndInventory(items);

      return NextResponse.json({
        success: result.success,
        batchRequestId: result.batchRequestId,
        error: result.error,
      });
    }

    // Verifică status batch request
    if (action === "checkBatch") {
      const { batchRequestId } = body;
      
      if (!batchRequestId) {
        return NextResponse.json({
          success: false,
          error: "batchRequestId is required",
        });
      }

      const result = await client.getBatchRequestResult(batchRequestId);

      return NextResponse.json({
        success: result.success,
        status: result.data?.status,
        items: result.data?.items,
        error: result.error,
      });
    }

    // Delete produse
    if (action === "deleteProducts") {
      const { barcodes } = body;
      
      if (!barcodes || !Array.isArray(barcodes)) {
        return NextResponse.json({
          success: false,
          error: "Barcodes array is required",
        });
      }

      const result = await client.deleteProducts(barcodes);

      return NextResponse.json({
        success: result.success,
        batchRequestId: result.batchRequestId,
        error: result.error,
      });
    }

    // Publică produse din ERP către Trendyol
    if (action === "publishProducts") {
      const { productIds, brandId, brandName } = body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: "productIds array is required",
        });
      }

      if (!brandId) {
        return NextResponse.json({
          success: false,
          error: "brandId is required",
        });
      }

      // Fetch produsele din DB cu categorii și imagini
      const products = await prisma.masterProduct.findMany({
        where: {
          id: { in: productIds },
          category: {
            trendyolCategoryId: { not: null }
          }
        },
        include: {
          category: true,
          images: {
            orderBy: { position: "asc" }
          }
        }
      });

      if (products.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Nu au fost găsite produse valide pentru publicare",
        });
      }

      // Cursul de schimb RON -> EUR
      const currencyRate = settings.trendyolCurrencyRate ? 
        parseFloat(settings.trendyolCurrencyRate.toString()) : 5.0;

      // Validate attributes before publishing
      const productsWithMissingAttrs: string[] = [];

      for (const product of products) {
        if (!product.category?.trendyolCategoryId) continue;

        const categoryAttrs = product.category?.trendyolAttributes as any[] || [];
        const requiredAttrs = categoryAttrs.filter((a: any) => a.required);
        const savedAttrs = (product as any).trendyolAttributeValues as Record<string, { attributeValueId?: number; customValue?: string }> || {};

        const missingAttrs = requiredAttrs.filter((attr: any) => {
          const attrId = (attr.attribute?.id || attr.id).toString();
          const saved = savedAttrs[attrId];
          return !saved || (!saved.attributeValueId && !saved.customValue);
        });

        if (missingAttrs.length > 0) {
          const missingNames = missingAttrs.map((a: any) => a.attribute?.name || a.name).join(", ");
          productsWithMissingAttrs.push(`${product.sku}: ${missingNames}`);
        }
      }

      if (productsWithMissingAttrs.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Urmatoarele produse nu au atributele obligatorii configurate:\n${productsWithMissingAttrs.join("\n")}`,
          missingAttributes: productsWithMissingAttrs,
        });
      }

      // Construim produsele pentru Trendyol
      const trendyolProducts = products
        .filter(product => product.category?.trendyolCategoryId) // Filtram produsele fara categorie Trendyol
        .map(product => {
        // Generam barcode din SKU daca nu exista
        const barcode = product.trendyolBarcode || generateBarcode(product.sku);

        // Convertim pretul din RON in EUR
        const priceEUR = Math.round((parseFloat(product.price.toString()) / currencyRate) * 100) / 100;

        // Atributele categoriei (obligatorii)
        const categoryAttrs = product.category?.trendyolAttributes as any[] || [];
        const requiredAttrs = categoryAttrs.filter((a: any) => a.required);

        // Use saved attribute values from product.trendyolAttributeValues
        const savedAttrs = (product as any).trendyolAttributeValues as Record<string, { attributeValueId?: number; customValue?: string }> || {};

        const attributes = requiredAttrs.map((attr: any) => {
          const attrId = attr.attribute?.id || attr.id;
          const saved = savedAttrs[attrId.toString()];
          if (!saved) return null;

          return {
            attributeId: attrId,
            ...(saved.attributeValueId ? { attributeValueId: saved.attributeValueId } : {}),
            ...(saved.customValue ? { customAttributeValue: saved.customValue } : {}),
          };
        }).filter(Boolean);

        return {
          barcode,
          title: product.title.substring(0, 100), // Max 100 chars
          productMainId: product.sku,
          brandId: brandId,
          categoryId: product.category!.trendyolCategoryId as number,
          quantity: product.stock,
          stockCode: product.sku,
          dimensionalWeight: 1,
          description: product.description?.replace(/<[^>]*>/g, '').substring(0, 30000) || product.title,
          currencyType: "EUR" as const,
          listPrice: priceEUR,
          salePrice: priceEUR,
          vatRate: 20, // Trendyol accepts only 0, 1, 10, 20
          cargoCompanyId: 17, // Default cargo
          images: product.images.slice(0, 8).map(img => {
            let url = img.url;
            const baseUrl = process.env.NEXTAUTH_URL || 'https://erp-cashflowsync-staging.up.railway.app';
            // Convert relative URLs to absolute with .jpg extension for Trendyol
            if (url.startsWith('/api/drive-image/')) {
              const fileId = url.replace('/api/drive-image/', '');
              // Use our proxy with .jpg extension (Trendyol requires image extension)
              url = `${baseUrl}/api/drive-image/${fileId}.jpg`;
            } else if (url.startsWith('/')) {
              // Other relative URLs - make absolute
              url = `${baseUrl}${url}`;
            }
            return { url };
          }),
          attributes: attributes.length > 0 ? attributes : undefined,
        };
      });

      console.log("[Trendyol] Publishing products:", JSON.stringify(trendyolProducts, null, 2));

      // Trimitem către Trendyol
      const result = await client.createProducts(trendyolProducts);

      if (result.success && result.batchRequestId) {
        // Actualizăm produsele în DB
        for (const product of products) {
          const trendyolProduct = trendyolProducts.find(p => p.productMainId === product.sku);
          await prisma.masterProduct.update({
            where: { id: product.id },
            data: {
              trendyolBarcode: trendyolProduct?.barcode,
              trendyolBrandId: brandId,
              trendyolBrandName: brandName,
              trendyolStatus: "pending",
              trendyolBatchId: result.batchRequestId,
              trendyolLastSyncedAt: new Date(),
            }
          });
        }
      }

      return NextResponse.json({
        success: result.success,
        sent: trendyolProducts.length,
        batchRequestId: result.batchRequestId,
        error: result.error,
      });
    }

    // Generate webhook secret (cryptographically random)
    if (action === "generateWebhookSecret") {
      const crypto = await import("crypto");
      const secret = crypto.randomBytes(32).toString("hex");

      // Save to settings
      await prisma.settings.upsert({
        where: { id: "default" },
        update: { trendyolWebhookSecret: secret },
        create: { id: "default", trendyolWebhookSecret: secret },
      });

      return NextResponse.json({
        success: true,
        secret,
        message: "Webhook secret generated and saved",
      });
    }

    // Register webhook with Trendyol
    if (action === "registerWebhook") {
      const { callbackUrl, events } = body;

      if (!callbackUrl) {
        return NextResponse.json({
          success: false,
          error: "callbackUrl is required",
        });
      }

      const defaultEvents = [
        "OrderCreated",
        "OrderStatusChanged",
        "OrderCancelled",
        "OrderReturned",
        "ShipmentDelivered",
      ];

      const result = await client.registerWebhook(callbackUrl, events || defaultEvents);

      return NextResponse.json({
        success: result.success,
        webhookId: result.data?.webhookId,
        error: result.error,
      });
    }

    // List registered webhooks
    if (action === "listWebhooks") {
      const result = await client.listWebhooks();

      return NextResponse.json({
        success: result.success,
        webhooks: result.data?.webhooks || [],
        error: result.error,
      });
    }

    // Unregister webhook
    if (action === "unregisterWebhook") {
      const { webhookId } = body;

      if (!webhookId) {
        return NextResponse.json({
          success: false,
          error: "webhookId is required",
        });
      }

      const result = await client.deleteWebhook(webhookId);

      return NextResponse.json({
        success: result.success,
        error: result.error,
      });
    }

    // Retry sending invoice for a specific order
    if (action === "retrySendInvoice") {
      const { orderId } = body;

      if (!orderId) {
        return NextResponse.json({
          success: false,
          error: "orderId is required",
        });
      }

      // Get the TrendyolOrder and check if there's an invoice link to retry
      const trendyolOrder = await prisma.trendyolOrder.findFirst({
        where: { orderId },
        include: {
          order: {
            include: { invoice: true }
          }
        }
      });

      if (!trendyolOrder) {
        return NextResponse.json({
          success: false,
          error: "Not a Trendyol order or order not found",
        }, { status: 404 });
      }

      if (!trendyolOrder.oblioInvoiceLink) {
        return NextResponse.json({
          success: false,
          error: "No invoice link available - invoice may not have been issued yet",
        }, { status: 400 });
      }

      // Import and call the send function
      const { sendInvoiceToTrendyol } = await import("@/lib/trendyol-invoice");
      const retryResult = await sendInvoiceToTrendyol(orderId, trendyolOrder.oblioInvoiceLink);

      return NextResponse.json({
        success: retryResult.success,
        error: retryResult.error,
        orderNumber: trendyolOrder.trendyolOrderNumber,
      });
    }

    // Retry all failed invoice sends
    if (action === "retryAllFailedInvoices") {
      const { retryFailedInvoiceSends } = await import("@/lib/trendyol-invoice");
      const result = await retryFailedInvoiceSends();

      return NextResponse.json({
        success: result.failed === 0 && result.total > 0,
        total: result.total,
        successCount: result.success,
        failedCount: result.failed,
        errors: result.errors,
      });
    }

    // Get pending/failed invoice sends
    if (action === "getPendingInvoiceSends") {
      const { getPendingInvoiceSends } = await import("@/lib/trendyol-invoice");
      const result = await getPendingInvoiceSends();

      return NextResponse.json({
        success: true,
        pending: result.pending,
        failed: result.failed,
        orders: result.orders,
      });
    }

    // Retry sending AWB tracking for a specific order
    if (action === "retrySendTracking") {
      const { orderId } = body;

      if (!orderId) {
        return NextResponse.json({
          success: false,
          error: "orderId is required",
        });
      }

      const { retrySendTrackingToTrendyol } = await import("@/lib/trendyol-awb");
      const result = await retrySendTrackingToTrendyol(orderId);

      return NextResponse.json({
        success: result.success,
        error: result.error,
      });
    }

    // Sync all products stock and prices to Trendyol
    if (action === "syncInventory") {
      const { syncAllProductsToTrendyol } = await import("@/lib/trendyol-stock-sync");
      const syncResult = await syncAllProductsToTrendyol();

      return NextResponse.json(syncResult);
    }

    // Sync a single product stock and price to Trendyol
    if (action === "syncProduct") {
      const { productId } = body;

      if (!productId) {
        return NextResponse.json({
          success: false,
          error: "productId is required",
        });
      }

      const { syncSingleProductToTrendyol } = await import("@/lib/trendyol-stock-sync");
      const productSyncResult = await syncSingleProductToTrendyol(productId);

      return NextResponse.json(productSyncResult);
    }

    return NextResponse.json({
      success: false,
      error: "Unknown action",
    });

  } catch (error: any) {
    console.error("Trendyol API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}
