"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Truck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Package,
  MapPin,
  Calendar,
  Store,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface AWBItem {
  id: string;
  awbNumber: string | null;
  orderId: string;
  serviceType: string;
  paymentType: string;
  currentStatus: string | null;
  currentStatusDate: string | null;
  cashOnDelivery: number | null;
  errorMessage: string | null;
  createdAt: string;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    customerPhone: string | null;
    shippingCity: string | null;
    shippingProvince: string | null;
    shippingAddress1: string | null;
    totalPrice: number;
    currency: string;
    status: string;
    store: {
      name: string;
    } | null;
    lineItems: Array<{
      id: string;
      sku: string | null;
      title: string;
      quantity: number;
    }>;
  };
}

interface AWBStats {
  total: number;
  inTransit: number;
  delivered: number;
  returned: number;
  cancelled: number;
  pending: number;
  errors: number;
}

// Funcție pentru a determina badge-ul de status
function getStatusBadge(status: string | null) {
  if (!status) return { variant: "outline" as const, icon: Clock, label: "Necunoscut" };

  const statusLower = status.toLowerCase();

  if (statusLower.includes("livrat") || statusLower.includes("delivered")) {
    return { variant: "default" as const, icon: CheckCircle2, label: status, color: "bg-emerald-100 text-emerald-800" };
  }
  if (statusLower.includes("tranzit") || statusLower.includes("transport") || statusLower.includes("livrare")) {
    return { variant: "default" as const, icon: Truck, label: status, color: "bg-blue-100 text-blue-800" };
  }
  if (statusLower.includes("retur") || statusLower.includes("refuz") || statusLower.includes("returned")) {
    return { variant: "destructive" as const, icon: AlertTriangle, label: status, color: "bg-orange-100 text-orange-800" };
  }
  if (statusLower.includes("anulat") || statusLower.includes("șters")) {
    return { variant: "destructive" as const, icon: XCircle, label: status, color: "bg-red-100 text-red-800" };
  }
  if (statusLower.includes("ridicat") || statusLower.includes("predat")) {
    return { variant: "default" as const, icon: Package, label: status, color: "bg-indigo-100 text-indigo-800" };
  }

  return { variant: "outline" as const, icon: Clock, label: status, color: "bg-gray-100 text-gray-800" };
}

export default function AWBPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showDelivered, setShowDelivered] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const limit = 50;

  // Fetch stores pentru filter
  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });
  const stores = storesData?.stores || [];

  // Fetch AWBs
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["awbs", search, statusFilter, storeFilter, showDelivered, page, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      params.set("showAll", showDelivered.toString());

      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/awb?${params}`);
      return res.json();
    },
  });

  const awbs: AWBItem[] = data?.awbs || [];
  const stats: AWBStats = data?.stats || {
    total: 0,
    inTransit: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
    pending: 0,
    errors: 0,
  };
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  // Filtrare locală pentru store (API nu suportă direct)
  const filteredAwbs = storeFilter === "all"
    ? awbs
    : awbs.filter(a => a.order?.store?.name === storeFilter);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: ro });
  };

  // Format currency
  const formatCurrency = (amount: number | null, currency: string = "RON") => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 md:h-6 md:w-6" />
            Tracking AWB
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Urmărește și gestionează livrările
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="cursor-pointer hover:border-primary" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500" onClick={() => setStatusFilter("tranzit")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.inTransit}</div>
            <div className="text-xs text-muted-foreground">În tranzit</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-emerald-500" onClick={() => { setStatusFilter("livrat"); setShowDelivered(true); }}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
            <div className="text-xs text-muted-foreground">Livrate</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-orange-500" onClick={() => setStatusFilter("retur")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">{stats.returned}</div>
            <div className="text-xs text-muted-foreground">Retururi</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-gray-500" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">În așteptare</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500" onClick={() => setStatusFilter("anulat")}>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-xs text-muted-foreground">Anulate</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
            <div className="text-xs text-muted-foreground">Erori</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Căutare</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="AWB, comandă, client, SKU..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="tranzit">În tranzit</SelectItem>
                  <SelectItem value="livrat">Livrate</SelectItem>
                  <SelectItem value="retur">Retururi</SelectItem>
                  <SelectItem value="pending">În așteptare</SelectItem>
                  <SelectItem value="anulat">Anulate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Store Filter */}
            <div className="w-40">
              <label className="text-sm text-muted-foreground mb-1 block">Magazin</label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <Store className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Magazin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {stores.map((store: any) => (
                    <SelectItem key={store.id} value={store.name}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Delivered Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDelivered"
                checked={showDelivered}
                onChange={(e) => { setShowDelivered(e.target.checked); setPage(1); }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="showDelivered" className="text-sm">
                Afișează livrate
              </label>
            </div>

            {/* Clear Filters */}
            {(search || statusFilter !== "all" || storeFilter !== "all" || showDelivered) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setStoreFilter("all");
                  setShowDelivered(false);
                  setPage(1);
                }}
              >
                Resetează filtrele
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAwbs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-2" />
              <p>Nu au fost găsite AWB-uri</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">AWB</TableHead>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status FanCourier</TableHead>
                    <TableHead className="text-right">Ramburs</TableHead>
                    <TableHead>Magazin</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAwbs.map((awb) => {
                    const statusInfo = getStatusBadge(awb.currentStatus);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow
                        key={awb.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/awb/${awb.id}`}
                      >
                        <TableCell>
                          <div className="font-mono font-bold">{awb.awbNumber || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            #{awb.order?.shopifyOrderNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(awb.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {awb.order?.customerFirstName} {awb.order?.customerLastName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {awb.order?.shippingCity}, {awb.order?.shippingProvince}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("flex items-center gap-1 w-fit", statusInfo.color)}>
                            <StatusIcon className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{statusInfo.label}</span>
                          </Badge>
                          {awb.currentStatusDate && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(awb.currentStatusDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {awb.cashOnDelivery ? (
                            <span className="font-medium">
                              {formatCurrency(Number(awb.cashOnDelivery))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {awb.order?.store?.name || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/awb/${awb.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Afișez {((pagination.page - 1) * pagination.limit) + 1} -{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} din{" "}
                  {pagination.total} AWB-uri
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Următor
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
