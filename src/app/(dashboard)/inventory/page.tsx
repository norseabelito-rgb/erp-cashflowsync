"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  RefreshCw,
  Plus,
  Layers,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  Eye,
  Download,
  FileUp,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";

interface WarehouseStock {
  id: string;
  currentStock: number;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  currentStock: number;
  minStock?: number;
  unit: string;
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  isComposite: boolean;
  isActive: boolean;
  supplier?: {
    id: string;
    name: string;
  };
  warehouseStocks?: WarehouseStock[];
  recipeComponents?: Array<{
    id: string;
    quantity: number;
    unit?: string;
    componentItem: {
      id: string;
      sku: string;
      name: string;
      currentStock: number;
      unit: string;
    };
  }>;
  _count?: {
    mappedProducts: number;
    stockMovements: number;
  };
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; sku: string; error: string }>;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
  isActive: boolean;
}

export default function InventoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(50);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResultsDialogOpen, setImportResultsDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"upsert" | "create" | "update" | "stock_only">("upsert");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Eroare la incarcarea depozitelor");
      return res.json();
    },
  });

  const warehouses: Warehouse[] = warehousesData?.warehouses || [];

  // Fetch inventory items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-items", search, filterType, filterStock, filterWarehouse, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType !== "all") params.set("isComposite", filterType === "composite" ? "true" : "false");
      if (filterStock === "low") params.set("lowStock", "true");
      if (filterStock === "active") params.set("isActive", "true");
      if (filterWarehouse !== "all") {
        params.set("warehouseId", filterWarehouse);
      }
      // Always include warehouse stocks to show per-warehouse columns
      params.set("includeWarehouseStock", "true");
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/inventory-items?${params}`);
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory-items?id=${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({
          title: "Succes",
          description: data.message || "Articolul a fost șters",
        });
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/inventory-items/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({
          title: "Succes",
          description: data.message,
        });
        setBulkDeleteDialogOpen(false);
        setSelectedItems(new Set());
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  // Import inventory mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/inventory-items/import", {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        setImportDialogOpen(false);
        setImportFile(null);
        setImportResults(data.results);
        setImportResultsDialogOpen(true);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/inventory-items/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventar_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export finalizat", description: "Fișierul CSV a fost descărcat" });
    } catch (error: unknown) {
      toast({ title: "Eroare", description: error instanceof Error ? error.message : "Eroare", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("mode", importMode);
    importMutation.mutate(formData);
  };

  const items: InventoryItem[] = data?.data?.items || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };
  const stats = data?.data?.stats || {
    totalItems: 0,
    compositeItems: 0,
    individualItems: 0,
    lowStockItems: 0,
  };

  const handleRowClick = (item: InventoryItem) => {
    router.push(`/inventory/${item.id}`);
  };

  const handleDeleteClick = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedItems));
    }
  };

  const getStockBadge = (item: InventoryItem) => {
    if (item.isComposite) {
      return <Badge variant="outline">Compus</Badge>;
    }

    const stock = Number(item.currentStock);
    const minStock = item.minStock ? Number(item.minStock) : null;

    if (stock === 0) {
      return <Badge variant="destructive">Fără stoc</Badge>;
    }
    if (minStock && stock <= minStock) {
      return <Badge variant="warning">{stock}</Badge>;
    }
    return <Badge variant="secondary">{stock}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Articole Inventar"
        description="Gestionează articolele din inventar"
        actions={
          <>
            <ActionTooltip action="Reincarca inventar" consequence="Se actualizeaza lista">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reîncarcă
              </Button>
            </ActionTooltip>
            <DropdownMenu>
              <ActionTooltip action="Importa din CSV" consequence="Se actualizeaza stocurile in bulk">
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Import/Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
              </ActionTooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Import / Export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Import din Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export în CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ActionTooltip action="Adauga articol nou" consequence="Se deschide formularul de creare">
              <Button onClick={() => router.push("/inventory/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Articol nou
              </Button>
            </ActionTooltip>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total articole</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Individuale</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.individualItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compuse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.compositeItems}
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStockItems > 0 ? "border-status-warning" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Stoc scăzut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.lowStockItems}
              {stats.lowStockItems > 0 && (
                <AlertTriangle className="h-4 w-4 text-status-warning" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după SKU sau nume..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tip articol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            <SelectItem value="individual">Individuale</SelectItem>
            <SelectItem value="composite">Compuse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStock} onValueChange={(v) => { setFilterStock(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status stoc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tot stocul</SelectItem>
            <SelectItem value="low">Stoc scăzut</SelectItem>
            <SelectItem value="active">Doar active</SelectItem>
          </SelectContent>
        </Select>
        {warehouses.length > 0 && (
          <Select value={filterWarehouse} onValueChange={(v) => { setFilterWarehouse(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Depozit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate depozitele</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  {wh.name} {wh.isPrimary && "(Principal)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {selectedItems.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Șterge {selectedItems.size} selectate
          </Button>
        )}
      </div>

      {/* Pagination Controls - Top */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afișează:</span>
          <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="10000">Toate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {pagination.total} articole
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={items.length > 0 && selectedItems.size === items.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nume</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className="text-center">Stoc Total</TableHead>
              {warehouses.filter(w => w.isActive).map((wh) => (
                <TableHead key={wh.id} className="text-center" title={wh.name}>
                  <span className="text-xs">{wh.code || wh.name.substring(0, 6)}</span>
                </TableHead>
              ))}
              <TableHead>Unitate</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9 + warehouses.filter(w => w.isActive).length} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9 + warehouses.filter(w => w.isActive).length} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search ? "Niciun articol găsit" : "Nu există articole în inventar"}
                  </p>
                  {!search && (
                    <Button variant="outline" onClick={() => router.push("/inventory/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă primul articol
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isComposite ? (
                      <Badge variant="outline" className="gap-1">
                        <Layers className="h-3 w-3" />
                        Compus
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Individual</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStockBadge(item)}
                  </TableCell>
                  {warehouses.filter(w => w.isActive).map((wh) => {
                    const warehouseStock = item.warehouseStocks?.find(ws => ws.warehouse.id === wh.id);
                    const stock = warehouseStock ? Number(warehouseStock.currentStock) : 0;
                    return (
                      <TableCell key={wh.id} className="text-center text-xs text-muted-foreground">
                        {item.isComposite ? "-" : (stock > 0 ? stock : <span className="text-muted-foreground/50">0</span>)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-muted-foreground">
                    {item.unit}
                    {item.unitsPerBox && (
                      <span className="text-xs block">
                        ({item.unitsPerBox}/{item.boxUnit || "bax"})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.costPrice ? formatCurrency(Number(item.costPrice)) : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.supplier?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <ActionTooltip action="Editeaza articolul" consequence="Modificarile se salveaza">
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </ActionTooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inventory/${item.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Vezi detalii
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inventory/${item.id}/edit`);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editează
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeleteClick(item, e)}
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

      {/* Pagination Controls - Bottom */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Următor
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare ștergere</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi articolul{" "}
              <strong>{itemToDelete?.name}</strong> ({itemToDelete?.sku})?
              {itemToDelete?._count?.mappedProducts && itemToDelete._count.mappedProducts > 0 && (
                <span className="block mt-2 text-status-warning">
                  Atentie: Acest articol este mapat la {itemToDelete._count.mappedProducts} produse.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere în masă</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi {selectedItems.size} articole selectate?
              Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se șterge...
                </>
              ) : (
                <>Șterge {selectedItems.size} articole</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import inventar din Excel</DialogTitle>
            <DialogDescription>
              Încarcă un fișier Excel (.xlsx) cu articole de inventar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                  a.href = "/api/inventory-items/import";
                  a.download = "template_inventar.xlsx";
                  a.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="importFile">Fișier Excel</Label>
              <Input
                id="importFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="importMode">Mod import</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as typeof importMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsert">Creare + Actualizare (după SKU)</SelectItem>
                  <SelectItem value="create">Doar creare (omite existente)</SelectItem>
                  <SelectItem value="update">Doar actualizare (omite noi)</SelectItem>
                  <SelectItem value="stock_only">Doar actualizare stoc</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {importMode === "upsert" && "Articolele noi vor fi create, cele existente vor fi actualizate."}
                {importMode === "create" && "Doar articolele cu SKU inexistent vor fi create."}
                {importMode === "update" && "Doar articolele existente vor fi actualizate."}
                {importMode === "stock_only" && "Actualizează doar stocul curent, restul câmpurilor sunt ignorate."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending ? (
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

      {/* Import Results Dialog */}
      <Dialog open={importResultsDialogOpen} onOpenChange={setImportResultsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Rezultate Import</DialogTitle>
            <DialogDescription>
              Rezumatul importului din Excel
            </DialogDescription>
          </DialogHeader>
          {importResults && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">Create</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                    {importResults.created}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">Actualizate</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                    {importResults.updated}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">Omise</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                    {importResults.skipped}
                  </div>
                </div>
              </div>

              {/* Errors List */}
              {importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">
                    Erori ({importResults.errors.length}):
                  </h4>
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-4 space-y-2">
                      {importResults.errors.map((error, index) => (
                        <div
                          key={index}
                          className="p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                        >
                          <div className="flex items-start gap-3">
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-mono text-xs">
                                  Rând {error.row}
                                </Badge>
                                {error.sku && (
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    SKU: {error.sku}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-destructive mt-1">{error.error}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {importResults.errors.length === 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    Importul s-a finalizat fără erori!
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportResultsDialogOpen(false)}>
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
