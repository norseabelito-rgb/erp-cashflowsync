"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Package,
  Building2,
  FileText,
  Calendar,
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
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface ReceiptItem {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
}

export default function NewGoodsReceiptPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [supplierId, setSupplierId] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");

  // Items state
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnitCost, setItemUnitCost] = useState("");

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true");
      return res.json();
    },
  });

  // Fetch inventory items (non-composite only)
  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-for-receipt"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?isComposite=false&isActive=true&limit=500");
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      supplierId?: string;
      documentNumber?: string;
      documentDate?: string;
      notes?: string;
      items: Array<{
        itemId: string;
        quantity: number;
        unitCost?: number;
      }>;
    }) => {
      const res = await fetch("/api/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        toast({
          title: "Succes",
          description: `Recepția ${result.data.receiptNumber} a fost creată`,
        });
        router.push(`/inventory/receipts/${result.data.id}`);
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  const suppliers = suppliersData?.data || [];
  const availableItems = itemsData?.data?.items || [];

  const handleAddItem = () => {
    if (!selectedItemId || !itemQuantity) {
      toast({
        title: "Eroare",
        description: "Selectează un articol și introdu cantitatea",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(itemQuantity);
    if (quantity <= 0) {
      toast({
        title: "Eroare",
        description: "Cantitatea trebuie să fie pozitivă",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.id === selectedItemId);
    if (!selectedItem) return;

    // Check if already added - if so, update quantity
    const existingIndex = items.findIndex(i => i.itemId === selectedItemId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      if (itemUnitCost) {
        updated[existingIndex].unitCost = parseFloat(itemUnitCost);
      }
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          itemId: selectedItem.id,
          sku: selectedItem.sku,
          name: selectedItem.name,
          unit: selectedItem.unit,
          quantity,
          unitCost: itemUnitCost ? parseFloat(itemUnitCost) : selectedItem.costPrice ? Number(selectedItem.costPrice) : null,
        },
      ]);
    }

    setSelectedItemId("");
    setItemQuantity("");
    setItemUnitCost("");
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(i => i.itemId !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(i => i.itemId === itemId ? { ...i, quantity } : i));
  };

  const handleUpdateItemCost = (itemId: string, unitCost: number | null) => {
    setItems(items.map(i => i.itemId === itemId ? { ...i, unitCost } : i));
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0);

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({
        title: "Eroare",
        description: "Adaugă cel puțin un articol în recepție",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      supplierId: supplierId || undefined,
      documentNumber: documentNumber || undefined,
      documentDate: documentDate || undefined,
      notes: notes || undefined,
      items: items.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost || undefined,
      })),
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventory/receipts")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Recepție nouă
          </h1>
          <p className="text-muted-foreground">Înregistrează intrări în stoc de la furnizor</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Document Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informații document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Furnizor
                </Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează furnizor (opțional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Fără furnizor</SelectItem>
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Număr document/factură
                </Label>
                <Input
                  placeholder="Ex: FA-001234"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data document
                </Label>
                <Input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Note suplimentare (opțional)..."
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
              Articole recepționate
            </CardTitle>
            <CardDescription>
              Adaugă articolele primite și cantitățile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add item form */}
            <div className="flex flex-wrap gap-2 items-end p-4 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-[200px]">
                <Label>Articol</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează articol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="font-mono text-xs">{item.sku}</span> - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label>Cantitate</Label>
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
                <Label>Cost unitar (RON)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemUnitCost}
                  onChange={(e) => setItemUnitCost(e.target.value)}
                  placeholder="Opțional"
                />
              </div>
              <Button type="button" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adaugă
              </Button>
            </div>

            {/* Items table */}
            {items.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>SKU</TableHead>
                      <TableHead>Articol</TableHead>
                      <TableHead className="text-right w-[120px]">Cantitate</TableHead>
                      <TableHead className="text-right w-[140px]">Cost unitar</TableHead>
                      <TableHead className="text-right w-[120px]">Valoare</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="w-24 text-right ml-auto"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQuantity(item.itemId, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 text-right ml-auto"
                            value={item.unitCost ?? ""}
                            onChange={(e) => handleUpdateItemCost(item.itemId, e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="-"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.unitCost ? formatCurrency(item.quantity * item.unitCost) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.itemId)}
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
                      {items.length} articole, {totalQuantity.toFixed(3)} unități total
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground mr-2">Valoare totală:</span>
                      <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg border-dashed">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-2">
                  Niciun articol adăugat încă
                </p>
                <p className="text-sm text-muted-foreground">
                  Selectează articole din inventar și adaugă cantitățile recepționate
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Recepția va fi salvată ca ciornă. Poți să o finalizezi ulterior pentru a actualiza stocul.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/inventory/receipts")}>
              Anulează
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || items.length === 0}>
              {createMutation.isPending ? (
                "Se salvează..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvează recepția
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
