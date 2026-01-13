"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, FolderTree, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  // Create category
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        closeDialog();
        toast({ title: "Categorie creată", description: `"${data.category.name}" a fost adăugată` });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Update category
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description?: string }) => {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        closeDialog();
        toast({ title: "Categorie actualizată" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        toast({ title: "Categorie ștearsă" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Eroare", description: "Numele este obligatoriu", variant: "destructive" });
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: formData.name,
        description: formData.description || undefined,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description || undefined,
      });
    }
  };

  const handleDelete = (category: Category) => {
    if (category._count?.products && category._count.products > 0) {
      toast({
        title: "Nu se poate șterge",
        description: `Categoria are ${category._count.products} produse asociate`,
        variant: "destructive",
      });
      return;
    }

    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const categories: Category[] = categoriesData?.categories || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categorii</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestionează categoriile de produse
          </p>
        </div>
        <Button size="sm" className="md:size-default" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Categorie Nouă</span>
          <span className="md:hidden">Adaugă</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Lista Categoriilor</CardTitle>
          <CardDescription className="text-sm">
            Categoriile sunt folosite pentru organizarea produselor și crearea de Collections în Shopify
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Se încarcă...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">Nu există categorii</p>
              <Button variant="outline" onClick={openCreateDialog}>
                Creează prima categorie
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead className="hidden sm:table-cell">Descriere</TableHead>
                  <TableHead className="text-center">Produse</TableHead>
                  <TableHead className="hidden md:table-cell">Data creării</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate hidden sm:table-cell">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {category._count?.products || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {formatDate(category.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-status-error" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editează Categoria" : "Categorie Nouă"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifică detaliile categoriei"
                : "Creează o nouă categorie pentru produse"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nume *</Label>
              <Input
                placeholder="ex: Tricouri, Pantaloni, Accesorii"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descriere</Label>
              <Textarea
                placeholder="Descriere opțională..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anulează
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Se salvează..." : editingCategory ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi categoria &quot;{categoryToDelete?.name}&quot;?
              Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-error hover:bg-status-error/90"
              onClick={() => {
                if (categoryToDelete) {
                  deleteMutation.mutate(categoryToDelete.id);
                }
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
