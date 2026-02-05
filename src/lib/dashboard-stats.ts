import prisma from "@/lib/db";
import { getCategoryFilterConditions } from "@/lib/awb-status";
import { FANCOURIER_STATUSES } from "@/lib/fancourier-statuses";
import { getLowStockAlerts } from "@/lib/inventory-stock";

/**
 * Romania timezone constant
 * Europe/Bucharest is UTC+2 in winter (EET) and UTC+3 in summer (EEST)
 */
const ROMANIA_TIMEZONE = "Europe/Bucharest";

/**
 * Get Romania timezone offset in hours for a given date
 * Uses Intl.DateTimeFormat to correctly handle DST transitions
 * Returns positive value for UTC+ timezones (e.g., 2 for UTC+2, 3 for UTC+3)
 */
function getRomaniaOffsetHours(year: number, month: number, day: number): number {
  // Create a sample date at noon UTC for this day
  const sampleDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Get what hour it is in Romania at 12:00 UTC
  const romaniaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ROMANIA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const romaniaParts = romaniaFormatter.formatToParts(sampleDate);
  const romaniaHour = parseInt(romaniaParts.find(p => p.type === "hour")?.value || "0");

  // If it's 12:00 UTC and it shows 14:00 in Romania, offset is +2 hours
  // If it's 12:00 UTC and it shows 15:00 in Romania, offset is +3 hours
  return romaniaHour - 12;
}

/**
 * Convert a date string (YYYY-MM-DD) to start of day in Romania timezone (as UTC timestamp)
 * Example: "2026-01-27" -> 2026-01-26T22:00:00.000Z (midnight Romania = 22:00 UTC in winter)
 *
 * Romania is ahead of UTC, so midnight in Romania occurs BEFORE midnight UTC.
 * When it's 00:00 in Romania (UTC+2), it's 22:00 UTC the previous day.
 */
function toRomaniaStartOfDay(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const offsetHours = getRomaniaOffsetHours(year, month, day);

  // Midnight in Romania = midnight UTC minus the offset (because Romania is ahead)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetHours * 3600000);
}

/**
 * Convert a date string (YYYY-MM-DD) to end of day in Romania timezone (as UTC timestamp)
 * Example: "2026-01-27" -> 2026-01-27T21:59:59.999Z (23:59:59.999 Romania = 21:59:59.999 UTC in winter)
 */
function toRomaniaEndOfDay(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const offsetHours = getRomaniaOffsetHours(year, month, day);

  // End of day in Romania = 23:59:59.999 UTC minus the offset
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetHours * 3600000);
}

/**
 * Get today's date in Romania timezone as YYYY-MM-DD string
 */
function getTodayInRomania(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROMANIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // Returns YYYY-MM-DD format
}

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

  // Low stock products (no date filter) - uses InventoryItem.currentStock
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStock: number;
    unit: string;
    status: 'out_of_stock' | 'low_stock';
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

  // Orders by hour of day (for distribution chart)
  ordersByHour: Array<{
    hour: number;
    orderCount: number;
  }>;
}

/**
 * Build date range where clause for Prisma queries
 * Uses Romania timezone (Europe/Bucharest) for consistent date boundaries
 * Defaults to today (in Romania timezone) if no dates provided
 */
