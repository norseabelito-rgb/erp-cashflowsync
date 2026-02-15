import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateEmbedToken } from "@/lib/embed-auth";

/**
 * Customer key: a composite identifier that uniquely identifies a customer.
 * Priority: email (lowercased) > phone > "name:FirstName LastName"
 * This ensures ALL customers are visible, not just those with emails.
 */
const CUSTOMER_KEY_EXPR = `COALESCE(
  NULLIF(LOWER(TRIM(o."customerEmail")), ''),
  NULLIF(TRIM(o."customerPhone"), ''),
  CASE
    WHEN TRIM(COALESCE(o."customerFirstName", '') || ' ' || COALESCE(o."customerLastName", '')) != ''
    THEN 'name:' || TRIM(COALESCE(o."customerFirstName", '') || ' ' || COALESCE(o."customerLastName", ''))
    ELSE NULL
  END,
  'unknown:' || o.id
)`;

interface CustomerRow {
  customerKey: string;
  email: string | null;
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
    // Include ALL orders - at least one customer identifier must exist
    const conditions: string[] = [
      `(
        (o."customerEmail" IS NOT NULL AND TRIM(o."customerEmail") != '')
        OR (o."customerPhone" IS NOT NULL AND TRIM(o."customerPhone") != '')
        OR (o."customerFirstName" IS NOT NULL AND TRIM(o."customerFirstName") != '')
        OR (o."customerLastName" IS NOT NULL AND TRIM(o."customerLastName") != '')
      )`
    ];
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

    // Get total count for pagination (count unique customer keys)
    const countQuery = `
      SELECT COUNT(DISTINCT ${CUSTOMER_KEY_EXPR}) as count
      FROM orders o
      WHERE ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      countQuery,
      ...params
    );
    const total = Number(countResult[0]?.count || 0);

    // Get aggregated customer data, grouped by composite customer key.
    // Uses a CTE with ROW_NUMBER() to identify each customer's most recent order,
    // so name/email/phone come from that single order (not independent MAX() calls
    // which could combine firstName from one order with lastName from another).
    const customersQuery = `
      WITH ranked AS (
        SELECT
          o.*,
          ${CUSTOMER_KEY_EXPR} as "customerKey",
          ROW_NUMBER() OVER (
            PARTITION BY ${CUSTOMER_KEY_EXPR}
            ORDER BY o."createdAt" DESC
          ) as rn
        FROM orders o
        WHERE ${whereClause}
      )
      SELECT
        r."customerKey",
        LOWER(NULLIF(TRIM(latest."customerEmail"), '')) as email,
        NULLIF(TRIM(latest."customerPhone"), '') as phone,
        NULLIF(TRIM(latest."customerFirstName"), '') as "firstName",
        NULLIF(TRIM(latest."customerLastName"), '') as "lastName",
        COUNT(*)::int as "orderCount",
        COALESCE(SUM(r."totalPrice"::numeric), 0) as "totalSpent",
        MAX(r."createdAt") as "lastOrderDate",
        MIN(r."createdAt") as "firstOrderDate"
      FROM ranked r
      JOIN ranked latest ON latest."customerKey" = r."customerKey" AND latest.rn = 1
      GROUP BY r."customerKey", latest."customerEmail", latest."customerPhone",
               latest."customerFirstName", latest."customerLastName"
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
      customerKey: c.customerKey,
      email: c.email || null,
      phone: c.phone || null,
      firstName: c.firstName || null,
      lastName: c.lastName || null,
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
