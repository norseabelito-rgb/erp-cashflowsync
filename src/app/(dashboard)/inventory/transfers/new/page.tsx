"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Search,
  Package,
  AlertCircle,
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

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
  isActive: boolean;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface TransferItem {
  itemId: string;
  item: InventoryItem;
  quantity: number;
  availableStock: number;
  notes?: string;
}

export default function NewTransferPage() {
  const router = useRouter();
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  // Fetch warehouses
  const { data: warehousesData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Eroare la incarcarea depozitelor");
      return res.json();
    },
  });

  // Fetch inventory items for selection
  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ["inventory-items-for-transfer", itemSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "50",
        isComposite: "false",
      });
      if (itemSearch) params.append("search", itemSearch);

      const res = await fetch(`/api/inventory-items?${params}`);
      if (!res.ok) throw new Error("Eroare la incarcarea articolelor");
      return res.json();
    },
    enabled: itemSearchOpen,
  });

  // Fetch stock for source warehouse
  const { data: warehouseStockData } = useQuery({
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
      items: { itemId: string; quantity: number; notes?: string }[];
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
  const availableItems: InventoryItem[] = itemsData?.data?.items || [];

  // Get stock map for source warehouse
  const stockMap = new Map<string, number>();
  if (warehouseStockData?.stock) {
    warehouseStockData.stock.forEach((s: any) => {
      stockMap.set(s.itemId, Number(s.currentStock));
    });
  }

  const addItem = (item: InventoryItem) => {
    if (items.find((i) => i.itemId === item.id)) {
      toast({ title: "Articolul este deja adaugat", variant: "destructive" });
      return;
    }

    const availableStock = stockMap.get(item.id) || 0;
    setItems([
      ...items,
      {
        itemId: item.id,
        item,
        quantity: 1,
        availableStock,
      },
    ]);
    setItemSearchOpen(false);
    setItemSearch("");
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(
      items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: Math.max(0, quantity) } : i
      )
    );
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((i) => i.itemId !== itemId));
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
    if (items.length === 0) {
      toast({ title: "Adauga cel putin un articol", variant: "destructive" });
      return;
    }

    // Check quantities
    const invalidItems = items.filter((i) => i.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Toate cantitatile trebuie sa fie mai mari ca 0",
        variant: "destructive",
      });
      return;
    }

    // Check available stock
    const insufficientStock = items.filter((i) => i.quantity > i.availableStock);
    if (insufficientStock.length > 0) {
      toast({
        title: `Stoc insuficient pentru: ${insufficientStock.map((i) => i.item.sku).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      fromWarehouseId,
      toWarehouseId,
      notes,
      items: items.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
      })),
    });
  };

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
                      onValueChange={(value) => {
                        setFromWarehouseId(value);
                        // Reset items when source changes
                        setItems([]);
                      }}
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

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Articole de Transferat</CardTitle>
                <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!fromWarehouseId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adauga Articol
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="end">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Cauta dupa SKU sau nume..."
                        value={itemSearch}
                        onValueChange={setItemSearch}
                      />
                      <CommandList>
                        {loadingItems ? (
                          <div className="p-4 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : availableItems.length === 0 ? (
                          <CommandEmpty>Niciun articol gasit</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {availableItems.map((item) => {
                              const stock = stockMap.get(item.id) || 0;
                              const alreadyAdded = items.some(
                                (i) => i.itemId === item.id
                              );
                              return (
                                <CommandItem
                                  key={item.id}
                                  value={item.id}
                                  onSelect={() => addItem(item)}
                                  disabled={alreadyAdded || stock <= 0}
                                  className="flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-medium">{item.sku}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {item.name}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`text-sm ${
                                        stock <= 0
                                          ? "text-destructive"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      Stoc: {stock} {item.unit}
                                    </p>
                                    {alreadyAdded && (
                                      <p className="text-xs text-amber-600">
                                        Deja adaugat
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                {!fromWarehouseId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Selecteaza depozitul sursa pentru a adauga articole</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Niciun articol adaugat</p>
                    <p className="text-sm">
                      Apasa "Adauga Articol" pentru a selecta articolele de transferat
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Articol</TableHead>
                        <TableHead className="text-right">Disponibil</TableHead>
                        <TableHead className="text-right w-[150px]">
                          Cantitate
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <p className="font-medium">{item.item.sku}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.item.name}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                item.quantity > item.availableStock
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              {item.availableStock} {item.item.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.itemId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min={0}
                              max={item.availableStock}
                              step={0.001}
                              className={`w-[120px] text-right ${
                                item.quantity > item.availableStock
                                  ? "border-destructive"
                                  : ""
                              }`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.itemId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <span className="text-muted-foreground">Articole</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total unitati</span>
                  <span className="font-medium">
                    {items.reduce((sum, i) => sum + i.quantity, 0).toFixed(2)}
                  </span>
                </div>
                {items.some((i) => i.quantity > i.availableStock) && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Stoc insuficient pentru unele articole</span>
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
                  items.length === 0 ||
                  !fromWarehouseId ||
                  !toWarehouseId
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
