import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

interface TopProduct {
  title: string;
  sku: string | null;
  quantity: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verificam autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Verificam permisiunea de vizualizare comenzi (customers derived from orders)
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza clientii" },
        { status: 403 }
      );
    }

    const { email: encodedEmail } = await params;
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");

    // Decode and normalize email
    const decodedEmail = decodeURIComponent(encodedEmail);
    const normalizedEmail = decodedEmail.toLowerCase();

    // Fetch all orders for this customer
    const orders = await prisma.order.findMany({
      where: {
        customerEmail: { equals: normalizedEmail, mode: "insensitive" },
        ...(storeId && storeId !== "all" && { storeId }),
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
        awb: {
          select: { id: true, awbNumber: true, currentStatus: true },
        },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Return 404 if no orders found for this email
    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Clientul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Compute analytics from orders
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const analytics = {
      totalSpent,
      orderCount: orders.length,
      firstOrderDate: orders.length ? orders[orders.length - 1].createdAt : null,
      lastOrderDate: orders.length ? orders[0].createdAt : null,
      averageOrderValue: orders.length ? totalSpent / orders.length : 0,
    };

    // Compute most ordered products from lineItems
    const productMap = new Map<string, TopProduct>();
    for (const order of orders) {
      for (const item of order.lineItems || []) {
        const key = item.sku || item.title;
        const existing = productMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productMap.set(key, {
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
          });
        }
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Extract customer info from first order (most recent)
    const mostRecentOrder = orders[0];
    const customer = mostRecentOrder
      ? {
          email: mostRecentOrder.customerEmail,
          phone: mostRecentOrder.customerPhone,
          firstName: mostRecentOrder.customerFirstName,
          lastName: mostRecentOrder.customerLastName,
          address: {
            address1: mostRecentOrder.shippingAddress1,
            address2: mostRecentOrder.shippingAddress2,
            city: mostRecentOrder.shippingCity,
            province: mostRecentOrder.shippingProvince,
            zip: mostRecentOrder.shippingZip,
            country: mostRecentOrder.shippingCountry,
          },
        }
      : null;

    // Format orders for response
    const formattedOrders = orders.map((o) => ({
      id: o.id,
      shopifyOrderNumber: o.shopifyOrderNumber,
      totalPrice: Number(o.totalPrice),
      status: o.status,
      createdAt: o.createdAt,
      store: o.store,
      invoice: o.invoice
        ? {
            invoiceNumber: o.invoice.invoiceNumber,
            status: o.invoice.status,
          }
        : null,
      awb: o.awb
        ? {
            awbNumber: o.awb.awbNumber,
            currentStatus: o.awb.currentStatus,
          }
        : null,
    }));

    return NextResponse.json({
      customer,
      analytics,
      topProducts,
      orders: formattedOrders,
    });
  } catch (error: unknown) {
    console.error("Error fetching customer details:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "Eroare la incarcarea detaliilor clientului",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
