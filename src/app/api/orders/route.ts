import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { validateEmbedToken } from "@/lib/embed-auth";

export async function GET(request: NextRequest) {
  try {
    // Check if this is an embed request (token-based auth for iframe access)
    const isEmbedRequest = validateEmbedToken(request);

    if (!isEmbedRequest) {
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
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const storeId = searchParams.get("storeId");
    const source = searchParams.get("source"); // "shopify" | "trendyol" | "manual"
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const containsSku = searchParams.get("containsSku"); // Filtru după SKU produs
    const containsBarcode = searchParams.get("containsBarcode"); // Filtru după barcode
    const containsProduct = searchParams.get("containsProduct"); // Filtru după SKU sau nume produs
    const hasAwb = searchParams.get("hasAwb"); // "true" sau "false"
    const awbStatus = searchParams.get("awbStatus"); // "tranzit" | "livrat" | "retur" | "pending" | "anulat"
    const internalStatusId = searchParams.get("internalStatusId"); // Internal workflow status filter
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (storeId && storeId !== "all") {
      where.storeId = storeId;
    }

    // Filtru după sursa comenzii (Shopify, Trendyol, manual)
    if (source && source !== "all") {
      where.source = source;
    }

    // Filtrare pe interval de date
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Adaugă 1 zi pentru a include și ziua finală complet
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    // Filtru după SKU - găsește comenzi care conțin un produs specific
    if (containsSku) {
      where.lineItems = {
        some: {
          sku: {
            contains: containsSku,
            mode: "insensitive",
          },
        },
      };
    }

    // Filtru după barcode
    if (containsBarcode) {
      where.lineItems = {
        some: {
          barcode: {
            contains: containsBarcode,
            mode: "insensitive",
          },
        },
      };
    }

    // Filtru după produs (caută în SKU și title simultan)
    if (containsProduct) {
      where.lineItems = {
        some: {
          OR: [
            { sku: { contains: containsProduct, mode: "insensitive" } },
            { title: { contains: containsProduct, mode: "insensitive" } },
          ],
        },
      };
    }

    // Filtru după existența AWB
    if (hasAwb === "true") {
      // Sub-filtru după status AWB (doar când hasAwb=true)
      if (awbStatus && awbStatus !== "all") {
        where.awb = {
          currentStatus: {
            contains: awbStatus,
            mode: "insensitive",
          },
        };
      } else {
        where.awb = { isNot: null };
      }
    } else if (hasAwb === "false") {
      where.awb = { is: null };
    }

    // Filtru dupa status intern (nomenclator)
    if (internalStatusId && internalStatusId !== "all") {
      if (internalStatusId === "none") {
        // Filter for orders without internal status
        where.internalStatusId = null;
      } else {
        where.internalStatusId = internalStatusId;
      }
    }

    if (search) {
      where.OR = [
        { shopifyOrderNumber: { contains: search, mode: "insensitive" } },
        { customerFirstName: { contains: search, mode: "insensitive" } },
        { customerLastName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { shippingCity: { contains: search, mode: "insensitive" } },
        // Căutare și în LineItems
        { lineItems: { some: { sku: { contains: search, mode: "insensitive" } } } },
        { lineItems: { some: { title: { contains: search, mode: "insensitive" } } } },
        { lineItems: { some: { barcode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // Build where clause for source counts (excludes source filter)
    // This is used for tab count badges - we need all channels' counts
    const sourceCountsWhere: Prisma.OrderWhereInput = {};

    if (status && status !== "all") {
      sourceCountsWhere.status = status;
    }
    if (storeId && storeId !== "all") {
      sourceCountsWhere.storeId = storeId;
    }
    if (startDate || endDate) {
      sourceCountsWhere.createdAt = {};
      if (startDate) {
        sourceCountsWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        sourceCountsWhere.createdAt.lt = end;
      }
    }

    // Parallel queries: total count, source counts, and orders
    const [total, sourceCountsRaw, orders] = await Promise.all([
      // Total count for pagination
      prisma.order.count({ where }),

      // Source counts for channel tabs (NOT filtered by source param)
      prisma.order.groupBy({
        by: ['source'],
        _count: { _all: true },
        where: sourceCountsWhere,
      }),

      // Orders with all relations
      prisma.order.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            invoiceSeriesName: true,
            oblioId: true,
            status: true,
            errorMessage: true,
          },
        },
        awb: {
          select: {
            id: true,
            awbNumber: true,
            currentStatus: true,
            currentStatusDate: true,
            errorMessage: true,
          },
        },
        trendyolOrder: {
          select: {
            id: true,
            trendyolOrderNumber: true,
            shipmentPackageId: true,
            invoiceSentToTrendyol: true,
            invoiceSentAt: true,
            invoiceSendError: true,
            oblioInvoiceLink: true,
            trackingSentToTrendyol: true,
            trackingSentAt: true,
            trackingSendError: true,
            localAwbNumber: true,
            localCarrier: true,
          },
        },
        internalStatus: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        lineItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    ]);

    // Transform source counts into object
    const sourceCounts = {
      shopify: sourceCountsRaw.find(c => c.source === 'shopify')?._count._all || 0,
      trendyol: sourceCountsRaw.find(c => c.source === 'trendyol')?._count._all || 0,
      temu: 0, // Placeholder - no Temu orders yet
    };

    // Count total orders per customer (across all stores) for "Comenzi multiple" tag
    // Collect unique customer identifiers (email or phone)
    const customerKeys = new Set<string>();
    for (const o of orders as any[]) {
      const key = o.customerEmail?.trim().toLowerCase() || o.customerPhone?.trim();
      if (key) customerKeys.add(key);
    }

    let customerOrderCounts: Record<string, number> = {};
    if (customerKeys.size > 0) {
      const countRows = await prisma.$queryRawUnsafe<Array<{ key: string; cnt: bigint }>>(
        `SELECT
          COALESCE(NULLIF(LOWER(TRIM("customerEmail")), ''), NULLIF(TRIM("customerPhone"), '')) as key,
          COUNT(*) as cnt
        FROM orders
        WHERE COALESCE(NULLIF(LOWER(TRIM("customerEmail")), ''), NULLIF(TRIM("customerPhone"), '')) = ANY($1)
        GROUP BY key`,
        Array.from(customerKeys)
      );
      for (const row of countRows) {
        customerOrderCounts[row.key] = Number(row.cnt);
      }
    }

    // API compat: map invoices[0] → invoice for frontend + add customerOrderCount
    const ordersWithCompat = orders.map((o: any) => {
      const key = o.customerEmail?.trim().toLowerCase() || o.customerPhone?.trim();
      return {
        ...o,
        invoice: o.invoices?.[0] || null,
        invoices: undefined,
        customerOrderCount: key ? (customerOrderCounts[key] || 1) : 1,
      };
    });

    // Fetch stores for dropdown (used by embed and frontend)
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      orders: ordersWithCompat,
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      sourceCounts,
    });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Eroare la încărcarea comenzilor",
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
