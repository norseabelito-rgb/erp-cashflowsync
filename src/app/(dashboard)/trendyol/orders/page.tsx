"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Package,
  MapPin,
  ExternalLink,
  InfoIcon,
  FileText,
  Truck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
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

export default function TrendyolOrdersPage() {
  const queryClient = useQueryClient();
  const syncOverlay = useSyncOverlay();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [mapped, setMapped] = useState<string>("all");
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  
  const limit = 20;

  // Fetch orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trendyol-orders", page, search, status, mapped],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (mapped !== "all") params.set("mapped", mapped);
      
      const res = await fetch(`/api/trendyol/orders?${params}`);
      return res.json();
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      syncOverlay.start("Sincronizare comenzi Trendyol", "Se descarcă comenzile din Trendyol...");
      const res = await fetch("/api/trendyol/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        syncOverlay.success(
          `${data.synced} comenzi sincronizate (${data.created} noi, ${data.updated} actualizate)` +
          (data.errors?.length ? `. ${data.errors.length} erori.` : "")
        );
        queryClient.invalidateQueries({ queryKey: ["trendyol-orders"] });
      } else {
        syncOverlay.error(data.error || "Eroare la sincronizare");
      }
    },
    onError: (error: any) => {
      syncOverlay.error(error.message || "Eroare la sincronizare");
    },
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const formatCurrency = (value: number, currency = "TRY") => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      Created: { label: "Nouă", variant: "default" },
      Picking: { label: "În pregătire", variant: "warning" },
      Invoiced: { label: "Facturată", variant: "secondary" },
      Shipped: { label: "Expediată", variant: "info" },
      Delivered: { label: "Livrată", variant: "success" },
      Cancelled: { label: "Anulată", variant: "destructive" },
      UnDelivered: { label: "Nelivrată", variant: "destructive" },
      Returned: { label: "Returnată", variant: "warning" },
    };
    const config = statusMap[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const hasUnmappedItems = (order: any) => {
    return order.lineItems?.some((li: any) => !li.isMapped);
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Comenzi Trendyol</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {pagination?.total || 0} comenzi total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="md:size-default" asChild>
              <Link href="/trendyol/mapping">
                <MapPin className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Mapare Produse</span>
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="md:size-default"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 md:mr-2" />
                  )}
                  <span className="hidden md:inline">Sincronizează</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Descarcă comenzile noi din ultimele 7 zile din Trendyol API.</p>
                <p className="text-xs text-muted-foreground">Durată: ~30 secunde</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Comenzile Trendyol apar si in <Link href="/orders?source=trendyol" className="font-medium text-primary hover:underline">lista principala de comenzi</Link>.
            Aceasta pagina ofera detalii specifice Trendyol precum status sincronizare factura/AWB.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după număr comandă sau client..."
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
                  <SelectItem value="Created">Noi</SelectItem>
                  <SelectItem value="Picking">În pregătire</SelectItem>
                  <SelectItem value="Invoiced">Facturate</SelectItem>
                  <SelectItem value="Shipped">Expediate</SelectItem>
                  <SelectItem value="Delivered">Livrate</SelectItem>
                  <SelectItem value="Cancelled">Anulate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mapped} onValueChange={(v) => { setMapped(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Mapare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="true">Complet mapate</SelectItem>
                  <SelectItem value="false">Cu produse nemapate</SelectItem>
                </SelectContent>
              </Select>
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
                <p className="text-muted-foreground">Nu sunt comenzi</p>
                <Button className="mt-4" onClick={() => syncMutation.mutate()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizează acum
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comandă</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sync Trendyol</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewOrder(order)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.trendyolOrderNumber}</span>
                          {hasUnmappedItems(order) && (
                            <AlertTriangle className="h-4 w-4 text-status-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.customerCity}</p>
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
                              <FileText className={`h-4 w-4 ${order.invoiceSentToTrendyol ? 'text-status-success' : order.invoiceSendError ? 'text-status-error' : 'text-muted-foreground'}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.invoiceSentToTrendyol ? 'Factura trimisa' : order.invoiceSendError ? `Eroare: ${order.invoiceSendError}` : 'Factura netrimisa'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              <Truck className={`h-4 w-4 ${order.trackingSentToTrendyol ? 'text-status-success' : order.trackingSendError ? 'text-status-error' : 'text-muted-foreground'}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.trackingSentToTrendyol ? `AWB trimis: ${order.localAwbNumber || 'Da'}` : order.trackingSendError ? `Eroare: ${order.trackingSendError}` : 'AWB netrimis'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(order.totalPrice), order.currency)}
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
              Pagina {pagination.page} din {pagination.totalPages}
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
              <DialogTitle>Comandă {viewOrder?.trendyolOrderNumber}</DialogTitle>
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
                    {formatCurrency(Number(viewOrder.totalPrice), viewOrder.currency)}
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
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Adresă</h4>
                    <p className="text-sm">{viewOrder.customerAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewOrder.customerDistrict}, {viewOrder.customerCity}
                    </p>
                  </div>
                </div>

                {/* Cargo Info */}
                {viewOrder.cargoTrackingNumber && (
                  <div>
                    <h4 className="font-semibold mb-2">Livrare</h4>
                    <div className="flex items-center gap-2">
                      <span>{viewOrder.cargoProviderName}</span>
                      <Badge variant="outline">{viewOrder.cargoTrackingNumber}</Badge>
                      {viewOrder.cargoTrackingLink && (
                        <a href={viewOrder.cargoTrackingLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Products */}
                <div>
                  <h4 className="font-semibold mb-2">Produse ({viewOrder.lineItems?.length || 0})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produs</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>SKU Local</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">Preț</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewOrder.lineItems?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium line-clamp-1">{item.title}</p>
                                {item.productColor && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.productColor} {item.productSize && `/ ${item.productSize}`}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs">{item.barcode}</code>
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
                              {formatCurrency(Number(item.price), viewOrder.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Trendyol Sync Status */}
                <div>
                  <h4 className="font-semibold mb-2">Sincronizare Trendyol</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Factura</span>
                      </div>
                      {viewOrder.invoiceSentToTrendyol ? (
                        <div className="flex items-center gap-1 text-status-success">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">
                            Trimisa {viewOrder.invoiceSentAt && new Date(viewOrder.invoiceSentAt).toLocaleString("ro-RO")}
                          </span>
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
                      {viewOrder.trackingSentToTrendyol ? (
                        <div className="flex items-center gap-1 text-status-success">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-xs">
                            {viewOrder.localAwbNumber || "Trimis"} {viewOrder.trackingSentAt && `- ${new Date(viewOrder.trackingSentAt).toLocaleString("ro-RO")}`}
                          </span>
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
                  {viewOrder.shipmentPackageId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Shipment Package ID: <code>{viewOrder.shipmentPackageId}</code>
                    </p>
                  )}
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
                      <Link href="/trendyol/mapping" className="underline ml-1">
                        Mapează acum
                      </Link>
                    </p>
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
