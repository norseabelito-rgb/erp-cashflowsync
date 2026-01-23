"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Loader2,
  Store,
  Star,
  Trash2,
  ShoppingBag,
  Edit2,
  Hash,
  Settings2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InvoiceSeries {
  id: string;
  name: string;
  prefix: string;
  description: string | null;
  type: string;
  startNumber: number;
  currentNumber: number;
  isDefault: boolean;
  isActive: boolean;
  syncToFacturis: boolean;
  facturisSeries: string | null;
  stores: { id: string; name: string }[];
}

interface StoreWithSeries {
  id: string;
  name: string;
  shopifyDomain: string;
  invoiceSeriesId: string | null;
}

interface SeriesFormData {
  id?: string;
  name: string;
  prefix: string;
  description: string;
  type: string;
  startNumber: number;
  isDefault: boolean;
  syncToFacturis: boolean;
  facturisSeries: string;
}

const initialFormData: SeriesFormData = {
  name: "",
  prefix: "",
  description: "",
  type: "f",
  startNumber: 1,
  isDefault: false,
  syncToFacturis: false,
  facturisSeries: "",
};

export default function InvoiceSeriesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<SeriesFormData>(initialFormData);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch series
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-series"],
    queryFn: async () => {
      const res = await fetch("/api/invoice-series");
      if (!res.ok) throw new Error("Eroare la încărcarea seriilor");
      return res.json();
    },
  });

  // Fetch stores
  const { data: storesData } = useQuery({
    queryKey: ["stores-with-series"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      if (!res.ok) return { stores: [] };
      return res.json();
    },
  });

  const series: InvoiceSeries[] = data?.series || [];
  const stores: StoreWithSeries[] = storesData?.stores || [];
  const trendyolSeries = data?.trendyolSeries;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SeriesFormData) => {
      const method = data.id ? "PUT" : "POST";
      const res = await fetch("/api/invoice-series", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: isEditing ? "Serie actualizată" : "Serie creată" });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update store series mutation
  const updateStoreMutation = useMutation({
    mutationFn: async ({ storeId, seriesId }: { storeId: string; seriesId: string | null }) => {
      const res = await fetch("/api/invoice-series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, seriesId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      queryClient.invalidateQueries({ queryKey: ["stores-with-series"] });
      toast({ title: "Store actualizat" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update Trendyol series mutation
  const updateTrendyolMutation = useMutation({
    mutationFn: async (trendyolSeries: string | null) => {
      const res = await fetch("/api/invoice-series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trendyolSeries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: "Seria Trendyol actualizată" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/invoice-series", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: "Serie default setată" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoice-series?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: "Serie ștearsă" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: InvoiceSeries) => {
    setFormData({
      id: s.id,
      name: s.name,
      prefix: s.prefix,
      description: s.description || "",
      type: s.type,
      startNumber: s.startNumber,
      isDefault: s.isDefault,
      syncToFacturis: s.syncToFacturis,
      facturisSeries: s.facturisSeries || "",
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormData(initialFormData);
    setIsEditing(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.prefix.trim()) {
      toast({
        title: "Eroare",
        description: "Numele și prefixul sunt obligatorii",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Serii de Facturare</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Definește și gestionează seriile de facturare pentru magazine
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Serie
          </Button>
        </div>

        {/* Info */}
        {series.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nu ai nicio serie de facturare. Creează una pentru a putea emite facturi.
            </AlertDescription>
          </Alert>
        )}

        {/* Series List */}
        {series.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Serii disponibile
              </CardTitle>
              <CardDescription>
                Seriile de facturare definite în sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {series.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <span className="font-bold text-primary">{s.prefix}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.isDefault && (
                            <Badge className="bg-status-warning">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          {s.syncToFacturis && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-status-info border-status-info/50">
                                  <Settings2 className="h-3 w-3 mr-1" />
                                  Facturis
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                Sincronizat cu seria Facturis: {s.facturisSeries || s.prefix}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Curent: {s.currentNumber}
                          </span>
                          {s.description && (
                            <span className="hidden md:inline">{s.description}</span>
                          )}
                        </div>
                        {s.stores.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Folosită de: {s.stores.map((st) => st.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(s)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!s.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(s.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          <span className="hidden md:inline">Setează default</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(s.id)}
                        disabled={s.stores.length > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Store Associations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Magazine Shopify
            </CardTitle>
            <CardDescription>
              Asociază o serie de facturare fiecărui magazin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nu ai magazine configurate
              </p>
            ) : (
              <div className="space-y-4">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-info/10">
                        <Store className="h-5 w-5 text-status-info" />
                      </div>
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground">{store.shopifyDomain}</p>
                      </div>
                    </div>
                    <Select
                      value={store.invoiceSeriesId || "none"}
                      onValueChange={(v) =>
                        updateStoreMutation.mutate({
                          storeId: store.id,
                          seriesId: v === "none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selectează seria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Fără serie (folosește default)</SelectItem>
                        {series.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.prefix} - {s.name}
                            {s.isDefault && " ⭐"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trendyol */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Trendyol Marketplace
            </CardTitle>
            <CardDescription>
              Seria de facturare pentru comenzile din Trendyol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-warning/10">
                  <ShoppingBag className="h-5 w-5 text-status-warning" />
                </div>
                <div>
                  <p className="font-medium">Trendyol</p>
                  <p className="text-sm text-muted-foreground">Marketplace internațional</p>
                </div>
              </div>
              <Select
                value={trendyolSeries || "none"}
                onValueChange={(v) =>
                  updateTrendyolMutation.mutate(v === "none" ? null : v)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selectează seria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fără serie (folosește default)</SelectItem>
                  {series.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.prefix} - {s.name}
                      {s.isDefault && " ⭐"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editează Serie" : "Adaugă Serie de Facturare"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Modifică detaliile seriei de facturare"
                  : "Creează o nouă serie pentru facturare"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prefix *</Label>
                  <Input
                    value={formData.prefix}
                    onChange={(e) =>
                      setFormData({ ...formData, prefix: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: CFG, FA, TRD"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apare înaintea numărului facturii
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Număr de start</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.startNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, startNumber: parseInt(e.target.value) || 1 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Prima factură din serie
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nume serie *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Serie Shopify România"
                />
              </div>

              <div className="space-y-2">
                <Label>Descriere (opțional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notițe despre această serie..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tip document</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="f">Factură</SelectItem>
                    <SelectItem value="p">Proformă</SelectItem>
                    <SelectItem value="c">Chitanță</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Serie default</Label>
                  <p className="text-xs text-muted-foreground">
                    Folosită când canalul nu are serie asociată
                  </p>
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label>Sincronizează cu Facturis</Label>
                    <p className="text-xs text-muted-foreground">
                      Folosește aceeași serie și în Facturis la emiterea facturii
                    </p>
                  </div>
                  <Switch
                    checked={formData.syncToFacturis}
                    onCheckedChange={(v) => setFormData({ ...formData, syncToFacturis: v })}
                  />
                </div>

                {formData.syncToFacturis && (
                  <div className="space-y-2 mt-3">
                    <Label>Seria Facturis</Label>
                    <Input
                      value={formData.facturisSeries}
                      onChange={(e) =>
                        setFormData({ ...formData, facturisSeries: e.target.value.toUpperCase() })
                      }
                      placeholder={formData.prefix || "Ex: CFG"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lasă gol pentru a folosi prefixul ca nume de serie Facturis
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseForm}>
                Anulează
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.prefix || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditing ? "Salvează" : "Creează"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ștergi seria?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune nu poate fi anulată. Seria va fi ștearsă permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Șterge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
