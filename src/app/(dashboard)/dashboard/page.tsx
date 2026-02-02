import { Suspense } from "react";
import {
  ShoppingCart,
  FileText,
  Truck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
  Megaphone,
  RefreshCw,
  ArrowRight,
  Sparkles,
  BarChart3,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import prisma from "@/lib/db";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardAIInsights } from "./dashboard-ai-insights";

async function getStats(storeId?: string | null) {
  // Data de azi la miezul nopții (UTC pentru consistență)
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  // Data acum 7 zile
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  
  // Data acum 14 zile (pentru comparație)
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  const [
    totalOrders,
    pendingOrders,
    validatedOrders,
    validationFailed,
    invoiced,
    shipped,
    delivered,
    recentOrders,
    storeStats,
    // Statistici stoc
    productStats,
    lowStockProducts,
    // Ads stats
    adsStats,
    // AI Insights pending
    pendingInsights,
    // Trendyol stats
    trendyolOrdersToday,
    trendyolPendingOrders,
    trendyolRevenue,
    // Shopify stats (for comparison)
    shopifyOrdersToday,
    shopifyRevenue,
  ] = await Promise.all([
    // Aceste statistici sunt GLOBALE (nu se filtrează după magazin)
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "VALIDATED" } }),
    prisma.order.count({ where: { status: "VALIDATION_FAILED" } }),
    prisma.order.count({ where: { status: "INVOICED" } }),
    prisma.order.count({ where: { status: "SHIPPED" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { store: true },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    }),
    // Statistici produse
    prisma.product.aggregate({
      where: { isActive: true },
      _count: true,
      _sum: {
        stockQuantity: true,
      },
    }),
    // Produse cu stoc scăzut
    prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lte: 5 },
      },
      orderBy: { stockQuantity: "asc" },
      take: 5,
    }),
    // Ads aggregate stats
    prisma.adsCampaign.aggregate({
      where: { status: "ACTIVE" },
      _sum: {
        spend: true,
        conversions: true,
        revenue: true,
      },
      _count: true,
    }),
    // AI Insights pending count
    prisma.aIInsight.count({
      where: { status: "PENDING" },
    }).catch(() => 0),
    // Trendyol orders today
    prisma.order.count({
      where: {
        source: "trendyol",
        createdAt: { gte: today },
      },
    }),
    // Trendyol pending orders
    prisma.order.count({
      where: {
        source: "trendyol",
        status: { in: ["PENDING", "VALIDATED"] },
      },
    }),
    // Trendyol revenue today
    prisma.order.aggregate({
      where: {
        source: "trendyol",
        createdAt: { gte: today },
      },
      _sum: { totalPrice: true },
    }),
    // Shopify orders today (for comparison)
    prisma.order.count({
      where: {
        source: "shopify",
        createdAt: { gte: today },
      },
    }),
    // Shopify revenue today
    prisma.order.aggregate({
      where: {
        source: "shopify",
        createdAt: { gte: today },
      },
      _sum: { totalPrice: true },
    }),
  ]);

  // Calculăm vânzări din comenzi - ultimele 7 zile (grupat per zi)
  // FĂRĂ filtru pe status - toate comenzile
  // CU filtru opțional pe magazin (doar pentru chart)
  const salesQuery = storeId 
    ? prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT 
          DATE("createdAt" AT TIME ZONE 'UTC') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${sevenDaysAgo}
          AND "storeId" = ${storeId}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `
    : prisma.$queryRaw<Array<{
        date: Date;
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT 
          DATE("createdAt" AT TIME ZONE 'UTC') as date,
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;

  const salesLast7DaysRaw = await salesQuery;

  // Vânzări perioada anterioară (7-14 zile în urmă) pentru trend
  const previousWeekQuery = storeId
    ? prisma.$queryRaw<Array<{
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT 
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${fourteenDaysAgo}
          AND "createdAt" < ${sevenDaysAgo}
          AND "storeId" = ${storeId}
      `
    : prisma.$queryRaw<Array<{
        totalSales: number;
        orderCount: bigint;
      }>>`
        SELECT 
          COALESCE(SUM("totalPrice"::numeric), 0) as "totalSales",
          COUNT(*) as "orderCount"
        FROM orders
        WHERE "createdAt" >= ${fourteenDaysAgo}
          AND "createdAt" < ${sevenDaysAgo}
      `;

  const salesPreviousWeekRaw = await previousWeekQuery;

  // Generăm array complet pentru ultimele 7 zile (inclusiv zilele fără vânzări)
  const salesByDate = new Map<string, { sales: number; orders: number }>();
  salesLast7DaysRaw.forEach((row: { date: Date; totalSales: number; orderCount: bigint }) => {
    // Folosim UTC pentru consistență
    const d = new Date(row.date);
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    salesByDate.set(dateKey, {
      sales: Number(row.totalSales),
      orders: Number(row.orderCount),
    });
  });

  const salesLast7Days: Array<{ date: string; sales: number; orders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const data = salesByDate.get(dateKey) || { sales: 0, orders: 0 };
    salesLast7Days.push({
      date: dateKey,
      ...data,
    });
  }

  // Calculăm totalurile
  const totalSalesLast7Days = salesLast7Days.reduce((sum, d) => sum + d.sales, 0);
  const totalOrdersLast7Days = salesLast7Days.reduce((sum, d) => sum + d.orders, 0);
  const previousWeekSales = Number(salesPreviousWeekRaw[0]?.totalSales) || 0;

  // Trend: comparație cu săptămâna anterioară
  const salesTrend = previousWeekSales > 0 
    ? ((totalSalesLast7Days - Number(previousWeekSales)) / Number(previousWeekSales) * 100)
    : 0;

  // Vânzări de azi (din chart data)
  const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const todayData = salesByDate.get(todayKey) || { sales: 0, orders: 0 };
  const todaySalesTotal = todayData.sales;
  const todayOrderCount = todayData.orders;

  // Facturi emise azi (global, nu filtrat)
  const todayInvoices = await prisma.invoice.count({
    where: {
      status: "issued",
      issuedAt: { gte: today },
    },
  });

  // Ads stats procesate
  const adsSpend = Number(adsStats._sum?.spend) || 0;
  const adsRevenue = Number(adsStats._sum?.revenue) || 0;
  const adsROAS = adsSpend > 0 ? (adsRevenue / adsSpend) : 0;

  return {
    totalOrders,
    pendingOrders,
    validatedOrders,
    validationFailed,
    invoiced,
    shipped,
    delivered,
    recentOrders,
    storeStats,
    // Vânzări
    todayInvoices,
    todaySalesTotal,
    todayOrderCount,
    salesTrend,
    totalSalesLast7Days,
    totalOrdersLast7Days,
    salesLast7Days,
    // Stoc
    totalProducts: productStats._count || 0,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
    // Ads
    adsSpend,
    adsRevenue,
    adsROAS,
    activeCampaigns: adsStats._count || 0,
    // AI
    pendingInsights,
    // Trendyol
    trendyolOrdersToday,
    trendyolPendingOrders,
    trendyolRevenueToday: Number(trendyolRevenue._sum?.totalPrice) || 0,
    // Shopify
    shopifyOrdersToday,
    shopifyRevenueToday: Number(shopifyRevenue._sum?.totalPrice) || 0,
    // Pentru filtru
    stores: storeStats.map((s: typeof storeStats[number]) => ({
      id: s.id,
      name: s.name,
      ordersCount: s._count.orders,
    })),
    currentStoreId: storeId || null,
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel,
  variant = "default",
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: number;
  trendLabel?: string;
  variant?: "default" | "success" | "warning" | "error";
  href?: string;
}) {
  const variantStyles = {
    default: "from-primary/10 to-primary/5 border-primary/20",
    success: "from-status-success/10 to-status-success/5 border-status-success/20",
    warning: "from-status-warning/10 to-status-warning/5 border-status-warning/20",
    error: "from-status-error/10 to-status-error/5 border-status-error/20",
  };

  const iconStyles = {
    default: "text-primary",
    success: "text-status-success",
    warning: "text-status-warning",
    error: "text-status-error",
  };

  const content = (
    <Card
      className={cn(
        `bg-gradient-to-br ${variantStyles[variant]} border hover:shadow-lg transition-all duration-300`,
        href && "cursor-pointer"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 text-status-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-status-error" />
            )}
            <span className={cn(
              "text-xs",
              trend >= 0 ? "text-status-success" : "text-status-error"
            )}>
              {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {trendLabel || "vs săpt. trecută"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function getStatusBadge(status: string) {
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" }
  > = {
    PENDING: { label: "În așteptare", variant: "warning" },
    VALIDATED: { label: "Validat", variant: "info" },
    VALIDATION_FAILED: { label: "Validare eșuată", variant: "destructive" },
    INVOICED: { label: "Facturat", variant: "success" },
    SHIPPED: { label: "Expediat", variant: "info" },
    DELIVERED: { label: "Livrat", variant: "success" },
    RETURNED: { label: "Returnat", variant: "destructive" },
    CANCELLED: { label: "Anulat", variant: "neutral" },
    INVOICE_ERROR: { label: "Eroare factură", variant: "destructive" },
    AWB_ERROR: { label: "Eroare AWB", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "default" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { store?: string };
}) {
  const storeId = searchParams.store || null;
  const stats = await getStats(storeId);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Bine ai venit! Iată o privire de ansamblu asupra afacerii tale."
        badge={
          stats.pendingInsights > 0 ? (
            <Link href="/dashboard#ai-insights">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {stats.pendingInsights} recomandări AI
              </Badge>
            </Link>
          ) : undefined
        }
      />

      {/* Vânzări de azi - Row Principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Vânzări Azi"
          value={formatCurrency(stats.todaySalesTotal)}
          icon={TrendingUp}
          description={`${stats.todayOrderCount} comenzi procesate`}
          trend={stats.salesTrend}
          variant="success"
          href="/invoices"
        />
        <StatCard
          title="De procesat"
          value={stats.pendingOrders + stats.validatedOrders}
          icon={Clock}
          description="Comenzi care așteaptă acțiune"
          variant={stats.pendingOrders + stats.validatedOrders > 10 ? "warning" : "default"}
          href="/orders?status=PENDING,VALIDATED"
        />
        <StatCard
          title="Expediate"
          value={stats.shipped}
          icon={Truck}
          description="Comenzi în curs de livrare"
          variant="default"
          href="/tracking"
        />
        <StatCard
          title="ROAS Ads"
          value={stats.adsROAS.toFixed(2) + "x"}
          icon={Megaphone}
          description={`${stats.activeCampaigns} campanii active`}
          variant={stats.adsROAS >= 3 ? "success" : stats.adsROAS >= 2 ? "warning" : "error"}
          href="/ads"
        />
      </div>

      {/* Channel Stats - Shopify vs Trendyol */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Comenzi Shopify"
          value={stats.shopifyOrdersToday}
          icon={ShoppingCart}
          description={formatCurrency(stats.shopifyRevenueToday)}
          variant="default"
          href="/orders?source=shopify"
        />
        <StatCard
          title="Comenzi Trendyol"
          value={stats.trendyolOrdersToday}
          icon={ShoppingBag}
          description={formatCurrency(stats.trendyolRevenueToday)}
          variant="default"
          href="/orders?source=trendyol"
        />
        <StatCard
          title="Total Comenzi Azi"
          value={stats.shopifyOrdersToday + stats.trendyolOrdersToday}
          icon={Package}
          description={formatCurrency(stats.shopifyRevenueToday + stats.trendyolRevenueToday)}
          variant="success"
          href="/orders"
        />
        <StatCard
          title="Trendyol de procesat"
          value={stats.trendyolPendingOrders}
          icon={ShoppingBag}
          description="Comenzi Trendyol in asteptare"
          variant={stats.trendyolPendingOrders > 5 ? "warning" : "default"}
          href="/orders?source=trendyol&status=PENDING,VALIDATED"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<Card className="h-[300px] animate-pulse" />}>
            <DashboardCharts 
              salesData={stats.salesLast7Days}
              stores={stats.stores}
              currentStoreId={stats.currentStoreId}
            />
          </Suspense>
        </div>
        
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sumar Rapid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-status-success" />
                <span className="text-sm">Cheltuieli Ads</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats.adsSpend)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-status-info" />
                <span className="text-sm">Venituri Ads</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats.adsRevenue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm">Total Produse</span>
              </div>
              <span className="font-semibold">{stats.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                <span className="text-sm">Stoc Scăzut</span>
              </div>
              <Badge variant={stats.lowStockCount > 0 ? "warning" : "success"}>
                {stats.lowStockCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-error" />
                <span className="text-sm">Erori Validare</span>
              </div>
              <Badge variant={stats.validationFailed > 0 ? "destructive" : "success"}>
                {stats.validationFailed}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <div id="ai-insights" className="mb-6">
        <Suspense fallback={<Card className="h-[200px] animate-pulse" />}>
          <DashboardAIInsights />
        </Suspense>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Comenzi Recente</span>
              <Link
                href="/orders"
                className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
              >
                Vezi toate <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Nu există comenzi încă"
                description="Adaugă un magazin pentru a începe sincronizarea."
                action={{ label: "Adaugă Magazin", href: "/stores" }}
                size="sm"
              />
            ) : (
              <div className="space-y-4">
                {stats.recentOrders.map((order: typeof stats.recentOrders[number]) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {order.shopifyOrderNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {order.store.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customerFirstName} {order.customerLastName} •{" "}
                        {formatCurrency(Number(order.totalPrice))}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(order.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                Stoc Scăzut
              </span>
              <Link
                href="/products?lowStock=true"
                className="text-sm font-normal text-primary hover:underline"
              >
                Inventar →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Toate produsele au stoc suficient!"
                size="sm"
                className="text-status-success"
              />
            ) : (
              <div className="space-y-3">
                {stats.lowStockProducts.map((product: typeof stats.lowStockProducts[number]) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge 
                      variant={product.stockQuantity <= 0 ? "destructive" : "warning"}
                      className="ml-2"
                    >
                      {product.stockQuantity} {product.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stores Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Magazine Active</span>
            <Link
              href="/stores"
              className="text-sm font-normal text-primary hover:underline"
            >
              Gestionare →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.storeStats.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nu ai magazine configurate"
              description="Conectează primul tău magazin Shopify pentru a începe."
              action={{ label: "Adaugă Magazin", href: "/stores" }}
              size="sm"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.storeStats.map((store: typeof stats.storeStats[number]) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.shopifyDomain}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {store._count.orders}
                    </p>
                    <p className="text-xs text-muted-foreground">comenzi</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
