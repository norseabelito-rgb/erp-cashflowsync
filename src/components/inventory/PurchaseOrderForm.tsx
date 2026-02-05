"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Package,
  Building2,
  Calendar,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  costPrice?: number;
}

interface OrderItem {
  inventoryItemId: string;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  unitPrice: number | null;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  supplierId: string;
  expectedDate: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    inventoryItemId: string;
    quantityOrdered: number;
    unitPrice: number | null;
    inventoryItem: InventoryItem;
  }>;
  supplier: Supplier;
}

interface PurchaseOrderFormProps {
  initialData?: PurchaseOrder;
  onSuccess: (order: PurchaseOrder) => void;
}

export function PurchaseOrderForm({ initialData, onSuccess }: PurchaseOrderFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditMode = !!initialData;

  // Form state
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || "");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [expectedDate, setExpectedDate] = useState(
    initialData?.expectedDate ? initialData.expectedDate.split("T")[0] : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (initialData?.items) {
      return initialData.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        sku: item.inventoryItem.sku,
        name: item.inventoryItem.name,
        unit: item.inventoryItem.unit,
        quantityOrdered: Number(item.quantityOrdered),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      }));
    }
    return [];
  });

  // Add item state
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true&limit=200");
      return res.json();
    },
  });

  // Fetch inventory items for search
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-items-search", productSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("isComposite", "false");
      params.set("isActive", "true");
      params.set("limit", "50");
      if (productSearch) {
        params.set("search", productSearch);
      }
      const res = await fetch(`/api/inventory-items?${params}`);
      return res.json();
    },
    enabled: productSearchOpen || productSearch.length > 0,
  });

  const suppliers: Supplier[] = suppliersData?.data || [];
  const availableItems: InventoryItem[] = inventoryData?.data?.items || [];
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      supplierId: string;
      expectedDate?: string;
      notes?: string;
      items: Array<{
        inventoryItemId: string;
        quantityOrdered: number;
        unitPrice?: number;
      }>;
    }) => {
      const url = isEditMode
        ? `/api/purchase-orders/${initialData.id}`
        : "/api/purchase-orders";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast({
          title: "Succes",
          description: isEditMode
            ? "Precomanda a fost actualizata"
            : `Precomanda ${result.data.documentNumber} a fost creata`,
        });
        onSuccess(result.data);
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast({
        title: "Eroare",
        description: "Selecteaza un produs",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(itemQuantity);
    if (!quantity || quantity <= 0) {
      toast({
        title: "Eroare",
        description: "Cantitatea trebuie sa fie pozitiva",
        variant: "destructive",
      });
      return;
    }

    // Check if already exists
    const existingIndex = items.findIndex(
      (i) => i.inventoryItemId === selectedProduct.id
    );

    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...items];
      updated[existingIndex].quantityOrdered += quantity;
      if (itemPrice) {
        updated[existingIndex].unitPrice = parseFloat(itemPrice);
      }
      setItems(updated);
    } else {
      // Add new
      setItems([
        ...items,
        {
          inventoryItemId: selectedProduct.id,
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          unit: selectedProduct.unit,
          quantityOrdered: quantity,
          unitPrice: itemPrice ? parseFloat(itemPrice) : (selectedProduct.costPrice ? Number(selectedProduct.costPrice) : null),
        },
      ]);
    }

    // Reset add form
    setSelectedProduct(null);
    setProductSearch("");
    setItemQuantity("");
    setItemPrice("");
    setProductSearchOpen(false);
  };

  const handleRemoveItem = (inventoryItemId: string) => {
    setItems(items.filter((i) => i.inventoryItemId !== inventoryItemId));
  };

  const handleUpdateQuantity = (inventoryItemId: string, quantity: number) => {
    setItems(
      items.map((i) =>
        i.inventoryItemId === inventoryItemId
          ? { ...i, quantityOrdered: quantity }
          : i
      )
    );
  };

  const handleUpdatePrice = (inventoryItemId: string, price: number | null) => {
    setItems(
      items.map((i) =>
        i.inventoryItemId === inventoryItemId ? { ...i, unitPrice: price } : i
      )
    );
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantityOrdered, 0);
  const totalValue = items.reduce(
    (sum, i) => sum + i.quantityOrdered * (i.unitPrice || 0),
    0
  );

  const handleSubmit = () => {
    if (!supplierId) {
      toast({
        title: "Eroare",
        description: "Selecteaza un furnizor",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Eroare",
        description: "Adauga cel putin un produs",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      supplierId,
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      items: items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        quantityOrdered: i.quantityOrdered,
        unitPrice: i.unitPrice || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Document Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informatii precomanda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Furnizor *
              </Label>
              <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={supplierOpen}
                    className="w-full justify-between"
                  >
                    {selectedSupplier ? selectedSupplier.name : "Selecteaza furnizor..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cauta furnizor..." />
                    <CommandList>
                      <CommandEmpty>Niciun furnizor gasit.</CommandEmpty>
                      <CommandGroup>
                        {suppliers.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.name}
                            onSelect={() => {
                              setSupplierId(supplier.id);
                              setSupplierOpen(false);
                            }}
                          >
                            <span className="font-medium">{supplier.name}</span>
                            {supplier.code && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                ({supplier.code})
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Expected Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data estimata livrare
              </Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observatii</Label>
            <Textarea
              placeholder="Note sau observatii pentru precomanda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produse comandate
          </CardTitle>
          <CardDescription>Adauga produsele care vor fi comandate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add item form */}
          <div className="flex flex-wrap gap-2 items-end p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[250px]">
              <Label>Produs</Label>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedProduct ? (
                      <span>
                        <span className="font-mono text-xs">{selectedProduct.sku}</span>
                        {" - "}
                        {selectedProduct.name}
                      </span>
                    ) : (
                      "Selecteaza produs..."
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Cauta dupa SKU sau nume..."
                      value={productSearch}
                      onValueChange={setProductSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Niciun produs gasit.</CommandEmpty>
                      <CommandGroup>
                        {availableItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => {
                              setSelectedProduct(item);
                              setProductSearchOpen(false);
                              // Pre-fill price from costPrice
                              if (item.costPrice) {
                                setItemPrice(Number(item.costPrice).toString());
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1 rounded">
                                {item.sku}
                              </span>
                              <span>{item.name}</span>
                              <span className="text-muted-foreground text-xs ml-auto">
                                {item.unit}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-28">
              <Label>Cantitate *</Label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="w-32">
              <Label>Pret unitar (RON)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="button" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adauga
            </Button>
          </div>

          {/* Items table */}
          {items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Produs</TableHead>
                    <TableHead className="text-right w-[120px]">Cantitate</TableHead>
                    <TableHead className="text-right w-[140px]">Pret unitar</TableHead>
                    <TableHead className="text-right w-[120px]">Valoare</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.inventoryItemId}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="w-24 text-right ml-auto"
                          value={item.quantityOrdered}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.inventoryItemId,
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 text-right ml-auto"
                          value={item.unitPrice ?? ""}
                          onChange={(e) =>
                            handleUpdatePrice(
                              item.inventoryItemId,
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="-"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.unitPrice
                          ? formatCurrency(item.quantityOrdered * item.unitPrice)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.inventoryItemId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {items.length} produse, {Math.round(totalQuantity)} unitati total
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-2">
                      Valoare totala:
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg border-dashed">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">
                Niciun produs adaugat inca
              </p>
              <p className="text-sm text-muted-foreground">
                Selecteaza produse din inventar si adauga cantitatile dorite
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Modificarile vor fi salvate ca ciorna."
            : "Precomanda va fi salvata ca ciorna. Poti sa o aprobi ulterior."}
        </p>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/inventory/purchase-orders")}
          >
            Anuleaza
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || items.length === 0 || !supplierId}
          >
            {saveMutation.isPending ? (
              "Se salveaza..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? "Salveaza modificarile" : "Salveaza precomanda"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
