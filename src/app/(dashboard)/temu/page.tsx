"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  FileText,
  Truck,
  RefreshCw,
  Package,
  AlertCircle,
  Settings,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SyncOverlay, useSyncOverlay } from "@/components/ui/sync-overlay";

interface TemuStats {
  totalOrders: number;
  pendingInvoice: number;
  pendingAwb: number;
  syncedToday: number;
  storesCount: number;
  configured: boolean;
}

interface TemuOrder {
  id: string;
  temuOrderNumber: string;
  orderDate: string;
  status: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  invoiceSent: boolean;
  trackingSent: boolean;
}

interface TemuStore {
  id: string;
  name: string;
  appKey: string;
  companyId: string;
  companyName: string;
}

// Stat Card component (inline - follows dashboard pattern)
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
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
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: any }> = {
    PENDING_SHIPMENT: { label: "De expediat", variant: "default" },
    SHIPPED: { label: "Expediat", variant: "info" },
    DELIVERED: { label: "Livrat", variant: "success" },
    CANCELLED: { label: "Anulat", variant: "destructive" },
    RETURNED: { label: "Returnat", variant: "warning" },
  };
  const config = statusMap[status] || { label: status, variant: "default" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function TemuDashboardPage() {
  const queryClient = useQueryClient();
  const syncOverlay = useSyncOverlay();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Fetch Temu configuration and stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery<TemuStats>({
    queryKey: ["temu-stats"],
    queryFn: async () => {
      const res = await fetch("/api/temu/stats");
      if (!res.ok) {
        // If stats endpoint doesn't exist, return defaults
        return {
          totalOrders: 0,
          pendingInvoice: 0,
          pendingAwb: 0,
          syncedToday: 0,
          storesCount: 0,
          configured: false,
        };
      }
      return res.json();
    },
  });

  // Fetch stores for selector
  const { data: storesData } = useQuery<{ stores: TemuStore[] }>({
    queryKey: ["temu-stores"],
    queryFn: async () => {
      const res = await fetch("/api/temu/stores");
      if (!res.ok) return { stores: [] };
      return res.json();
    },
  });

  const stores = storesData?.stores || [];
  const currentStoreId = selectedStoreId || stores[0]?.id;

  // Fetch recent orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: TemuOrder[] }>({
    queryKey: ["temu-recent-orders", currentStoreId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "5");
      if (currentStoreId) params.set("storeId", currentStoreId);
      const res = await fetch(`/api/temu/orders?${params}`);
      if (!res.ok) return { orders: [] };
      return res.json();
    },
    enabled: statsData?.configured ?? false,
  });

  const recentOrders = ordersData?.orders || [];

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      syncOverlay.start("Sincronizare comenzi Temu", "Se descarca comenzile din Temu...");

      const res = await fetch("/api/temu/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          storeId: currentStoreId,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        syncOverlay.success(
          `${data.synced || 0} comenzi sincronizate (${data.created || 0} noi, ${data.updated || 0} actualizate)`
        );
        queryClient.invalidateQueries({ queryKey: ["temu-stats"] });
        queryClient.invalidateQueries({ queryKey: ["temu-recent-orders"] });
      } else {
        syncOverlay.error(data.error || "Eroare la sincronizare");
      }
    },
    onError: (error: any) => {
      syncOverlay.error(error.message || "Eroare la sincronizare");
    },
  });

  // Not configured state
  if (!statsLoading && !statsData?.configured) {
    return (
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeader
            title="Temu"
            description="Gestioneaza comenzile si produsele din magazinele Temu"
          />

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Temu nu este configurat</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Adauga un magazin Temu pentru a incepe.<br />
                Mergi la Setari - Magazine Temu
              </p>
              <Link href="/settings?tab=temu">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configureaza Temu
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 md:h-8 md:w-8" />
                Temu
              </h1>
              {/* Store selector */}
              {stores.length > 1 && (
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium"
                  value={currentStoreId || ""}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.companyName})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Gestioneaza comenzile si produsele din magazinele Temu
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 md:mr-2" />
                  )}
                  <span className="hidden md:inline">Sincronizeaza</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Descarca comenzile noi din ultimele 7 zile.</p>
              </TooltipContent>
            </Tooltip>

            <Link href="/temu/orders">
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Vezi comenzi</span>
              </Button>
            </Link>

            <Link href="/settings?tab=temu">
              <Button variant="outline">
                <Settings className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Setari</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Comenzi"
            value={statsLoading ? "-" : statsData?.totalOrders || 0}
            icon={ShoppingCart}
            href="/temu/orders"
          />
          <StatCard
            title="De Facturat"
            value={statsLoading ? "-" : statsData?.pendingInvoice || 0}
            icon={FileText}
            variant={(statsData?.pendingInvoice || 0) > 0 ? "warning" : "default"}
            href="/orders?source=temu&needsInvoice=true"
          />
          <StatCard
            title="Fara AWB"
            value={statsLoading ? "-" : statsData?.pendingAwb || 0}
            icon={Truck}
            variant={(statsData?.pendingAwb || 0) > 0 ? "warning" : "default"}
            href="/orders?source=temu&needsAwb=true"
          />
          <StatCard
            title="Sincronizate Azi"
            value={statsLoading ? "-" : statsData?.syncedToday || 0}
            icon={Clock}
            variant="success"
          />
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Comenzi Recente</CardTitle>
            <Link href="/temu/orders">
              <Button variant="ghost" size="sm">
                Vezi toate <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nu sunt comenzi Temu</p>
                <Button className="mt-4" onClick={() => syncMutation.mutate()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizeaza acum
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comanda</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.temuOrderNumber}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString("ro-RO")}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.totalPrice, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sync Overlay */}
        <SyncOverlay
          isOpen={syncOverlay.state.isOpen}
          title={syncOverlay.state.title}
          description={syncOverlay.state.description}
          status={syncOverlay.state.status}
          progress={syncOverlay.state.progress}
          successMessage={syncOverlay.state.successMessage}
          errorMessage={syncOverlay.state.errorMessage}
          errors={syncOverlay.state.errors}
          onClose={syncOverlay.close}
        />
      </div>
    </TooltipProvider>
  );
}
