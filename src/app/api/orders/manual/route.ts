import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShopifyClient, CreateDraftOrderInput } from "@/lib/shopify";

interface ManualOrderRequest {
  storeId: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress1: string;
  shippingAddress2?: string;
  shippingCity: string;
  shippingProvince: string;
  shippingZip: string;
  lineItems: Array<{
    productId?: string;
    sku: string;
    title: string;
    quantity: number;
    price: number;
  }>;
  note?: string;
}

/**
 * POST /api/orders/manual
 *
 * Creates a manual order by:
 * 1. Creating a draft order in Shopify
 * 2. Completing the draft to a real order
 * 3. Saving to local database with source="manual"
 *
 * This ensures data consistency - if Shopify fails, no local order is created.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "orders.create");
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a crea comenzi" },
        { status: 403 }
      );
    }

    const body: ManualOrderRequest = await request.json();

    // Validate required fields
    if (
      !body.storeId ||
      !body.customerFirstName ||
      !body.customerLastName ||
      !body.customerEmail ||
      !body.customerPhone ||
      !body.shippingAddress1 ||
      !body.shippingCity ||
      !body.shippingProvince ||
      !body.shippingZip ||
      !body.lineItems ||
      body.lineItems.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Toate campurile obligatorii trebuie completate" },
        { status: 400 }
      );
    }

    // Validate line items have required fields
    for (const item of body.lineItems) {
      if (!item.title || !item.sku || item.quantity <= 0 || item.price < 0) {
        return NextResponse.json(
          { success: false, error: "Produsele trebuie sa aiba titlu, SKU, cantitate si pret valid" },
          { status: 400 }
        );
      }
    }

    // Get store with credentials
    const store = await prisma.store.findUnique({
      where: { id: body.storeId },
      select: {
        id: true,
        name: true,
        shopifyDomain: true,
        accessToken: true,
        companyId: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Magazinul nu a fost gasit" },
        { status: 404 }
      );
    }

    if (!store.accessToken || !store.shopifyDomain) {
      return NextResponse.json(
        { success: false, error: "Magazinul nu are credentiale Shopify configurate" },
        { status: 400 }
      );
    }

    // Create Shopify client
    const shopify = new ShopifyClient(store.shopifyDomain, store.accessToken, store.id);

    // Calculate total
    const totalPrice = body.lineItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Prepare draft order input
    const draftOrderInput: CreateDraftOrderInput = {
      lineItems: body.lineItems.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        sku: item.sku,
      })),
      customer: {
        firstName: body.customerFirstName,
        lastName: body.customerLastName,
        email: body.customerEmail,
        phone: body.customerPhone,
      },
      shippingAddress: {
        firstName: body.customerFirstName,
        lastName: body.customerLastName,
        address1: body.shippingAddress1,
        address2: body.shippingAddress2,
        city: body.shippingCity,
        province: body.shippingProvince,
        country: "Romania",
        zip: body.shippingZip,
        phone: body.customerPhone,
      },
      note: body.note,
      tags: ["manual-erp", "creat-din-erp"],
    };

    // Create draft order in Shopify
    let draftOrder;
    try {
      draftOrder = await shopify.createDraftOrder(draftOrderInput);
    } catch (error: any) {
      console.error("[Manual Order] Draft order creation failed:", error);

      // Handle Shopify API errors
      if (error.response?.data?.errors) {
        const shopifyError = JSON.stringify(error.response.data.errors);
        return NextResponse.json(
          { success: false, error: `Eroare Shopify la crearea draft-ului: ${shopifyError}` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Eroare la crearea comenzii in Shopify" },
        { status: 500 }
      );
    }

    // Complete draft order (convert to real order)
    let shopifyOrder;
    try {
      shopifyOrder = await shopify.completeDraftOrder(draftOrder.id, true);
    } catch (error: any) {
      console.error("[Manual Order] Draft order completion failed:", error);

      // Handle Shopify API errors
      if (error.response?.data?.errors) {
        const shopifyError = JSON.stringify(error.response.data.errors);
        return NextResponse.json(
          { success: false, error: `Eroare Shopify la finalizarea comenzii: ${shopifyError}` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Eroare la finalizarea comenzii in Shopify" },
        { status: 500 }
      );
    }

    // Save to local database - only after Shopify success
    const localOrder = await prisma.order.create({
      data: {
        shopifyOrderId: String(shopifyOrder.id),
        shopifyOrderNumber: shopifyOrder.name, // e.g., "#1234"
        source: "manual",
        storeId: body.storeId,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerFirstName: body.customerFirstName,
        customerLastName: body.customerLastName,
        shippingAddress1: body.shippingAddress1,
        shippingAddress2: body.shippingAddress2,
        shippingCity: body.shippingCity,
        shippingProvince: body.shippingProvince,
        shippingCountry: "Romania",
        shippingZip: body.shippingZip,
        totalPrice: totalPrice,
        subtotalPrice: totalPrice, // No separate subtotal for manual orders
        totalShipping: 0, // No shipping cost for manual orders by default
        totalTax: 0, // Tax calculated separately if needed
        currency: "RON",
        status: "PENDING",
        financialStatus: "pending", // Payment pending
        fulfillmentStatus: null, // Not yet fulfilled
        phoneValidation: "PASSED", // Manual entry assumed validated
        addressValidation: "PASSED", // Manual entry assumed validated
        shopifyCreatedAt: new Date(),
        shopifyUpdatedAt: new Date(),
        billingCompanyId: store.companyId,
        lineItems: {
          create: body.lineItems.map((item, idx) => ({
            shopifyLineItemId: String(draftOrder.lineItems[idx]?.id || `manual-${idx}`),
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            variantTitle: null,
          })),
        },
      },
      include: {
        store: { select: { name: true } },
        lineItems: true,
      },
    });

    // Log the action
    console.log(
      `[Manual Order] Created order ${shopifyOrder.name} (local: ${localOrder.id}) for store ${store.name} by user ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      order: localOrder,
      orderNumber: shopifyOrder.name,
      shopifyOrderId: shopifyOrder.id,
    });
  } catch (error: any) {
    console.error("[Manual Order] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare neasteptata la crearea comenzii",
      },
      { status: 500 }
    );
  }
}
