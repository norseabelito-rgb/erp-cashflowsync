"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, GripVertical, Tag, RefreshCw } from "lucide-react";
import { OrderStatusBadge, ColorPreview } from "@/components/orders/order-status-badge";

interface InternalOrderStatus {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Default color options for quick selection
const DEFAULT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function OrderStatusesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<InternalOrderStatus | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<InternalOrderStatus | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6b7280");
  const [formSortOrder, setFormSortOrder] = useState(0);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["order-statuses"],
    queryFn: async () => {
      const res = await fetch("/api/order-statuses");
      if (!res.ok) throw new Error("Failed to fetch statuses");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; sortOrder: number }) => {
      const res = await fetch("/api/order-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-statuses"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Status creat", description: "Statusul a fost creat cu succes" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; color?: string; sortOrder?: number; isActive?: boolean }) => {
      const res = await fetch("/api/order-statuses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-statuses"] });
      setDialogOpen(false);
      setEditingStatus(null);
      resetForm();
      toast({ title: "Status actualizat", description: "Statusul a fost actualizat cu succes" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/order-statuses?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order-statuses"] });
      setDeleteDialogOpen(false);
      setStatusToDelete(null);
      toast({
        title: data.deactivated ? "Status dezactivat" : "Status sters",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const statuses: InternalOrderStatus[] = data?.statuses || [];

  const resetForm = () => {
    setFormName("");
    setFormColor("#6b7280");
    setFormSortOrder(statuses.length);
  };

  const openCreateDialog = () => {
    setEditingStatus(null);
    resetForm();
    setFormSortOrder(statuses.length);
    setDialogOpen(true);
  };

  const openEditDialog = (status: InternalOrderStatus) => {
    setEditingStatus(status);
    setFormName(status.name);
    setFormColor(status.color);
    setFormSortOrder(status.sortOrder);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast({ title: "Eroare", description: "Numele este obligatoriu", variant: "destructive" });
      return;
    }

    if (editingStatus) {
      updateMutation.mutate({
        id: editingStatus.id,
        name: formName.trim(),
        color: formColor,
        sortOrder: formSortOrder,
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        color: formColor,
        sortOrder: formSortOrder,
      });
    }
  };

  const handleToggleActive = (status: InternalOrderStatus) => {
    updateMutation.mutate({
      id: status.id,
      isActive: !status.isActive,
    });
  };

  const confirmDelete = (status: InternalOrderStatus) => {
    setStatusToDelete(status);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-4" />
          <div className="h-4 w-96 bg-muted rounded mb-6" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Statusuri Interne Comenzi
          </h1>
          <p className="text-muted-foreground mt-1">
            Defineste statusuri personalizate pentru a urmari fluxul intern al comenzilor
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Actualizeaza
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Adauga Status
          </Button>
        </div>
      </div>

      {statuses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nu exista statusuri definite</h3>
            <p className="text-muted-foreground mb-4">
              Creeaza primul status pentru a incepe sa organizezi comenzile.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Creeaza primul status
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Statusuri Definite ({statuses.length})</CardTitle>
            <CardDescription>
              Ordinea statusurilor poate fi modificata prin campul &quot;Ordine&quot;.
              Statusurile inactive nu vor aparea in selectoare dar vor ramane pe comenzile existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ordine</TableHead>
                  <TableHead>Nume</TableHead>
                  <TableHead className="w-[100px]">Culoare</TableHead>
                  <TableHead className="w-[150px]">Preview</TableHead>
                  <TableHead className="w-[100px]">Activ</TableHead>
                  <TableHead className="text-right w-[120px]">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id} className={!status.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {status.sortOrder}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ColorPreview color={status.color} size="sm" />
                        <code className="text-xs text-muted-foreground">{status.color}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={status.isActive}
                        onCheckedChange={() => handleToggleActive(status)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(status)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Help section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Cum functioneaza</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Statusurile interne</strong> sunt separate de statusurile de sistem (Pending, Validated, etc.).
            Ele permit echipei sa urmareasca etapele interne ale procesarii comenzilor.
          </p>
          <p>
            <strong>Exemple:</strong> &quot;Apel client necesar&quot;, &quot;Verificare stoc&quot;, &quot;Returnat la depozit&quot;, &quot;In asteptare plata&quot;.
          </p>
          <p>
            Statusurile apar ca badge-uri colorate in lista de comenzi si pot fi folosite pentru filtrare.
          </p>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Editeaza Status" : "Adauga Status Nou"}
            </DialogTitle>
            <DialogDescription>
              {editingStatus
                ? "Modifica detaliile statusului intern."
                : "Defineste un nou status intern pentru comenzi."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nume</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Apel client necesar"
              />
            </div>

            <div className="grid gap-2">
              <Label>Culoare</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#6b7280"
                  className="flex-1 font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded border-2 ${formColor === color ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Ordine de afisare</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>

            <div className="grid gap-2">
              <Label>Preview</Label>
              <div className="p-4 border rounded bg-muted/50">
                <OrderStatusBadge status={{ id: "preview", name: formName || "Preview", color: formColor }} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Se salveaza..."
                : editingStatus
                  ? "Salveaza"
                  : "Creeaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirma stergerea</AlertDialogTitle>
            <AlertDialogDescription>
              Esti sigur ca vrei sa stergi statusul &quot;{statusToDelete?.name}&quot;?
              {statusToDelete && (
                <span className="block mt-2 text-sm">
                  Daca statusul este folosit de comenzi, va fi dezactivat in loc sa fie sters.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuleaza</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusToDelete && deleteMutation.mutate(statusToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Se sterge..." : "Sterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
