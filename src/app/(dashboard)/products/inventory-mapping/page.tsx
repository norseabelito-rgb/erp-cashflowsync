"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  Wand2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Layers,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, getDriveImageUrl } from "@/lib/utils";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  unit: string;
  isComposite: boolean;
}

interface MappedProduct {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock: number;
  isActive: boolean;
  inventoryItemId: string | null;
  inventoryItem: InventoryItem | null;
  images: { url: string }[];
}

export default function InventoryMappingPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [mappingStatus, setMappingStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MappedProduct | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [autoMatchDialogOpen, setAutoMatchDialogOpen] = useState(false);

  // Fetch products with mapping status
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product-mappings", search, mappingStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (mappingStatus !== "all") params.set("mappingStatus", mappingStatus);
      params.set("page", page.toString());

      const res = await fetch(`/api/products/inventory-mapping?${params}`);
      return res.json();
    },
  });

  // Fetch inventory items for the mapping dialog
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-items-for-mapping", inventorySearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (inventorySearch) params.set("search", inventorySearch);
      params.set("isActive", "true");

      const res = await fetch(`/api/inventory-items?${params}`);
      return res.json();
    },
    enabled: mapDialogOpen,
  });

  // Map product mutation
  const mapMutation = useMutation({
    mutationFn: async ({ productId, inventoryItemId }: { productId: string; inventoryItemId: string | null }) => {
      const res = await fetch("/api/products/inventory-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, inventoryItemId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
        setMapDialogOpen(false);
        setSelectedProduct(null);
        setSelectedInventoryId("");
        toast({
          title: "Succes",
          description: data.message,
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
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
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
        setAutoMatchDialogOpen(false);
        toast({
          title: "Auto-mapare completă",
          description: data.message,
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  const products: MappedProduct[] = data?.data?.products || [];
  const stats = data?.data?.stats || { total: 0, mapped: 0, unmapped: 0 };
  const pagination = data?.data?.pagination;
  const inventoryItems: InventoryItem[] = inventoryData?.data?.items || [];

  const openMapDialog = (product: MappedProduct) => {
    setSelectedProduct(product);
    setSelectedInventoryId(product.inventoryItemId || "");
    setInventorySearch("");
    setMapDialogOpen(true);
  };

  const handleMap = () => {
    if (selectedProduct) {
      mapMutation.mutate({
        productId: selectedProduct.id,
        inventoryItemId: selectedInventoryId || null,
      });
    }
  };

  const handleUnmap = (product: MappedProduct) => {
    mapMutation.mutate({
      productId: product.id,
      inventoryItemId: null,
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mapare Inventar</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Leagă produsele de articolele din inventar
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button onClick={() => setAutoMatchDialogOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-mapare
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total produse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={stats.mapped > 0 ? "border-green-500" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Mapate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.mapped}
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.unmapped > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Nemapate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.unmapped}
              {stats.unmapped > 0 && <XCircle className="h-4 w-4 text-yellow-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după SKU sau titlu..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={mappingStatus}
          onValueChange={(v) => {
            setMappingStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status mapare" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="mapped">Mapate</SelectItem>
            <SelectItem value="unmapped">Nemapate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px]">Img</TableHead>
              <TableHead>SKU Produs</TableHead>
              <TableHead>Titlu</TableHead>
              <TableHead className="text-right">Preț</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Articol Inventar</TableHead>
              <TableHead className="text-center">Stoc Inventar</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {search || mappingStatus !== "all"
                      ? "Niciun produs găsit"
                      : "Nu există produse"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.images?.[0] ? (
                      <img
                        src={getDriveImageUrl(product.images[0].url)}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-xs truncate">{product.title}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(product.price))}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.inventoryItemId ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Mapat
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Nemapat
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.inventoryItem ? (
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {product.inventoryItem.sku}
                        </div>
                        <div className="text-sm flex items-center gap-1">
                          {product.inventoryItem.name}
                          {product.inventoryItem.isComposite && (
                            <Layers className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.inventoryItem ? (
                      <Badge variant="secondary">
                        {Number(product.inventoryItem.currentStock)} {product.inventoryItem.unit}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openMapDialog(product)}
                        title={product.inventoryItemId ? "Schimbă maparea" : "Mapează"}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      {product.inventoryItemId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnmap(product)}
                          title="Elimină maparea"
                        >
                          <Unlink className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} produse)
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

      {/* Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mapare la Inventar</DialogTitle>
            <DialogDescription>
              Selectează articolul din inventar pentru produsul{" "}
              <strong>{selectedProduct?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Produs selectat:</div>
              <div className="font-mono text-sm">{selectedProduct?.sku}</div>
              <div className="font-medium">{selectedProduct?.title}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Articol inventar</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedInventoryId
                      ? inventoryItems.find((item) => item.id === selectedInventoryId)?.name ||
                        "Selectează..."
                      : "Selectează articol..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Caută articol..."
                      value={inventorySearch}
                      onValueChange={setInventorySearch}
                    />
                    <CommandList>
                      <CommandEmpty>Niciun articol găsit.</CommandEmpty>
                      <CommandGroup>
                        {inventoryItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => setSelectedInventoryId(item.id)}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-muted px-1 rounded">
                                  {item.sku}
                                </span>
                                {item.isComposite && (
                                  <Badge variant="outline" className="text-xs">
                                    <Layers className="h-3 w-3 mr-1" />
                                    Compus
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm">{item.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Stoc: {Number(item.currentStock)} {item.unit}
                              </span>
                            </div>
                            {selectedInventoryId === item.id && (
                              <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleMap} disabled={mapMutation.isPending}>
              {mapMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-match Dialog */}
      <Dialog open={autoMatchDialogOpen} onOpenChange={setAutoMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-mapare pe baza SKU</DialogTitle>
            <DialogDescription>
              Această funcție va mapa automat produsele la articolele din inventar care au același SKU.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{stats.unmapped}</strong> produse nemapate vor fi verificate.
                <br />
                Produsele cu SKU identic cu un articol din inventar vor fi mapate automat.
              </p>
            </div>
          </div>
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
                  Pornește auto-maparea
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
