"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  Package,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Ban,
  Trash2,
  FileText,
  ExternalLink,
  Phone,
  MapPin,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

// Order type matching API response
interface TemuOrder {
  id: string;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  source: string;
  storeId: string;
  store: { id: string; name: string };
  customerEmail: string | null;
  customerPhone: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  shippingAddress1: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  totalPrice: string;
  currency: string;
  status: string;
  phoneValidation: string;
  addressValidation: string;
  createdAt: string;
  invoice: {
    id: string;
    invoiceNumber: string | null;
    invoiceSeriesName: string | null;
    status: string;
    errorMessage: string | null;
  } | null;
  awb: {
    id: string;
    awbNumber: string;
    currentStatus: string;
    currentStatusDate: string | null;
    errorMessage: string | null;
  } | null;
  temuOrder: {
    id: string;
    temuOrderNumber: string;
    temuStoreId: string | null;
    temuStore: {
      id: string;
      name: string;
      region: string;
    } | null;
  } | null;
  lineItems?: Array<{
    id: string;
    title: string;
    sku: string;
    quantity: number;
    price: string;
  }>;
  internalStatus?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface TemuStore {
  id: string;
  name: string;
  region: string;
}

interface TemuOrdersListProps {
  filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  };
}

// Status configuration
const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" }> = {
  PENDING: { label: "In asteptare", variant: "warning" },
  VALIDATED: { label: "Validat", variant: "info" },
  VALIDATION_FAILED: { label: "Validare esuata", variant: "destructive" },
  INVOICED: { label: "Facturat", variant: "success" },
  PICKING: { label: "In picking", variant: "info" },
  PACKED: { label: "Impachetat", variant: "success" },
  SHIPPED: { label: "Expediat", variant: "info" },
  DELIVERED: { label: "Livrat", variant: "success" },
  RETURNED: { label: "Returnat", variant: "destructive" },
  CANCELLED: { label: "Anulat", variant: "neutral" },
  INVOICE_ERROR: { label: "Eroare factura", variant: "destructive" },
  AWB_ERROR: { label: "Eroare AWB", variant: "destructive" },
};

// AWB status helper
function getAWBStatusInfo(awb: TemuOrder["awb"]): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "outline";
  icon: React.ElementType;
  label: string;
  className?: string;
} {
  if (!awb || !awb.awbNumber) {
    if (awb?.errorMessage) {
      return { variant: "destructive", icon: AlertCircle, label: "Eroare", className: "bg-status-error/10 text-status-error border-status-error/20" };
    }
    return { variant: "outline", icon: Package, label: "Fara AWB" };
  }

  const status = awb.currentStatus?.toLowerCase() || "";

  if (status.includes("sters") || status.includes("deleted")) {
    return { variant: "outline", icon: Trash2, label: awb.awbNumber, className: "bg-status-neutral/10 text-status-neutral border-status-neutral/20 line-through opacity-70" };
  }
  if (status.includes("anulat") || status.includes("cancelled")) {
    return { variant: "destructive", icon: Ban, label: awb.awbNumber, className: "bg-status-error/10 text-status-error border-status-error/20 line-through" };
  }
  if (status.includes("retur") || status.includes("refuz") || status.includes("return")) {
    return { variant: "default", icon: RotateCcw, label: awb.awbNumber, className: "bg-status-warning/10 text-status-warning border-status-warning/20" };
  }
  if (status.includes("livrat") || status.includes("delivered")) {
    return { variant: "success", icon: CheckCircle2, label: awb.awbNumber, className: "bg-status-success/10 text-status-success border-status-success/20" };
  }
  if (status.includes("tranzit") || status.includes("transit") || status.includes("livrare") || status.includes("expedit")) {
    return { variant: "info", icon: Truck, label: awb.awbNumber, className: "bg-status-info/10 text-status-info border-status-info/20" };
  }
  if (status.includes("asteptare") || status.includes("pending")) {
    return { variant: "default", icon: Clock, label: awb.awbNumber, className: "bg-status-warning/10 text-status-warning border-status-warning/20" };
  }

  return { variant: "info", icon: Package, label: awb.awbNumber, className: "bg-status-info/10 text-status-info border-status-info/20" };
}

