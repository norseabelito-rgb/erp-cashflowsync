import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncTrendyolOrders } from "@/lib/trendyol";

// GET - Listare comenzi Trendyol
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const mapped = searchParams.get("mapped"); // "true", "false", or undefined

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { trendyolOrderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (mapped === "true") {
      where.lineItems = { every: { isMapped: true } };
    } else if (mapped === "false") {
      where.lineItems = { some: { isMapped: false } };
    }

    const [orders, total] = await Promise.all([
      prisma.trendyolOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: "desc" },
        include: {
          lineItems: {
            include: {
              masterProduct: {
                select: { id: true, sku: true, title: true },
              },
            },
          },
        },
      }),
      prisma.trendyolOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching Trendyol orders:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Sincronizare comenzi din Trendyol
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate, status } = body;

    const result = await syncTrendyolOrders({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error syncing Trendyol orders:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
