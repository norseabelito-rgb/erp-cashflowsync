"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Layers,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Minus,
  History,
  Link2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  trackLots: boolean;
  createdAt: string;
  updatedAt: string;
  availableStock?: number;
  supplier?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
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
      costPrice?: number;
    };
  }>;
  usedInRecipes?: Array<{
    id: string;
    quantity: number;
    compositeItem: {
      id: string;
      sku: string;
      name: string;
    };
  }>;
  mappedProducts?: Array<{
    id: string;
    sku: string;
    title: string;
    price: number;
    stock: number;
  }>;
  stockMovements?: Array<{
    id: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    notes?: string;
    userName?: string;
    orderNumber?: string;
    invoiceNumber?: string;
    createdAt: string;
  }>;
  _count?: {
    stockMovements: number;
    mappedProducts: number;
    receiptItems: number;
  };
}

export default function InventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // State
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"plus" | "minus">("plus");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Fetch item details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-item", id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-items/${id}`);
      return res.json();
    },
  });

  // Stock adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      type: string;
      quantity: number;
      reason: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/inventory-items/stock-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-item", id] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({
          title: "Succes",
          description: result.message,
        });
        setAdjustDialogOpen(false);
        resetAdjustForm();
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  const item: InventoryItem | null = data?.data || null;

  const resetAdjustForm = () => {
    setAdjustQuantity("");
    setAdjustReason("");
    setAdjustNotes("");
  };

  const handleAdjustStock = () => {
    if (!adjustQuantity || parseFloat(adjustQuantity) <= 0) {
      toast({
        title: "Eroare",
        description: "Introdu o cantitate validă",
        variant: "destructive",
      });
      return;
    }

    adjustMutation.mutate({
      itemId: id,
      type: adjustType === "plus" ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
      quantity: parseFloat(adjustQuantity),
      reason: adjustReason || (adjustType === "plus" ? "Intrare manuală" : "Ieșire manuală"),
      notes: adjustNotes,
    });
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      RECEIPT: { variant: "default", label: "Recepție" },
      SALE: { variant: "destructive", label: "Vânzare" },
      ADJUSTMENT_PLUS: { variant: "secondary", label: "Ajustare +" },
      ADJUSTMENT_MINUS: { variant: "outline", label: "Ajustare -" },
      RECIPE_OUT: { variant: "destructive", label: "Producție" },
      RETURN: { variant: "default", label: "Retur" },
      TRANSFER: { variant: "secondary", label: "Transfer" },
    };
    const config = variants[type] || { variant: "outline" as const, label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">Articol negăsit</h2>
          <p className="text-muted-foreground mb-4">
            Articolul căutat nu există sau a fost șters.
          </p>
          <Button onClick={() => router.push("/inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la inventar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">{item.name}</h1>
              {item.isComposite && (
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  Compus
                </Badge>
              )}
              {!item.isActive && (
                <Badge variant="destructive">Inactiv</Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono">{item.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button variant="outline" onClick={() => router.push(`/inventory/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editează
          </Button>
          {!item.isComposite && (
            <Button onClick={() => setAdjustDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajustare stoc
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informații generale</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">SKU</Label>
                <p className="font-mono">{item.sku}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Unitate</Label>
                <p>
                  {item.unit}
                  {item.unitsPerBox && ` (${item.unitsPerBox}/${item.boxUnit || "bax"})`}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cost unitar</Label>
                <p>{item.costPrice ? formatCurrency(Number(item.costPrice)) : "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Furnizor</Label>
                <p>{item.supplier?.name || "-"}</p>
              </div>
              {item.description && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Descriere</Label>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipe Components (for composite items) */}
          {item.isComposite && item.recipeComponents && item.recipeComponents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Componente rețetă
                </CardTitle>
                <CardDescription>
                  Articolele necesare pentru a produce 1 {item.unit} din {item.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nume</TableHead>
                      <TableHead className="text-right">Necesar</TableHead>
                      <TableHead className="text-right">Stoc disponibil</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.recipeComponents.map((comp) => {
                      const available = Math.floor(
                        Number(comp.componentItem.currentStock) / Number(comp.quantity)
                      );
                      const isLow = available < 10;
                      return (
                        <TableRow
                          key={comp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/inventory/${comp.componentItem.id}`)}
                        >
                          <TableCell className="font-mono">{comp.componentItem.sku}</TableCell>
                          <TableCell>{comp.componentItem.name}</TableCell>
                          <TableCell className="text-right">
                            {Number(comp.quantity)} {comp.unit || comp.componentItem.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={isLow ? "warning" : "secondary"}>
                              {comp.componentItem.currentStock} {comp.componentItem.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {comp.componentItem.costPrice
                              ? formatCurrency(Number(comp.componentItem.costPrice) * Number(comp.quantity))
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {item.availableStock !== null && item.availableStock !== undefined && (
                  <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                    <span className="font-medium">Unități producibile (stoc disponibil):</span>
                    <Badge variant={item.availableStock > 0 ? "default" : "destructive"} className="text-lg px-4 py-1">
                      {item.availableStock} {item.unit}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Used in Recipes */}
          {item.usedInRecipes && item.usedInRecipes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Folosit în produse compuse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.usedInRecipes.map((recipe) => (
                    <Badge
                      key={recipe.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/inventory/${recipe.compositeItem.id}`)}
                    >
                      {recipe.compositeItem.name} ({recipe.quantity} {item.unit})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Mișcări stoc recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.stockMovements && item.stockMovements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead className="text-right">Cantitate</TableHead>
                      <TableHead className="text-right">Stoc nou</TableHead>
                      <TableHead>Motiv</TableHead>
                      <TableHead>Utilizator</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.stockMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{getMovementTypeBadge(movement.type)}</TableCell>
                        <TableCell className="text-right">
                          <span className={Number(movement.quantity) > 0 ? "text-status-success" : "text-status-error"}>
                            {Number(movement.quantity) > 0 ? "+" : ""}{movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{movement.newStock}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {movement.reason || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.userName || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nicio mișcare de stoc înregistrată
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stock & Mapped Products */}
        <div className="space-y-6">
          {/* Stock Card */}
          <Card className={!item.isComposite && item.minStock && Number(item.currentStock) <= Number(item.minStock) ? "border-status-warning" : ""}>
            <CardHeader>
              <CardTitle>Stoc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.isComposite ? (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Stoc disponibil (calculat)</p>
                    <p className="text-4xl font-bold">
                      {item.availableStock !== null && item.availableStock !== undefined
                        ? item.availableStock
                        : "N/A"}
                    </p>
                    <p className="text-muted-foreground">{item.unit}</p>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Articolele compuse nu au stoc propriu. Stocul disponibil este calculat din componente.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Stoc curent</p>
                    <p className="text-4xl font-bold">{Number(item.currentStock)}</p>
                    <p className="text-muted-foreground">{item.unit}</p>
                  </div>
                  {item.minStock && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stoc minim alertă:</span>
                      <span className="font-medium">{Number(item.minStock)} {item.unit}</span>
                    </div>
                  )}
                  {item.minStock && Number(item.currentStock) <= Number(item.minStock) && (
                    <div className="flex items-center gap-2 p-3 bg-status-warning/10 dark:bg-status-warning/20 rounded-lg text-status-warning dark:text-status-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Stocul este sub limita minimă!</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Mapped Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Produse mapate
              </CardTitle>
              <CardDescription>
                Produse din catalog legate de acest articol
              </CardDescription>
            </CardHeader>
            <CardContent>
              {item.mappedProducts && item.mappedProducts.length > 0 ? (
                <div className="space-y-2">
                  {item.mappedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                        <Badge variant="secondary">{formatCurrency(Number(product.price))}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-2">
                    Niciun produs mapat
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push("/inventory/mapping")}>
                    Mapare produse
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistici</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mișcări stoc:</span>
                <span className="font-medium">{item._count?.stockMovements || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Produse mapate:</span>
                <span className="font-medium">{item._count?.mappedProducts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recepții:</span>
                <span className="font-medium">{item._count?.receiptItems || 0}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">Creat:</span>
                <span className="text-sm">{formatDate(item.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizat:</span>
                <span className="text-sm">{formatDate(item.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustare stoc</DialogTitle>
            <DialogDescription>
              Ajustează manual stocul pentru {item.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={adjustType === "plus" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("plus")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Intrare
              </Button>
              <Button
                variant={adjustType === "minus" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("minus")}
              >
                <Minus className="h-4 w-4 mr-2" />
                Ieșire
              </Button>
            </div>
            <div>
              <Label>Cantitate ({item.unit})</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
            <div>
              <Label>Motiv</Label>
              <Select value={adjustReason} onValueChange={setAdjustReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează motivul" />
                </SelectTrigger>
                <SelectContent>
                  {adjustType === "plus" ? (
                    <>
                      <SelectItem value="Inventar - surplus găsit">Inventar - surplus găsit</SelectItem>
                      <SelectItem value="Corecție eroare introducere">Corecție eroare introducere</SelectItem>
                      <SelectItem value="Retur intern">Retur intern</SelectItem>
                      <SelectItem value="Alt motiv">Alt motiv</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Inventar - lipsă constatată">Inventar - lipsă constatată</SelectItem>
                      <SelectItem value="Pierderi/deteriorări">Pierderi/deteriorări</SelectItem>
                      <SelectItem value="Consum intern">Consum intern</SelectItem>
                      <SelectItem value="Corecție eroare introducere">Corecție eroare introducere</SelectItem>
                      <SelectItem value="Alt motiv">Alt motiv</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (opțional)</Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Detalii suplimentare..."
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Stoc curent:</span>
                <span className="font-medium">{Number(item.currentStock)} {item.unit}</span>
              </div>
              {adjustQuantity && (
                <div className="flex justify-between text-sm mt-1">
                  <span>Stoc după ajustare:</span>
                  <span className={`font-medium ${
                    adjustType === "plus" ? "text-status-success" : "text-status-error"
                  }`}>
                    {adjustType === "plus"
                      ? Number(item.currentStock) + parseFloat(adjustQuantity || "0")
                      : Number(item.currentStock) - parseFloat(adjustQuantity || "0")
                    } {item.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={adjustMutation.isPending || !adjustQuantity}
            >
              {adjustMutation.isPending ? "Se salvează..." : "Salvează ajustarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
