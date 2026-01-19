"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  MapPin,
  Package,
  AlertCircle,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Warehouse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  isActive: boolean;
  isPrimary: boolean;
  sortOrder: number;
  _count?: {
    stockLevels: number;
    stockMovements: number;
  };
}

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Fetch warehouses
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Eroare la incarcarea depozitelor");
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      code: string;
      name: string;
      description: string;
      address: string;
      isActive: boolean;
    }) => {
      const url = data.id ? `/api/warehouses/${data.id}` : "/api/warehouses";
      const res = await fetch(url, {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la salvare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: editingWarehouse ? "Depozit actualizat" : "Depozit creat" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la stergere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "Depozit sters" });
      setDeleteWarehouse(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}/set-primary`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la setarea depozitului principal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "Depozit principal actualizat" });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const warehouses: Warehouse[] = warehousesData?.warehouses || [];

  // Funcție pentru rularea migrării
  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await fetch("/api/admin/migrate-warehouse", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Migrare reusita!",
          description: `Depozit principal creat: ${data.results.warehouse.name}. ${data.results.migratedStocks} stocuri migrate.`,
        });
        queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      } else {
        toast({
          title: "Eroare la migrare",
          description: data.error || "Eroare necunoscuta",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la migrare",
        description: error.message || "Eroare de conexiune",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Funcție pentru sincronizarea articolelor cu depozitul principal
  const handleSyncStock = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-warehouse-stock", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Sincronizare reusita!",
          description: `${data.results.syncedItems} articole asociate depozitului ${data.results.warehouse.name}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["warehouses"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      } else {
        toast({
          title: "Eroare la sincronizare",
          description: data.error || "Eroare necunoscuta",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la sincronizare",
        description: error.message || "Eroare de conexiune",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const openCreateDialog = () => {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormAddress("");
    setFormIsActive(true);
    setEditingWarehouse(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (warehouse: Warehouse) => {
    setFormCode(warehouse.code);
    setFormName(warehouse.name);
    setFormDescription(warehouse.description || "");
    setFormAddress(warehouse.address || "");
    setFormIsActive(warehouse.isActive);
    setEditingWarehouse(warehouse);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingWarehouse(null);
  };

  const handleSave = () => {
    if (!formCode.trim()) {
      toast({ title: "Introdu codul depozitului", variant: "destructive" });
      return;
    }
    if (!formName.trim()) {
      toast({ title: "Introdu numele depozitului", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      id: editingWarehouse?.id,
      code: formCode,
      name: formName,
      description: formDescription,
      address: formAddress,
      isActive: formIsActive,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Depozite</h1>
          <p className="text-muted-foreground">
            Gestioneaza depozitele si stocurile per locatie
          </p>
        </div>
        <div className="flex gap-2">
          {warehouses.length > 0 && (
            <Button
              variant="outline"
              onClick={handleSyncStock}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sincronizeaza Articole
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Depozit Nou
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Despre sistemul multi-depozit</p>
          <p className="mt-1">
            Toate depozitele folosesc acelasi nomenclator de articole. Fiecare depozit are
            cantitati proprii. Comenzile scad stocul doar din depozitul principal (marcat cu stea).
            Transferurile intre depozite se executa instant.
          </p>
        </div>
      </div>

      {/* Warehouses Grid */}
      {warehouses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Niciun depozit</h3>
            <p className="text-muted-foreground text-center mb-4">
              Creeaza primul depozit pentru a incepe gestiunea multi-locatie.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Creeaza Depozit
              </Button>
              <Button
                variant="outline"
                onClick={handleMigration}
                disabled={isMigrating}
              >
                {isMigrating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Migrare Date Existente
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 max-w-md text-center">
              Folosește "Migrare Date Existente" dacă ai deja stocuri în sistem și vrei să le muți în sistemul multi-depozit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <Card
              key={warehouse.id}
              className={`relative ${!warehouse.isActive ? "opacity-60" : ""}`}
            >
              {warehouse.isPrimary && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-500 text-yellow-950">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Principal
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                      {!warehouse.isActive && (
                        <Badge variant="secondary">Inactiv</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {warehouse.code}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(warehouse)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!warehouse.isPrimary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteWarehouse(warehouse)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {warehouse.description && (
                  <CardDescription className="mt-2">
                    {warehouse.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {warehouse.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{warehouse.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>{warehouse._count?.stockLevels || 0} articole cu stoc</span>
                    </div>
                  </div>

                  {!warehouse.isPrimary && warehouse.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setPrimaryMutation.mutate(warehouse.id)}
                      disabled={setPrimaryMutation.isPending}
                    >
                      {setPrimaryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Star className="h-4 w-4 mr-2" />
                      )}
                      Seteaza ca Principal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? `Editare: ${editingWarehouse.name}` : "Depozit Nou"}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse
                ? "Modifica detaliile depozitului"
                : "Completeaza informatiile pentru noul depozit"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cod *</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="Ex: DEP-01"
                  disabled={!!editingWarehouse}
                />
                {editingWarehouse && (
                  <p className="text-xs text-muted-foreground">
                    Codul nu poate fi modificat
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nume *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Depozit Central"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descriere</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrierea depozitului (optional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Adresa</Label>
              <Textarea
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Adresa depozitului (optional)"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Activ</Label>
                <p className="text-xs text-muted-foreground">
                  Depozitele inactive nu pot primi transferuri
                </p>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                disabled={editingWarehouse?.isPrimary}
              />
            </div>
            {editingWarehouse?.isPrimary && (
              <p className="text-xs text-amber-600">
                Depozitul principal nu poate fi dezactivat
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anuleaza
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingWarehouse ? "Salveaza" : "Creeaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWarehouse} onOpenChange={() => setDeleteWarehouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stergi depozitul "{deleteWarehouse?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Aceasta actiune nu poate fi anulata. Poti sterge doar depozitele care
              nu au stoc si nu au miscari de stoc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuleaza</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWarehouse && deleteMutation.mutate(deleteWarehouse.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Sterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
