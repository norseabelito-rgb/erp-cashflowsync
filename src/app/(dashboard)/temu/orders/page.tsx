"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  ExternalLink,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, cn } from "@/lib/utils";
import { SyncOverlay, useSyncOverlay } from "@/components/ui/sync-overlay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface TemuOrder {
  id: string;
  temuOrderId: string;
  temuOrderNumber: string;
  orderDate: string;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string;
  totalPrice: number;
  currency: string;
  storeName: string;
  invoiceSent: boolean;
  invoiceSendError: string | null;
  trackingSent: boolean;
  trackingSendError: string | null;
  localOrderId: string | null;
  hasInvoice: boolean;
  hasAwb: boolean;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    isMapped: boolean;
    localSku: string | null;
  }>;
}

interface TemuStore {
  id: string;
  name: string;
  region: string;
}

export const metadata = {
  title: "Comenzi Temu | CashFlowSync",
};

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: any }> = {
    PENDING_SHIPMENT: { label: "De expediat", variant: "default" },
    SHIPPED: { label: "Expediat", variant: "info" },
    DELIVERED: { label: "Livrat", variant: "success" },
    CANCELLED: { label: "Anulat", variant: "destructive" },
    RETURNED: { label: "Returnat", variant: "warning" },
    Created: { label: "Noua", variant: "default" },
    Picking: { label: "In pregatire", variant: "warning" },
    Invoiced: { label: "Facturata", variant: "secondary" },
    UnDelivered: { label: "Nelivrata", variant: "destructive" },
  };
  const config = statusMap[status] || { label: status, variant: "default" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function TemuOrdersPage() {
  const queryClient = useQueryClient();
  const syncOverlay = useSyncOverlay();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [storeId, setStoreId] = useState<string>("all");
  const [viewOrder, setViewOrder] = useState<TemuOrder | null>(null);

  const limit = 20;

  // Fetch orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["temu-orders-list", page, search, status, storeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (storeId !== "all") params.set("storeId", storeId);

      const res = await fetch(`/api/temu/orders?${params}`);
      return res.json();
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      syncOverlay.start("Sincronizare comenzi Temu", "Se descarca comenzile din Temu...");
      const res = await fetch("/api/temu/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          storeId: storeId !== "all" ? storeId : undefined,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        syncOverlay.success(
          `${data.synced || 0} comenzi sincronizate (${data.created || 0} noi, ${data.updated || 0} actualizate)` +
          (data.errors?.length ? `. ${data.errors.length} erori.` : "")
        );
        queryClient.invalidateQueries({ queryKey: ["temu-orders-list"] });
      } else {
        syncOverlay.error(data.error || "Eroare la sincronizare");
      }
    },
    onError: (error: any) => {
      syncOverlay.error(error.message || "Eroare la sincronizare");
    },
  });

  const orders: TemuOrder[] = data?.orders || [];
  const pagination = data?.pagination;
  const temuStores: TemuStore[] = data?.temuStores || [];

  const hasUnmappedItems = (order: TemuOrder) => {
    return order.lineItems?.some((li) => !li.isMapped);
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <PageHeader
          title="Comenzi Temu"
          description="Gestioneaza comenzile din magazinele Temu"
          backHref="/temu"
          backLabel="Temu"
          actions={
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
                  <p>Descarca comenzile noi din ultimele 7 zile din Temu API.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        {/* Info Alert */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Comenzile Temu apar si in <Link href="/orders?source=temu" className="font-medium text-primary hover:underline">lista principala de comenzi</Link>.
            Aceasta pagina ofera detalii specifice Temu precum status sincronizare factura/AWB.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cauta dupa numar comanda sau client..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate statusurile</SelectItem>
                  <SelectItem value="PENDING_SHIPMENT">De expediat</SelectItem>
                  <SelectItem value="SHIPPED">Expediate</SelectItem>
                  <SelectItem value="DELIVERED">Livrate</SelectItem>
                  <SelectItem value="CANCELLED">Anulate</SelectItem>
                  <SelectItem value="RETURNED">Returnate</SelectItem>
                </SelectContent>
              </Select>
              {temuStores.length > 1 && (
                <Select value={storeId} onValueChange={(v) => { setStoreId(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Magazin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate magazinele</SelectItem>
                    {temuStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                    <TableHead>Produse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sync Temu</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewOrder(order)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.temuOrderNumber}</span>
                          {hasUnmappedItems(order) && (
                            <AlertTriangle className="h-4 w-4 text-status-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.storeName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString("ro-RO")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{order.lineItems?.length || 0} produs(e)</span>
                          {hasUnmappedItems(order) && (
                            <Badge variant="warning" className="text-xs">Nemapat</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger>
                              <FileText className={`h-4 w-4 ${order.invoiceSent ? 'text-status-success' : order.invoiceSendError ? 'text-status-error' : 'text-muted-foreground'}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.invoiceSent ? 'Factura trimisa' : order.invoiceSendError ? `Eroare: ${order.invoiceSendError}` : 'Factura netrimisa'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              <Truck className={`h-4 w-4 ${order.trackingSent ? 'text-status-success' : order.trackingSendError ? 'text-status-error' : 'text-muted-foreground'}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.trackingSent ? 'AWB trimis' : order.trackingSendError ? `Eroare: ${order.trackingSendError}` : 'AWB netrimis'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {pagination.page} din {pagination.totalPages} ({pagination.total || pagination.totalCount} comenzi)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Comanda {viewOrder?.temuOrderNumber}</DialogTitle>
              <DialogDescription>
                {viewOrder && new Date(viewOrder.orderDate).toLocaleDateString("ro-RO")}
              </DialogDescription>
            </DialogHeader>
            {viewOrder && (
              <div className="space-y-6">
                {/* Status & Total */}
                <div className="flex justify-between items-center">
                  {getStatusBadge(viewOrder.status)}
                  <span className="text-2xl font-bold">
                    {formatCurrency(viewOrder.totalPrice, viewOrder.currency)}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Client</h4>
                    <p>{viewOrder.customerName}</p>
                    {viewOrder.customerEmail && (
                      <p className="text-sm text-muted-foreground">{viewOrder.customerEmail}</p>
                    )}
                    {viewOrder.customerPhone && (
                      <p className="text-sm text-muted-foreground">{viewOrder.customerPhone}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Adresa</h4>
                    <p className="text-sm">{viewOrder.customerAddress}</p>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <h4 className="font-semibold mb-2">Produse ({viewOrder.lineItems?.length || 0})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produs</TableHead>
                          <TableHead>SKU Local</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">Pret</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewOrder.lineItems?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium line-clamp-1">{item.title}</p>
                            </TableCell>
                            <TableCell>
                              {item.isMapped ? (
                                <Badge variant="success">{item.localSku}</Badge>
                              ) : (
                                <Badge variant="warning">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Nemapat
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.price, viewOrder.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Temu Sync Status */}
                <div>
                  <h4 className="font-semibold mb-2">Sincronizare Temu</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Factura</span>
                      </div>
                      {viewOrder.invoiceSent ? (
                        <div className="flex items-center gap-1 text-status-success">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">Trimisa</span>
                        </div>
                      ) : viewOrder.invoiceSendError ? (
                        <div className="text-xs text-status-error">
                          Eroare: {viewOrder.invoiceSendError}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Netrimisa</span>
                      )}
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">AWB / Tracking</span>
                      </div>
                      {viewOrder.trackingSent ? (
                        <div className="flex items-center gap-1 text-status-success">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">Trimis</span>
                        </div>
                      ) : viewOrder.trackingSendError ? (
                        <div className="text-xs text-status-error">
                          Eroare: {viewOrder.trackingSendError}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Netrimis</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unmapped warning */}
                {hasUnmappedItems(viewOrder) && (
                  <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                    <div className="flex items-center gap-2 text-status-warning">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Produse nemapate</span>
                    </div>
                    <p className="text-sm text-status-warning mt-1">
                      Unele produse nu au fost mapate la SKU-uri locale.
                    </p>
                  </div>
                )}

                {/* Link to main orders */}
                {viewOrder.localOrderId && (
                  <div className="flex justify-end">
                    <Link href={`/orders?search=${viewOrder.temuOrderNumber}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Vezi in Comenzi
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

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