function buildDateWhere(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return {
      gte: toRomaniaStartOfDay(startDate),
      lte: toRomaniaEndOfDay(endDate),
    };
  }

  // If only startDate provided, use it for both start and end (single day filter)
  if (startDate) {
    return {
      gte: toRomaniaStartOfDay(startDate),
      lte: toRomaniaEndOfDay(startDate),
    };
  }

  // Default to today in Romania timezone
  const todayRomania = getTodayInRomania();
  return {
    gte: toRomaniaStartOfDay(todayRomania),
    lte: toRomaniaEndOfDay(todayRomania),
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
 * Get orders grouped by hour of day
 * Shows what time during the day most orders are placed
 * Uses Romania timezone for hour calculation
 */
async function getOrdersByHourOfDay(
  startDate: Date,
  endDate: Date,
  storeId?: string
): Promise<Array<{ hour: number; orderCount: bigint }>> {
  try {
    if (storeId && storeId !== "all") {
      return await prisma.$queryRaw<Array<{
        hour: number;
        orderCount: bigint;
      }>>`
        SELECT
          EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Europe/Bucharest')::int as hour,
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          AND "storeId" = ${storeId}
        GROUP BY EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Europe/Bucharest')
        ORDER BY hour ASC
      `;
    } else {
      return await prisma.$queryRaw<Array<{
        hour: number;
        orderCount: bigint;
      }>>`
        SELECT
          EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Europe/Bucharest')::int as hour,
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        GROUP BY EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Europe/Bucharest')
        ORDER BY hour ASC
      `;
    }
  } catch {
    return [];
  }
}

/**
 * Get sales data grouped by date for chart
 * Uses raw query for efficient grouping
 * Groups by Romania date (Europe/Bucharest timezone), not UTC
 */
async function getSalesDataForChart(
  startDate: Date,
  endDate: Date,
  storeId?: string
): Promise<Array<{ date: Date; totalSales: number; orderCount: bigint }>> {
  try {
    if (storeId && storeId !== "all") {
      // Query with store filter - group by Romania date
      return await prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT
          DATE("createdAt" AT TIME ZONE 'Europe/Bucharest') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
          AND "storeId" = ${storeId}
        GROUP BY DATE("createdAt" AT TIME ZONE 'Europe/Bucharest')
        ORDER BY date ASC
      `;
    } else {
      // Query without store filter - group by Romania date
      return await prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT
          DATE("createdAt" AT TIME ZONE 'Europe/Bucharest') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt" AT TIME ZONE 'Europe/Bucharest')
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

    // Orders by hour of day (for distribution chart)
    ordersByHourRaw,
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

    // Low stock products (no date filter) - uses InventoryItem.currentStock
    // getLowStockAlerts returns items where currentStock <= minStock
    getLowStockAlerts(),

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
    // Uses getCategoryFilterConditions for consistency with awb-status.ts
    prisma.aWB.count({
      where: {
        createdAt: dateWhere,
        ...(filters.storeId && filters.storeId !== "all" && {
          order: { storeId: filters.storeId },
        }),
        OR: getCategoryFilterConditions("returned") || [],
      },
    }),

    // Orders by hour of day (for distribution chart)
    getOrdersByHourOfDay(
      dateWhere.gte,
      dateWhere.lte ?? new Date(),
      filters.storeId
    ),
  ]);

  // VERIFICATION: Compare string-based count with code-based count for in_transit
  // This helps detect if string matching finds AWBs that code lookup misses (or vice versa)
  const inTransitCodes = Object.entries(FANCOURIER_STATUSES)
    .filter(([, s]) => ["pickup", "transit", "delivery"].includes(s.category))
    .filter(([, s]) => !(s.isFinal && s.internalStatus === "DELIVERED")) // Exclude S2 (delivered)
    .map(([code]) => code);

  const inTransitByCode = await prisma.aWB.count({
    where: {
      createdAt: dateWhere,
      ...(filters.storeId && filters.storeId !== "all" && {
        order: { storeId: filters.storeId },
      }),
      fanCourierStatusCode: {
        in: inTransitCodes,
      },
    },
  });

  // Log if counts differ (indicates potential categorization issues)
  if (inTransit !== inTransitByCode) {
    console.warn(
      `[Dashboard Stats] In Transit count mismatch: string=${inTransit}, code=${inTransitByCode}. ` +
      `Difference may indicate AWBs with legacy status strings or unknown codes.`
    );
  }

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
  // We need to iterate by Romania dates, not UTC dates
  const salesData: Array<{ date: string; total: number; orders: number }> = [];

  // Get the start and end dates as Romania date strings (YYYY-MM-DD)
  const startDateStr = filters.startDate || getTodayInRomania();
  const endDateStr = filters.endDate || startDateStr;

  // Parse the date strings into components
  const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

  // Create Date objects for iteration (using UTC to avoid any local timezone issues)
  const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  // Iterate through each day in the range (in Romania timezone terms)
  const currentDate = new Date(startDateObj);
  while (currentDate <= endDateObj) {
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

    // Low stock products (from InventoryItem.currentStock)
    // Take only top 5 for dashboard, sorted by currentStock (lowest first)
    lowStockProducts: lowStockProducts
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentStock: p.currentStock,
        minStock: p.minStock,
        unit: p.unit,
        status: p.currentStock <= 0 ? 'out_of_stock' as const : 'low_stock' as const,
      })),

    // Product counts
    totalProducts: productCount,
    lowStockCount: lowStockProducts.length,

    // Returns count
    returns: returnsCount,

    // Sales data for chart
    salesData,

    // Orders by hour of day (fill in missing hours with 0)
    ordersByHour: Array.from({ length: 24 }, (_, hour) => {
      const found = ordersByHourRaw.find((r) => r.hour === hour);
      return {
        hour,
        orderCount: found ? Number(found.orderCount) : 0,
      };
    }),
  };
}
