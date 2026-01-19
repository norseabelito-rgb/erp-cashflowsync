"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Package,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
  isActive: boolean;
}

interface WarehouseStockItem {
  itemId: string;
  currentStock: number;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
}

interface SelectedItem {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  availableStock: number;
}

export default function NewTransferPage() {
  const router = useRouter();
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch warehouses
  const { data: warehousesData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Eroare la incarcarea depozitelor");
      return res.json();
    },
  });

  // Fetch stock for source warehouse
  const { data: warehouseStockData, isLoading: loadingStock } = useQuery({
    queryKey: ["warehouse-stock", fromWarehouseId],
    queryFn: async () => {
      if (!fromWarehouseId) return null;
      const res = await fetch(`/api/warehouses/${fromWarehouseId}/stock?limit=1000`);
      if (!res.ok) throw new Error("Eroare la incarcarea stocului");
      return res.json();
    },
    enabled: !!fromWarehouseId,
  });

  // Create transfer mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      fromWarehouseId: string;
      toWarehouseId: string;
      notes: string;
      items: { itemId: string; quantity: number }[];
    }) => {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la crearea transferului");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Transfer creat cu succes" });
      router.push(`/inventory/transfers/${data.transfer.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const warehouses: Warehouse[] = warehousesData?.warehouses?.filter((w: Warehouse) => w.isActive) || [];

  // Stock items from source warehouse with positive stock
  const stockItems: WarehouseStockItem[] = useMemo(() => {
    if (!warehouseStockData?.stock) return [];
    return warehouseStockData.stock.filter((s: WarehouseStockItem) => Number(s.currentStock) > 0);
  }, [warehouseStockData]);

  // Filter items by search
  const filteredStockItems = useMemo(() => {
    if (!searchQuery.trim()) return stockItems;
    const query = searchQuery.toLowerCase();
    return stockItems.filter(
      (s) =>
        s.item.sku.toLowerCase().includes(query) ||
        s.item.name.toLowerCase().includes(query)
    );
  }, [stockItems, searchQuery]);

  // Reset selections when source warehouse changes
  useEffect(() => {
    setSelectedItems(new Map());
  }, [fromWarehouseId]);

  const toggleItemSelection = (stockItem: WarehouseStockItem) => {
    const newSelected = new Map(selectedItems);
    const itemId = stockItem.itemId;

    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.set(itemId, {
        itemId,
        sku: stockItem.item.sku,
        name: stockItem.item.name,
        unit: stockItem.item.unit,
        quantity: 1,
        availableStock: Number(stockItem.currentStock),
      });
    }
    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemId);
    if (item) {
      newSelected.set(itemId, { ...item, quantity: Math.max(0, quantity) });
      setSelectedItems(newSelected);
    }
  };

  const selectAll = () => {
    const newSelected = new Map<string, SelectedItem>();
    filteredStockItems.forEach((stockItem) => {
      newSelected.set(stockItem.itemId, {
        itemId: stockItem.itemId,
        sku: stockItem.item.sku,
        name: stockItem.item.name,
        unit: stockItem.item.unit,
        quantity: 1,
        availableStock: Number(stockItem.currentStock),
      });
    });
    setSelectedItems(newSelected);
  };

  const deselectAll = () => {
    setSelectedItems(new Map());
  };

  const handleCreate = () => {
    if (!fromWarehouseId) {
      toast({ title: "Selecteaza depozitul sursa", variant: "destructive" });
      return;
    }
    if (!toWarehouseId) {
      toast({ title: "Selecteaza depozitul destinatie", variant: "destructive" });
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast({
        title: "Depozitele trebuie sa fie diferite",
        variant: "destructive",
      });
      return;
    }
    if (selectedItems.size === 0) {
      toast({ title: "Selecteaza cel putin un articol", variant: "destructive" });
      return;
    }

    // Check quantities
    const itemsArray = Array.from(selectedItems.values());
    const invalidItems = itemsArray.filter((i) => i.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Toate cantitatile trebuie sa fie mai mari ca 0",
        variant: "destructive",
      });
      return;
    }

    // Check available stock
    const insufficientStock = itemsArray.filter((i) => i.quantity > i.availableStock);
    if (insufficientStock.length > 0) {
      toast({
        title: `Stoc insuficient pentru: ${insufficientStock.map((i) => i.sku).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      fromWarehouseId,
      toWarehouseId,
      notes,
      items: itemsArray.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
      })),
    });
  };

  const selectedItemsArray = Array.from(selectedItems.values());
  const hasInsufficientStock = selectedItemsArray.some((i) => i.quantity > i.availableStock);
  const allFilteredSelected = filteredStockItems.length > 0 &&
    filteredStockItems.every((s) => selectedItems.has(s.itemId));

  if (loadingWarehouses) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Transfer Nou</h1>
          <p className="text-muted-foreground">
            Creeaza un transfer de stoc intre depozite
          </p>
        </div>
      </div>

      {warehouses.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Depozite insuficiente</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ai nevoie de cel putin 2 depozite active pentru a crea un transfer.
            </p>
            <Button onClick={() => router.push("/settings/warehouses")}>
              Gestioneaza Depozite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warehouses Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Directia Transferului</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Din depozitul</Label>
                    <Select
                      value={fromWarehouseId}
                      onValueChange={setFromWarehouseId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteaza sursa" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses
                          .filter((w) => w.id !== toWarehouseId)
                          .map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name} ({wh.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ArrowRight className="h-6 w-6 text-muted-foreground mt-6" />

                  <div className="flex-1 space-y-2">
                    <Label>In depozitul</Label>
                    <Select
                      value={toWarehouseId}
                      onValueChange={setToWarehouseId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteaza destinatia" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses
                          .filter((w) => w.id !== fromWarehouseId)
                          .map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name} ({wh.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Selection with Checkboxes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selecteaza Articolele</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!fromWarehouseId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Selecteaza depozitul sursa pentru a vedea articolele disponibile</p>
                  </div>
                ) : loadingStock ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stockItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nu exista articole cu stoc in acest depozit</p>
                  </div>
                ) : (
                  <>
                    {/* Search and Select All */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cauta dupa SKU sau nume..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={allFilteredSelected ? deselectAll : selectAll}
                        >
                          {allFilteredSelected ? (
                            <>
                              <Square className="h-4 w-4 mr-2" />
                              Deselecteaza toate
                            </>
                          ) : (
                            <>
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Selecteaza toate ({filteredStockItems.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Articol</TableHead>
                            <TableHead className="text-right">Disponibil</TableHead>
                            <TableHead className="text-right w-[150px]">Cantitate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStockItems.map((stockItem) => {
                            const isSelected = selectedItems.has(stockItem.itemId);
                            const selectedItem = selectedItems.get(stockItem.itemId);
                            const availableStock = Number(stockItem.currentStock);
                            const hasError = selectedItem && selectedItem.quantity > availableStock;

                            return (
                              <TableRow
                                key={stockItem.itemId}
                                className={isSelected ? "bg-muted/50" : ""}
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(stockItem)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div
                                    className="cursor-pointer"
                                    onClick={() => toggleItemSelection(stockItem)}
                                  >
                                    <p className="font-medium font-mono text-sm">
                                      {stockItem.item.sku}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {stockItem.item.name}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">
                                    {availableStock} {stockItem.item.unit}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {isSelected ? (
                                    <Input
                                      type="number"
                                      value={selectedItem?.quantity || 0}
                                      onChange={(e) =>
                                        updateItemQuantity(
                                          stockItem.itemId,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      min={0}
                                      max={availableStock}
                                      step={0.001}
                                      className={`w-[120px] text-right ${
                                        hasError ? "border-destructive" : ""
                                      }`}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {filteredStockItems.length === 0 && searchQuery && (
                      <p className="text-center text-muted-foreground py-4">
                        Niciun articol gasit pentru "{searchQuery}"
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observatii</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observatii pentru transfer (optional)"
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sumar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Articole selectate</span>
                  <span className="font-medium">{selectedItems.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total unitati</span>
                  <span className="font-medium">
                    {selectedItemsArray.reduce((sum, i) => sum + i.quantity, 0).toFixed(2)}
                  </span>
                </div>
                {hasInsufficientStock && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Stoc insuficient pentru unele articole</span>
                  </div>
                )}

                {/* Selected Items Preview */}
                {selectedItemsArray.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-sm font-medium">Articole selectate:</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {selectedItemsArray.map((item) => (
                        <div
                          key={item.itemId}
                          className={`flex justify-between text-xs p-2 rounded ${
                            item.quantity > item.availableStock
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted"
                          }`}
                        >
                          <span className="truncate flex-1">{item.sku}</span>
                          <span className="ml-2">
                            {item.quantity} / {item.availableStock}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  selectedItems.size === 0 ||
                  !fromWarehouseId ||
                  !toWarehouseId ||
                  hasInsufficientStock
                }
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Creeaza Transfer
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                Anuleaza
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
