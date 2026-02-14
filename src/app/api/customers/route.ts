import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateEmbedToken } from "@/lib/embed-auth";
import { Prisma } from "@prisma/client";

interface CustomerRow {
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: Date;
  firstOrderDate: Date;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();
    const storeId = searchParams.get("storeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build base WHERE conditions
    const conditions: string[] = [`o."customerEmail" IS NOT NULL`];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Store filter
    if (storeId && storeId !== "all") {
      conditions.push(`o."storeId" = $${paramIndex}`);
      params.push(storeId);
      paramIndex++;
    }

    // Search filter - searches email, phone, name, and order number
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(`(
        LOWER(o."customerEmail") LIKE $${paramIndex}
        OR o."customerPhone" LIKE $${paramIndex}
        OR LOWER(o."customerFirstName") LIKE $${paramIndex}
        OR LOWER(o."customerLastName") LIKE $${paramIndex}
        OR o."shopifyOrderNumber" LIKE $${paramIndex}
      )`);
      params.push(searchPattern);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count for pagination (count unique emails)
    const countQuery = `
      SELECT COUNT(DISTINCT LOWER(o."customerEmail")) as count
      FROM orders o
      WHERE ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      countQuery,
      ...params
    );
    const total = Number(countResult[0]?.count || 0);

    // Get aggregated customer data
    const customersQuery = `
      SELECT
        LOWER(o."customerEmail") as email,
        MAX(o."customerPhone") as phone,
        MAX(o."customerFirstName") as "firstName",
        MAX(o."customerLastName") as "lastName",
        COUNT(*)::int as "orderCount",
        COALESCE(SUM(o."totalPrice"::numeric), 0) as "totalSpent",
        MAX(o."createdAt") as "lastOrderDate",
        MIN(o."createdAt") as "firstOrderDate"
      FROM orders o
      WHERE ${whereClause}
      GROUP BY LOWER(o."customerEmail")
      ORDER BY "totalSpent" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const customers = await prisma.$queryRawUnsafe<CustomerRow[]>(
      customersQuery,
      ...params,
      limit,
      offset
    );

    // Format the response - convert Decimal to number
    const formattedCustomers = customers.map((c) => ({
      email: c.email,
      phone: c.phone,
      firstName: c.firstName,
      lastName: c.lastName,
      orderCount: c.orderCount,
      totalSpent: Number(c.totalSpent),
      lastOrderDate: c.lastOrderDate,
      firstOrderDate: c.firstOrderDate,
    }));

    // Fetch stores for dropdown
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      customers: formattedCustomers,
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching customers:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "Eroare la incarcarea clientilor",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
