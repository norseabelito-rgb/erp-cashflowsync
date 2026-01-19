"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Package,
  Layers,
  Plus,
  Trash2,
  Save,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

// Form validation schema
const inventoryItemSchema = z.object({
  sku: z.string().min(1, "SKU-ul este obligatoriu"),
  name: z.string().min(1, "Numele este obligatoriu"),
  description: z.string().optional().nullable(),
  minStock: z.number().min(0).optional().nullable(),
  unit: z.string().default("buc"),
  unitsPerBox: z.number().min(1).optional().nullable(),
  boxUnit: z.string().optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  supplierId: z.string().optional().nullable(),
});

type InventoryItemForm = z.infer<typeof inventoryItemSchema>;

interface RecipeComponent {
  componentItemId: string;
  componentSku: string;
  componentName: string;
  quantity: number;
  unit: string;
}

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // State for recipe components
  const [recipeComponents, setRecipeComponents] = useState<RecipeComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [componentQuantity, setComponentQuantity] = useState("");

  // Form
  const form = useForm<InventoryItemForm>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      minStock: null,
      unit: "buc",
      unitsPerBox: null,
      boxUnit: null,
      costPrice: null,
      isActive: true,
      supplierId: null,
    },
  });

  // Fetch item details
  const { data: itemData, isLoading: isLoadingItem } = useQuery({
    queryKey: ["inventory-item", id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-items/${id}`);
      return res.json();
    },
  });

  const item = itemData?.data;
  const isComposite = item?.isComposite || false;

  // Populate form when data loads
  useEffect(() => {
    if (item) {
      form.reset({
        sku: item.sku,
        name: item.name,
        description: item.description || "",
        minStock: item.minStock ? Number(item.minStock) : null,
        unit: item.unit,
        unitsPerBox: item.unitsPerBox ? Number(item.unitsPerBox) : null,
        boxUnit: item.boxUnit || null,
        costPrice: item.costPrice ? Number(item.costPrice) : null,
        isActive: item.isActive,
        supplierId: item.supplier?.id || null,
      });

      // Set recipe components
      if (item.recipeComponents && item.recipeComponents.length > 0) {
        setRecipeComponents(
          item.recipeComponents.map((rc: any) => ({
            componentItemId: rc.componentItem.id,
            componentSku: rc.componentItem.sku,
            componentName: rc.componentItem.name,
            quantity: Number(rc.quantity),
            unit: rc.unit || rc.componentItem.unit,
          }))
        );
      }
    }
  }, [item, form]);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true");
      return res.json();
    },
  });

  // Fetch inventory items for recipe components
  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-simple"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?isComposite=false&isActive=true&limit=500");
      return res.json();
    },
    enabled: isComposite,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InventoryItemForm & { recipeComponents?: RecipeComponent[] }) => {
      const res = await fetch(`/api/inventory-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          recipeComponents: data.recipeComponents?.map(rc => ({
            componentItemId: rc.componentItemId,
            quantity: rc.quantity,
            unit: rc.unit,
          })),
        }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-item", id] });
        toast({
          title: "Succes",
          description: "Articolul a fost actualizat",
        });
        router.push(`/inventory/${id}`);
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

  const handleAddComponent = () => {
    if (!selectedComponentId || !componentQuantity) {
      toast({
        title: "Eroare",
        description: "Selecteaza un articol si introdu cantitatea",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.id === selectedComponentId);
    if (!selectedItem) return;

    // Check if already added
    if (recipeComponents.some(rc => rc.componentItemId === selectedComponentId)) {
      toast({
        title: "Eroare",
        description: "Acest articol este deja in reteta",
        variant: "destructive",
      });
      return;
    }

    setRecipeComponents([
      ...recipeComponents,
      {
        componentItemId: selectedItem.id,
        componentSku: selectedItem.sku,
        componentName: selectedItem.name,
        quantity: parseFloat(componentQuantity),
        unit: selectedItem.unit,
      },
    ]);

    setSelectedComponentId("");
    setComponentQuantity("");
  };

  const handleRemoveComponent = (componentItemId: string) => {
    setRecipeComponents(recipeComponents.filter(rc => rc.componentItemId !== componentItemId));
  };

  const onSubmit = (data: InventoryItemForm) => {
    if (isComposite && recipeComponents.length === 0) {
      toast({
        title: "Eroare",
        description: "Un articol compus trebuie sa aiba cel putin o componenta in reteta",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      ...data,
      recipeComponents: isComposite ? recipeComponents : undefined,
    });
  };

  if (isLoadingItem) {
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
          <h2 className="text-xl font-semibold mb-2">Articol negasit</h2>
          <p className="text-muted-foreground mb-4">
            Articolul cautat nu exista sau a fost sters.
          </p>
          <Button onClick={() => router.push("/inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Inapoi la inventar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Editeaza articol</h1>
          <p className="text-muted-foreground font-mono">{item.sku}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informatii generale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PROD-001" {...field} disabled />
                      </FormControl>
                      <FormDescription>SKU-ul nu poate fi modificat</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume *</FormLabel>
                      <FormControl>
                        <Input placeholder="Numele articolului" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descriere</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descriere optionala..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <FormLabel>Articol activ</FormLabel>
                      <FormDescription>
                        Articolele inactive nu apar in liste si nu pot fi folosite
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isComposite && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="font-medium">Articol compus</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Acest articol este compus si nu are stoc propriu. Stocul se calculeaza din componente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock & Units Card - only for non-composite */}
          {!isComposite && (
            <Card>
              <CardHeader>
                <CardTitle>Stoc si unitati</CardTitle>
                <CardDescription>
                  Stocul curent se modifica prin ajustari sau receptii, nu din acest formular.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Stoc curent</Label>
                    <p className="text-2xl font-bold">{Number(item.currentStock)} {item.unit}</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stoc minim alerta</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            placeholder="Optional"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Alerta cand stocul scade</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unitate de masura</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="buc">bucati (buc)</SelectItem>
                            <SelectItem value="kg">kilograme (kg)</SelectItem>
                            <SelectItem value="g">grame (g)</SelectItem>
                            <SelectItem value="l">litri (l)</SelectItem>
                            <SelectItem value="ml">mililitri (ml)</SelectItem>
                            <SelectItem value="m">metri (m)</SelectItem>
                            <SelectItem value="cm">centimetri (cm)</SelectItem>
                            <SelectItem value="set">seturi (set)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitsPerBox"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unitati per bax/cutie</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Ex: 12"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Cate unitati intra intr-un bax</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boxUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denumire bax/cutie</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: cutie, bax, palet"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost & Supplier Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cost si furnizor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost unitar (RON)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormDescription>Pretul de achizitie</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Furnizor</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteaza furnizor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Fara furnizor</SelectItem>
                          {suppliers.map((supplier: any) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recipe Components Card (for composite items) */}
          {isComposite && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Componente reteta
                </CardTitle>
                <CardDescription>
                  Articolele necesare pentru a produce 1 unitate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add component form */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Articol</Label>
                    <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteaza articol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems
                          .filter((item: any) =>
                            item.id !== id &&
                            !recipeComponents.some(rc => rc.componentItemId === item.id)
                          )
                          .map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label>Cantitate</Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={componentQuantity}
                      onChange={(e) => setComponentQuantity(e.target.value)}
                      placeholder="Ex: 1"
                    />
                  </div>
                  <Button type="button" onClick={handleAddComponent}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Components list */}
                {recipeComponents.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {recipeComponents.map((comp) => (
                      <div key={comp.componentItemId} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{comp.componentName}</p>
                          <p className="text-sm text-muted-foreground font-mono">{comp.componentSku}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            {comp.quantity} {comp.unit}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveComponent(comp.componentItemId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg border-dashed">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nicio componenta adaugata inca
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adauga articolele care formeaza acest produs compus
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push(`/inventory/${id}`)}>
              Anuleaza
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                "Se salveaza..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salveaza modificarile
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
