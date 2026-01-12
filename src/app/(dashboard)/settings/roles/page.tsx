"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Users,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number; groups: number };
}

interface Category {
  code: string;
  name: string;
  icon: string;
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#6b7280",
];

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());

  // Fetch permissions
  const { data: permissionsData, isLoading: loadingPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/permissions");
      if (!res.ok) throw new Error("Eroare la încărcarea permisiunilor");
      return res.json();
    },
  });

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/roles");
      if (!res.ok) throw new Error("Eroare la încărcarea rolurilor");
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      description: string;
      color: string;
      permissionIds: string[];
    }) => {
      const res = await fetch("/api/rbac/roles", {
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
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: editingRole ? "Rol actualizat" : "Rol creat" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rbac/roles?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la ștergere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Rol șters" });
      setDeleteRole(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const permissions: Permission[] = permissionsData?.permissions || [];
  const categories: Category[] = permissionsData?.categories || [];

  const permissionsByCategory = categories.map((cat) => ({
    ...cat,
    permissions: permissions.filter((p) => p.category === cat.code),
  }));

  const openCreateDialog = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(COLORS[0]);
    setFormPermissions(new Set());
    setEditingRole(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormColor(role.color || COLORS[0]);
    setFormPermissions(new Set(role.permissions.map((p) => p.permission.id)));
    setEditingRole(role);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingRole(null);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast({ title: "Introdu numele rolului", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      id: editingRole?.id,
      name: formName,
      description: formDescription,
      color: formColor,
      permissionIds: Array.from(formPermissions),
    });
  };

  const togglePermission = (permissionId: string) => {
    const newSet = new Set(formPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setFormPermissions(newSet);
  };

  const toggleCategory = (categoryCode: string) => {
    const categoryPermissions = permissions.filter((p) => p.category === categoryCode);
    const allSelected = categoryPermissions.every((p) => formPermissions.has(p.id));

    const newSet = new Set(formPermissions);
    if (allSelected) {
      categoryPermissions.forEach((p) => newSet.delete(p.id));
    } else {
      categoryPermissions.forEach((p) => newSet.add(p.id));
    }
    setFormPermissions(newSet);
  };

  const toggleExpandCategory = (code: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setExpandedCategories(newSet);
  };

  if (loadingPermissions || loadingRoles) {
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
          <h1 className="text-2xl font-bold">Roluri & Permisiuni</h1>
          <p className="text-muted-foreground">
            Gestionează rolurile și permisiunile utilizatorilor
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Rol Nou
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles?.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color || "#6b7280" }}
                  />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  {role.isSystem && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(role)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteRole(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{role._count.users} utilizatori</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>{role.permissions.length} permisiuni</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Editare: ${editingRole.name}` : "Rol Nou"}
            </DialogTitle>
            <DialogDescription>
              Configurează rolul și selectează permisiunile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Manager Depozit"
                  disabled={editingRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label>Culoare</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formColor === color
                          ? "border-white scale-125"
                          : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descriere</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrierea rolului..."
                rows={2}
              />
            </div>

            {/* Permissions Matrix */}
            <div className="space-y-2">
              <Label>Permisiuni ({formPermissions.size} selectate)</Label>
              <div className="border rounded-lg divide-y">
                {permissionsByCategory.map((cat) => {
                  const catPermCount = cat.permissions.filter((p) =>
                    formPermissions.has(p.id)
                  ).length;
                  const allSelected =
                    cat.permissions.length > 0 &&
                    cat.permissions.every((p) => formPermissions.has(p.id));
                  const someSelected =
                    catPermCount > 0 && catPermCount < cat.permissions.length;

                  return (
                    <Collapsible
                      key={cat.code}
                      open={expandedCategories.has(cat.code)}
                      onOpenChange={() => toggleExpandCategory(cat.code)}
                    >
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                          {expandedCategories.has(cat.code) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{cat.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {catPermCount}/{cat.permissions.length}
                          </Badge>
                        </CollapsibleTrigger>
                        <Checkbox
                          checked={allSelected}
                          ref={(ref) => {
                            if (ref && someSelected) {
                              (ref as any).indeterminate = true;
                            }
                          }}
                          onCheckedChange={() => toggleCategory(cat.code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <CollapsibleContent>
                        <div className="px-8 pb-3 space-y-2">
                          {cat.permissions.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between py-1"
                            >
                              <div>
                                <p className="text-sm font-medium">{perm.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              </div>
                              <Checkbox
                                checked={formPermissions.has(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingRole ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi rolul "{deleteRole?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Utilizatorii care au acest rol
              vor pierde permisiunile asociate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRole && deleteMutation.mutate(deleteRole.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
