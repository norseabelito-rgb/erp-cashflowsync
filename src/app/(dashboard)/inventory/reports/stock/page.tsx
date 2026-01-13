"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  FileBarChart,
  Calendar,
  Package,
  Building2,
  AlertTriangle,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PackageX,
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

export default function StockReportPage() {
  const router = useRouter();

  // Filters
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [supplierId, setSupplierId] = useState("all");
  const [isComposite, setIsComposite] = useState("all");
  const [search, setSearch] = useState("");
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  // Fetch report
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-report", { reportDate, supplierId, isComposite, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("date", reportDate);
      if (supplierId && supplierId !== "all") params.set("supplierId", supplierId);
      if (isComposite && isComposite !== "all") params.set("isComposite", isComposite);
      if (search) params.set("search", search);

      const res = await fetch(`/api/inventory-items/stock-report?${params}`);
      return res.json();
    },
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true");
      return res.json();
    },
  });

  const reportData = data?.data;
  const items = reportData?.items || [];
  const totals = reportData?.totals || {};
  const suppliers = suppliersData?.data || [];

  // Filter by low stock if enabled
  const displayItems = showOnlyLow
    ? items.filter((item: any) => item.isBelowMin || item.stockAtDate === 0)
    : items;

  const handleExportCSV = () => {
    const headers = [
      "SKU",
      "Nume",
      "Furnizor",
      "Unitate",
      "Stoc la data",
      "Stoc curent",
      "Diferență",
      "Cost unitar",
      "Valoare la data",
      "Valoare curentă",
    ];

    const rows = displayItems.map((item: any) => [
      item.sku,
      item.name,
      item.supplier?.name || "",
      item.unit,
      item.stockAtDate.toFixed(3),
      item.currentStock.toFixed(3),
      item.stockDifference.toFixed(3),
      item.costPrice.toFixed(2),
      item.valueAtDate.toFixed(2),
      item.currentValue.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stoc-${reportDate}.csv`;
    link.click();
  };

  const isToday = reportDate === new Date().toISOString().split("T")[0];

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
              <FileBarChart className="h-8 w-8" />
              Raport stoc
            </h1>
            <p className="text-muted-foreground">
              Vizualizare stoc la o anumită dată
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={displayItems.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Articole</p>
                <p className="text-xl font-bold">{totals.totalItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-status-info/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-status-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valoare la data</p>
                <p className="text-xl font-bold text-status-info">
                  {formatCurrency(totals.totalValueAtDate || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-status-success/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-status-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valoare curentă</p>
                <p className="text-xl font-bold text-status-success">
                  {formatCurrency(totals.totalCurrentValue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sub minim</p>
                <p className="text-xl font-bold text-orange-600">
                  {totals.itemsBelowMin || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-status-error/10 rounded-lg">
                <PackageX className="h-4 w-4 text-status-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fără stoc</p>
                <p className="text-xl font-bold text-status-error">
                  {totals.itemsOutOfStock || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filtre raport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[180px]">
              <Label className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                Data raport
              </Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="flex items-center gap-1 mb-1">
                <Search className="h-3 w-3" />
                Căutare
              </Label>
              <Input
                placeholder="SKU sau nume..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-[200px]">
              <Label className="flex items-center gap-1 mb-1">
                <Building2 className="h-3 w-3" />
                Furnizor
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Toți furnizorii" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți furnizorii</SelectItem>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Label className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3" />
                Tip articol
              </Label>
              <Select value={isComposite} onValueChange={setIsComposite}>
                <SelectTrigger>
                  <SelectValue placeholder="Toate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="false">Individuale</SelectItem>
                  <SelectItem value="true">Compuse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant={showOnlyLow ? "default" : "outline"}
                onClick={() => setShowOnlyLow(!showOnlyLow)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Doar cu alertă
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data comparison info */}
      {!isToday && (
        <Card className="mb-6 border-status-info/50 bg-status-info/10">
          <CardContent className="py-3">
            <p className="text-sm text-blue-700">
              <Calendar className="h-4 w-4 inline mr-1" />
              Vizualizezi stocul la data de{" "}
              <strong>
                {new Date(reportDate).toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              . Coloana "Diferență" arată modificarea stocului până la data curentă.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-12">
              <FileBarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">
                {showOnlyLow
                  ? "Nu există articole sub stocul minim"
                  : "Nu există articole în inventar"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Articol</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead className="text-right">Stoc la data</TableHead>
                    <TableHead className="text-right">Stoc curent</TableHead>
                    <TableHead className="text-right">Diferență</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className={item.isBelowMin || item.stockAtDate === 0 ? "bg-orange-50/50" : ""}
                    >
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.isComposite && (
                            <Badge variant="secondary" className="text-xs">
                              Compus
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.supplier?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="font-medium">{item.stockAtDate.toFixed(3)}</span>
                        <span className="text-muted-foreground ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.currentStock.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.stockDifference !== 0 && (
                          <span
                            className={`flex items-center justify-end gap-1 ${
                              item.stockDifference > 0 ? "text-status-success" : "text-status-error"
                            }`}
                          >
                            {item.stockDifference > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {item.stockDifference > 0 ? "+" : ""}
                            {item.stockDifference.toFixed(3)}
                          </span>
                        )}
                        {item.stockDifference === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(item.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(item.valueAtDate)}
                      </TableCell>
                      <TableCell>
                        {item.stockAtDate === 0 ? (
                          <Badge variant="destructive">Lipsă</Badge>
                        ) : item.isBelowMin ? (
                          <Badge variant="warning">Minim</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals Footer */}
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {displayItems.length} articole afișate
                  </p>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-2">
                      Valoare totală la{" "}
                      {new Date(reportDate).toLocaleDateString("ro-RO")}:
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(
                        displayItems.reduce(
                          (sum: number, item: any) => sum + item.valueAtDate,
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
