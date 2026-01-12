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
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  Eye,
} from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

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

export default function InventoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Fetch inventory items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-items", search, filterType, filterStock],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType !== "all") params.set("isComposite", filterType === "composite" ? "true" : "false");
      if (filterStock === "low") params.set("lowStock", "true");
      if (filterStock === "active") params.set("isActive", "true");

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

  const items: InventoryItem[] = data?.data?.items || [];
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventar</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestionează articolele din inventar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button onClick={() => router.push("/inventory/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Articol nou
          </Button>
        </div>
      </div>

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
        <Card className={stats.lowStockItems > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Stoc scăzut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.lowStockItems}
              {stats.lowStockItems > 0 && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după SKU sau nume..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tip articol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            <SelectItem value="individual">Individuale</SelectItem>
            <SelectItem value="composite">Compuse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStock} onValueChange={setFilterStock}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status stoc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tot stocul</SelectItem>
            <SelectItem value="low">Stoc scăzut</SelectItem>
            <SelectItem value="active">Doar active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>SKU</TableHead>
              <TableHead>Nume</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead className="text-center">Stoc</TableHead>
              <TableHead>Unitate</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
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
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
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

      {/* Footer info */}
      {items.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {items.length} articole afișate
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
                <span className="block mt-2 text-yellow-600">
                  Atenție: Acest articol este mapat la {itemToDelete._count.mappedProducts} produse.
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
    </div>
  );
}
