"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Store, Trash2, Edit, Eye, EyeOff, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface TemuStore {
  id: string;
  name: string;
  appKey: string;
  accessTokenExpiry: string;
  region: string;
  isActive: boolean;
  currencyRate: string | null;
  invoiceSeriesName: string | null;
  companyId: string;
  company: { id: string; name: string } | null;
  _count: { orders: number };
  hasApiCredentials: boolean;
  hasWebhookSecret: boolean;
}

interface Company {
  id: string;
  name: string;
}

const REGIONS = [
  { value: "EU", label: "Europa (EU)" },
  { value: "US", label: "Statele Unite (US)" },
  { value: "GLOBAL", label: "Global (Mexic, Japonia)" },
];

export function TemuStoresTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<TemuStore | null>(null);
  const [editingStore, setEditingStore] = useState<TemuStore | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    appKey: "",
    appSecret: "",
    accessToken: "",
    region: "EU",
    companyId: "",
    currencyRate: "",
    invoiceSeriesName: "",
    webhookSecret: "",
    isActive: true,
  });

  // Fetch stores
  const { data: storesData, isLoading } = useQuery({
    queryKey: ["temuStores"],
    queryFn: async () => {
      const res = await fetch("/api/temu/stores");
      if (!res.ok) throw new Error("Failed to fetch stores");
      return res.json();
    },
  });

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  const stores: TemuStore[] = storesData?.stores || [];
  const companies: Company[] = companiesData?.companies || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/temu/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create store");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temuStores"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Magazin creat", description: "Magazinul Temu a fost adaugat cu succes" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/temu/stores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update store");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temuStores"] });
      setDialogOpen(false);
      setEditingStore(null);
      resetForm();
      toast({ title: "Magazin actualizat", description: "Setarile au fost salvate" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/temu/stores/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete store");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temuStores"] });
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
      toast({ title: "Magazin sters", description: "Magazinul a fost sters" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      appKey: "",
      appSecret: "",
      accessToken: "",
      region: "EU",
      companyId: "",
      currencyRate: "",
      invoiceSeriesName: "",
      webhookSecret: "",
      isActive: true,
    });
    setShowSecret(false);
    setShowToken(false);
  };

  const openEditDialog = (store: TemuStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      appKey: store.appKey,
      appSecret: "", // Don't show existing secret
      accessToken: "", // Don't show existing token
      region: store.region,
      companyId: store.companyId,
      currencyRate: store.currencyRate || "",
      invoiceSeriesName: store.invoiceSeriesName || "",
      webhookSecret: "", // Don't show existing secret
      isActive: store.isActive,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    resetForm();
    setDialogOpen(true);
  };

  const openDeleteDialog = (store: TemuStore) => {
    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingStore) {
      // For update, only send non-empty sensitive fields
      const updateData: Partial<typeof formData> = { ...formData };
      if (!updateData.appSecret) delete updateData.appSecret;
      if (!updateData.accessToken) delete updateData.accessToken;
      if (!updateData.webhookSecret) delete updateData.webhookSecret;
      updateMutation.mutate({ id: editingStore.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isTokenExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  const isTokenExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Magazine Temu
            </CardTitle>
            <CardDescription>
              Configureaza magazinele Temu pentru sincronizare comenzi si produse
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Adauga magazin
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Se incarca...</div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista magazine Temu configurate</p>
              <p className="text-sm mt-2">Adauga primul magazin pentru a incepe sincronizarea</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Regiune</TableHead>
                  <TableHead>Serie factura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Comenzi</TableHead>
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      {store.company ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {store.company.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Neasociata
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{store.region}</Badge>
                    </TableCell>
                    <TableCell>
                      {store.invoiceSeriesName || (
                        <span className="text-muted-foreground text-sm">Neconfigurata</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.isActive ? "success" : "neutral"}>
                        {store.isActive ? "Activ" : "Inactiv"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isTokenExpired(store.accessTokenExpiry) ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expirat
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Token expirat pe {format(new Date(store.accessTokenExpiry), "d MMM yyyy", { locale: ro })}
                          </TooltipContent>
                        </Tooltip>
                      ) : isTokenExpiringSoon(store.accessTokenExpiry) ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                              <AlertTriangle className="h-3 w-3" />
                              Expira curand
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Expira pe {format(new Date(store.accessTokenExpiry), "d MMM yyyy", { locale: ro })}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                              <Calendar className="h-3 w-3" />
                              Valid
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Expira pe {format(new Date(store.accessTokenExpiry), "d MMM yyyy", { locale: ro })}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>{store._count.orders}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(store)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editeaza</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(store)}
                              disabled={store._count.orders > 0}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {store._count.orders > 0
                              ? "Nu se poate sterge - are comenzi"
                              : "Sterge magazin"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Editeaza magazin Temu" : "Adauga magazin Temu"}
            </DialogTitle>
            <DialogDescription>
              {editingStore
                ? "Modifica setarile magazinului"
                : "Configureaza un nou magazin Temu pentru sincronizare"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nume magazin *</Label>
                <Input
                  id="name"
                  placeholder="Temu EU"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyId">Firma facturare *</Label>
                <Select
                  value={formData.companyId || "none"}
                  onValueChange={(v) => setFormData({ ...formData, companyId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Selecteaza firma --</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="appKey">App Key *</Label>
                <Input
                  id="appKey"
                  placeholder="Temu App Key"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  disabled={!!editingStore}
                />
                {editingStore && (
                  <p className="text-xs text-muted-foreground">App Key nu poate fi modificat</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appSecret">App Secret *</Label>
                <div className="relative">
                  <Input
                    id="appSecret"
                    type={showSecret ? "text" : "password"}
                    placeholder={editingStore ? "(nemodificat)" : "Temu App Secret"}
                    value={formData.appSecret}
                    onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accessToken">Access Token *</Label>
              <div className="relative">
                <Textarea
                  id="accessToken"
                  className="min-h-[80px] pr-10"
                  placeholder={editingStore ? "(nemodificat)" : "Temu Access Token (din Partner Dashboard)"}
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token-ul expira in 3 luni. Vei primi notificare cand se apropie expirarea.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="region">Regiune</Label>
                <Select
                  value={formData.region}
                  onValueChange={(v) => setFormData({ ...formData, region: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceSeriesName">Serie factura Oblio</Label>
                <Input
                  id="invoiceSeriesName"
                  placeholder="ex: TEMU"
                  value={formData.invoiceSeriesName}
                  onChange={(e) => setFormData({ ...formData, invoiceSeriesName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currencyRate">Curs valutar EUR</Label>
                <Input
                  id="currencyRate"
                  type="number"
                  step="0.01"
                  placeholder="4.97"
                  value={formData.currencyRate}
                  onChange={(e) => setFormData({ ...formData, currencyRate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhookSecret">Webhook Secret (optional)</Label>
              <Input
                id="webhookSecret"
                type="password"
                placeholder={editingStore ? "(nemodificat)" : "Pentru verificarea webhook-urilor"}
                value={formData.webhookSecret}
                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Magazin activ</p>
                <p className="text-sm text-muted-foreground">
                  Dezactiveaza pentru a opri sincronizarea temporar
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !formData.name ||
                !formData.appKey ||
                !formData.companyId ||
                (!editingStore && !formData.appSecret) ||
                (!editingStore && !formData.accessToken)
              }
            >
              {createMutation.isPending || updateMutation.isPending ? "Se salveaza..." : "Salveaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirma stergerea</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi magazinul &quot;{storeToDelete?.name}&quot;?
              Aceasta actiune nu poate fi anulata.
            </DialogDescription>
          </DialogHeader>

          {storeToDelete && storeToDelete._count.orders > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Acest magazin are {storeToDelete._count.orders} comenzi asociate si nu poate fi sters.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => storeToDelete && deleteMutation.mutate(storeToDelete.id)}
              disabled={deleteMutation.isPending || (storeToDelete?._count.orders ?? 0) > 0}
            >
              {deleteMutation.isPending ? "Se sterge..." : "Sterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
