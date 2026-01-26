"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ChefHat,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  unit: string;
  costPrice?: number;
  isComposite: boolean;
}

interface RecipeComponent {
  componentItemId: string;
  componentItem?: InventoryItem;
  quantity: number;
  unit?: string;
}

interface CompositeItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  recipeComponents: Array<{
    id: string;
    quantity: number;
    unit?: string;
    componentItem: InventoryItem;
  }>;
}

export default function RecipeEditPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const itemId = params.id as string;

  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch composite item details
  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ["inventory-item", itemId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-items/${itemId}`);
      return res.json();
    },
  });

  // Fetch available individual items for components
  const { data: availableItems } = useQuery({
    queryKey: ["inventory-items-individual"],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-items?isComposite=false&limit=500`);
      return res.json();
    },
  });

  const item: CompositeItem | null = itemData?.data || null;
  const individualItems: InventoryItem[] = availableItems?.data?.items || [];

  // Initialize components from fetched data
  useEffect(() => {
    if (item?.recipeComponents) {
      setComponents(
        item.recipeComponents.map((comp) => ({
          componentItemId: comp.componentItem.id,
          componentItem: comp.componentItem,
          quantity: Number(comp.quantity),
          unit: comp.unit || comp.componentItem.unit,
        }))
      );
    }
  }, [item]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { compositeItemId: string; components: RecipeComponent[] }) => {
      const res = await fetch(`/api/inventory-items/recipes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compositeItemId: data.compositeItemId,
          components: data.components.map((c) => ({
            componentItemId: c.componentItemId,
            quantity: c.quantity,
            unit: c.unit,
          })),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-item", itemId] });
        queryClient.invalidateQueries({ queryKey: ["inventory-recipes"] });
        toast({
          title: "Succes",
          description: data.message || "Rețeta a fost salvată",
        });
        setHasChanges(false);
      } else {
        toast({
          title: "Eroare",
          description: data.error,
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      compositeItemId: itemId,
      components,
    });
  };

  const handleAddComponent = (itemToAdd: InventoryItem) => {
    // Check if already added
    if (components.some((c) => c.componentItemId === itemToAdd.id)) {
      toast({
        title: "Atenție",
        description: "Acest ingredient este deja în rețetă",
        variant: "destructive",
      });
      return;
    }

    setComponents([
      ...components,
      {
        componentItemId: itemToAdd.id,
        componentItem: itemToAdd,
        quantity: 1,
        unit: itemToAdd.unit,
      },
    ]);
    setHasChanges(true);
    setAddDialogOpen(false);
    setSearchTerm("");
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...components];
    updated[index].quantity = quantity;
    setComponents(updated);
    setHasChanges(true);
  };

  // Calculate totals
  const recipeCost = components.reduce((sum, comp) => {
    const cost = comp.componentItem?.costPrice || 0;
    return sum + Number(cost) * comp.quantity;
  }, 0);

  const canProduce = components.length > 0
    ? Math.min(
        ...components.map((comp) => {
          if (!comp.componentItem || comp.quantity <= 0) return 0;
          return Math.floor(Number(comp.componentItem.currentStock) / comp.quantity);
        })
      )
    : 0;

  // Filter available items for adding
  const filteredItems = individualItems.filter(
    (i) =>
      !components.some((c) => c.componentItemId === i.id) &&
      (i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (itemLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-status-warning" />
        <h2 className="text-xl font-semibold mb-2">Articol negăsit</h2>
        <p className="text-muted-foreground mb-4">
          Articolul cu ID-ul specificat nu există sau nu este compus.
        </p>
        <Button onClick={() => router.push("/inventory/recipes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la rețetar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventory/recipes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <ChefHat className="h-8 w-8" />
              Rețetă: {item.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              SKU: {item.sku} | Unitate: {item.unit}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/inventory/${item.id}`)}
          >
            <Package className="h-4 w-4 mr-2" />
            Vezi articolul
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Se salvează..." : "Salvează rețeta"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Components list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ingrediente rețetă</CardTitle>
                <CardDescription>
                  Definește componentele necesare pentru producție
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă ingredient
              </Button>
            </CardHeader>
            <CardContent>
              {components.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">
                    Nu sunt ingrediente definite în rețetă
                  </p>
                  <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă primul ingredient
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-center">Cantitate</TableHead>
                      <TableHead className="text-center">Stoc disponibil</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map((comp, index) => (
                      <TableRow key={comp.componentItemId}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {comp.componentItem?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comp.componentItem?.sku}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={comp.quantity}
                              onChange={(e) =>
                                handleQuantityChange(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-24 text-center"
                            />
                            <span className="text-muted-foreground">
                              {comp.unit || comp.componentItem?.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              Number(comp.componentItem?.currentStock || 0) >= comp.quantity
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {Math.round(Number(comp.componentItem?.currentStock || 0))}{" "}
                            {comp.componentItem?.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {comp.componentItem?.costPrice
                            ? formatCurrency(Number(comp.componentItem.costPrice) * comp.quantity)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveComponent(index)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Sidebar - Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rezumat rețetă</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ingrediente:</span>
                <span className="font-medium">{components.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cost total rețetă:</span>
                <span className="font-medium">{formatCurrency(recipeCost)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Producție posibilă:</span>
                  <Badge variant={canProduce > 0 ? "success" : "destructive"}>
                    {canProduce} {item.unit}
                  </Badge>
                </div>
                {canProduce === 0 && components.length > 0 && (
                  <p className="text-xs text-destructive mt-2">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Stoc insuficient pentru cel puțin un ingredient
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {components.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Limitări stoc</CardTitle>
                <CardDescription>
                  Ingredientele cu stoc insuficient
                </CardDescription>
              </CardHeader>
              <CardContent>
                {components.filter(
                  (c) => Number(c.componentItem?.currentStock || 0) < c.quantity
                ).length === 0 ? (
                  <div className="flex items-center gap-2 text-status-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Toate ingredientele au stoc suficient</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {components
                      .filter((c) => Number(c.componentItem?.currentStock || 0) < c.quantity)
                      .map((comp) => (
                        <li
                          key={comp.componentItemId}
                          className="text-sm flex items-center gap-2 text-destructive"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>
                            {comp.componentItem?.name}: necesar {comp.quantity}, disponibil{" "}
                            {Math.round(Number(comp.componentItem?.currentStock || 0))}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {hasChanges && (
            <Card className="border-status-warning">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-status-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Ai modificări nesalvate</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Component Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adaugă ingredient</DialogTitle>
            <DialogDescription>
              Selectează un articol individual din inventar
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după SKU sau nume..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto border rounded-lg">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm
                  ? "Niciun articol găsit"
                  : "Nu există articole individuale disponibile"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.slice(0, 20).map((i) => (
                  <button
                    key={i.id}
                    className="w-full p-3 text-left hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => handleAddComponent(i)}
                  >
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {i.sku} | Stoc: {Math.round(Number(i.currentStock))} {i.unit}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Anulează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
