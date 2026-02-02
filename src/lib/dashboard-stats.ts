import prisma from "@/lib/db";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { getCategoryFilterConditions } from "@/lib/awb-status";

/**
 * Dashboard Filters Interface
 * Used by the dashboard page to pass filter parameters
 */
export interface DashboardFilters {
  storeId?: string;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string;   // YYYY-MM-DD format
}

/**
 * Dashboard Stats Interface
 * Return type for getFilteredDashboardStats
 */
export interface DashboardStats {
  // Order counts
  totalOrders: number;
  pendingOrders: number;
  validatedOrders: number;
  validationFailed: number;
  invoiced: number;
  inTransit: number; // AWBs currently in transit (matches tracking page count)
  delivered: number;

  // Sales metrics
  totalSales: number;
  orderCount: number;

  // Channel-specific
  shopifyOrders: number;
  shopifyRevenue: number;
  trendyolOrders: number;
  trendyolRevenue: number;
  trendyolPending: number;

  // Invoices
  todayInvoices: number;

  // Stores (for dropdown)
  stores: Array<{
    id: string;
    name: string;
    ordersCount: number;
  }>;

  // Recent orders (no date filter)
  recentOrders: Array<{
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    totalPrice: number;
    status: string;
    createdAt: Date;
    store: {
      id: string;
      name: string;
    };
  }>;

  // Low stock products (no date filter)
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string | null;
    stockQuantity: number;
    unit: string;
  }>;

  // Product counts (no filter)
  totalProducts: number;
  lowStockCount: number;

  // Returns count (AWBs with return status)
  returns: number;

  // Sales data for chart (filtered by date and store)
  salesData: Array<{
    date: string;
    total: number;
    orders: number;
  }>;
}

/**
 * Build date range where clause for Prisma queries
 * Defaults to today if no dates provided
 */
function buildDateWhere(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return {
      gte: startOfDay(parseISO(startDate)),
      lte: endOfDay(parseISO(endDate)),
    };
  }

  if (startDate) {
    return {
      gte: startOfDay(parseISO(startDate)),
    };
  }

  // Default to today
  const now = new Date();
  return {
    gte: startOfDay(now),
    lte: endOfDay(now),
  };
}

/**
 * Build base where clause combining store and date filters
 * @param filters - Dashboard filters (storeId, startDate, endDate)
 * @param dateField - The field to apply date filter to (default: 'createdAt')
 */
function buildBaseWhere(filters: DashboardFilters, dateField: string = "createdAt") {
  const where: Record<string, unknown> = {};

  // Apply store filter if provided and not "all"
  if (filters.storeId && filters.storeId !== "all") {
    where.storeId = filters.storeId;
  }

  // Apply date filter
  where[dateField] = buildDateWhere(filters.startDate, filters.endDate);

  return where;
}

/**
 * Get sales data grouped by date for chart
 * Uses raw query for efficient grouping
 */
async function getSalesDataForChart(
  startDate: Date,
  endDate: Date,
  storeId?: string
): Promise<Array<{ date: Date; totalSales: number; orderCount: bigint }>> {
  try {
    if (storeId && storeId !== "all") {
      // Query with store filter
      return await prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT
          DATE("createdAt" AT TIME ZONE 'UTC') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          AND "storeId" = ${storeId}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;
    } else {
      // Query without store filter
      return await prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT
          DATE("createdAt" AT TIME ZONE 'UTC') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;
    }
  } catch {
    // Return empty array if query fails
    return [];
  }
}

/**
 * Get filtered dashboard statistics
 * All metrics respect the global date range and store filters consistently
 */
