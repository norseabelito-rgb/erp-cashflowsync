"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Tag,
  FolderTree,
  Package,
  Upload,
  Loader2,
  Download,
  FileUp,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, getDriveImageUrl } from "@/lib/utils";
import { SyncOverlay, useSyncOverlay } from "@/components/ui/sync-overlay";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface ProductChannel {
  id: string;
  channelId: string;
  isPublished: boolean;
  isActive: boolean;
  overrides: Record<string, any>;
  externalId?: string;
  lastSyncedAt?: string;
  hasExternalChanges?: boolean;
  channel: Channel;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  tags: string[];
  stock: number;
  isActive: boolean;
  category?: { id: string; name: string };
  images: { id: string; url: string; position: number }[];
  channels: ProductChannel[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  currentStock: number;
  costPrice?: number;
  unit: string;
  isComposite: boolean;
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [selectedOverride, setSelectedOverride] = useState<{
    product: Product;
    productChannel: ProductChannel;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"upsert" | "create" | "update">("upsert");
  const [isExporting, setIsExporting] = useState(false);
  const [inventoryComboboxOpen, setInventoryComboboxOpen] = useState(false);

  // Form state pentru produs nou
  const [newProduct, setNewProduct] = useState({
    sku: "",
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    tags: "",
    categoryId: "",
    channelIds: [] as string[],
    stock: 0,
    inventoryItemId: "",
  });

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, channelFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (channelFilter !== "all") params.set("channelId", channelFilter);
      params.set("page", page.toString());
      params.set("limit", "25");
      
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      return res.json();
    },
  });

  // Fetch inventory items (pentru dropdown SKU) - doar cele nemapate la produse
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-items", skuSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (skuSearch) params.set("search", skuSearch);
      params.set("isActive", "true");
      params.set("excludeMapped", "true");
      const res = await fetch(`/api/inventory-items?${params}`);
      return res.json();
    },
    enabled: createDialogOpen, // Doar când dialogul e deschis
  });

  // Sync channels cu stores (la prima încărcare)
  const syncChannelsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-stores" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // Efect pentru sync channels la prima încărcare
  useEffect(() => {
    if (channelsData?.channels?.length === 0) {
      syncChannelsMutation.mutate();
    }
  }, [channelsData]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setCreateDialogOpen(false);
        resetNewProductForm();
        toast({ title: "Produs creat", description: `${data.product.title} a fost adăugat` });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast({ title: "Produs șters" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (payload: { action: string; productIds: string[]; data: any }) => {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setSelectedProducts([]);
        setBulkDialogOpen(false);
        toast({ title: "Operație completată", description: data.message });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Reset channel override mutation
  const resetOverrideMutation = useMutation({
    mutationFn: async ({ productId, channelId }: { productId: string; channelId: string }) => {
      const res = await fetch(`/api/products/${productId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, resetAll: true }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setOverrideDialogOpen(false);
        toast({ title: "Override-uri resetate" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Sync Shopify mutation
  const syncShopifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products/sync-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast({ 
          title: "Sincronizare Shopify completă", 
          description: data.message,
        });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Import products mutation
  const importProductsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setImportDialogOpen(false);
        setImportFile(null);
        toast({
          title: "Import finalizat",
          description: data.message,
        });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const resetNewProductForm = () => {
    setNewProduct({
      sku: "",
      title: "",
      description: "",
      price: "",
      compareAtPrice: "",
      tags: "",
      categoryId: "",
      channelIds: [],
      stock: 0,
      inventoryItemId: "",
    });
    setSkuSearch("");
    setInventoryComboboxOpen(false);
  };

  const handleCreateProduct = () => {
    createProductMutation.mutate({
      sku: newProduct.sku,
      title: newProduct.title,
      description: newProduct.description || undefined,
      price: parseFloat(newProduct.price) || 0,
      compareAtPrice: newProduct.compareAtPrice ? parseFloat(newProduct.compareAtPrice) : undefined,
      tags: newProduct.tags.split(",").map(t => t.trim()).filter(Boolean),
      categoryId: newProduct.categoryId || undefined,
      channelIds: newProduct.channelIds,
      stock: newProduct.stock || 0,
      inventoryItemId: newProduct.inventoryItemId || undefined,
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (channelFilter !== "all") params.set("channelId", channelFilter);

      const res = await fetch(`/api/products/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produse_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export finalizat", description: "Fișierul CSV a fost descărcat" });
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    if (!importFile) return;

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", importMode);
    importProductsMutation.mutate(formData);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p: Product) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const getChannelStatus = (product: Product, channelId: string) => {
    const pc = product.channels.find(c => c.channelId === channelId);
    if (!pc) return "not-published"; // Nu e pe canal
    if (!pc.isPublished) return "draft"; // Draft
    if (!pc.isActive) return "paused"; // Pauzat
    if (pc.hasExternalChanges) return "external-changes"; // Modificări externe
    if (Object.keys(pc.overrides || {}).length > 0) return "override"; // Override-uri
    return "synced"; // Sincronizat
  };

  const getChannelStatusIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case "override":
        return <AlertTriangle className="h-4 w-4 text-status-warning cursor-pointer" />;
      case "external-changes":
        return <AlertTriangle className="h-4 w-4 text-status-warning cursor-pointer" />;
      case "draft":
        return <MinusCircle className="h-4 w-4 text-gray-400" />;
      case "paused":
        return <MinusCircle className="h-4 w-4 text-status-info" />;
      case "not-published":
        return <XCircle className="h-4 w-4 text-gray-300" />;
      default:
        return null;
    }
  };

  const products: Product[] = productsData?.products || [];
  const channels: Channel[] = productsData?.channels || channelsData?.channels || [];
  const categories: Category[] = categoriesData?.categories || [];
  const inventoryItems: InventoryItem[] = inventoryData?.data?.items || [];
  const pagination = productsData?.pagination;

  // Articolele sunt filtrate server-side (excludeMapped=true)
  const availableInventoryItems = inventoryItems;

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <PageHeader
          title="Produse"
          description="Gestionează produsele și sincronizarea pe canale"
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:size-default"
                    onClick={() => syncShopifyMutation.mutate()}
                    disabled={syncShopifyMutation.isPending}
                  >
                    {syncShopifyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">Sync Shopify</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Trimite toate produsele cu canale Shopify active către Shopify. Creează produse noi și actualizează cele existente (titlu, preț, descriere, imagini).</p>
                </TooltipContent>
              </Tooltip>
              <Link href="/products/inventory-mapping">
                <Button variant="outline" size="sm" className="md:size-default">
                  <Package className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Mapare Inventar</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="md:size-default">
                    <FileSpreadsheet className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Import/Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "Se exportă..." : "Export CSV"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                    <FileUp className="h-4 w-4 mr-2" />
                    Import Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" className="md:size-default" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Produs Nou</span>
              </Button>
            </>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după SKU, titlu sau tag..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <FolderTree className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate categoriile</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count?.products || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate canalele</SelectItem>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-4 p-4 mb-4 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">
              {selectedProducts.length} produse selectate
            </span>
            <div className="flex gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Acțiuni Bulk
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setBulkAction("change-category"); setBulkDialogOpen(true); }}>
                    <FolderTree className="h-4 w-4 mr-2" />
                    Schimbă categoria
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBulkAction("add-tags"); setBulkDialogOpen(true); }}>
                    <Tag className="h-4 w-4 mr-2" />
                    Adaugă tag-uri
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBulkAction("remove-tags"); setBulkDialogOpen(true); }}>
                    <Tag className="h-4 w-4 mr-2" />
                    Șterge tag-uri
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setBulkAction("publish-channel"); setBulkDialogOpen(true); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-status-success" />
                    Publică pe canal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBulkAction("unpublish-channel"); setBulkDialogOpen(true); }}>
                    <MinusCircle className="h-4 w-4 mr-2" />
                    Depublică de pe canal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setBulkAction("delete"); setBulkDialogOpen(true); }}
                    className="text-status-error"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Șterge produsele
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts([])}>
                Deselectează
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={products.length > 0 && selectedProducts.length === products.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">Img</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Titlu</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Preț</TableHead>
                  <TableHead className="text-center">Stoc</TableHead>
                  <TableHead className="hidden md:table-cell">Categorie</TableHead>
                  {channels.slice(0, 4).map((channel) => (
                    <TableHead key={channel.id} className="text-center w-[80px] hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[70px]">{channel.name}</span>
                        </TooltipTrigger>
                        <TooltipContent>{channel.name}</TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8 + channels.slice(0, 4).length} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Se încarcă...
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8 + channels.slice(0, 4).length} className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Nu există produse</p>
                      <Button variant="link" onClick={() => setCreateDialogOpen(true)}>
                        Adaugă primul produs
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.images?.[0] ? (
                          <img
                            src={getDriveImageUrl(product.images?.[0]?.url || "")}
                            alt={product.title}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <Link 
                          href={`/products/${product.id}`}
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {product.title}
                        </Link>
                        {product.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1 hidden sm:flex">
                            {product.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {product.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium hidden sm:table-cell">
                      {formatCurrency(Number(product.price))}
                      {product.compareAtPrice && (
                        <span className="text-muted-foreground text-sm line-through ml-2">
                          {formatCurrency(Number(product.compareAtPrice))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.stock > 10 ? "success" : product.stock > 0 ? "warning" : "destructive"}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {product.category?.name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {channels.slice(0, 4).map((channel) => {
                      const status = getChannelStatus(product, channel.id);
                      const pc = product.channels.find(c => c.channelId === channel.id);
                      
                      return (
                        <TableCell key={channel.id} className="text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  if ((status === "override" || status === "external-changes") && pc) {
                                    setSelectedOverride({ product, productChannel: pc });
                                    setOverrideDialogOpen(true);
                                  }
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {getChannelStatusIcon(status)}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {status === "synced" && "Sincronizat"}
                              {status === "override" && "Are override-uri - click pentru detalii"}
                              {status === "external-changes" && "Modificat în Shopify - click pentru detalii"}
                              {status === "draft" && "Draft (nepublicat)"}
                              {status === "paused" && "Pauzat (nu primește update-uri)"}
                              {status === "not-published" && "Nu e pe acest canal"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editează
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-status-error"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Șterge
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
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

        {/* Create Product Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Produs Nou</DialogTitle>
              <DialogDescription>
                Selectează un produs din inventar și configurează canalele de publicare
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label>Articol din Inventar *</Label>
                <Popover open={inventoryComboboxOpen} onOpenChange={setInventoryComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={inventoryComboboxOpen}
                      className="w-full justify-between font-normal"
                    >
                      {newProduct.inventoryItemId ? (
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-mono text-xs bg-muted px-1 rounded">{newProduct.sku}</span>
                          {newProduct.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selectează articolul din inventar</span>
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[462px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Caută SKU sau nume..."
                        value={skuSearch}
                        onValueChange={setSkuSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {skuSearch ? "Niciun articol găsit" : "Nu există articole disponibile în inventar"}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableInventoryItems.map((inv) => (
                            <CommandItem
                              key={inv.id}
                              value={inv.id}
                              onSelect={() => {
                                setNewProduct({
                                  ...newProduct,
                                  inventoryItemId: inv.id,
                                  sku: inv.sku,
                                  title: inv.name,
                                  description: inv.description || "",
                                  price: inv.costPrice ? String(inv.costPrice) : "",
                                  stock: Number(inv.currentStock),
                                });
                                setInventoryComboboxOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <span className="font-mono text-xs bg-muted px-1 rounded mr-2">{inv.sku}</span>
                              <span className="truncate flex-1">{inv.name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">({Number(inv.currentStock)} {inv.unit})</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Selectează un articol din inventarul local pentru a crea produsul.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Categorie</Label>
                <Select
                  value={newProduct.categoryId || "__none__"}
                  onValueChange={(v) => setNewProduct({ ...newProduct, categoryId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Fără categorie</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Titlu *</Label>
                <Input
                  placeholder="Numele produsului"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Descriere</Label>
                <Textarea
                  placeholder="Descrierea produsului..."
                  rows={3}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Preț (RON) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="99.00"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Preț comparat (RON)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="129.00"
                    value={newProduct.compareAtPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Tag-uri</Label>
                <Input
                  placeholder="tag1, tag2, tag3"
                  value={newProduct.tags}
                  onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Separate prin virgulă</p>
              </div>

              <div className="grid gap-2">
                <Label>Publică pe canalele:</Label>
                <div className="flex flex-wrap gap-2">
                  {channels.map((channel) => (
                    <label
                      key={channel.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        newProduct.channelIds.includes(channel.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={newProduct.channelIds.includes(channel.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewProduct({
                              ...newProduct,
                              channelIds: [...newProduct.channelIds, channel.id],
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              channelIds: newProduct.channelIds.filter(id => id !== channel.id),
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{channel.name}</span>
                      <Badge variant="secondary" className="text-xs">{channel.type}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Anulează
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={!newProduct.inventoryItemId || !newProduct.sku || !newProduct.title || !newProduct.price || createProductMutation.isPending}
              >
                {createProductMutation.isPending ? "Se creează..." : "Creează Produs"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Override Details Dialog */}
        <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override-uri pe {selectedOverride?.productChannel.channel.name}</DialogTitle>
              <DialogDescription>
                Diferențe față de produsul master pentru {selectedOverride?.product.title}
              </DialogDescription>
            </DialogHeader>
            {selectedOverride && (
              <div className="py-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Câmp</TableHead>
                        <TableHead>Master</TableHead>
                        <TableHead>Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selectedOverride.productChannel.overrides || {}).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium capitalize">{key}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {key === "price" || key === "compareAtPrice"
                              ? formatCurrency(Number((selectedOverride.product as any)[key]))
                              : String((selectedOverride.product as any)[key] || "-")}
                          </TableCell>
                          <TableCell className="font-medium text-status-warning">
                            {key === "price" || key === "compareAtPrice"
                              ? formatCurrency(Number(value))
                              : String(value)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(selectedOverride.productChannel.overrides || {}).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Nu există override-uri
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Închide
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedOverride) {
                    resetOverrideMutation.mutate({
                      productId: selectedOverride.product.id,
                      channelId: selectedOverride.productChannel.channelId,
                    });
                  }
                }}
                disabled={resetOverrideMutation.isPending}
              >
                Resetează la Master
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Action Dialog */}
        <BulkActionDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          action={bulkAction}
          selectedCount={selectedProducts.length}
          channels={channels}
          categories={categories}
          onConfirm={(data) => {
            bulkActionMutation.mutate({
              action: bulkAction,
              productIds: selectedProducts,
              data,
            });
          }}
          isLoading={bulkActionMutation.isPending}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ștergi produsul?</AlertDialogTitle>
              <AlertDialogDescription>
                Ești sigur că vrei să ștergi produsul &quot;{productToDelete?.title}&quot;?
                Această acțiune este ireversibilă.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                className="bg-status-error hover:bg-status-error/90"
                onClick={() => {
                  if (productToDelete) {
                    deleteProductMutation.mutate(productToDelete.id);
                  }
                  setDeleteConfirmOpen(false);
                  setProductToDelete(null);
                }}
              >
                Șterge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Produse din Excel</DialogTitle>
              <DialogDescription>
                Încarcă un fișier Excel (.xlsx) cu produse pentru a le importa în sistem
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <p className="font-medium">Descarcă template Excel</p>
                  <p className="text-muted-foreground">Template cu coloanele necesare</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/api/products/import";
                    a.download = "template_produse.xlsx";
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </div>

              <div className="grid gap-2">
                <Label>Fișier Excel</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Mod import</Label>
                <Select value={importMode} onValueChange={(v: "upsert" | "create" | "update") => setImportMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">Creare + Actualizare (recomandat)</SelectItem>
                    <SelectItem value="create">Doar creare produse noi</SelectItem>
                    <SelectItem value="update">Doar actualizare existente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {importMode === "upsert" && "Creează produse noi și actualizează cele existente (după SKU)"}
                  {importMode === "create" && "Ignoră produsele care există deja în sistem"}
                  {importMode === "update" && "Ignoră produsele care nu există în sistem"}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Coloane obligatorii</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>SKU</strong> - Cod unic produs</li>
                  <li><strong>Titlu</strong> - Numele produsului</li>
                  <li><strong>Preț</strong> - Prețul de vânzare</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); }}>
                Anulează
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importProductsMutation.isPending}
              >
                {importProductsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Se importă...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Importă
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Component pentru Bulk Action Dialog
function BulkActionDialog({
  open,
  onOpenChange,
  action,
  selectedCount,
  channels,
  categories,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string;
  selectedCount: number;
  channels: Channel[];
  categories: Category[];
  onConfirm: (data: any) => void;
  isLoading: boolean;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tags, setTags] = useState("");

  const getTitle = () => {
    switch (action) {
      case "change-category": return "Schimbă Categoria";
      case "add-tags": return "Adaugă Tag-uri";
      case "remove-tags": return "Șterge Tag-uri";
      case "publish-channel": return "Publică pe Canal";
      case "unpublish-channel": return "Depublică de pe Canal";
      case "delete": return "Șterge Produsele";
      default: return "Acțiune Bulk";
    }
  };

  const handleConfirm = () => {
    switch (action) {
      case "change-category":
        onConfirm({ categoryId: categoryId || null });
        break;
      case "add-tags":
      case "remove-tags":
        onConfirm({ tags: tags.split(",").map(t => t.trim()).filter(Boolean) });
        break;
      case "publish-channel":
      case "unpublish-channel":
      case "activate-channel":
      case "deactivate-channel":
        onConfirm({ channelId });
        break;
      case "delete":
        onConfirm({});
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Această acțiune va afecta {selectedCount} produse selectate.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {action === "change-category" && (
            <div className="grid gap-2">
              <Label>Categorie nouă</Label>
              <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Fără categorie</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(action === "add-tags" || action === "remove-tags") && (
            <div className="grid gap-2">
              <Label>Tag-uri</Label>
              <Input
                placeholder="tag1, tag2, tag3"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate prin virgulă</p>
            </div>
          )}

          {(action === "publish-channel" || action === "unpublish-channel") && (
            <div className="grid gap-2">
              <Label>Canal</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează canalul" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "delete" && (
            <div className="p-4 bg-status-error/10 rounded-lg border border-status-error/20">
              <p className="text-status-error font-medium">
                ⚠️ Atenție! Această acțiune este ireversibilă.
              </p>
              <p className="text-sm text-status-error/80 mt-1">
                Produsele vor fi șterse din sistem și din toate magazinele Shopify asociate.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button
            variant={action === "delete" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading || (
              (action === "publish-channel" || action === "unpublish-channel") && !channelId
            ) || (
              (action === "add-tags" || action === "remove-tags") && !tags.trim()
            )}
          >
            {isLoading ? "Se procesează..." : "Confirmă"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