// Validation icon helper
function getValidationIcon(status: string) {
  switch (status) {
    case "PASSED":
      return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    case "FAILED":
      return <AlertCircle className="h-3 w-3 text-status-error" />;
    case "PENDING":
    default:
      return <Clock className="h-3 w-3 text-status-warning" />;
  }
}

export function TemuOrdersList({ filters }: TemuOrdersListProps) {
  const queryClient = useQueryClient();

  // Local state
  const [searchQuery, setSearchQuery] = useState(filters?.search || "");
  const [statusFilter, setStatusFilter] = useState<string>(filters?.status || "all");
  const [temuStoreFilter, setTemuStoreFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(
    filters?.startDate ? filters.startDate.toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState<string>(
    filters?.endDate ? filters.endDate.toISOString().split("T")[0] : ""
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // View order modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<TemuOrder | null>(null);

  // Fetch orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["temu-orders", page, limit, statusFilter, temuStoreFilter, startDate, endDate, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (temuStoreFilter !== "all") params.set("storeId", temuStoreFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/temu/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Eroare la incarcarea comenzilor Temu");
      }
      return res.json();
    },
  });

  const orders: TemuOrder[] = ordersData?.orders || [];
  const temuStores: TemuStore[] = ordersData?.temuStores || [];
  const pagination = ordersData?.pagination || { page: 1, limit: 50, totalCount: 0, totalPages: 1 };

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/temu/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: temuStoreFilter !== "all" ? temuStoreFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la sincronizare");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronizare reusita",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["temu-orders"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Eroare sincronizare",
        description: error.message,
      });
    },
  });

  // Handle view order
  const handleViewOrder = useCallback((order: TemuOrder) => {
    setViewOrder(order);
    setViewModalOpen(true);
  }, []);

  // Calculate if there are active filters
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || temuStoreFilter !== "all" || startDate !== "" || endDate !== "";

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTemuStoreFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pagination.totalCount} comenzi Temu
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sincronizare...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizeaza Temu
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cauta comanda, client, telefon..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="PENDING">In asteptare</SelectItem>
                <SelectItem value="VALIDATED">Validate</SelectItem>
                <SelectItem value="INVOICED">Facturate</SelectItem>
                <SelectItem value="SHIPPED">Expediate</SelectItem>
                <SelectItem value="DELIVERED">Livrate</SelectItem>
                <SelectItem value="RETURNED">Returnate</SelectItem>
                <SelectItem value="CANCELLED">Anulate</SelectItem>
              </SelectContent>
            </Select>

            {/* Temu store filter */}
            {temuStores.length > 1 && (
              <Select value={temuStoreFilter} onValueChange={(v) => { setTemuStoreFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Magazin Temu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate magazinele</SelectItem>
                  {temuStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.region})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date filters */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Interval:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Reseteaza filtre
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">Comanda</th>
                  <th className="p-4 text-left text-sm font-medium">Client</th>
                  <th className="p-4 text-left text-sm font-medium">Validari</th>
                  <th className="p-4 text-left text-sm font-medium">Valoare</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Status Intern</th>
                  <th className="p-4 text-left text-sm font-medium">Factura</th>
                  <th className="p-4 text-left text-sm font-medium">AWB</th>
                  <th className="p-4 text-left text-sm font-medium">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={9} className="p-0">
                          <SkeletonTableRow cols={9} />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        icon={Package}
                        title={hasActiveFilters ? "Niciun rezultat" : "Nicio comanda Temu"}
                        description={
                          hasActiveFilters
                            ? "Incearca sa modifici filtrele sau sa sincronizezi comenzile."
                            : "Nu exista comenzi Temu. Apasa butonul de sincronizare pentru a importa comenzile din Temu."
                        }
                        action={
                          hasActiveFilters
                            ? { label: "Reseteaza filtre", onClick: clearFilters }
                            : { label: "Sincronizeaza acum", onClick: () => syncMutation.mutate() }
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const awbInfo = getAWBStatusInfo(order.awb);
                    const AWBIcon = awbInfo.icon;

                    return (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleViewOrder(order)}
                      >
                        {/* Order number */}
                        <td className="p-4">
                          <span className="font-medium">{order.shopifyOrderNumber}</span>
                          <div className="flex items-center gap-1 mt-1">
                            {order.temuOrder?.temuStore && (
                              <Badge variant="outline" className="text-xs">
                                {order.temuOrder.temuStore.name}
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            >
                              Temu
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>

                        {/* Customer */}
                        <td className="p-4">
                          <p className="font-medium">
                            {order.customerFirstName} {order.customerLastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.shippingCity}
                            {order.shippingProvince && `, ${order.shippingProvince}`}
                          </p>
                        </td>

                        {/* Validations */}
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {getValidationIcon(order.phoneValidation)}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {getValidationIcon(order.addressValidation)}
                            </div>
                          </div>
                        </td>

                        {/* Value */}
                        <td className="p-4">
                          <span className="font-semibold">
                            {formatCurrency(parseFloat(order.totalPrice), order.currency)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <Badge variant={statusConfig[order.status]?.variant || "default"}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </td>

                        {/* Internal status */}
                        <td className="p-4">
                          <OrderStatusBadge status={order.internalStatus} />
                        </td>

                        {/* Invoice */}
                        <td className="p-4">
                          {order.invoice?.invoiceNumber ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="success"
                                  className="bg-status-success/10 text-status-success border-status-success/20"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {order.invoice.invoiceNumber}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Seria: {order.invoice.invoiceSeriesName || "N/A"}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : order.invoice?.errorMessage ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="bg-status-error/10 text-status-error border-status-error/20">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Eroare
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{order.invoice.errorMessage}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Fara factura
                            </Badge>
                          )}
                        </td>

                        {/* AWB */}
                        <td className="p-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={awbInfo.variant} className={awbInfo.className}>
                                <AWBIcon className="h-3 w-3 mr-1" />
                                {awbInfo.label}
                              </Badge>
                            </TooltipTrigger>
                            {order.awb?.currentStatus && (
                              <TooltipContent>
                                <p>{order.awb.currentStatus}</p>
                                {order.awb.currentStatusDate && (
                                  <p className="text-xs">{formatDate(order.awb.currentStatusDate)}</p>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </td>

                        {/* Actions */}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.totalCount} comenzi)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Order Dialog */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Comanda {viewOrder?.shopifyOrderNumber}
              <Badge
                variant="secondary"
                className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              >
                Temu
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {viewOrder?.temuOrder?.temuStore?.name} - {formatDate(viewOrder?.createdAt || "")}
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-6">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Client</h4>
                  <p>{viewOrder.customerFirstName} {viewOrder.customerLastName}</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.customerEmail}</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.customerPhone}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Adresa livrare</h4>
                  <p>{viewOrder.shippingAddress1}</p>
                  <p className="text-sm text-muted-foreground">
                    {viewOrder.shippingCity}, {viewOrder.shippingProvince}
                  </p>
                </div>
              </div>

              {/* Order status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Status comanda</h4>
                  <Badge variant={statusConfig[viewOrder.status]?.variant || "default"}>
                    {statusConfig[viewOrder.status]?.label || viewOrder.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Factura</h4>
                  {viewOrder.invoice?.invoiceNumber ? (
                    <Badge variant="success">{viewOrder.invoice.invoiceNumber}</Badge>
                  ) : (
                    <Badge variant="outline">Fara factura</Badge>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">AWB</h4>
                  {viewOrder.awb?.awbNumber ? (
                    <Badge variant="info">{viewOrder.awb.awbNumber}</Badge>
                  ) : (
                    <Badge variant="outline">Fara AWB</Badge>
                  )}
                </div>
              </div>

              {/* Line items */}
              {viewOrder.lineItems && viewOrder.lineItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Produse ({viewOrder.lineItems.length})</h4>
                  <div className="border rounded-lg divide-y">
                    {viewOrder.lineItems.map((item) => (
                      <div key={item.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p>{item.quantity} x {formatCurrency(parseFloat(item.price), viewOrder.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total comanda</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(parseFloat(viewOrder.totalPrice), viewOrder.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