export async function getFilteredDashboardStats(
  filters: DashboardFilters
): Promise<DashboardStats> {
  // Build base where clause for order queries
  const baseWhere = buildBaseWhere(filters);
  const dateWhere = buildDateWhere(filters.startDate, filters.endDate);

  // Run all queries in parallel for performance
  const [
    // Order counts - ALL use baseWhere
    totalOrders,
    pendingOrders,       // PENDING + not invoiced
    validatedOrders,     // VALIDATED + not invoiced
    validationFailed,
    invoiced,
    inTransit,
    delivered,

    // Sales aggregate
    salesAggregate,

    // Channel-specific counts
    shopifyOrders,
    shopifyAggregate,
    trendyolOrders,
    trendyolAggregate,
    trendyolPending,

    // Invoices (filtered by issuedAt, not createdAt)
    todayInvoices,

    // Stores (no filter - need all for dropdown)
    storeStats,

    // Recent orders (no date filter, last 5)
    recentOrders,

    // Low stock products (no date filter)
    lowStockProducts,

    // Product count (no date filter)
    productCount,

    // Sales data for chart - grouped by date
    salesDataRaw,

    // Returns count (AWBs with return status)
    returnsCount,
  ] = await Promise.all([
    // Total orders with filters
    prisma.order.count({ where: baseWhere }),

    // Pending orders: PENDING status AND not yet invoiced
    // "De Procesat" should show orders that need action (not yet invoiced)
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "PENDING",
        invoice: null, // No invoice created yet
      },
    }),

    // Validated orders: VALIDATED status AND not yet invoiced
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "VALIDATED",
        invoice: null, // No invoice created yet
      },
    }),

    // Validation failed orders
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "VALIDATION_FAILED",
      },
    }),

    // Invoiced orders
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "INVOICED",
      },
    }),

    // In transit AWBs (matches tracking page "In tranzit" count)
    // Uses AWB.currentStatus instead of Order.status for accuracy
    prisma.aWB.count({
      where: {
        createdAt: dateWhere,
        ...(filters.storeId && filters.storeId !== "all" && {
          order: { storeId: filters.storeId },
        }),
        OR: getCategoryFilterConditions("in_transit") || [],
      },
    }),

    // Delivered orders
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "DELIVERED",
      },
    }),

    // Total sales aggregate
    prisma.order.aggregate({
      where: baseWhere,
      _sum: { totalPrice: true },
      _count: true,
    }),

    // Shopify orders
    prisma.order.count({
      where: {
        ...baseWhere,
        source: "shopify",
      },
    }),

    // Shopify revenue
    prisma.order.aggregate({
      where: {
        ...baseWhere,
        source: "shopify",
      },
      _sum: { totalPrice: true },
    }),

    // Trendyol orders
    prisma.order.count({
      where: {
        ...baseWhere,
        source: "trendyol",
      },
    }),

    // Trendyol revenue
    prisma.order.aggregate({
      where: {
        ...baseWhere,
        source: "trendyol",
      },
      _sum: { totalPrice: true },
    }),

    // Trendyol pending (PENDING or VALIDATED, regardless of invoice status)
    prisma.order.count({
      where: {
        ...baseWhere,
        source: "trendyol",
        status: { in: ["PENDING", "VALIDATED"] },
      },
    }),

    // Invoices issued (filtered by issuedAt date, not createdAt)
    prisma.invoice.count({
      where: {
        status: "issued",
        issuedAt: dateWhere,
      },
    }),

    // All active stores with order count (no filter - needed for dropdown)
    prisma.store.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    }),

    // Recent orders (no date filter, just last 5)
    // Apply storeId filter if provided
    prisma.order.findMany({
      where: filters.storeId && filters.storeId !== "all"
        ? { storeId: filters.storeId }
        : {},
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { store: true },
    }),

    // Low stock products (no date filter)
    prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lte: 5 },
      },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    }),

    // Total product count
    prisma.product.count({
      where: { isActive: true },
    }),

    // Sales data for chart - grouped by date (separate query with proper handling)
    getSalesDataForChart(
      dateWhere.gte,
      dateWhere.lte ?? new Date(),
      filters.storeId
    ),

    // Returns count: AWBs with return status
    // Matches tracking page getStatusCategory logic for 'returned'
    prisma.aWB.count({
      where: {
        createdAt: dateWhere,
        ...(filters.storeId && filters.storeId !== "all" && {
          order: { storeId: filters.storeId },
        }),
        OR: [
          { currentStatus: { contains: "retur", mode: "insensitive" } },
          { currentStatus: { contains: "refuz", mode: "insensitive" } },
          { currentStatus: { contains: "return", mode: "insensitive" } },
        ],
      },
    }),
  ]);

  // Process sales data for chart
  // Create a map of date -> sales data
  const salesByDate = new Map<string, { total: number; orders: number }>();

  // Handle raw sales data - may need different approach due to raw query limitations
  // For now, build the map from available data
  if (Array.isArray(salesDataRaw)) {
    salesDataRaw.forEach((row) => {
      const d = new Date(row.date);
      const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      salesByDate.set(dateKey, {
        total: Number(row.totalSales),
        orders: Number(row.orderCount),
      });
    });
  }

  // Generate complete date range for chart (fill in missing dates with 0)
  const salesData: Array<{ date: string; total: number; orders: number }> = [];
  const startDate = dateWhere.gte;
  const endDate = dateWhere.lte ?? new Date();

  // Iterate through each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
    const data = salesByDate.get(dateKey) || { total: 0, orders: 0 };
    salesData.push({
      date: dateKey,
      ...data,
    });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Return structured stats object
  return {
    // Order counts
    totalOrders,
    pendingOrders,
    validatedOrders,
    validationFailed,
    invoiced,
    inTransit, // AWBs in transit (matches tracking page)
    delivered,

    // Sales metrics
    totalSales: Number(salesAggregate._sum?.totalPrice) || 0,
    orderCount: salesAggregate._count || 0,

    // Channel-specific
    shopifyOrders,
    shopifyRevenue: Number(shopifyAggregate._sum?.totalPrice) || 0,
    trendyolOrders,
    trendyolRevenue: Number(trendyolAggregate._sum?.totalPrice) || 0,
    trendyolPending,

    // Invoices
    todayInvoices,

    // Stores (transform for dropdown)
    stores: storeStats.map((s) => ({
      id: s.id,
      name: s.name,
      ordersCount: s._count.orders,
    })),

    // Recent orders (transform for display)
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      shopifyOrderNumber: o.shopifyOrderNumber,
      customerFirstName: o.customerFirstName,
      customerLastName: o.customerLastName,
      totalPrice: Number(o.totalPrice),
      status: o.status,
      createdAt: o.createdAt,
      store: {
        id: o.store.id,
        name: o.store.name,
      },
    })),

    // Low stock products
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      unit: p.unit,
    })),

    // Product counts
    totalProducts: productCount,
    lowStockCount: lowStockProducts.length,

    // Returns count
    returns: returnsCount,

    // Sales data for chart
    salesData,
  };
}
