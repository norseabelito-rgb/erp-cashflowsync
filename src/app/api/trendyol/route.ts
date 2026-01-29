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

      if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
          configured: false,
        });
      }

      console.log("[Trendyol Test] Step 2: Using credentials:");
      console.log("  - SupplierId:", settings.trendyolSupplierId);
      console.log("  - ApiKey:", settings.trendyolApiKey.substring(0, 5) + "...");
      console.log("  - ApiSecret:", settings.trendyolApiSecret ? "***set***" : "***empty***");
      console.log("  - TestMode:", settings.trendyolIsTestMode);

      const client = new TrendyolClient({
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey,
        apiSecret: settings.trendyolApiSecret,
        isTestMode: settings.trendyolIsTestMode,
      });

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
      if (result.data?.storeFrontCode && result.data.storeFrontCode !== settings.trendyolStoreFrontCode) {
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

    // Adrese expeditor (necesită autentificare)
    if (action === "addresses") {
      if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient({
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey,
        apiSecret: settings.trendyolApiSecret,
        isTestMode: settings.trendyolIsTestMode,
      });

      const result = await client.getSupplierAddresses();

      return NextResponse.json({
        success: result.success,
        addresses: result.data,
        error: result.error,
      });
    }

    // Cargo companies (firme de curierat)
    if (action === "cargo") {
      if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient({
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey,
        apiSecret: settings.trendyolApiSecret,
        isTestMode: settings.trendyolIsTestMode,
      });

      const result = await client.getCargoCompanies();

      return NextResponse.json({
        success: result.success,
        cargoCompanies: result.data,
        error: result.error,
      });
    }

    // Produsele din Trendyol
    if (action === "products") {
      if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
        return NextResponse.json({
          success: false,
          error: "Credențialele Trendyol nu sunt configurate",
        });
      }

      const client = new TrendyolClient({
        supplierId: settings.trendyolSupplierId,
        apiKey: settings.trendyolApiKey,
        apiSecret: settings.trendyolApiSecret,
        isTestMode: settings.trendyolIsTestMode,
      });

      const page = parseInt(searchParams.get("page") || "0");
      const size = parseInt(searchParams.get("size") || "50");
      const approved = searchParams.get("approved");
      const barcode = searchParams.get("barcode");
      
      // Folosește storeFrontCode din query param sau din setări
      let storeFrontCode = searchParams.get("storeFrontCode") || settings.trendyolStoreFrontCode || undefined;
      
      console.log("[Trendyol Products] storeFrontCode from settings:", settings.trendyolStoreFrontCode);
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

    // Default - returnează statusul configurării
    return NextResponse.json({
      success: true,
      configured: !!(settings?.trendyolSupplierId && settings?.trendyolApiKey && settings?.trendyolApiSecret),
      isTestMode: settings?.trendyolIsTestMode || false,
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

    if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Trendyol nu sunt configurate",
      });
    }

    const client = new TrendyolClient({
      supplierId: settings.trendyolSupplierId,
      apiKey: settings.trendyolApiKey,
      apiSecret: settings.trendyolApiSecret,
      isTestMode: settings.trendyolIsTestMode,
    });

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

      // Construim produsele pentru Trendyol
      const trendyolProducts = products
        .filter(product => product.category?.trendyolCategoryId) // Filtrăm produsele fără categorie Trendyol
        .map(product => {
        // Generăm barcode din SKU dacă nu există
        const barcode = product.trendyolBarcode || generateBarcode(product.sku);
        
        // Convertim prețul din RON în EUR
        const priceEUR = Math.round((parseFloat(product.price.toString()) / currencyRate) * 100) / 100;
        
        // Atributele categoriei (obligatorii)
        const categoryAttrs = product.category?.trendyolAttributes as any[] || [];
        const requiredAttrs = categoryAttrs.filter(a => a.required);
        
        // Construim atributele de bază (pot fi extinse ulterior în UI)
        const attributes = requiredAttrs.map(attr => ({
          attributeId: attr.attribute?.id || attr.id,
          // Folosim prima valoare disponibilă ca placeholder
          attributeValueId: attr.attributeValues?.[0]?.id || null,
        })).filter(a => a.attributeValueId);

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
          vatRate: 19,
          cargoCompanyId: 17, // Default cargo
          images: product.images.slice(0, 8).map(img => ({ url: img.url })),
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
