"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  History,
  Filter,
  Package,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";

type MovementType = "RECEIPT" | "SALE" | "ADJUSTMENT_PLUS" | "ADJUSTMENT_MINUS" | "PRODUCTION" | "";

export default function StockMovementsPage() {
  const router = useRouter();

  // Filters
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<MovementType>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Fetch movements
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-movements", { itemId, type, startDate, endDate, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (itemId) params.set("itemId", itemId);
      if (type) params.set("type", type);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/inventory-items/stock-adjustment?${params}`);
      return res.json();
    },
  });

  // Fetch inventory items for filter
  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-simple"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?limit=500");
      return res.json();
    },
  });

  const movements = data?.data?.movements || [];
  const pagination = data?.data?.pagination || { page: 1, total: 0, totalPages: 1 };
  const items = itemsData?.data?.items || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeInfo = (movementType: string) => {
    switch (movementType) {
      case "RECEIPT":
        return {
          label: "Recepție",
          icon: ArrowDownCircle,
          color: "text-green-600",
          bgColor: "bg-green-100",
          variant: "success" as const,
        };
      case "SALE":
        return {
          label: "Vânzare",
          icon: ArrowUpCircle,
          color: "text-red-600",
          bgColor: "bg-red-100",
          variant: "destructive" as const,
        };
      case "ADJUSTMENT_PLUS":
        return {
          label: "Ajustare +",
          icon: TrendingUp,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          variant: "default" as const,
        };
      case "ADJUSTMENT_MINUS":
        return {
          label: "Ajustare -",
          icon: TrendingDown,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          variant: "warning" as const,
        };
      case "PRODUCTION":
        return {
          label: "Producție",
          icon: Package,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          variant: "secondary" as const,
        };
      default:
        return {
          label: movementType,
          icon: FileText,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          variant: "outline" as const,
        };
    }
  };

  const handleClearFilters = () => {
    setItemId("");
    setType("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Calculate stats from current page movements
  const stats = movements.reduce(
    (acc: { inCount: number; outCount: number; inQty: number; outQty: number }, m: any) => {
      const qty = Number(m.quantity);
      if (qty > 0) {
        acc.inCount++;
        acc.inQty += qty;
      } else {
        acc.outCount++;
        acc.outQty += Math.abs(qty);
      }
      return acc;
    },
    { inCount: 0, outCount: 0, inQty: 0, outQty: 0 }
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Mișcări stoc
            </h1>
            <p className="text-muted-foreground">Istoric complet al mișcărilor de stoc</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <History className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Intrări</p>
                <p className="text-xl font-bold text-green-600">{stats.inCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ieșiri</p>
                <p className="text-xl font-bold text-red-600">{stats.outCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantitate +</p>
                <p className="text-xl font-bold text-blue-600">+{stats.inQty.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3" />
                Articol
              </Label>
              <Select value={itemId} onValueChange={(v) => { setItemId(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Toate articolele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toate articolele</SelectItem>
                  {items.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-mono text-xs">{item.sku}</span> - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Label className="flex items-center gap-1 mb-1">
                <FileText className="h-3 w-3" />
                Tip mișcare
              </Label>
              <Select value={type} onValueChange={(v) => { setType(v as MovementType); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Toate tipurile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toate tipurile</SelectItem>
                  <SelectItem value="RECEIPT">Recepție</SelectItem>
                  <SelectItem value="SALE">Vânzare</SelectItem>
                  <SelectItem value="ADJUSTMENT_PLUS">Ajustare +</SelectItem>
                  <SelectItem value="ADJUSTMENT_MINUS">Ajustare -</SelectItem>
                  <SelectItem value="PRODUCTION">Producție</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Label className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                De la
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>

            <div className="w-[150px]">
              <Label className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                Până la
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                Resetează
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">Nu există mișcări de stoc</p>
              <p className="text-sm text-muted-foreground">
                Mișcările vor apărea aici după recepții, vânzări sau ajustări
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[160px]">Data</TableHead>
                      <TableHead>Articol</TableHead>
                      <TableHead className="w-[120px]">Tip</TableHead>
                      <TableHead className="text-right w-[100px]">Cantitate</TableHead>
                      <TableHead className="text-right w-[100px]">Stoc vechi</TableHead>
                      <TableHead className="text-right w-[100px]">Stoc nou</TableHead>
                      <TableHead>Motiv</TableHead>
                      <TableHead className="w-[120px]">Utilizator</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement: any) => {
                      const typeInfo = getTypeInfo(movement.type);
                      const TypeIcon = typeInfo.icon;
                      const qty = Number(movement.quantity);

                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">
                            {formatDate(movement.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{movement.item?.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {movement.item?.sku}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeInfo.variant} className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-medium ${qty > 0 ? "text-green-600" : "text-red-600"}`}>
                            {qty > 0 ? "+" : ""}{qty.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {Number(movement.previousStock).toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {Number(movement.newStock).toFixed(3)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {movement.reason || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {movement.userName || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} înregistrări)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                    >
                      Următor
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
