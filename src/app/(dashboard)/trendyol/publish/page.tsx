"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, RefreshCw, Search, Package, AlertCircle, Check, X,
  ChevronLeft, ChevronRight, Settings, ExternalLink, Loader2,
  CheckCircle2, XCircle, Clock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Types for batch status
interface BatchItem {
  barcode: string;
  status: "SUCCESS" | "FAILED" | "PROCESSING";
  failureReasons?: string[];
}

interface BatchStatusResponse {
  success: boolean;
  batchRequestId?: string;
  status?: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  totalItems?: number;
  successCount?: number;
  failedCount?: number;
  items?: BatchItem[];
  errors?: Array<{ barcode: string; message: string }>;
  error?: string;
}

interface MasterProduct {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
  category?: {
    id: string;
    name: string;
    trendyolCategoryId?: number;
    trendyolCategoryName?: string;
  };
  images: Array<{ url: string; position: number }>;
  trendyolBarcode?: string;
  trendyolBrandId?: number;
  trendyolBrandName?: string;
  trendyolStatus?: string;
  trendyolError?: string;
}

interface Brand {
  id: number;
  name: string;
}

export default function TrendyolPublishPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [publishing, setPublishing] = useState(false);
  const pageSize = 20;

  // Batch status tracking
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // Fetch produse ERP care au categorie mapată
  const { data: productsData, isLoading: productsLoading, refetch } = useQuery({
    queryKey: ["erp-products-for-trendyol", page, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", (page + 1).toString());
      params.set("limit", pageSize.toString());
      params.set("hasTrendyolCategory", "true");
      if (searchTerm) params.set("search", searchTerm);
      
      const res = await fetch(`/api/products?${params.toString()}`);
      return res.json();
    },
  });

  // Fetch branduri Trendyol
  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ["trendyol-brands", brandSearchTerm],
    queryFn: async () => {
      if (!brandSearchTerm || brandSearchTerm.length < 2) return { brands: [] };
      const res = await fetch(`/api/trendyol?action=brands&search=${encodeURIComponent(brandSearchTerm)}`);
      return res.json();
    },
    enabled: brandSearchTerm.length >= 2,
  });

  // Fetch setări pentru brand default
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  // Fetch batch status when dialog is open and we have an active batch
  const { data: batchStatusData, isLoading: batchStatusLoading } = useQuery<BatchStatusResponse>({
    queryKey: ["trendyol-batch-status", activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return { success: false };
      const res = await fetch(`/api/trendyol/batch-status?batchRequestId=${activeBatchId}&updateProducts=true`);
      return res.json();
    },
    enabled: !!activeBatchId && batchDialogOpen,
    refetchInterval: (data) => {
      // Stop polling when batch is complete or failed
      if (data?.state?.data?.status === "COMPLETED" || data?.state?.data?.status === "FAILED") {
        return false;
      }
      // Poll every 3 seconds while in progress
      return 3000;
    },
  });

  // Effect to show toast and refresh products when batch completes
  useEffect(() => {
    if (batchStatusData?.status === "COMPLETED") {
      toast({
        title: "Procesare completa",
        description: `${batchStatusData.successCount || 0} produse aprobate, ${batchStatusData.failedCount || 0} respinse`,
      });
      queryClient.invalidateQueries({ queryKey: ["erp-products-for-trendyol"] });
    } else if (batchStatusData?.status === "FAILED") {
      queryClient.invalidateQueries({ queryKey: ["erp-products-for-trendyol"] });
    }
  }, [batchStatusData?.status, batchStatusData?.successCount, batchStatusData?.failedCount, queryClient]);

  const products: MasterProduct[] = productsData?.products || [];
  const total = productsData?.pagination?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const brands: Brand[] = brandsData?.brands || [];

  // Mutation pentru publicare
  const publishMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await fetch("/api/trendyol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publishProducts",
          productIds,
          brandId: selectedBrand?.id || settingsData?.settings?.trendyolDefaultBrandId,
          brandName: selectedBrand?.name,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.batchRequestId) {
        toast({
          title: "Produse trimise",
          description: `${data.sent} produse trimise catre Trendyol. Se verifica statusul...`,
        });
        setSelectedProducts(new Set());
        // Open the batch status dialog
        setActiveBatchId(data.batchRequestId);
        setBatchDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ["erp-products-for-trendyol"] });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-au putut trimite produsele",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const canPublish = (product: MasterProduct) => {
    return (
      product.category?.trendyolCategoryId &&
      product.images.length > 0 &&
      !product.trendyolStatus // Nu e deja publicat
    );
  };

  const getStatusBadge = (product: MasterProduct) => {
    if (!product.category?.trendyolCategoryId) {
      return <Badge variant="outline" className="text-status-warning">Categorie nemapată</Badge>;
    }
    if (product.images.length === 0) {
      return <Badge variant="outline" className="text-status-warning">Fără imagini</Badge>;
    }
    if (product.trendyolStatus === "approved") {
      return <Badge variant="default" className="bg-status-success">Aprobat</Badge>;
    }
    if (product.trendyolStatus === "pending") {
      return <Badge variant="secondary">În așteptare</Badge>;
    }
    if (product.trendyolStatus === "rejected") {
      return <Badge variant="destructive">Respins</Badge>;
    }
    return <Badge variant="outline" className="text-status-info">Gata de publicare</Badge>;
  };

  const readyToPublish = products.filter(canPublish);
  const selectedReadyProducts = Array.from(selectedProducts).filter(id => 
    products.find(p => p.id === id && canPublish(p))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="h-8 w-8" />
            Publică pe Trendyol
          </h1>
          <p className="text-muted-foreground mt-1">
            Trimite produse din ERP către Trendyol Marketplace
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/trendyol/mapping">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Mapare Categorii
            </Button>
          </Link>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cu categorie mapată</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gata de publicare</p>
                <p className="text-2xl font-bold text-status-info">{readyToPublish.length}</p>
              </div>
              <Check className="h-8 w-8 text-status-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selectate</p>
                <p className="text-2xl font-bold text-primary">{selectedProducts.size}</p>
              </div>
              <Checkbox checked={selectedProducts.size > 0} className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setBrandDialogOpen(true)}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Brand</p>
                <p className="text-lg font-medium truncate">
                  {selectedBrand?.name || "Selectează..."}
                </p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      {selectedReadyProducts.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {selectedReadyProducts.length} produse selectate pentru publicare
                </span>
                {!selectedBrand && (
                  <Badge variant="outline" className="text-status-warning">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Selectează un brand
                  </Badge>
                )}
              </div>
              <Button
                onClick={() => publishMutation.mutate(selectedReadyProducts)}
                disabled={!selectedBrand || publishMutation.isPending}
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Publică pe Trendyol
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Caută după SKU sau titlu..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nu au fost găsite produse cu categorii mapate</p>
              <Link href="/trendyol/mapping" className="mt-4">
                <Button variant="outline">Mapează Categorii</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.size === products.length && products.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">Imagine</TableHead>
                  <TableHead>Produs</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead className="text-right">Stoc</TableHead>
                  <TableHead className="text-right">Preț</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow 
                    key={product.id}
                    className={!canPublish(product) ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                        disabled={!canPublish(product)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.images?.[0]?.url ? (
                        <div className="w-12 h-12 relative rounded overflow-hidden bg-muted">
                          <Image
                            src={product.images?.[0]?.url || ""}
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
                        <p className="font-medium truncate">{product.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate">{product.category?.name || "-"}</p>
                        {product.category?.trendyolCategoryName && (
                          <p className="text-xs text-muted-foreground truncate">
                            → {product.category.trendyolCategoryName.split(' > ').pop()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={product.stock === 0 ? "text-status-error" : ""}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(product.price).toFixed(2)} RON
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product)}
                      {product.trendyolError && (
                        <p className="text-xs text-status-error mt-1 truncate max-w-[150px]" title={product.trendyolError}>
                          {product.trendyolError}
                        </p>
                      )}
                    </TableCell>
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

      {/* Brand Selection Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selectează Brandul</DialogTitle>
            <DialogDescription>
              Caută și selectează brandul pentru produsele care vor fi publicate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută brand (min. 2 caractere)..."
                className="pl-9"
                value={brandSearchTerm}
                onChange={(e) => setBrandSearchTerm(e.target.value)}
              />
            </div>

            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {brandsLoading ? (
                <div className="p-4 text-center">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                </div>
              ) : brands.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {brandSearchTerm.length < 2 ? "Introdu min. 2 caractere" : "Nu s-au găsit branduri"}
                </div>
              ) : (
                <div className="divide-y">
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center justify-between ${
                        selectedBrand?.id === brand.id ? "bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        setSelectedBrand(brand);
                        setBrandDialogOpen(false);
                      }}
                    >
                      <span className="font-medium">{brand.name}</span>
                      <Badge variant="outline">ID: {brand.id}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Status Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={(open) => {
        setBatchDialogOpen(open);
        if (!open) {
          // Clear batch ID when dialog is closed
          setActiveBatchId(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {batchStatusData?.status === "IN_PROGRESS" && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                  Se proceseaza...
                </>
              )}
              {batchStatusData?.status === "COMPLETED" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Procesare completa
                </>
              )}
              {batchStatusData?.status === "FAILED" && (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Procesare finalizata cu erori
                </>
              )}
              {!batchStatusData?.status && batchStatusLoading && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Se incarca...
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Batch ID: {activeBatchId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Summary */}
            {batchStatusData?.success && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{batchStatusData.totalItems || 0}</p>
                  <p className="text-xs text-muted-foreground">Total produse</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{batchStatusData.successCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Acceptate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-500/10">
                  <p className="text-2xl font-bold text-red-600">{batchStatusData.failedCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Respinse</p>
                </div>
              </div>
            )}

            {/* Progress indicator for IN_PROGRESS */}
            {batchStatusData?.status === "IN_PROGRESS" && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Se actualizeaza automat la fiecare 3 secunde...</span>
                </div>
              </div>
            )}

            {/* Error list */}
            {batchStatusData?.errors && batchStatusData.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Produse respinse ({batchStatusData.errors.length})
                </h4>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-4 space-y-3">
                    {batchStatusData.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                        <p className="font-mono text-xs text-muted-foreground">{error.barcode}</p>
                        <p className="text-sm text-red-600 mt-1">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Success items list (collapsed by default) */}
            {batchStatusData?.items && batchStatusData.items.filter(i => i.status === "SUCCESS").length > 0 && (
              <div className="space-y-2">
                <details className="group">
                  <summary className="font-medium text-sm flex items-center gap-2 cursor-pointer list-none">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Produse acceptate ({batchStatusData.items.filter(i => i.status === "SUCCESS").length})
                    <span className="text-xs text-muted-foreground ml-2">(click pentru detalii)</span>
                  </summary>
                  <ScrollArea className="h-[150px] rounded-md border mt-2">
                    <div className="p-4 space-y-2">
                      {batchStatusData.items
                        .filter(i => i.status === "SUCCESS")
                        .map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-500/5 rounded">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="font-mono text-xs">{item.barcode}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </details>
              </div>
            )}

            {/* Error state */}
            {batchStatusData?.success === false && batchStatusData?.error && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm text-red-600">{batchStatusData.error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBatchDialogOpen(false);
              setActiveBatchId(null);
            }}>
              Inchide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
