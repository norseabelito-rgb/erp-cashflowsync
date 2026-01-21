"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Link2,
  Link2Off,
  Search,
  Package,
  Warehouse,
  CheckCircle2,
  XCircle,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function ProductInventoryMappingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [mappingStatus, setMappingStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  // Dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState("");
  const [autoMatchDialogOpen, setAutoMatchDialogOpen] = useState(false);

  // Fetch products with mapping status
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product-mappings", { search, mappingStatus, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (mappingStatus !== "all") params.set("mappingStatus", mappingStatus);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/products/inventory-mapping?${params}`);
      return res.json();
    },
  });

  // Fetch inventory items for selection
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-items-for-mapping"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?isActive=true&limit=500");
      return res.json();
    },
  });

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ productId, inventoryItemId }: { productId: string; inventoryItemId: string | null }) => {
      const res = await fetch("/api/products/inventory-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, inventoryItemId }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
        toast({ title: "Succes", description: result.message });
        setMappingDialogOpen(false);
        setSelectedProduct(null);
        setSelectedInventoryItemId("");
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products/inventory-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-match" }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
        toast({
          title: "Succes",
          description: result.message,
        });
        setAutoMatchDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  const products = data?.data?.products || [];
  const stats = data?.data?.stats || { total: 0, mapped: 0, unmapped: 0 };
  const pagination = data?.data?.pagination || { page: 1, total: 0, totalPages: 1 };
  const inventoryItems = inventoryData?.data?.items || [];

  const openMappingDialog = (product: any) => {
    setSelectedProduct(product);
    setSelectedInventoryItemId(product.inventoryItemId || "");
    setMappingDialogOpen(true);
  };

  const handleSaveMapping = () => {
    if (selectedProduct) {
      updateMappingMutation.mutate({
        productId: selectedProduct.id,
        inventoryItemId: selectedInventoryItemId || null,
      });
    }
  };

  const handleRemoveMapping = (product: any) => {
    updateMappingMutation.mutate({
      productId: product.id,
      inventoryItemId: null,
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Link2 className="h-8 w-8" />
              Mapare Inventar
            </h1>
            <p className="text-muted-foreground">
              Leagă produsele de articolele din inventar
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAutoMatchDialogOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-match SKU
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total produse</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-status-success/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mapate</p>
                <p className="text-2xl font-bold text-status-success">{stats.mapped}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-status-warning/10 rounded-lg">
                <XCircle className="h-4 w-4 text-status-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nemapate</p>
                <p className="text-2xl font-bold text-status-warning">{stats.unmapped}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      {stats.unmapped > 0 && (
        <Alert className="mb-6 border-status-warning/20 bg-status-warning/10">
          <Link2Off className="h-4 w-4 text-status-warning" />
          <AlertTitle className="text-status-warning">Produse nemapate</AlertTitle>
          <AlertDescription className="text-status-warning/80">
            Ai {stats.unmapped} produse care nu sunt legate la inventar. Stocul acestor produse nu va fi afectat automat la facturare.
            Folosește butonul &quot;Auto-match SKU&quot; pentru a mapa automat produsele cu același SKU.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după SKU sau nume produs..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select value={mappingStatus} onValueChange={(v) => { setMappingStatus(v); setPage(1); }}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="mapped">Mapate</SelectItem>
                  <SelectItem value="unmapped">Nemapate</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nu există produse</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead>Produs</TableHead>
                      <TableHead>Preț</TableHead>
                      <TableHead>Stoc produs</TableHead>
                      <TableHead>Articol inventar</TableHead>
                      <TableHead>Stoc inventar</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px]">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images?.[0]?.url || ""}
                              alt={product.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(Number(product.price))}
                        </TableCell>
                        <TableCell className="font-mono">
                          {product.stock ?? "-"}
                        </TableCell>
                        <TableCell>
                          {product.inventoryItem ? (
                            <div>
                              <p className="font-medium text-sm">{product.inventoryItem.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {product.inventoryItem.sku}
                                {product.inventoryItem.isComposite && (
                                  <Badge variant="secondary" className="ml-1 text-xs">Compus</Badge>
                                )}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {product.inventoryItem ? (
                            <span>
                              {Number(product.inventoryItem.currentStock).toFixed(2)} {product.inventoryItem.unit}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {product.inventoryItem ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Mapat
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <Link2Off className="h-3 w-3" />
                              Nemapat
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMappingDialog(product)}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            {product.inventoryItem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMapping(product)}
                              >
                                <Link2Off className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} produse)
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

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mapare la inventar</DialogTitle>
            <DialogDescription>
              Selectează articolul de inventar pentru produsul{" "}
              <strong>{selectedProduct?.title}</strong> ({selectedProduct?.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedInventoryItemId} onValueChange={setSelectedInventoryItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează articol inventar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Fără mapare</span>
                </SelectItem>
                {inventoryItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{item.sku}</span>
                      <span>-</span>
                      <span>{item.name}</span>
                      {item.isComposite && (
                        <Badge variant="secondary" className="text-xs">Compus</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleSaveMapping}
              disabled={updateMappingMutation.isPending}
            >
              {updateMappingMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-match Dialog */}
      <Dialog open={autoMatchDialogOpen} onOpenChange={setAutoMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Auto-match după SKU
            </DialogTitle>
            <DialogDescription>
              Această acțiune va mapa automat toate produsele nemapate la articolele de inventar
              care au exact același SKU (case-insensitive).
              <br /><br />
              Produse nemapate: <strong>{stats.unmapped}</strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoMatchDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => autoMatchMutation.mutate()}
              disabled={autoMatchMutation.isPending}
            >
              {autoMatchMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Pornește auto-match
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
