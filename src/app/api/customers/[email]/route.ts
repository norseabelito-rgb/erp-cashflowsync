import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateEmbedToken } from "@/lib/embed-auth";
import { Prisma } from "@prisma/client";

interface TopProduct {
  title: string;
  sku: string | null;
  quantity: number;
}

/**
 * Parse a customerKey to determine the lookup type.
 * Customer keys have these formats:
 *   - "user@example.com" -> email-based lookup
 *   - "name:First Last" -> name-based lookup
 *   - "unknown:orderId" -> single order lookup
 *   - anything else (e.g. phone number) -> phone-based lookup
 */
function parseCustomerKey(key: string): Prisma.OrderWhereInput {
  if (key.startsWith("name:")) {
    const fullName = key.substring(5).trim();
    const spaceIndex = fullName.indexOf(" ");
    if (spaceIndex > 0) {
      const firstName = fullName.substring(0, spaceIndex);
      const lastName = fullName.substring(spaceIndex + 1);
      return {
        customerFirstName: { equals: firstName, mode: "insensitive" },
        customerLastName: { equals: lastName, mode: "insensitive" },
        // Ensure these customers don't have email/phone (otherwise they'd be grouped under those)
        OR: [
          { customerEmail: null },
          { customerEmail: "" },
        ],
        AND: [
          { OR: [{ customerPhone: null }, { customerPhone: "" }] },
        ],
      };
    }
    // Single name (no space) - treat as firstName
    return {
      customerFirstName: { equals: fullName, mode: "insensitive" },
      OR: [
        { customerEmail: null },
        { customerEmail: "" },
      ],
      AND: [
        { OR: [{ customerPhone: null }, { customerPhone: "" }] },
      ],
    };
  }

  if (key.startsWith("unknown:")) {
    const orderId = key.substring(8);
    return { id: orderId };
  }

  // Check if it looks like an email (contains @)
  if (key.includes("@")) {
    return {
      customerEmail: { equals: key, mode: "insensitive" },
    };
  }

  // Otherwise treat as phone number
  return {
    customerPhone: key,
    // Ensure no email (otherwise they'd be grouped under email)
    OR: [
      { customerEmail: null },
      { customerEmail: "" },
    ],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Check if this is an embed request (token-based auth for iframe access)
    const isEmbedRequest = validateEmbedToken(request);

    if (!isEmbedRequest) {
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
    }

    const { email: encodedKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("storeId");

    // Decode the customer key
    const customerKey = decodeURIComponent(encodedKey);

    // Build the where clause based on customer key type
    const customerWhere = parseCustomerKey(customerKey);

    // Fetch all orders for this customer
    const orders = await prisma.order.findMany({
      where: {
        ...customerWhere,
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

    // Return 404 if no orders found for this customer
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

    // Fetch customer note (use email if available, otherwise use the customerKey)
    const noteKey = customerKey.includes("@") ? customerKey.toLowerCase() : customerKey;
    const customerNote = await prisma.customerNote.findUnique({
      where: { email: noteKey },
    });

    return NextResponse.json({
      customer,
      customerKey,
      analytics,
      topProducts,
      orders: formattedOrders,
      note: customerNote?.note || "",
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
