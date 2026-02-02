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
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ShoppingBag, Wifi, Copy, Trash2, Edit, Eye, EyeOff, RefreshCw, ExternalLink } from "lucide-react";

interface TrendyolStore {
  id: string;
  name: string;
  supplierId: string;
  apiKey: string;
  storeFrontCode: string;
  isTestMode: boolean;
  isActive: boolean;
  defaultBrandId: number | null;
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

const STORE_FRONT_CODES = [
  { value: "RO", label: "Romania (RO)" },
  { value: "BG", label: "Bulgaria (BG)" },
  { value: "HU", label: "Ungaria (HU)" },
  { value: "CZ", label: "Cehia (CZ)" },
  { value: "PL", label: "Polonia (PL)" },
  { value: "DE", label: "Germania (DE)" },
  { value: "GR", label: "Grecia (GR)" },
  { value: "AE", label: "UAE (AE)" },
];

export function TrendyolStoresTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<TrendyolStore | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; secret: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    apiKey: "",
    apiSecret: "",
    storeFrontCode: "RO",
    companyId: "",
    isTestMode: false,
    currencyRate: "5.0",
    invoiceSeriesName: "",
  });

  // Fetch stores
  const { data: storesData, isLoading } = useQuery({
    queryKey: ["trendyolStores"],
    queryFn: async () => {
      const res = await fetch("/api/trendyol/stores");
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

  const stores: TrendyolStore[] = storesData?.stores || [];
  const companies: Company[] = companiesData?.companies || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/trendyol/stores", {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trendyolStores"] });
      setDialogOpen(false);
      resetForm();
      // Show webhook info
      if (data.webhookUrl && data.webhookSecret) {
        setWebhookInfo({ url: data.webhookUrl, secret: data.webhookSecret });
      }
      toast({ title: "Magazin creat", description: "Magazinul Trendyol a fost adaugat cu succes" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/trendyol/stores/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["trendyolStores"] });
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
      const res = await fetch(`/api/trendyol/stores/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete store");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trendyolStores"] });
      toast({ title: "Magazin sters", description: "Magazinul a fost sters" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trendyol/stores/${id}/test`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Conexiune reusita",
          description: `${data.details?.storeName} - ${data.responseTime}ms`,
        });
      } else {
        toast({
          title: "Conexiune esuata",
          description: data.message || data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      supplierId: "",
      apiKey: "",
      apiSecret: "",
      storeFrontCode: "RO",
      companyId: "",
      isTestMode: false,
      currencyRate: "5.0",
      invoiceSeriesName: "",
    });
  };

  const openEditDialog = (store: TrendyolStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      supplierId: store.supplierId,
      apiKey: store.apiKey,
      apiSecret: "", // Don't show existing secret
      storeFrontCode: store.storeFrontCode,
      companyId: store.companyId,
      isTestMode: store.isTestMode,
      currencyRate: store.currencyRate || "5.0",
      invoiceSeriesName: store.invoiceSeriesName || "",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiat", description: `${label} a fost copiat in clipboard` });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Magazine Trendyol
            </CardTitle>
            <CardDescription>
              Configureaza magazinele Trendyol pentru sincronizare comenzi si produse
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
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista magazine Trendyol configurate</p>
              <p className="text-sm mt-2">Adauga primul magazin pentru a incepe sincronizarea</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Tara</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comenzi</TableHead>
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="font-mono text-sm">{store.supplierId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{store.storeFrontCode}</Badge>
                    </TableCell>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={store.isActive ? "success" : "neutral"}>
                          {store.isActive ? "Activ" : "Inactiv"}
                        </Badge>
                        {store.isTestMode && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            Test
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{store._count.orders}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => testMutation.mutate(store.id)}
                              disabled={testMutation.isPending}
                            >
                              <Wifi className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Test conexiune</TooltipContent>
                        </Tooltip>
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
                              onClick={() => {
                                if (confirm(`Stergi magazinul "${store.name}"?`)) {
                                  deleteMutation.mutate(store.id);
                                }
                              }}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Editeaza magazin Trendyol" : "Adauga magazin Trendyol"}
            </DialogTitle>
            <DialogDescription>
              {editingStore
                ? "Modifica setarile magazinului"
                : "Configureaza un nou magazin Trendyol pentru sincronizare"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nume magazin</Label>
                <Input
                  id="name"
                  placeholder="Trendyol RO"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplierId">Supplier ID (ID Comerciant)</Label>
                <Input
                  id="supplierId"
                  placeholder="123456"
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  disabled={!!editingStore}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="xxxxxxxxxx"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="apiSecret"
                    type={showSecret ? "text" : "password"}
                    placeholder={editingStore ? "(nemodificat)" : "xxxxxxxxxx"}
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
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

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="storeFrontCode">Tara</Label>
                <Select
                  value={formData.storeFrontCode}
                  onValueChange={(v) => setFormData({ ...formData, storeFrontCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_FRONT_CODES.map((code) => (
                      <SelectItem key={code.value} value={code.value}>
                        {code.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyId">Firma facturare</Label>
                <Select
                  value={formData.companyId || "none"}
                  onValueChange={(v) => setFormData({ ...formData, companyId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteaza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Nicio firma --</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currencyRate">Curs valutar</Label>
                <Input
                  id="currencyRate"
                  type="number"
                  step="0.01"
                  placeholder="5.0"
                  value={formData.currencyRate}
                  onChange={(e) => setFormData({ ...formData, currencyRate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Mod Test</p>
                <p className="text-sm text-muted-foreground">Foloseste API-ul de test</p>
              </div>
              <Switch
                checked={formData.isTestMode}
                onCheckedChange={(checked) => setFormData({ ...formData, isTestMode: checked })}
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
                !formData.supplierId ||
                !formData.apiKey ||
                (!editingStore && !formData.apiSecret)
              }
            >
              {createMutation.isPending || updateMutation.isPending ? "Se salveaza..." : "Salveaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Info Dialog */}
      <Dialog open={!!webhookInfo} onOpenChange={() => setWebhookInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook configurat</DialogTitle>
            <DialogDescription>
              Configureaza acest webhook in panoul Trendyol Partner pentru a primi notificari
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>URL Webhook</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono overflow-hidden text-ellipsis">
                  {webhookInfo?.url}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookInfo?.url || "", "URL-ul")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Secret HMAC</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono overflow-hidden text-ellipsis">
                  {webhookInfo?.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookInfo?.secret || "", "Secretul")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Salveaza acest secret! Nu va mai fi afisat din nou.
              </p>
            </div>

            <div className="bg-status-info/10 border border-status-info/30 rounded-lg p-4">
              <p className="text-sm">
                <strong>Pasii urmatori:</strong><br />
                1. Mergi la <a href="https://partner.trendyol.com" target="_blank" rel="noopener noreferrer" className="underline">partner.trendyol.com</a><br />
                2. Navigheaza la Integrari API sau Setari Webhook<br />
                3. Adauga URL-ul de mai sus<br />
                4. Selecteaza evenimentele dorite (comenzi noi, statusuri, etc.)<br />
                5. Salveaza si testeaza
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => window.open("https://partner.trendyol.com", "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Deschide Trendyol Partner
            </Button>
            <Button onClick={() => setWebhookInfo(null)}>Am inteles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
