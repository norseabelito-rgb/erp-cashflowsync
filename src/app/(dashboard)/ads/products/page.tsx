"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  RefreshCw,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ArrowUpDown,
  ChevronRight,
  AlertCircle,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequirePermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

// Platform icons
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

function formatCurrency(value: number, currency: string = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
}

export default function ProductsPerformancePage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  // Fetch product stats
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads-products", search, platformFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      
      const res = await fetch(`/api/ads/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const products = data?.products || [];
  const totals = data?.totals || {};

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getRoasColor = (roas: number | null) => {
    if (roas === null) return "text-gray-500";
    if (roas >= 3) return "text-green-600";
    if (roas >= 2) return "text-yellow-600";
    return "text-red-600";
  };

  const getRoasBg = (roas: number | null) => {
    if (roas === null) return "bg-gray-100";
    if (roas >= 3) return "bg-green-100";
    if (roas >= 2) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Performanță per SKU
            </h1>
            <p className="text-muted-foreground">
              Analizează performanța campaniilor grupate pe produs
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Info about naming convention */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mapping automat</AlertTitle>
          <AlertDescription>
            Produsele sunt mapate automat din numele campaniilor care respectă convenția: 
            <code className="mx-1 px-1 bg-muted rounded">CONV_SKU_[COD]_BROAD_2024Q4</code>. 
            Pentru campanii fără convenție, mapping-ul manual este disponibil în detaliile campaniei.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">SKU-uri Promovate</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalSpend || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Conversii</p>
                <p className="text-2xl font-bold">{totals.totalConversions || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">ROAS Mediu</p>
                <p className={cn("text-2xl font-bold", getRoasColor(totals.avgRoas))}>
                  {totals.avgRoas ? `${totals.avgRoas.toFixed(2)}x` : "-"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Caută SKU sau produs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platformă" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="META">Meta</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sortare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend">După Spend</SelectItem>
                  <SelectItem value="roas">După ROAS</SelectItem>
                  <SelectItem value="conversions">După Conversii</SelectItem>
                  <SelectItem value="cpa">După CPA</SelectItem>
                  <SelectItem value="revenue">După Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Niciun produs cu campanii active</p>
                <p className="text-muted-foreground text-center max-w-md">
                  {search || platformFilter !== "all"
                    ? "Încearcă alte filtre"
                    : "Campaniile trebuie să respecte convenția de denumire sau să fie mapate manual pentru a apărea aici."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Produs</TableHead>
                    <TableHead>Platforme</TableHead>
                    <TableHead className="text-right">Campanii</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => toggleSort("spend")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Spend
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => toggleSort("conversions")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Conv.
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => toggleSort("cpa")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        CPA
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => toggleSort("revenue")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Revenue
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted"
                      onClick={() => toggleSort("roas")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        ROAS
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: any) => (
                    <>
                      <TableRow 
                        key={product.sku}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          expandedSku === product.sku && "bg-muted/30"
                        )}
                        onClick={() => setExpandedSku(expandedSku === product.sku ? null : product.sku)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.sku}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.sku}</p>
                              {product.productTitle && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {product.productTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {product.platforms.map((p: string) => (
                              <TooltipProvider key={p}>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={cn(
                                      "p-1 rounded",
                                      p === "META" ? "bg-blue-100" : "bg-gray-100"
                                    )}>
                                      {p === "META" ? <MetaIcon /> : <TikTokIcon />}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>{p}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.campaignCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.totalSpend)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(product.totalImpressions)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.totalConversions}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.cpa ? formatCurrency(product.cpa) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getRoasBg(product.roas)}>
                            <span className={getRoasColor(product.roas)}>
                              {product.roas ? `${product.roas.toFixed(2)}x` : "-"}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            expandedSku === product.sku && "rotate-90"
                          )} />
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded campaigns */}
                      {expandedSku === product.sku && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/20 p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium mb-3">Campanii pentru {product.sku}:</p>
                              {product.campaigns.map((c: any) => (
                                <div 
                                  key={c.id}
                                  className="flex items-center justify-between p-2 bg-background rounded border"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "p-1 rounded",
                                      c.platform === "META" ? "bg-blue-100" : "bg-gray-100"
                                    )}>
                                      {c.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                                    </div>
                                    <span className="text-sm">{c.name}</span>
                                    <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                                      {c.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span>Spend: {formatCurrency(c.spend)}</span>
                                    <span>Conv: {c.conversions}</span>
                                    <span className={getRoasColor(c.roas)}>
                                      ROAS: {c.roas ? `${c.roas.toFixed(2)}x` : "-"}
                                    </span>
                                    <Link href={`/ads/campaigns/${c.id}`}>
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}
