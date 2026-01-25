import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/db";

/**
 * GET /api/intercompany/eligible-orders - Fetch eligible orders for settlement selection
 *
 * Returns orders eligible for intercompany settlement:
 * - From secondary companies (billingCompanyId != primary)
 * - With intercompanyStatus = "pending"
 * - Either AWB isCollected = true (COD) OR financialStatus = "paid" (online payment)
 * - Includes line items with costPrice from InventoryItem
 *
 * Query params:
 * - companyId (required): Secondary company ID
 * - fromDate (optional): Start of period (ISO date)
 * - toDate (optional): End of period (ISO date)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "intercompany.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza decontarile" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const fromDateStr = searchParams.get("fromDate");
    const toDateStr = searchParams.get("toDate");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId este obligatoriu" },
        { status: 400 }
      );
    }

    // Verify company exists and is not primary
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, isPrimary: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost gasita" },
        { status: 404 }
      );
    }

    if (company.isPrimary) {
      return NextResponse.json(
        { success: false, error: "Nu se poate genera decontare pentru firma primara" },
        { status: 400 }
      );
    }

    // Build date filter for invoice issuedAt
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDateStr) {
      dateFilter.gte = new Date(fromDateStr);
    }
    if (toDateStr) {
      dateFilter.lte = new Date(toDateStr);
    }

    // Fetch eligible orders
    // Eligible: intercompanyStatus = "pending" AND (AWB collected OR online paid)
    const orders = await prisma.order.findMany({
      where: {
        billingCompanyId: companyId,
        intercompanyStatus: "pending",
        OR: [
          { awb: { isCollected: true } }, // COD orders with AWB collected
          { financialStatus: "paid" },    // Online paid orders
        ],
        ...(Object.keys(dateFilter).length > 0
          ? {
              invoice: {
                issuedAt: dateFilter,
              },
            }
          : {}),
      },
      include: {
        lineItems: {
          include: {
            masterProduct: {
              include: {
                inventoryItem: {
                  select: { sku: true, costPrice: true },
                },
              },
            },
          },
        },
        awb: {
          select: { isCollected: true },
        },
        invoice: {
          select: { issuedAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Collect all unique SKUs for batch lookup (for items without masterProduct mapping)
    const unmappedSkus = new Set<string>();
    for (const order of orders) {
      for (const item of order.lineItems) {
        if (item.sku && !item.masterProduct?.inventoryItem) {
          unmappedSkus.add(item.sku);
        }
      }
    }

    // Batch fetch costPrice for unmapped SKUs directly from InventoryItem
    const directInventoryLookup = await prisma.inventoryItem.findMany({
      where: { sku: { in: Array.from(unmappedSkus) } },
      select: { sku: true, costPrice: true },
    });
    const directCostPriceMap = new Map(
      directInventoryLookup.map((item) => [item.sku, item.costPrice ? Number(item.costPrice) : null])
    );

    // Process orders and calculate cost totals
    const warnings: string[] = [];
    const warningSkus = new Set<string>();

    const processedOrders = orders.map((order) => {
      const customerName = [order.customerFirstName, order.customerLastName]
        .filter(Boolean)
        .join(" ") || order.customerEmail || "Client necunoscut";

      // Determine payment type
      const paymentType: "cod" | "online" =
        order.awb?.isCollected === true ? "cod" : "online";

      // Process line items with cost price
      let costTotal = 0;
      let hasMissingCostPrice = false;

      const lineItems = order.lineItems.map((item) => {
        // Try to get costPrice from: 1) masterProduct->inventoryItem, 2) direct SKU lookup
        let costPrice: number | null = null;

        if (item.masterProduct?.inventoryItem?.costPrice) {
          costPrice = Number(item.masterProduct.inventoryItem.costPrice);
        } else if (item.sku && directCostPriceMap.has(item.sku)) {
          costPrice = directCostPriceMap.get(item.sku) ?? null;
        }

        if (costPrice === null) {
          hasMissingCostPrice = true;
          const identifier = item.sku || item.title;
          if (!warningSkus.has(identifier)) {
            warningSkus.add(identifier);
            warnings.push(`${identifier}: Pret achizitie lipsa`);
          }
        }

        // Add to cost total (use 0 if costPrice is null)
        costTotal += (costPrice ?? 0) * item.quantity;

        return {
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          price: Number(item.price),
          costPrice,
        };
      });

      return {
        id: order.id,
        orderNumber: order.shopifyOrderNumber || order.id,
        date: order.invoice?.issuedAt || order.shopifyCreatedAt || order.createdAt,
        client: customerName,
        totalPrice: Number(order.totalPrice),
        productCount: order.lineItems.reduce((sum, li) => sum + li.quantity, 0),
        costTotal: Math.round(costTotal * 100) / 100,
        paymentType,
        isAlreadyCollected: order.financialStatus === "paid",
        hasMissingCostPrice,
        lineItems,
      };
    });

    return NextResponse.json({
      success: true,
      orders: processedOrders,
      warnings,
    });
  } catch (error: unknown) {
    console.error("Error fetching eligible orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
