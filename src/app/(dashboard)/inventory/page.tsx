"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  RefreshCw,
  Warehouse,
  ArrowDownToLine,
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
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  lowStockAlert: number;
  isActive: boolean;
  category?: string;
  unit: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Fetch inventory din baza de date locală
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ["inventory-full", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/inventory/full?${params}`);
      return res.json();
    },
  });

  // Sync stock mutation - trage din SmartBill și actualizează/creează în DB local
  const syncStockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stock/sync", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "smartbill_to_erp", createMissing: true }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-full"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        toast({ 
          title: "Sincronizare completă", 
          description: data.message || `${data.updates?.length || 0} produse actualizate` 
        });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const products: InventoryProduct[] = inventoryData?.products || [];
  
  // Filtrare locală
  const filteredProducts = search 
    ? products.filter(p => 
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stockQuantity <= p.lowStockAlert && p.stockQuantity > 0).length,
    outOfStock: products.filter(p => p.stockQuantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.stockQuantity * Number(p.price)), 0),
  };

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventar SmartBill</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Stocuri sincronizate din gestiunea SmartBill
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => syncStockMutation.mutate()} 
                disabled={syncStockMutation.isPending}
                size="sm"
                className="md:size-default"
              >
                {syncStockMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 md:mr-2 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Sincronizează din SmartBill</span>
                <span className="md:hidden">Sync</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Importă toate produsele și stocurile din SmartBill în baza de date locală. Creează produse noi și actualizează cantitățile existente.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Warehouse className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Inventarul este sincronizat din SmartBill.</strong> Produsele și stocurile sunt gestionate în SmartBill 
                și importate automat în ERP. Pentru a adăuga sau modifica produse, folosește interfața SmartBill.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Apasă "Sincronizează din SmartBill" pentru a actualiza stocurile și a importa produse noi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Produse</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Stoc Scăzut</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Fără Stoc</div>
          <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Valoare Totală</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după SKU sau nume..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>SKU</TableHead>
              <TableHead>Nume Produs</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead className="text-right">Preț Vânzare</TableHead>
              <TableHead className="text-right">Preț Achiziție</TableHead>
              <TableHead className="text-center">Stoc</TableHead>
              <TableHead>Unitate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search ? "Niciun produs găsit" : "Nu există produse în inventar"}
                  </p>
                  {!search && (
                    <Button 
                      variant="outline" 
                      onClick={() => syncStockMutation.mutate()}
                      disabled={syncStockMutation.isPending}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-2" />
                      Importă din SmartBill
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm font-medium">{product.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(product.price))}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(Number(product.costPrice))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        product.stockQuantity === 0
                          ? "destructive"
                          : product.stockQuantity <= product.lowStockAlert
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {product.stockQuantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.unit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      {products.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {filteredProducts.length} din {products.length} produse afișate
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
