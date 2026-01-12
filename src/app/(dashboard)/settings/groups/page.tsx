"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  UserPlus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Role {
  id: string;
  name: string;
  color: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  members: { user: User }[];
  roles: { role: Role }[];
  _count: { members: number; roles: number };
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formRoles, setFormRoles] = useState<Set<string>>(new Set());
  const [formMembers, setFormMembers] = useState<Set<string>>(new Set());

  // Fetch groups
  const { data: groups, isLoading: loadingGroups } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/groups");
      if (!res.ok) throw new Error("Eroare la încărcarea grupurilor");
      return res.json();
    },
  });

  // Fetch roles for selection
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/roles");
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
  });

  // Fetch users for selection
  const { data: users } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/users");
      if (!res.ok) throw new Error("Eroare");
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
      roleIds: string[];
      memberIds: string[];
    }) => {
      const res = await fetch("/api/rbac/groups", {
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
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: editingGroup ? "Grup actualizat" : "Grup creat" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rbac/groups?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la ștergere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: "Grup șters" });
      setDeleteGroup(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(COLORS[0]);
    setFormRoles(new Set());
    setFormMembers(new Set());
    setEditingGroup(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (group: Group) => {
    setFormName(group.name);
    setFormDescription(group.description || "");
    setFormColor(group.color || COLORS[0]);
    setFormRoles(new Set(group.roles.map((r) => r.role.id)));
    setFormMembers(new Set(group.members.map((m) => m.user.id)));
    setEditingGroup(group);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingGroup(null);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast({ title: "Introdu numele grupului", variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      id: editingGroup?.id,
      name: formName,
      description: formDescription,
      color: formColor,
      roleIds: Array.from(formRoles),
      memberIds: Array.from(formMembers),
    });
  };

  const toggleRole = (roleId: string) => {
    const newSet = new Set(formRoles);
    if (newSet.has(roleId)) {
      newSet.delete(roleId);
    } else {
      newSet.add(roleId);
    }
    setFormRoles(newSet);
  };

  const toggleMember = (userId: string) => {
    const newSet = new Set(formMembers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setFormMembers(newSet);
  };

  if (loadingGroups) {
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
          <h1 className="text-2xl font-bold">Grupuri</h1>
          <p className="text-muted-foreground">
            Grupează utilizatorii și asignează-le roluri comune
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Grup Nou
        </Button>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color || "#6b7280" }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(group)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteGroup(group)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Roles */}
              <div className="flex flex-wrap gap-1">
                {group.roles.map((r) => (
                  <Badge
                    key={r.role.id}
                    variant="outline"
                    style={{ borderColor: r.role.color || undefined }}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {r.role.name}
                  </Badge>
                ))}
                {group.roles.length === 0 && (
                  <span className="text-sm text-muted-foreground">Fără roluri</span>
                )}
              </div>

              {/* Members */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 5).map((m) => (
                    <Avatar key={m.user.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={m.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {m.user.name?.charAt(0) || m.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {group._count.members} {group._count.members === 1 ? "membru" : "membri"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {groups?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nu există grupuri</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Creează primul grup
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? `Editare: ${editingGroup.name}` : "Grup Nou"}
            </DialogTitle>
            <DialogDescription>
              Configurează grupul, rolurile moștenite și membrii
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
                  placeholder="Ex: Echipa Depozit"
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
                placeholder="Descrierea grupului..."
                rows={2}
              />
            </div>

            {/* Roles - inherited by all members */}
            <div className="space-y-2">
              <Label>Roluri moștenite (toți membrii vor primi aceste roluri)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {roles?.map((role: any) => (
                  <Badge
                    key={role.id}
                    variant={formRoles.has(role.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: formRoles.has(role.id) ? role.color || undefined : undefined,
                      borderColor: role.color || undefined,
                    }}
                    onClick={() => toggleRole(role.id)}
                  >
                    {formRoles.has(role.id) && <Check className="h-3 w-3 mr-1" />}
                    {role.name}
                  </Badge>
                ))}
                {(!roles || roles.length === 0) && (
                  <span className="text-sm text-muted-foreground">Nu există roluri</span>
                )}
              </div>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label>Membri ({formMembers.size} selectați)</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg divide-y">
                {users?.map((user: any) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 ${
                      formMembers.has(user.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleMember(user.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    {formMembers.has(user.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
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
              {editingGroup ? "Salvează" : "Creează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi grupul "{deleteGroup?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Membrii grupului vor pierde
              rolurile moștenite de la acest grup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroup && deleteMutation.mutate(deleteGroup.id)}
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
