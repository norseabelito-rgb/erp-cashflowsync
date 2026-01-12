"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  RefreshCw,
  Loader2,
  Store,
  Star,
  Trash2,
  ShoppingBag,
  Check,
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InvoiceSeries {
  id: string;
  name: string;
  type: string;
  nextNumber: string | null;
  isDefault: boolean;
  isActive: boolean;
  stores: { id: string; name: string }[];
}

interface StoreWithSeries {
  id: string;
  name: string;
  shopifyDomain: string;
  invoiceSeriesId: string | null;
}

export default function InvoiceSeriesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newSeriesName, setNewSeriesName] = useState("");

  // Fetch series
  const { data, isLoading, refetch } = useQuery({
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

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoice-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: "Sincronizare completă", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/invoice-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-series"] });
      toast({ title: "Serie creată" });
      setIsCreateOpen(false);
      setNewSeriesName("");
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

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
            Gestionează seriile SmartBill și asociază-le magazinelor
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="md:size-default"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Sincronizează din SmartBill</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Importă toate seriile de facturare din contul SmartBill. Seriile existente vor fi actualizate.</p>
            </TooltipContent>
          </Tooltip>
          <Button size="sm" className="md:size-default" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Adaugă Serie</span>
          </Button>
        </div>
      </div>

      {/* Info */}
      {series.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nu ai nicio serie de facturare. Apasă "Sincronizează din SmartBill" pentru a importa seriile existente.
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
              Seriile de facturare importate din SmartBill
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {series.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {s.isDefault && (
                          <Badge className="bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.stores.length > 0
                          ? `Folosită de: ${s.stores.map((st) => st.name).join(", ")}`
                          : "Neasociată"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(s.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Setează default
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Store className="h-5 w-5 text-blue-500" />
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
                          {s.name}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
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
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                    {s.isDefault && " ⭐"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă Serie de Facturare</DialogTitle>
            <DialogDescription>
              Creează o serie nouă manual (trebuie să existe și în SmartBill)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Numele seriei</Label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value.toUpperCase())}
                placeholder="Ex: CFG, TRD, FACT"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Numele trebuie să fie identic cu cel din SmartBill
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => createMutation.mutate(newSeriesName)}
              disabled={!newSeriesName || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Creează
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
