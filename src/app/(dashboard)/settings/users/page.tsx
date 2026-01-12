"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Mail,
  Shield,
  UserCog,
  Crown,
  Loader2,
  MoreHorizontal,
  UserPlus,
  Building2,
  Check,
  X,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  roles: { role: { id: string; name: string; color: string } }[];
  groups: { group: { id: string; name: string; color: string } }[];
  storeAccess: { store: { id: string; name: string } }[];
}

interface Role {
  id: string;
  name: string;
  color: string | null;
}

interface Group {
  id: string;
  name: string;
  color: string | null;
}

interface Store {
  id: string;
  name: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<Set<string>>(new Set());
  const [inviteGroups, setInviteGroups] = useState<Set<string>>(new Set());
  const [inviteStores, setInviteStores] = useState<Set<string>>(new Set());
  const [inviteUrl, setInviteUrl] = useState("");

  // Edit form state
  const [editRoles, setEditRoles] = useState<Set<string>>(new Set());
  const [editGroups, setEditGroups] = useState<Set<string>>(new Set());
  const [editStores, setEditStores] = useState<Set<string>>(new Set());

  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["users", search, filterRole, filterGroup],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterRole) params.set("roleId", filterRole);
      if (filterGroup) params.set("groupId", filterGroup);
      params.set("includeInactive", "true");

      const res = await fetch(`/api/rbac/users?${params}`);
      if (!res.ok) throw new Error("Eroare la încărcarea utilizatorilor");
      return res.json();
    },
  });

  // Fetch roles
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/roles");
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
  });

  // Fetch groups
  const { data: groups } = useQuery<Group[]>({
    queryKey: ["groups-list"],
    queryFn: async () => {
      const res = await fetch("/api/rbac/groups");
      if (!res.ok) throw new Error("Eroare");
      return res.json();
    },
  });

  // Fetch stores
  const { data: storesData } = useQuery<{ stores: Store[] }>({
    queryKey: ["stores-list"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      if (!res.ok) return { stores: [] };
      return res.json();
    },
  });

  const stores = storesData?.stores || [];

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      roleIds?: string[];
      groupIds?: string[];
      storeIds?: string[];
      isActive?: boolean;
      isSuperAdmin?: boolean;
    }) => {
      const res = await fetch("/api/rbac/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Utilizator actualizat" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Create invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      roleIds: string[];
      groupIds: string[];
      storeIds: string[];
    }) => {
      const res = await fetch("/api/rbac/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      toast({ title: "Invitație creată!" });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (user: User) => {
    setEditRoles(new Set(user.roles.map((r) => r.role.id)));
    setEditGroups(new Set(user.groups.map((g) => g.group.id)));
    setEditStores(new Set(user.storeAccess.map((s) => s.store.id)));
    setEditingUser(user);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;

    updateMutation.mutate({
      userId: editingUser.id,
      roleIds: Array.from(editRoles),
      groupIds: Array.from(editGroups),
      storeIds: Array.from(editStores),
    });
  };

  const handleToggleActive = (user: User) => {
    updateMutation.mutate({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast({ title: "Introdu email-ul", variant: "destructive" });
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      roleIds: Array.from(inviteRoles),
      groupIds: Array.from(inviteGroups),
      storeIds: Array.from(inviteStores),
    });
  };

  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: "Link copiat!" });
  };

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRoles(new Set());
    setInviteGroups(new Set());
    setInviteStores(new Set());
    setInviteUrl("");
  };

  if (loadingUsers) {
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
          <h1 className="text-2xl font-bold">Utilizatori</h1>
          <p className="text-muted-foreground">
            Gestionează utilizatorii și accesul lor
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invită Utilizator
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută după nume sau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole || "all"} onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate rolurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate rolurile</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGroup || "all"} onValueChange={(v) => setFilterGroup(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate grupurile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate grupurile</SelectItem>
                {groups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users?.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 hover:bg-muted/50 ${
                  !user.isActive ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name || "—"}</span>
                      {user.isSuperAdmin && (
                        <Badge className="bg-yellow-500">
                          <Crown className="h-3 w-3 mr-1" />
                          SuperAdmin
                        </Badge>
                      )}
                      {!user.isActive && (
                        <Badge variant="secondary">Inactiv</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {user.roles.map((r) => (
                      <Badge
                        key={r.role.id}
                        variant="outline"
                        style={{ borderColor: r.role.color || undefined }}
                      >
                        {r.role.name}
                      </Badge>
                    ))}
                    {user.roles.length === 0 && !user.isSuperAdmin && (
                      <span className="text-sm text-muted-foreground">Fără roluri</span>
                    )}
                  </div>

                  {/* Groups */}
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {user.groups.slice(0, 2).map((g) => (
                      <Badge key={g.group.id} variant="secondary">
                        {g.group.name}
                      </Badge>
                    ))}
                    {user.groups.length > 2 && (
                      <Badge variant="secondary">+{user.groups.length - 2}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <UserCog className="h-4 w-4 mr-2" />
                        Editează Permisiuni
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(user)}
                        disabled={user.isSuperAdmin}
                      >
                        {user.isActive ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Dezactivează
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Activează
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editare: {editingUser?.name || editingUser?.email}</DialogTitle>
            <DialogDescription>
              Configurează rolurile, grupurile și accesul la store-uri
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Roles */}
            <div className="space-y-2">
              <Label>Roluri</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {roles?.map((role) => (
                  <Badge
                    key={role.id}
                    variant={editRoles.has(role.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: editRoles.has(role.id) ? role.color || undefined : undefined,
                      borderColor: role.color || undefined,
                    }}
                    onClick={() => {
                      const newSet = new Set(editRoles);
                      if (newSet.has(role.id)) {
                        newSet.delete(role.id);
                      } else {
                        newSet.add(role.id);
                      }
                      setEditRoles(newSet);
                    }}
                  >
                    {editRoles.has(role.id) && <Check className="h-3 w-3 mr-1" />}
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-2">
              <Label>Grupuri</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {groups?.map((group) => (
                  <Badge
                    key={group.id}
                    variant={editGroups.has(group.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newSet = new Set(editGroups);
                      if (newSet.has(group.id)) {
                        newSet.delete(group.id);
                      } else {
                        newSet.add(group.id);
                      }
                      setEditGroups(newSet);
                    }}
                  >
                    {editGroups.has(group.id) && <Check className="h-3 w-3 mr-1" />}
                    {group.name}
                  </Badge>
                ))}
                {(!groups || groups.length === 0) && (
                  <span className="text-sm text-muted-foreground">Nu există grupuri</span>
                )}
              </div>
            </div>

            {/* Store Access */}
            <div className="space-y-2">
              <Label>Acces la Store-uri (gol = acces la toate)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {stores?.map((store) => (
                  <Badge
                    key={store.id}
                    variant={editStores.has(store.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newSet = new Set(editStores);
                      if (newSet.has(store.id)) {
                        newSet.delete(store.id);
                      } else {
                        newSet.add(store.id);
                      }
                      setEditStores(newSet);
                    }}
                  >
                    {editStores.has(store.id) && <Check className="h-3 w-3 mr-1" />}
                    <Building2 className="h-3 w-3 mr-1" />
                    {store.name}
                  </Badge>
                ))}
                {(!stores || stores.length === 0) && (
                  <span className="text-sm text-muted-foreground">Nu există store-uri</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Anulează
            </Button>
            <Button onClick={handleSaveUser} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={closeInviteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invită Utilizator Nou</DialogTitle>
            <DialogDescription>
              Trimite o invitație pe email cu rolurile și grupurile pre-configurate
            </DialogDescription>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-400 mb-2">✅ Invitație creată cu succes!</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Trimite acest link către {inviteEmail}:
                </p>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly />
                  <Button onClick={copyInviteUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeInviteDialog}>Închide</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="utilizator@exemplu.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                {/* Roles */}
                <div className="space-y-2">
                  <Label>Roluri (vor fi asignate automat)</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                    {roles?.map((role) => (
                      <Badge
                        key={role.id}
                        variant={inviteRoles.has(role.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: inviteRoles.has(role.id) ? role.color || undefined : undefined,
                        }}
                        onClick={() => {
                          const newSet = new Set(inviteRoles);
                          if (newSet.has(role.id)) {
                            newSet.delete(role.id);
                          } else {
                            newSet.add(role.id);
                          }
                          setInviteRoles(newSet);
                        }}
                      >
                        {inviteRoles.has(role.id) && <Check className="h-3 w-3 mr-1" />}
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Groups */}
                <div className="space-y-2">
                  <Label>Grupuri</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                    {groups?.map((group) => (
                      <Badge
                        key={group.id}
                        variant={inviteGroups.has(group.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newSet = new Set(inviteGroups);
                          if (newSet.has(group.id)) {
                            newSet.delete(group.id);
                          } else {
                            newSet.add(group.id);
                          }
                          setInviteGroups(newSet);
                        }}
                      >
                        {inviteGroups.has(group.id) && <Check className="h-3 w-3 mr-1" />}
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeInviteDialog}>
                  Anulează
                </Button>
                <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Creează Invitație
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
