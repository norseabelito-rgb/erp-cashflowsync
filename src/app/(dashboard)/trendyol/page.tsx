"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShoppingBag, RefreshCw, Search, ChevronLeft, ChevronRight, 
  Package, AlertCircle, CheckCircle2, Clock, XCircle,
  ExternalLink, Settings, FolderTree, Upload
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import Image from "next/image";

interface TrendyolProduct {
  id: string;
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  brandName?: string;
  categoryId: number;
  categoryName?: string;
  quantity: number;
  stockCode: string;
  salePrice: number;
  listPrice: number;
  approved: boolean;
  archived: boolean;
  onSale: boolean;
  rejected?: boolean;
  rejectReasonDetails?: string;
  images?: Array<{ url: string }>;
}

export default function TrendyolProductsPage() {
  const [page, setPage] = useState(0);
  const [searchBarcode, setSearchBarcode] = useState("");
  const [filterApproved, setFilterApproved] = useState<string>("all");
  const pageSize = 20;

  // Verifică dacă Trendyol e configurat
  const { data: configData } = useQuery({
    queryKey: ["trendyol-config"],
    queryFn: async () => {
      const res = await fetch("/api/trendyol");
      return res.json();
    },
  });

  // Fetch produse
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["trendyol-products", page, searchBarcode, filterApproved],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("action", "products");
      params.set("page", page.toString());
      params.set("size", pageSize.toString());
      if (searchBarcode) params.set("barcode", searchBarcode);
      if (filterApproved === "approved") params.set("approved", "true");
      if (filterApproved === "pending") params.set("approved", "false");
      
      const res = await fetch(`/api/trendyol?${params.toString()}`);
      return res.json();
    },
    enabled: configData?.configured,
  });

  const products: TrendyolProduct[] = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (product: TrendyolProduct) => {
    if (product.rejected) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Respins</Badge>;
    }
    if (product.approved && product.onSale) {
      return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Activ</Badge>;
    }
    if (product.approved && !product.onSale) {
      return <Badge variant="secondary" className="gap-1"><Package className="h-3 w-3" /> Inactiv</Badge>;
    }
    if (product.archived) {
      return <Badge variant="outline" className="gap-1">Arhivat</Badge>;
    }
    return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> În așteptare</Badge>;
  };

  if (!configData?.configured) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Trendyol nu este configurat</h3>
            <p className="text-muted-foreground mb-4">
              Configurează credențialele Trendyol pentru a vedea produsele.
            </p>
            <Link href="/settings">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Mergi la Setări
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 md:h-8 md:w-8" />
            Produse Trendyol
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Vizualizează și gestionează produsele din contul Trendyol
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/trendyol/mapping">
            <Button variant="outline" size="sm" className="md:size-default">
              <FolderTree className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Mapare Categorii</span>
            </Button>
          </Link>
          <Link href="/trendyol/publish">
            <Button size="sm" className="md:size-default">
              <Upload className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Publică Produse</span>
            </Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="md:size-default" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 md:mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Reîncarcă</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Reîncarcă lista de produse din Trendyol.</p>
            </TooltipContent>
          </Tooltip>
          <Link href="https://partner.trendyol.com" target="_blank">
            <Button variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Produse</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilterApproved("approved")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-status-success">-</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-status-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilterApproved("pending")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">În așteptare</p>
                <p className="text-2xl font-bold text-status-warning">-</p>
              </div>
              <Clock className="h-8 w-8 text-status-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilterApproved("all")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Afișează</p>
                <p className="text-lg font-medium">
                  {filterApproved === "all" ? "Toate" : filterApproved === "approved" ? "Active" : "În așteptare"}
                </p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-sm">
              <label className="text-sm font-medium mb-1 block">Caută după barcode</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Introdu barcode..." 
                  className="pl-9"
                  value={searchBarcode}
                  onChange={(e) => {
                    setSearchBarcode(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterApproved}
                onChange={(e) => {
                  setFilterApproved(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Toate</option>
                <option value="approved">Aprobate</option>
                <option value="pending">În așteptare</option>
              </select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchBarcode("");
                setFilterApproved("all");
                setPage(0);
              }}
            >
              Resetează
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nu au fost găsite produse</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagine</TableHead>
                  <TableHead>Produs</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stoc</TableHead>
                  <TableHead className="text-right">Preț</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id || product.barcode}>
                    <TableCell>
                      {product.images?.[0]?.url ? (
                        <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                          <Image
                            src={product.images[0].url}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate" title={product.title}>
                          {product.title}
                        </p>
                        {product.brandName && (
                          <p className="text-xs text-muted-foreground">{product.brandName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                    <TableCell className="text-muted-foreground">{product.stockCode || product.productMainId}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.quantity === 0 ? "text-status-error font-medium" : ""}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">{product.salePrice?.toFixed(2)} €</p>
                        {product.listPrice !== product.salePrice && (
                          <p className="text-xs text-muted-foreground line-through">
                            {product.listPrice?.toFixed(2)} €
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(product)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Pagina {page + 1} din {totalPages} ({total} produse)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Următor
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
    </TooltipProvider>
  );
}
