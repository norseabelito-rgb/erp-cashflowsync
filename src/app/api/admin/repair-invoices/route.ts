import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/repair-invoices
 * Returneaza facturile emise gresit (client = firma emitenta) din comenzile Shopify.
 * Bug: billingCompanyId pe Order era setat la companyId-ul store-ului,
 * ceea ce facea ca factura sa fie emisa de la Aquaterra catre Aquaterra.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Doar super admin poate accesa aceasta pagina" },
        { status: 403 }
      );
    }

    // Gaseste facturile emise unde billingCompanyId == store.companyId (auto-facturare)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "issued",
        order: {
          source: "shopify",
          billingCompanyId: { not: null },
        },
      },
      include: {
        order: {
          include: {
            store: {
              include: {
                company: true,
              },
            },
            billingCompany: true,
          },
        },
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filtram doar facturile unde billingCompanyId == store.companyId
    const affectedInvoices = invoices.filter((inv) => {
      const order = inv.order;
      if (!order || !order.billingCompanyId || !order.store?.companyId) return false;
      return order.billingCompanyId === order.store.companyId;
    });

    const result = affectedInvoices.map((inv) => {
      const order = inv.order!;
      const realCustomerName = [order.customerFirstName, order.customerLastName]
        .filter(Boolean)
        .join(" ") || "Client";

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceSeriesName: inv.invoiceSeriesName,
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        wrongCustomer: inv.company?.name || order.billingCompany?.name || "N/A",
        correctCustomer: realCustomerName,
        total: Number(order.totalPrice),
        currency: order.currency,
        issuedAt: inv.createdAt,
        companyName: inv.company?.name || "N/A",
      };
    });

    return NextResponse.json({
      success: true,
      total: result.length,
      invoices: result,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/repair-invoices:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
