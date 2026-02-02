import { Suspense } from "react";
import {
  ShoppingCart,
  Truck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  ShoppingBag,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFilters } from "./dashboard-filters";
import { getFilteredDashboardStats } from "@/lib/dashboard-stats";

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
  searchParams: { store?: string; startDate?: string; endDate?: string };
}) {
  // Parse filter parameters from URL
  const storeId = searchParams.store || undefined;
  const startDate = searchParams.startDate || undefined;
  const endDate = searchParams.endDate || undefined;

  // Fetch filtered stats using the new dashboard-stats service
  const stats = await getFilteredDashboardStats({
    storeId,
    startDate,
    endDate,
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Bine ai venit! Iata o privire de ansamblu asupra afacerii tale."
      />

      {/* Global Filters */}
      <Suspense fallback={<div className="h-[76px] animate-pulse bg-muted/30 rounded-lg mb-6" />}>
        <DashboardFilters
          stores={stats.stores.map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          }))}
        />
      </Suspense>

      {/* Vanzari - Row Principal (toate valorile folosesc filtrele selectate) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Vanzari"
          value={formatCurrency(stats.totalSales)}
          icon={TrendingUp}
          description={`${stats.orderCount} comenzi in perioada selectata`}
          variant="success"
          href="/invoices"
        />
        <StatCard
          title="De procesat"
          value={stats.pendingOrders + stats.validatedOrders}
          icon={Clock}
          description="Comenzi care asteapta actiune (nefacturate)"
          variant={stats.pendingOrders + stats.validatedOrders > 10 ? "warning" : "default"}
          href="/orders?status=PENDING,VALIDATED"
        />
        <StatCard
          title="Expediate"
          value={stats.shipped}
          icon={Truck}
          description="Comenzi in curs de livrare"
          variant="default"
          href="/tracking"
        />
        <StatCard
          title="Facturi emise"
          value={stats.todayInvoices}
          icon={FileText}
          description="In perioada selectata"
          variant="success"
          href="/invoices"
        />
      </div>

      {/* Channel Stats - Shopify vs Trendyol (toate folosesc filtrele selectate) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Comenzi Shopify"
          value={stats.shopifyOrders}
          icon={ShoppingCart}
          description={formatCurrency(stats.shopifyRevenue)}
          variant="default"
          href="/orders?source=shopify"
        />
        <StatCard
          title="Comenzi Trendyol"
          value={stats.trendyolOrders}
          icon={ShoppingBag}
          description={formatCurrency(stats.trendyolRevenue)}
          variant="default"
          href="/orders?source=trendyol"
        />
        <StatCard
          title="Total Comenzi"
          value={stats.totalOrders}
          icon={Package}
          description={formatCurrency(stats.totalSales)}
          variant="success"
          href="/orders"
        />
        <StatCard
          title="Trendyol de procesat"
          value={stats.trendyolPending}
          icon={ShoppingBag}
          description="Comenzi Trendyol in asteptare"
          variant={stats.trendyolPending > 5 ? "warning" : "default"}
          href="/orders?source=trendyol&status=PENDING,VALIDATED"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<Card className="h-[300px] animate-pulse" />}>
            <DashboardCharts
              salesData={stats.salesData.map(d => ({ date: d.date, sales: d.total, orders: d.orders }))}
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
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm">Total Produse</span>
              </div>
              <span className="font-semibold">{stats.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                <span className="text-sm">Stoc Scazut</span>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-status-success" />
                <span className="text-sm">Facturi emise</span>
              </div>
              <span className="font-semibold">{stats.todayInvoices}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-status-info" />
                <span className="text-sm">Livrate</span>
              </div>
              <span className="font-semibold">{stats.delivered}</span>
            </div>
          </CardContent>
        </Card>
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
              Gestionare
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.stores.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nu ai magazine configurate"
              description="Conecteaza primul tau magazin Shopify pentru a incepe."
              action={{ label: "Adauga Magazin", href: "/stores" }}
              size="sm"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.stores.map((store) => (
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
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {store.ordersCount}
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
