"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  description: z.string().optional(),
  currentStock: z.number().min(0).default(0),
  minStock: z.number().min(0).optional().nullable(),
  unit: z.string().default("buc"),
  unitsPerBox: z.number().min(1).optional().nullable(),
  boxUnit: z.string().optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  isComposite: z.boolean().default(false),
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

export default function NewInventoryItemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      currentStock: 0,
      minStock: null,
      unit: "buc",
      unitsPerBox: null,
      boxUnit: null,
      costPrice: null,
      isComposite: false,
      supplierId: null,
    },
  });

  const isComposite = form.watch("isComposite");

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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InventoryItemForm & { recipeComponents?: RecipeComponent[] }) => {
      const res = await fetch("/api/inventory-items", {
        method: "POST",
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
        toast({
          title: "Succes",
          description: "Articolul a fost creat",
        });
        router.push(`/inventory/${result.data.id}`);
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
        description: "Selectează un articol și introdu cantitatea",
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
        description: "Acest articol este deja în rețetă",
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
    if (data.isComposite && recipeComponents.length === 0) {
      toast({
        title: "Eroare",
        description: "Un articol compus trebuie să aibă cel puțin o componentă în rețetă",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      ...data,
      recipeComponents: data.isComposite ? recipeComponents : undefined,
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Articol nou</h1>
          <p className="text-muted-foreground">Adaugă un articol în inventar</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informații generale</CardTitle>
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
                        <Input placeholder="Ex: PROD-001" {...field} />
                      </FormControl>
                      <FormDescription>Cod unic de identificare</FormDescription>
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
                      <Textarea placeholder="Descriere opțională..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isComposite"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <FormLabel className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Articol compus
                      </FormLabel>
                      <FormDescription>
                        Articolele compuse nu au stoc propriu, stocul se calculează din componente
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
            </CardContent>
          </Card>

          {/* Stock & Units Card */}
          {!isComposite && (
            <Card>
              <CardHeader>
                <CardTitle>Stoc și unități</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="currentStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stoc inițial</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stoc minim alertă</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            placeholder="Opțional"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Alertă când stocul scade</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unitate de măsură</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="buc">bucăți (buc)</SelectItem>
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
                        <FormLabel>Unități per bax/cutie</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Ex: 12"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Câte unități intră într-un bax</FormDescription>
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
              <CardTitle>Cost și furnizor</CardTitle>
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
                      <FormDescription>Prețul de achiziție</FormDescription>
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
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectează furnizor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Fără furnizor</SelectItem>
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
                  Componente rețetă
                </CardTitle>
                <CardDescription>
                  Adaugă articolele necesare pentru a produce 1 unitate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add component form */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Articol</Label>
                    <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează articol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems
                          .filter((item: any) => !recipeComponents.some(rc => rc.componentItemId === item.id))
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
                      Nicio componentă adăugată încă
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adaugă articolele care formează acest produs compus
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>
              Anulează
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                "Se salvează..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvează articol
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
