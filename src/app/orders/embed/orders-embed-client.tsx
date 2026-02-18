"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ShoppingCart,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Loader2,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
  AlertCircle,
  Ban,
  Trash2,
  RotateCcw,
  Clock,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Order {
  id: string;
  shopifyOrderNumber: string;
  source: string;
  store: { id: string; name: string };
  customerEmail: string | null;
  customerPhone: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingZip: string | null;
  totalPrice: string;
  currency: string;
  status: string;
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
  lineItems?: Array<{
    id: string;
    title: string;
    variantTitle?: string;
    sku: string;
    quantity: number;
    price: string;
  }>;
  customerOrderCount?: number;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" }
> = {
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
  AWB_PENDING: { label: "Necesita AWB", variant: "warning" },
  INVOICE_PENDING: { label: "Necesita factura", variant: "warning" },
};

function getInvoiceDisplay(invoice: Order["invoice"]) {
  if (!invoice) return <span className="text-muted-foreground text-sm">-</span>;
  if (invoice.status === "issued") {
    return (
      <Badge variant="success">
        {invoice.invoiceSeriesName}
        {invoice.invoiceNumber}
      </Badge>
    );
  }
  if (invoice.status === "deleted") return <Badge variant="neutral">Stearsa</Badge>;
  if (invoice.status === "cancelled") return <Badge variant="warning">Anulata</Badge>;
  if (invoice.status === "error") return <Badge variant="destructive">Eroare</Badge>;
  return <Badge variant="neutral">In asteptare</Badge>;
}

function getAwbDisplay(awb: Order["awb"]) {
  if (!awb || !awb.awbNumber) {
    if (awb?.errorMessage) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Eroare
        </Badge>
      );
    }
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const status = awb.currentStatus?.toLowerCase() || "";

  if (status.includes("sters") || status.includes("deleted")) {
    return (
      <Badge variant="neutral" className="line-through opacity-70 gap-1">
        <Trash2 className="h-3 w-3" />
        {awb.awbNumber}
      </Badge>
    );
  }
  if (status.includes("anulat") || status.includes("cancelled")) {
    return (
      <Badge variant="destructive" className="line-through gap-1">
        <Ban className="h-3 w-3" />
        {awb.awbNumber}
      </Badge>
    );
  }
  if (status.includes("retur") || status.includes("refuz")) {
    return (
      <Badge variant="warning" className="gap-1">
        <RotateCcw className="h-3 w-3" />
        {awb.awbNumber}
      </Badge>
    );
  }
  if (status.includes("livrat") || status.includes("delivered")) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {awb.awbNumber}
      </Badge>
    );
  }
  if (status.includes("tranzit") || status.includes("transit") || status.includes("predat")) {
    return (
      <Badge variant="info" className="gap-1">
        <Truck className="h-3 w-3" />
        {awb.awbNumber}
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1">
      <Package className="h-3 w-3" />
      {awb.awbNumber}
    </Badge>
  );
}

// Create a client for this page
const queryClient = new QueryClient();

function OrdersEmbedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read embed token from URL
  const embedToken = searchParams.get("token") || "";

  // URL-based state for store filter
  const storeFilter = searchParams.get("store") || "all";
  const statusFilter = searchParams.get("status") || "all";

  // Local state for search (with debounce)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination state
  const [page, setPage] = useState(1);

  // Fetch orders
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders-embed", storeFilter, statusFilter, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/orders?${params}`, {
        headers: embedToken ? { Authorization: `Bearer ${embedToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // Filter change handlers - update URL
  const updateUrlParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`/orders/embed?${params.toString()}`);
      setPage(1);
    },
    [searchParams, router]
  );

  // Selected order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Comenzi</h1>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Store Filter */}
            <Select value={storeFilter} onValueChange={(v) => updateUrlParam("store", v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Toate magazinele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate magazinele</SelectItem>
                {data?.stores?.map((store: { id: string; name: string }) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => updateUrlParam("status", v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Toate statusurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cauta dupa nr. comanda, nume, telefon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Eroare la incarcarea comenzilor</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Reincearca
              </Button>
            </div>
          ) : !data?.orders?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              {debouncedSearch
                ? `Nu am gasit comenzi pentru "${debouncedSearch}"`
                : "Nu exista comenzi."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm">Comanda</th>
                    <th className="text-left p-4 font-medium text-sm">Client</th>
                    <th className="text-right p-4 font-medium text-sm">Valoare</th>
                    <th className="text-left p-4 font-medium text-sm">Status</th>
                    <th className="text-left p-4 font-medium text-sm">Factura</th>
                    <th className="text-left p-4 font-medium text-sm">AWB</th>
                    <th className="text-left p-4 font-medium text-sm">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.orders.map((order: Order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleViewOrder(order)}
                    >
                      <td className="p-4">
                        <span className="font-medium">{order.shopifyOrderNumber}</span>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {order.store.name}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {order.customerFirstName} {order.customerLastName}
                          </p>
                          {(order.customerOrderCount || 0) > 1 && (
                            <Badge variant="info" className="text-[10px] px-1.5 py-0">
                              {order.customerOrderCount} comenzi
                            </Badge>
                          )}
                        </div>
                        {order.customerPhone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customerPhone}
                          </p>
                        )}
                        {order.shippingCity && (
                          <p className="text-sm text-muted-foreground">
                            {order.shippingCity}
                            {order.shippingProvince ? `, ${order.shippingProvince}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold">
                          {formatCurrency(parseFloat(order.totalPrice), order.currency)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusConfig[order.status]?.variant || "default"}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </td>
                      <td className="p-4">{getInvoiceDisplay(order.invoice)}</td>
                      <td className="p-4">{getAwbDisplay(order.awb)}</td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Afisez{" "}
            {(data.pagination.page - 1) * data.pagination.limit + 1}-
            {Math.min(
              data.pagination.page * data.pagination.limit,
              data.pagination.total
            )}{" "}
            din {data.pagination.total} comenzi (Pagina {data.pagination.page}{" "}
            din {data.pagination.totalPages})
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Inapoi
            </Button>
            <span className="text-sm font-medium min-w-[3ch] text-center">
              {data.pagination.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Inainte
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comanda {selectedOrder?.shopifyOrderNumber}</DialogTitle>
            <DialogDescription>Din magazinul {selectedOrder?.store.name}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Client</h4>
                  <p>
                    {selectedOrder.customerFirstName} {selectedOrder.customerLastName}
                  </p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedOrder.customerEmail}
                    </p>
                  )}
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedOrder.customerPhone}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Adresa livrare</h4>
                  {selectedOrder.shippingAddress1 && (
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedOrder.shippingAddress1}
                    </p>
                  )}
                  {selectedOrder.shippingAddress2 && (
                    <p className="text-sm">{selectedOrder.shippingAddress2}</p>
                  )}
                  <p className="text-sm">
                    {selectedOrder.shippingCity}
                    {selectedOrder.shippingProvince ? `, ${selectedOrder.shippingProvince}` : ""}
                  </p>
                  {selectedOrder.shippingZip && (
                    <p className="text-sm text-muted-foreground">
                      Cod postal: {selectedOrder.shippingZip}
                    </p>
                  )}
                </div>
              </div>

              {/* Status & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={statusConfig[selectedOrder.status]?.variant || "default"}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Valoare</h4>
                  <p className="text-xl font-bold">
                    {formatCurrency(parseFloat(selectedOrder.totalPrice), selectedOrder.currency)}
                  </p>
                </div>
              </div>

              {/* Invoice & AWB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Factura</h4>
                  {getInvoiceDisplay(selectedOrder.invoice)}
                  {selectedOrder.invoice?.errorMessage && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOrder.invoice.errorMessage}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">AWB</h4>
                  {getAwbDisplay(selectedOrder.awb)}
                  {selectedOrder.awb?.currentStatus && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOrder.awb.currentStatus}
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items */}
              {selectedOrder.lineItems && selectedOrder.lineItems.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Produse</h4>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.lineItems.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.variantTitle && (
                            <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {item.quantity} x {formatCurrency(parseFloat(item.price))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Creata pe {formatDate(selectedOrder.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Wrap with QueryClientProvider and Suspense since this is outside the main app layout
export default function OrdersEmbedClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingFallback />}>
        <OrdersEmbedContent />
      </Suspense>
    </QueryClientProvider>
  );
}
