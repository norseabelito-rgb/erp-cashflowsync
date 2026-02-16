import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createShopifyClient } from "@/lib/shopify";
import { logOrderDataUpdate } from "@/lib/activity-log";
import { validateOrder } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare comenzi
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzi" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
        awb: true,
        lineItems: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Comanda nu a fost găsită" },
        { status: 404 }
      );
    }

    // API compat: map invoices[0] → invoice for frontend
    return NextResponse.json({ order: { ...order, invoice: order.invoices?.[0] || null, invoices: undefined } });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Actualizează datele comenzii (telefon, adresă, nume, email, cod poștal)
 * Sincronizează modificările în Shopify și adaugă comentariu audit
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de editare comenzi
    const canEdit = await hasPermission(session.user.id, "orders.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a edita comenzi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customerPhone,
      customerEmail,
      customerFirstName,
      customerLastName,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingProvince,
      shippingZip,
      syncToShopify = true,
      acknowledgeDocumentsIssued = false,
    } = body;

    // Obținem comanda curentă
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        store: true,
        invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 },
        awb: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Comanda nu a fost găsită" },
        { status: 404 }
      );
    }

    // Verificăm dacă există documente emise
    const hasInvoice = order.invoices?.[0] && order.invoices[0].status === "issued";
    const hasAwb = order.awb && order.awb.awbNumber;
    const hasDocuments = hasInvoice || hasAwb;

    if (hasDocuments && !acknowledgeDocumentsIssued) {
      return NextResponse.json(
        {
          error: "Comanda are documente emise",
          hasInvoice,
          hasAwb,
          invoiceNumber: hasInvoice ? `${order.invoices[0]!.invoiceSeriesName || ''}${order.invoices[0]!.invoiceNumber || ''}` : null,
          awbNumber: hasAwb ? order.awb!.awbNumber : null,
          requiresAcknowledgement: true,
        },
        { status: 400 }
      );
    }

    // Construim lista de modificări
    const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    if (customerPhone !== undefined && customerPhone !== order.customerPhone) {
      changes.push({ field: "Telefon", oldValue: order.customerPhone, newValue: customerPhone });
    }
    if (customerEmail !== undefined && customerEmail !== order.customerEmail) {
      changes.push({ field: "Email", oldValue: order.customerEmail, newValue: customerEmail });
    }
    if (customerFirstName !== undefined && customerFirstName !== order.customerFirstName) {
      changes.push({ field: "Prenume", oldValue: order.customerFirstName, newValue: customerFirstName });
    }
    if (customerLastName !== undefined && customerLastName !== order.customerLastName) {
      changes.push({ field: "Nume", oldValue: order.customerLastName, newValue: customerLastName });
    }
    if (shippingAddress1 !== undefined && shippingAddress1 !== order.shippingAddress1) {
      changes.push({ field: "Adresă 1", oldValue: order.shippingAddress1, newValue: shippingAddress1 });
    }
    if (shippingAddress2 !== undefined && shippingAddress2 !== order.shippingAddress2) {
      changes.push({ field: "Adresă 2", oldValue: order.shippingAddress2, newValue: shippingAddress2 });
    }
    if (shippingCity !== undefined && shippingCity !== order.shippingCity) {
      changes.push({ field: "Oraș", oldValue: order.shippingCity, newValue: shippingCity });
    }
    if (shippingProvince !== undefined && shippingProvince !== order.shippingProvince) {
      changes.push({ field: "Județ", oldValue: order.shippingProvince, newValue: shippingProvince });
    }
    if (shippingZip !== undefined && shippingZip !== order.shippingZip) {
      changes.push({ field: "Cod poștal", oldValue: order.shippingZip, newValue: shippingZip });
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: "Nu există modificări de salvat" },
        { status: 400 }
      );
    }

    // Re-validăm datele
    const newPhone = customerPhone !== undefined ? customerPhone : order.customerPhone;
    const newAddress1 = shippingAddress1 !== undefined ? shippingAddress1 : order.shippingAddress1;
    const newAddress2 = shippingAddress2 !== undefined ? shippingAddress2 : order.shippingAddress2;
    const newCity = shippingCity !== undefined ? shippingCity : order.shippingCity;
    const newProvince = shippingProvince !== undefined ? shippingProvince : order.shippingProvince;
    const newZip = shippingZip !== undefined ? shippingZip : order.shippingZip;

    const validation = validateOrder({
      customerPhone: newPhone,
      shippingAddress1: newAddress1,
      shippingAddress2: newAddress2,
      shippingCity: newCity,
      shippingProvince: newProvince,
      shippingCountry: order.shippingCountry,
      shippingZip: newZip,
    });

    // Actualizăm în baza de date
    const updateData: any = {
      phoneValidation: validation.phone.isValid ? "PASSED" : "FAILED",
      phoneValidationMsg: validation.phone.message,
      addressValidation: validation.address.isValid ? "PASSED" : "FAILED",
      addressValidationMsg: validation.address.message,
    };

    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (customerFirstName !== undefined) updateData.customerFirstName = customerFirstName;
    if (customerLastName !== undefined) updateData.customerLastName = customerLastName;
    if (shippingAddress1 !== undefined) updateData.shippingAddress1 = shippingAddress1;
    if (shippingAddress2 !== undefined) updateData.shippingAddress2 = shippingAddress2;
    if (shippingCity !== undefined) updateData.shippingCity = shippingCity;
    if (shippingProvince !== undefined) updateData.shippingProvince = shippingProvince;
    if (shippingZip !== undefined) updateData.shippingZip = shippingZip;

    const updatedOrderRaw = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        store: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
        awb: true,
        lineItems: true,
      },
    });
    // API compat: map invoices[0] → invoice for frontend
    const updatedOrder = { ...updatedOrderRaw, invoice: updatedOrderRaw.invoices?.[0] || null, invoices: undefined };

    // Sincronizăm în Shopify
    let shopifySynced = false;
    let shopifyError: string | null = null;

    if (syncToShopify && order.shopifyOrderId) {
      try {
        const shopifyClient = await createShopifyClient(order.storeId);

        // Construim obiectul de update pentru Shopify
        const shopifyUpdate: any = {
          shipping_address: {},
        };

        // Adăugăm câmpurile modificate
        if (customerFirstName !== undefined) shopifyUpdate.shipping_address.first_name = customerFirstName;
        if (customerLastName !== undefined) shopifyUpdate.shipping_address.last_name = customerLastName;
        if (shippingAddress1 !== undefined) shopifyUpdate.shipping_address.address1 = shippingAddress1;
        if (shippingAddress2 !== undefined) shopifyUpdate.shipping_address.address2 = shippingAddress2;
        if (shippingCity !== undefined) shopifyUpdate.shipping_address.city = shippingCity;
        if (shippingProvince !== undefined) shopifyUpdate.shipping_address.province = shippingProvince;
        if (shippingZip !== undefined) shopifyUpdate.shipping_address.zip = shippingZip;
        if (customerPhone !== undefined) shopifyUpdate.shipping_address.phone = customerPhone;
        if (customerEmail !== undefined) shopifyUpdate.email = customerEmail;

        // Actualizăm în Shopify
        await shopifyClient.updateOrderAddress(order.shopifyOrderId, shopifyUpdate);

        // Adăugăm notă în timeline-ul Shopify
        const timestamp = new Date().toLocaleString("ro-RO");
        const userEmail = session.user.email || session.user.name || "Unknown";
        const changesText = changes.map(c => `${c.field}: ${c.oldValue || "(gol)"} → ${c.newValue || "(gol)"}`).join("\n");
        const auditNote = `[${timestamp}] ${userEmail} a modificat:\n${changesText}`;

        await shopifyClient.addOrderTimelineNote(order.shopifyOrderId, auditNote);

        shopifySynced = true;
      } catch (error: any) {
        console.error("Error syncing to Shopify:", error);
        shopifyError = error.message;
      }
    }

    // Logăm activitatea
    await logOrderDataUpdate({
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      changes,
      updatedBy: session.user.email || session.user.name || "Unknown",
      syncedToShopify: shopifySynced,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      changes,
      shopifySynced,
      shopifyError,
      hasDocuments,
      validation: {
        phone: validation.phone,
        address: validation.address,
      },
    });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
