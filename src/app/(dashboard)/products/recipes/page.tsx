"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Trash2,
  Save,
  Search,
  Loader2,
  ChevronRight,
  Beaker,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Component {
  componentId: string;
  componentSku: string;
  componentTitle: string;
  quantity: number;
  unit: string;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  isComposite: boolean;
  componentsCount?: number;
  components?: Component[];
}

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editComponents, setEditComponents] = useState<Component[]>([]);
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");

  // Fetch lista produse compuse
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await fetch("/api/products/recipes");
      return res.json();
    },
  });

  // Fetch toate produsele pentru selector
  const { data: allProductsData } = useQuery({
    queryKey: ["all-products-for-recipe"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=1000");
      return res.json();
    },
  });

  // Fetch rețeta unui produs specific
  const { data: recipeDetail, isLoading: recipeLoading } = useQuery({
    queryKey: ["recipe", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const res = await fetch(`/api/products/recipes?productId=${selectedProduct.id}`);
      return res.json();
    },
    enabled: !!selectedProduct?.id,
  });

  // Mutation pentru salvare rețetă
  const saveMutation = useMutation({
    mutationFn: async (data: { productId: string; components: Component[] }) => {
      const res = await fetch("/api/products/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: data.productId,
          components: data.components.map((c) => ({
            componentId: c.componentId,
            quantity: c.quantity,
            unit: c.unit,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la salvare");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rețeta a fost salvată" });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe", selectedProduct?.id] });
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Mutation pentru ștergere rețetă
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/products/recipes?productId=${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Eroare la ștergere");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rețeta a fost ștearsă" });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const compositeProducts: Product[] = recipesData?.products || [];
  const allProducts = allProductsData?.products || [];

  const filteredProducts = compositeProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEdit = () => {
    if (recipeDetail?.recipe) {
      setEditComponents(
        recipeDetail.recipe.map((r: any) => ({
          componentId: r.componentId,
          componentSku: r.componentSku,
          componentTitle: r.componentTitle,
          quantity: r.quantity,
          unit: r.unit || "buc",
        }))
      );
    } else {
      setEditComponents([]);
    }
    setEditMode(true);
  };

  const handleAddComponent = (product: any) => {
    // Verificăm să nu fie deja în listă
    if (editComponents.some((c) => c.componentId === product.id)) {
      toast({ title: "Componenta există deja în rețetă", variant: "destructive" });
      return;
    }
    // Verificăm să nu fie produsul părinte
    if (product.id === selectedProduct?.id) {
      toast({ title: "Un produs nu poate fi component al lui însuși", variant: "destructive" });
      return;
    }

    setEditComponents([
      ...editComponents,
      {
        componentId: product.id,
        componentSku: product.sku,
        componentTitle: product.title,
        quantity: 1,
        unit: "buc",
      },
    ]);
    setAddComponentOpen(false);
    setComponentSearch("");
  };

  const handleRemoveComponent = (componentId: string) => {
    setEditComponents(editComponents.filter((c) => c.componentId !== componentId));
  };

  const handleQuantityChange = (componentId: string, quantity: number) => {
    setEditComponents(
      editComponents.map((c) =>
        c.componentId === componentId ? { ...c, quantity: Math.max(0.001, quantity) } : c
      )
    );
  };

  const handleSave = () => {
    if (!selectedProduct) return;
    saveMutation.mutate({
      productId: selectedProduct.id,
      components: editComponents,
    });
  };

  // Produse disponibile pentru a adăuga ca component
  const availableProducts = allProducts.filter(
    (p: any) =>
      p.id !== selectedProduct?.id &&
      !editComponents.some((c) => c.componentId === p.id) &&
      (componentSearch === "" ||
        p.title.toLowerCase().includes(componentSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(componentSearch.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            Rețete Produse
          </h1>
          <p className="text-muted-foreground">
            Gestionează rețetele pentru produsele compuse
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lista produse compuse */}
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Produse Compuse</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {recipesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Beaker className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nu există produse compuse</p>
                <p className="text-sm">Selectează un produs și adaugă componente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setEditMode(false);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedProduct?.id === product.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm opacity-70">{product.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{product.componentsCount} comp.</Badge>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Buton pentru a adăuga rețetă la un produs existent */}
            <div className="mt-4 pt-4 border-t">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă rețetă la produs
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Caută produs..." />
                    <CommandList>
                      <CommandEmpty>Nu s-a găsit.</CommandEmpty>
                      <CommandGroup>
                        {allProducts
                          .filter((p: any) => !p.isComposite)
                          .slice(0, 20)
                          .map((product: any) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => {
                                setSelectedProduct({
                                  id: product.id,
                                  sku: product.sku,
                                  title: product.title,
                                  isComposite: false,
                                });
                                setEditComponents([]);
                                setEditMode(true);
                              }}
                            >
                              <Package className="mr-2 h-4 w-4" />
                              <div>
                                <p className="font-medium">{product.title}</p>
                                <p className="text-xs text-muted-foreground">{product.sku}</p>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Detalii rețetă */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedProduct ? (
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {selectedProduct.title}
                    <Badge variant="outline" className="font-mono">
                      {selectedProduct.sku}
                    </Badge>
                  </span>
                ) : (
                  "Selectează un produs"
                )}
              </CardTitle>
              {selectedProduct && !editMode && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    Editează
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedProduct.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {editMode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Anulează
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Salvează
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedProduct ? (
              <div className="text-center py-12 text-muted-foreground">
                <Beaker className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Selectează un produs din stânga pentru a vedea sau edita rețeta</p>
              </div>
            ) : recipeLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : editMode ? (
              // Mod editare
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Componente</h3>
                  <Popover open={addComponentOpen} onOpenChange={setAddComponentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Adaugă component
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Caută produs..."
                          value={componentSearch}
                          onValueChange={setComponentSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nu s-a găsit.</CommandEmpty>
                          <CommandGroup>
                            {availableProducts.slice(0, 20).map((product: any) => (
                              <CommandItem
                                key={product.id}
                                onSelect={() => handleAddComponent(product)}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                <div>
                                  <p className="font-medium">{product.title}</p>
                                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {editComponents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Nu există componente</p>
                    <p className="text-sm">Adaugă componente pentru a crea rețeta</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editComponents.map((comp) => (
                      <div
                        key={comp.componentId}
                        className="flex items-center gap-4 p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{comp.componentTitle}</p>
                          <p className="text-sm text-muted-foreground">{comp.componentSku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={comp.quantity}
                            onChange={(e) =>
                              handleQuantityChange(comp.componentId, parseFloat(e.target.value) || 1)
                            }
                            className="w-20 text-center"
                            min="0.001"
                            step="0.001"
                          />
                          <span className="text-sm text-muted-foreground">{comp.unit}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComponent(comp.componentId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Mod vizualizare
              <div className="space-y-4">
                {recipeDetail?.recipe?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Acest produs nu are rețetă definită</p>
                    <Button variant="outline" className="mt-4" onClick={handleStartEdit}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă componente
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-medium mb-3">
                      Pentru 1 bucată de <strong>{selectedProduct.title}</strong> ai nevoie de:
                    </h3>
                    {recipeDetail?.recipe?.map((comp: any) => (
                      <div
                        key={comp.componentId}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{comp.componentTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {comp.componentSku}
                              {comp.componentLocation && ` • ${comp.componentLocation}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            Stoc: {comp.componentStock}
                          </Badge>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {comp.quantity} {comp.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
