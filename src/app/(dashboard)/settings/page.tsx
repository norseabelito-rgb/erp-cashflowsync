"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw,
  Store, Calculator, Truck, Plus, Trash2, Copy, Edit2,
  Download, Apple, Monitor, Package, FolderOpen, Wifi, WifiOff,
  ShoppingBag, Search, ExternalLink, Sparkles, Brain, Clock, Zap,
  HardDrive, Upload, Database, Webhook, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Settings {
  // FanCourier
  fancourierClientId: string;
  fancourierUsername: string;
  fancourierPassword: string;
  // Default AWB settings
  defaultWeight: number;
  defaultServiceType: string;
  defaultPaymentType: string;
  defaultPackages: number;
  // Sender info
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCounty: string;
  senderCity: string;
  senderStreet: string;
  senderNumber: string;
  senderPostalCode: string;
  // PIM - Google Drive
  googleDriveFolderUrl: string;
  googleDriveCredentials: string;
  // Trendyol
  trendyolSupplierId: string;
  trendyolApiKey: string;
  trendyolApiSecret: string;
  trendyolIsTestMode: boolean;
  trendyolCurrencyRate: string;
  trendyolStoreFrontCode: string;
  // AI Insights
  aiApiKey: string;
  aiModel: string;
  aiDailyAnalysisEnabled: boolean;
  aiDailyAnalysisTime: string;
  aiLastAnalysisAt: string | null;
  // Backup
  backupFolderUrl: string;
  backupAutoEnabled: boolean;
  backupAutoTime: string;
  backupLastAt: string | null;
}

interface FanCourierService {
  id: string | number;
  name: string;
}

interface StoreType {
  id: string;
  name: string;
  shopifyDomain: string;
  isActive: boolean;
  hasWebhookSecret: boolean;
  createdAt: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  invoiceSeriesId: string | null;
  invoiceSeries: { id: string; name: string; prefix: string } | null;
  _count?: { orders: number };
}

interface InvoiceSeriesOption {
  id: string;
  name: string;
  prefix: string;
  companyId: string;
  isDefault: boolean;
}

interface CompanyOption {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stores");
  const [showFancourierPassword, setShowFancourierPassword] = useState(false);
  const [showTrendyolSecret, setShowTrendyolSecret] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [fancourierServices, setFancourierServices] = useState<FanCourierService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Dialog pentru magazin nou
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState({ name: "", shopifyDomain: "", accessToken: "" });

  // Dialog pentru editare magazin (asociere cu firmă)
  const [editStoreDialogOpen, setEditStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [editStoreCompanyId, setEditStoreCompanyId] = useState<string | null>(null);
  const [editStoreSeriesId, setEditStoreSeriesId] = useState<string | null>(null);
  const [editStoreWebhookSecret, setEditStoreWebhookSecret] = useState<string>("");

  const [settings, setSettings] = useState<Settings>({
    fancourierClientId: "",
    fancourierUsername: "",
    fancourierPassword: "",
    defaultWeight: 1,
    defaultServiceType: "Standard",
    defaultPaymentType: "destinatar",
    defaultPackages: 1,
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderCounty: "",
    senderCity: "",
    senderStreet: "",
    senderNumber: "",
    senderPostalCode: "",
    googleDriveFolderUrl: "",
    googleDriveCredentials: "",
    trendyolSupplierId: "",
    trendyolApiKey: "",
    trendyolApiSecret: "",
    trendyolIsTestMode: false,
    trendyolCurrencyRate: "5.0",
    trendyolStoreFrontCode: "",
    // AI Insights
    aiApiKey: "",
    aiModel: "claude-sonnet-4-20250514",
    aiDailyAnalysisEnabled: false,
    aiDailyAnalysisTime: "08:00",
    aiLastAnalysisAt: null,
    // Backup
    backupFolderUrl: "",
    backupAutoEnabled: false,
    backupAutoTime: "03:00",
    backupLastAt: null,
  });

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  // Fetch stores
  const { data: storesData } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // Fetch companies pentru asociere cu magazine
  const { data: companiesData } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json();
    },
  });
  const companies: CompanyOption[] = companiesData?.companies || [];

  // Fetch invoice series for store edit dialog
  const { data: seriesData } = useQuery({
    queryKey: ["invoice-series-list"],
    queryFn: async () => {
      const res = await fetch("/api/invoice-series");
      if (!res.ok) throw new Error("Failed to fetch series");
      return res.json();
    },
  });
  const allSeries: InvoiceSeriesOption[] = seriesData?.series || [];

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings({
        fancourierClientId: settingsData.settings.fancourierClientId || "",
        fancourierUsername: settingsData.settings.fancourierUsername || "",
        fancourierPassword: settingsData.settings.fancourierPassword || "",
        defaultWeight: Number(settingsData.settings.defaultWeight) || 1,
        defaultServiceType: settingsData.settings.defaultServiceType || "Standard",
        defaultPaymentType: settingsData.settings.defaultPaymentType || "destinatar",
        defaultPackages: settingsData.settings.defaultPackages || 1,
        senderName: settingsData.settings.senderName || "",
        senderPhone: settingsData.settings.senderPhone || "",
        senderEmail: settingsData.settings.senderEmail || "",
        senderCounty: settingsData.settings.senderCounty || "",
        senderCity: settingsData.settings.senderCity || "",
        senderStreet: settingsData.settings.senderStreet || "",
        senderNumber: settingsData.settings.senderNumber || "",
        senderPostalCode: settingsData.settings.senderPostalCode || "",
        googleDriveFolderUrl: settingsData.settings.googleDriveFolderUrl || "",
        googleDriveCredentials: settingsData.settings.googleDriveCredentials || "",
        trendyolSupplierId: settingsData.settings.trendyolSupplierId || "",
        trendyolApiKey: settingsData.settings.trendyolApiKey || "",
        trendyolApiSecret: settingsData.settings.trendyolApiSecret || "",
        trendyolIsTestMode: settingsData.settings.trendyolIsTestMode || false,
        trendyolCurrencyRate: settingsData.settings.trendyolCurrencyRate || "5.0",
        trendyolStoreFrontCode: settingsData.settings.trendyolStoreFrontCode || "",
        // AI Insights
        aiApiKey: settingsData.settings.aiApiKey || "",
        aiModel: settingsData.settings.aiModel || "claude-sonnet-4-20250514",
        aiDailyAnalysisEnabled: settingsData.settings.aiDailyAnalysisEnabled || false,
        aiDailyAnalysisTime: settingsData.settings.aiDailyAnalysisTime || "08:00",
        aiLastAnalysisAt: settingsData.settings.aiLastAnalysisAt || null,
        // Backup
        backupFolderUrl: settingsData.settings.backupFolderUrl || "",
        backupAutoEnabled: settingsData.settings.backupAutoEnabled || false,
        backupAutoTime: settingsData.settings.backupAutoTime || "03:00",
        backupLastAt: settingsData.settings.backupLastAt || null,
      });
    }
  }, [settingsData]);

  // Load FanCourier services
  const loadFancourierServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch("/api/fancourier/services");
      const data = await res.json();
      if (data.success && data.services) {
        setFancourierServices(data.services);
        toast({ title: "Servicii încărcate", description: `${data.services.length} servicii disponibile` });
      } else {
        toast({ title: "Eroare", description: data.error || "Nu s-au putut încărca serviciile", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setLoadingServices(false);
    }
  };

  // Save settings
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Setări salvate", description: "Configurația a fost actualizată cu succes" });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Test FanCourier connection
  const testFancourierMutation = useMutation({
    mutationFn: async () => {
      // Trimite credențialele din formular pentru a testa ÎNAINTE de salvare
      const res = await fetch("/api/fancourier/test", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: settings.fancourierClientId,
          username: settings.fancourierUsername,
          password: settings.fancourierPassword,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ 
          title: "✅ Conexiune reușită", 
          description: data.message || `Conectat la FanCourier: ${data.clientName || "OK"}` 
        });
      } else {
        toast({ 
          title: "❌ Conexiune eșuată", 
          description: data.error || "Nu s-a putut conecta la FanCourier", 
          variant: "destructive" 
        });
      }
    },
  });

  // Add store
  const addStoreMutation = useMutation({
    mutationFn: async (data: { name: string; shopifyDomain: string; accessToken: string }) => {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["stores-list"] });
        setStoreDialogOpen(false);
        setNewStore({ name: "", shopifyDomain: "", accessToken: "" });
        toast({ title: "Magazin adăugat", description: `${data.store.name} a fost conectat` });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Update store (pentru asociere cu firma si serie)
  const updateStoreMutation = useMutation({
    mutationFn: async (data: { storeId: string; companyId: string | null; invoiceSeriesId?: string | null; webhookSecret?: string }) => {
      const payload: Record<string, unknown> = {
        companyId: data.companyId,
        invoiceSeriesId: data.invoiceSeriesId ?? null,
      };
      if (data.webhookSecret) {
        payload.webhookSecret = data.webhookSecret;
      }
      const res = await fetch(`/api/stores/${data.storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["stores-list"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-series-list"] });
        setEditStoreDialogOpen(false);
        setEditingStore(null);
        toast({ title: "Magazin actualizat", description: "Firma si seria au fost asociate cu succes" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const openEditStoreDialog = (store: StoreType) => {
    setEditingStore(store);
    setEditStoreCompanyId(store.companyId);
    setEditStoreSeriesId(store.invoiceSeriesId);
    setEditStoreWebhookSecret("");
    setEditStoreDialogOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiat!", description: `${label} a fost copiat în clipboard` });
  };

  const stores: StoreType[] = storesData?.stores || [];

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Setări"
        description="Configurează integrările și preferințele aplicației"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 lg:w-[1050px]">
          <TabsTrigger value="stores" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Magazine</span>
          </TabsTrigger>
          <TabsTrigger value="trendyol" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Trendyol</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produse</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Contabilitate</span>
          </TabsTrigger>
          <TabsTrigger value="courier" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Curieri</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Magazine */}
        <TabsContent value="stores" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Magazine Shopify</CardTitle>
                <CardDescription>Magazinele conectate la ERP</CardDescription>
              </div>
              <Button onClick={() => setStoreDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă magazin
              </Button>
            </CardHeader>
            <CardContent>
              {stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există magazine configurate</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Domeniu Shopify</TableHead>
                      <TableHead>Firmă Facturare</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Webhook</TableHead>
                      <TableHead>Comenzi</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell className="text-muted-foreground">{store.shopifyDomain}</TableCell>
                        <TableCell>
                          {store.company ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {store.company.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Neasociată
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? "success" : "neutral"}>
                            {store.isActive ? "Activ" : "Inactiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={store.hasWebhookSecret ? "success" : "outline"} className="cursor-help">
                                <Webhook className="h-3 w-3 mr-1" />
                                {store.hasWebhookSecret ? "Activ" : "Neconfigurat"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {store.hasWebhookSecret
                                ? "Webhook configurat - comenzile se sincronizează în timp real"
                                : "Click pe Editează pentru a configura webhook-ul"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{store._count?.orders || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditStoreDialog(store)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Trendyol Marketplace */}
        <TabsContent value="trendyol" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Trendyol - Credențiale API
              </CardTitle>
              <CardDescription>
                Configurează conexiunea la Trendyol Marketplace pentru sincronizarea produselor și comenzilor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-status-info/10 dark:bg-status-info/5 border border-status-info/30 dark:border-status-info/20 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Unde găsești credențialele?</strong><br />
                  Mergi la <a href="https://partner.trendyol.com" target="_blank" rel="noopener noreferrer" className="underline">partner.trendyol.com</a> → 
                  Contul meu → Informații integrare API
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>ID Comerciant (ID entitate)</Label>
                  <Input
                    placeholder="123456"
                    value={settings.trendyolSupplierId}
                    onChange={(e) => setSettings({ ...settings, trendyolSupplierId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    "ID comerciant" din panoul Trendyol
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Cheie API</Label>
                  <Input
                    placeholder="xxxxxxxxx"
                    value={settings.trendyolApiKey}
                    onChange={(e) => setSettings({ ...settings, trendyolApiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    "Cheie API" din panoul Trendyol
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Secret API</Label>
                  <div className="relative">
                    <Input
                      type={showTrendyolSecret ? "text" : "password"}
                      placeholder="••••••••"
                      value={settings.trendyolApiSecret}
                      onChange={(e) => setSettings({ ...settings, trendyolApiSecret: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowTrendyolSecret(!showTrendyolSecret)}
                    >
                      {showTrendyolSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    "Secret API" din panoul Trendyol
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Mod Test</p>
                    <p className="text-sm text-muted-foreground">
                      Folosește API-ul de test în loc de producție
                    </p>
                  </div>
                  <Switch
                    checked={settings.trendyolIsTestMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, trendyolIsTestMode: checked })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cod Țară (StoreFront)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings.trendyolStoreFrontCode}
                    onChange={(e) => setSettings({ ...settings, trendyolStoreFrontCode: e.target.value })}
                  >
                    <option value="">Auto-detectare</option>
                    <option value="RO">🇷🇴 România (RO)</option>
                    <option value="BG">🇧🇬 Bulgaria (BG)</option>
                    <option value="HU">🇭🇺 Ungaria (HU)</option>
                    <option value="CZ">🇨🇿 Cehia (CZ)</option>
                    <option value="PL">🇵🇱 Polonia (PL)</option>
                    <option value="DE">🇩🇪 Germania (DE)</option>
                    <option value="GR">🇬🇷 Grecia (GR)</option>
                    <option value="AE">🇦🇪 UAE (AE)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Se detectează automat la test
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Curs RON → EUR</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="5.0"
                    value={settings.trendyolCurrencyRate}
                    onChange={(e) => setSettings({ ...settings, trendyolCurrencyRate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Conversie preț (ex: 5.0)
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Mai întâi salvăm setările curente pentru a folosi noile credențiale
                          const saveRes = await fetch("/api/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(settings),
                          });

                          if (!saveRes.ok) {
                            toast({
                              title: "Eroare",
                              description: "Nu s-au putut salva setările",
                              variant: "destructive",
                            });
                            return;
                          }

                          // Apoi testăm conexiunea
                          const res = await fetch("/api/trendyol?action=test");
                          const data = await res.json();
                          if (data.success) {
                            const sfCode = data.data?.storeFrontCode;
                            // Actualizează storeFrontCode-ul în state
                            if (sfCode && sfCode !== settings.trendyolStoreFrontCode) {
                              setSettings(prev => ({ ...prev, trendyolStoreFrontCode: sfCode }));
                            }
                            toast({
                              title: "✅ Conexiune reușită & Setări salvate",
                              description: `Conectat la Trendyol. ${data.data?.productCount || 0} produse în cont${sfCode ? ` (${sfCode})` : ''}.`,
                            });
                          } else {
                            toast({
                              title: "❌ Eroare conexiune",
                              description: data.error || "Nu s-a putut conecta la Trendyol",
                              variant: "destructive",
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: "Eroare",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!settings.trendyolSupplierId || !settings.trendyolApiKey || !settings.trendyolApiSecret}
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      Testează conexiunea
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Verifică dacă credențialele Trendyol sunt valide și poți accesa API-ul pentru produse și comenzi.</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  onClick={() => window.open("https://partner.trendyol.com", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Deschide Trendyol Partner
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informații Trendyol</CardTitle>
              <CardDescription>
                Vizualizează categorii, branduri și alte date din Trendyol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/trendyol?action=categories");
                      const data = await res.json();
                      if (data.success) {
                        toast({
                          title: "Categorii încărcate",
                          description: `${data.total} categorii disponibile în Trendyol`,
                        });
                        console.log("Trendyol Categories:", data.flatCategories);
                      } else {
                        toast({
                          title: "Eroare",
                          description: data.error,
                          variant: "destructive",
                        });
                      }
                    } catch (error: any) {
                      toast({ title: "Eroare", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  <Package className="h-6 w-6 mb-2" />
                  <span>Vezi Categorii</span>
                  <span className="text-xs text-muted-foreground">Afișează în consolă</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={async () => {
                    const search = prompt("Caută brand (ex: Nike, Adidas):");
                    if (!search) return;
                    try {
                      const res = await fetch(`/api/trendyol?action=brands&search=${encodeURIComponent(search)}`);
                      const data = await res.json();
                      if (data.success) {
                        const brands = data.brands || [];
                        if (brands.length > 0) {
                          const brandList = brands.slice(0, 10).map((b: any) => `${b.name} (ID: ${b.id})`).join("\n");
                          alert(`Branduri găsite:\n\n${brandList}`);
                        } else {
                          alert("Niciun brand găsit");
                        }
                      } else {
                        toast({ title: "Eroare", description: data.error, variant: "destructive" });
                      }
                    } catch (error: any) {
                      toast({ title: "Eroare", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  <Search className="h-6 w-6 mb-2" />
                  <span>Caută Brand</span>
                  <span className="text-xs text-muted-foreground">Găsește ID-ul brandului</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={async () => {
                    if (!settings.trendyolSupplierId) {
                      toast({ title: "Eroare", description: "Configurează credențialele mai întâi", variant: "destructive" });
                      return;
                    }
                    try {
                      const res = await fetch("/api/trendyol?action=products&size=10");
                      const data = await res.json();
                      if (data.success) {
                        toast({
                          title: "Produse Trendyol",
                          description: `${data.total} produse în contul tău Trendyol`,
                        });
                        console.log("Trendyol Products:", data.products);
                      } else {
                        toast({ title: "Eroare", description: data.error, variant: "destructive" });
                      }
                    } catch (error: any) {
                      toast({ title: "Eroare", description: error.message, variant: "destructive" });
                    }
                  }}
                  disabled={!settings.trendyolSupplierId}
                >
                  <ShoppingBag className="h-6 w-6 mb-2" />
                  <span>Vezi Produse</span>
                  <span className="text-xs text-muted-foreground">Produsele din cont</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări Trendyol"}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: Produse (Google Drive) */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Drive - Imagini Produse</CardTitle>
              <CardDescription>
                Configurează folderul Google Drive pentru sincronizarea automată a imaginilor produselor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>URL Folder Părinte</Label>
                <Input
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={settings.googleDriveFolderUrl}
                  onChange={(e) => setSettings({ ...settings, googleDriveFolderUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Folder-ul trebuie partajat cu Service Account (email din JSON).
                  În acest folder, creează subfoldere denumite după SKU-ul fiecărui produs.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Service Account Credentials (JSON)</Label>
                <Textarea
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  rows={4}
                  className="font-mono text-xs"
                  value={settings.googleDriveCredentials || ""}
                  onChange={(e) => setSettings({ ...settings, googleDriveCredentials: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Lipește conținutul fișierului JSON descărcat din Google Cloud Console.
                  Mergi la IAM → Service Accounts → Creează → Keys → Add Key → JSON.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Structura recomandată în Drive:
                </h4>
                <pre className="text-xs bg-background p-3 rounded border">
{`📁 Produse ERP (folder părinte)
├── 📁 ABC123
│   ├── 🖼️ 01_fata.jpg (imaginea principală)
│   ├── 🖼️ 02_spate.jpg
│   └── 🖼️ 03_detaliu.jpg
├── 📁 DEF456
│   └── 🖼️ produs.jpg
└── 📁 GHI789
    └── ...`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Prima imagine din fiecare folder (alfabetic) va fi setată ca imagine principală.
                  <br />
                  <strong>IMPORTANT:</strong> Partajează folder-ul cu email-ul Service Account 
                  (client_email din JSON).
                </p>
              </div>

              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/products/sync-images");
                          const data = await res.json();
                          if (data.success) {
                            toast({
                              title: "✅ Conexiune reușită",
                              description: `Găsite ${data.stats?.totalFolders || 0} foldere, ${data.stats?.matchedProducts || 0} potrivite cu produse`,
                            });
                          } else {
                            toast({
                              title: "❌ Eroare",
                              description: data.error,
                              variant: "destructive",
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: "Eroare",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!settings.googleDriveFolderUrl || !settings.googleDriveCredentials}
                    >
                      <Wifi className="h-4 w-4 mr-2" />
                      Testează conexiunea
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Verifică dacă credențialele Google Drive sunt valide și folder-ul este accesibil.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/products/sync-images", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dryRun: false }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            toast({
                              title: "✅ Sincronizare completă",
                              description: `${data.stats?.imagesAdded || 0} imagini adăugate, ${data.stats?.imagesUpdated || 0} actualizate`,
                            });
                          } else {
                            toast({
                              title: "❌ Eroare",
                              description: data.error,
                              variant: "destructive",
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: "Eroare",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!settings.googleDriveFolderUrl || !settings.googleDriveCredentials}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizează acum
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Sincronizează imaginile din Google Drive cu produsele. Folderele sunt potrivite cu SKU-ul produselor.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări Produse"}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: Contabilitate (Facturis) */}
        <TabsContent value="accounting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Facturare cu Facturis
              </CardTitle>
              <CardDescription>
                Credențialele Facturis sunt configurate per firmă pentru a permite facturare de pe mai multe entități juridice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-status-info/10 border border-status-info/30 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Setările de facturare au fost mutate la nivel de firmă.</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Fiecare firmă poate avea propriile credențiale Facturis. Când se emite o factură pentru o comandă,
                  se folosesc credențialele firmei asociate cu magazinul din care provine comanda.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => window.location.href = "/settings/companies"}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Configurează firmele
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/settings/invoice-series"}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Gestionează serii facturi
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg h-fit">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Cum funcționează?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Configurează firmele tale în pagina Firme</li>
                    <li>2. Adaugă credențialele Facturis pentru fiecare firmă</li>
                    <li>3. Asociază magazinele cu firmele corespunzătoare</li>
                    <li>4. Facturile vor fi emise automat pe firma corectă</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Curieri (FanCourier) */}
        <TabsContent value="courier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>FanCourier - Credențiale API</CardTitle>
              <CardDescription>Conectează-te la FanCourier pentru generarea automată a AWB-urilor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Client ID</Label>
                  <Input
                    placeholder="ex: 7032158"
                    value={settings.fancourierClientId}
                    onChange={(e) => setSettings({ ...settings, fancourierClientId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="Username selfAWB"
                    value={settings.fancourierUsername}
                    onChange={(e) => setSettings({ ...settings, fancourierUsername: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Parolă</Label>
                  <div className="relative">
                    <Input
                      type={showFancourierPassword ? "text" : "password"}
                      placeholder="Parolă selfAWB"
                      value={settings.fancourierPassword}
                      onChange={(e) => setSettings({ ...settings, fancourierPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowFancourierPassword(!showFancourierPassword)}
                    >
                      {showFancourierPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => testFancourierMutation.mutate()}
                      disabled={testFancourierMutation.isPending || !settings.fancourierClientId || !settings.fancourierUsername}
                    >
                      {testFancourierMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-2" />
                      )}
                      Testează conexiunea
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Verifică dacă credențialele FanCourier sunt valide și poți genera AWB-uri.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                Credențialele sunt cele de logare în aplicația selfAWB. Client ID-ul îl găsești în selfawb.ro → Contul meu.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setări Default AWB</CardTitle>
              <CardDescription>Aceste valori vor fi folosite implicit la crearea AWB-urilor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Tip Serviciu</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={loadFancourierServices} disabled={loadingServices}>
                      {loadingServices ? "Se încarcă..." : "🔄 Încarcă servicii"}
                    </Button>
                  </div>
                  <Select
                    value={settings.defaultServiceType}
                    onValueChange={(value) => setSettings({ ...settings, defaultServiceType: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selectează serviciul" /></SelectTrigger>
                    <SelectContent>
                      {fancourierServices.length === 0 ? (
                        <>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Express">Express</SelectItem>
                          <SelectItem value="Cont Colector">Cont Colector</SelectItem>
                          <SelectItem value="RedCode">RedCode</SelectItem>
                          <SelectItem value="Express Loco 1H">Express Loco 1H</SelectItem>
                        </>
                      ) : (
                        fancourierServices.map((service) => (
                          <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tip Plată</Label>
                  <Select
                    value={settings.defaultPaymentType}
                    onValueChange={(value) => setSettings({ ...settings, defaultPaymentType: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="destinatar">Ramburs (destinatar)</SelectItem>
                      <SelectItem value="expeditor">Expeditor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Greutate Default (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={settings.defaultWeight}
                    onChange={(e) => setSettings({ ...settings, defaultWeight: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Număr Colete Default</Label>
                  <Input
                    type="number"
                    min="1"
                    value={settings.defaultPackages}
                    onChange={(e) => setSettings({ ...settings, defaultPackages: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date Expeditor</CardTitle>
              <CardDescription>Informațiile firmei tale pentru AWB-uri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Nume Firmă</Label>
                  <Input
                    placeholder="SC Firma SRL"
                    value={settings.senderName}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input
                    placeholder="0722123456"
                    value={settings.senderPhone}
                    onChange={(e) => setSettings({ ...settings, senderPhone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@firma.ro"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Județ</Label>
                  <Input
                    placeholder="București"
                    value={settings.senderCounty}
                    onChange={(e) => setSettings({ ...settings, senderCounty: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Oraș</Label>
                  <Input
                    placeholder="Sector 1"
                    value={settings.senderCity}
                    onChange={(e) => setSettings({ ...settings, senderCity: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Stradă</Label>
                  <Input
                    placeholder="Strada Exemplu"
                    value={settings.senderStreet}
                    onChange={(e) => setSettings({ ...settings, senderStreet: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Număr</Label>
                  <Input
                    placeholder="123"
                    value={settings.senderNumber}
                    onChange={(e) => setSettings({ ...settings, senderNumber: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări Curier"}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: AI Insights */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Configurare AI Insights
              </CardTitle>
              <CardDescription>
                Configurează integrarea cu Claude AI pentru analize și recomandări inteligente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Key */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-status-warning" />
                  <Label className="text-base font-medium">API Key Claude (Anthropic)</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-ant-api03-..."
                        value={settings.aiApiKey || ""}
                        onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Obții cheia API de la{" "}
                    <a 
                      href="https://console.anthropic.com/settings/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      console.anthropic.com → API Keys
                    </a>
                  </p>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>Model AI</Label>
                <Select
                  value={settings.aiModel || "claude-sonnet-4-20250514"}
                  onValueChange={(value) => setSettings({ ...settings, aiModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează modelul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-20250514">
                      <div className="flex items-center gap-2">
                        <span>Claude Sonnet 4</span>
                        <Badge variant="outline" className="text-xs">Recomandat</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="claude-opus-4-20250514">
                      <div className="flex items-center gap-2">
                        <span>Claude Opus 4</span>
                        <Badge variant="secondary" className="text-xs">Premium</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="claude-haiku-4-20250514">
                      <div className="flex items-center gap-2">
                        <span>Claude Haiku 4</span>
                        <Badge variant="outline" className="text-xs">Rapid</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sonnet oferă cel mai bun raport calitate/preț. Opus pentru analize complexe.
                </p>
              </div>

              {/* Daily Analysis */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Analiză zilnică automată
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      AI-ul va analiza automat datele și va genera recomandări
                    </p>
                  </div>
                  <Switch
                    checked={settings.aiDailyAnalysisEnabled || false}
                    onCheckedChange={(checked) => 
                      setSettings({ ...settings, aiDailyAnalysisEnabled: checked })
                    }
                  />
                </div>

                {settings.aiDailyAnalysisEnabled && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Ora analizei zilnice</Label>
                    <Input
                      type="time"
                      value={settings.aiDailyAnalysisTime || "08:00"}
                      onChange={(e) => setSettings({ ...settings, aiDailyAnalysisTime: e.target.value })}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Analiza va rula zilnic la ora specificată (timezone: Europe/Bucharest)
                    </p>
                  </div>
                )}
              </div>

              {/* Status */}
              {settings.aiLastAnalysisAt && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                    <span>Ultima analiză AI: {formatDate(settings.aiLastAnalysisAt)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg h-fit">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Ce poate face AI Insights?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Analizează performanța campaniilor publicitare și sugerează optimizări</li>
                    <li>• Identifică produse cu potențial de creștere a prețului</li>
                    <li>• Recomandă ajustări de buget bazate pe ROAS și conversii</li>
                    <li>• Învață din deciziile tale pentru recomandări mai bune în timp</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări AI"}
            </Button>
          </div>
        </TabsContent>

        {/* TAB: Backup */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Restore
              </CardTitle>
              <CardDescription>
                Configurează backup-ul automat al bazei de date în Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Folder Google Drive */}
              <div className="grid gap-2">
                <Label htmlFor="backupFolderUrl">Folder Google Drive pentru backup</Label>
                <div className="flex gap-2">
                  <Input
                    id="backupFolderUrl"
                    placeholder="https://drive.google.com/drive/folders/... sau ID-ul folderului"
                    value={settings.backupFolderUrl}
                    onChange={(e) => setSettings({ ...settings, backupFolderUrl: e.target.value })}
                    className="flex-1"
                  />
                  {settings.backupFolderUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(settings.backupFolderUrl.startsWith("http") ? settings.backupFolderUrl : `https://drive.google.com/drive/folders/${settings.backupFolderUrl}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Asigură-te că Service Account-ul Google Drive are acces de scriere la acest folder.
                  Folosește același Service Account ca pentru imaginile produselor.
                </p>
              </div>

              {/* Backup automat */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Backup automat zilnic
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Creează automat un backup zilnic al bazei de date
                  </p>
                </div>
                <Switch
                  checked={settings.backupAutoEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, backupAutoEnabled: checked })}
                />
              </div>

              {/* Ora backup */}
              {settings.backupAutoEnabled && (
                <div className="grid gap-2">
                  <Label htmlFor="backupAutoTime">Ora backup-ului automat</Label>
                  <Input
                    id="backupAutoTime"
                    type="time"
                    value={settings.backupAutoTime}
                    onChange={(e) => setSettings({ ...settings, backupAutoTime: e.target.value })}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Backup-ul se va rula zilnic la ora specificată (timezone: Europe/Bucharest)
                  </p>
                </div>
              )}

              {/* Ultimul backup */}
              {settings.backupLastAt && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                    <span>Ultimul backup: {formatDate(settings.backupLastAt)}</span>
                  </div>
                </div>
              )}

              {/* Acțiuni */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/settings/backup"}
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Listă backup-uri
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/backup", { method: "POST" });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: "Succes", description: "Backup creat cu succes" });
                        queryClient.invalidateQueries({ queryKey: ["settings"] });
                      } else {
                        toast({ title: "Eroare", description: data.error, variant: "destructive" });
                      }
                    } catch (error) {
                      toast({ title: "Eroare", description: "Nu s-a putut crea backup-ul", variant: "destructive" });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Creează backup acum
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări Backup"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Adaugă magazin */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă magazin Shopify</DialogTitle>
            <DialogDescription>
              Conectează un magazin Shopify pentru sincronizarea comenzilor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nume magazin</Label>
              <Input
                placeholder="ex: Magazinul Meu"
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Domeniu Shopify</Label>
              <Input
                placeholder="ex: magazinul-meu.myshopify.com"
                value={newStore.shopifyDomain}
                onChange={(e) => setNewStore({ ...newStore, shopifyDomain: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="shpat_xxxxx"
                value={newStore.accessToken}
                onChange={(e) => setNewStore({ ...newStore, accessToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Obții token-ul din Shopify Admin → Settings → Apps → Develop apps
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              Anulează
            </Button>
            <Button 
              onClick={() => addStoreMutation.mutate(newStore)}
              disabled={!newStore.name || !newStore.shopifyDomain || !newStore.accessToken || addStoreMutation.isPending}
            >
              {addStoreMutation.isPending ? "Se conectează..." : "Conectează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editează magazin - Asociere cu firmă */}
      <Dialog open={editStoreDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditStoreDialogOpen(false);
          setEditingStore(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează magazin</DialogTitle>
            <DialogDescription>
              Asociază magazinul {editingStore?.name} cu o firmă pentru facturare
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Magazin</Label>
              <Input value={editingStore?.name || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Firma de facturare</Label>
              <Select
                value={editStoreCompanyId || "none"}
                onValueChange={(value) => {
                  setEditStoreCompanyId(value === "none" ? null : value);
                  setEditStoreSeriesId(null); // Clear series when company changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteaza firma" />
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
              <p className="text-xs text-muted-foreground">
                Comenzile din acest magazin vor fi facturate pe firma selectata
              </p>
            </div>
            {/* Serie de facturare - doar daca firma este selectata */}
            {editStoreCompanyId && (
              <div className="grid gap-2">
                <Label htmlFor="store-series">Serie de facturare</Label>
                <Select
                  value={editStoreSeriesId || "default"}
                  onValueChange={(value) => setEditStoreSeriesId(value === "default" ? null : value)}
                >
                  <SelectTrigger id="store-series">
                    <SelectValue placeholder="Selecteaza seria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <span className="text-muted-foreground">
                        Foloseste seria default a firmei
                      </span>
                    </SelectItem>
                    {allSeries
                      .filter((s: InvoiceSeriesOption) => s.companyId === editStoreCompanyId)
                      .map((series: InvoiceSeriesOption) => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.prefix} - {series.name}
                          {series.isDefault && (
                            <Badge variant="outline" className="ml-2 text-xs">Default</Badge>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Toate facturile din acest magazin vor folosi aceasta serie
                </p>
              </div>
            )}

            {/* Webhook Secret pentru sincronizare în timp real */}
            <div className="grid gap-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label htmlFor="webhookSecret" className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhook Secret
                </Label>
                {editingStore?.hasWebhookSecret && (
                  <Badge variant="success" className="text-xs">Configurat</Badge>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Secretul pentru verificarea webhook-urilor. Îl găsești în Shopify Admin → Settings → Notifications → Webhooks (la sfârșitul paginii).</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="webhookSecret"
                type="password"
                placeholder={editingStore?.hasWebhookSecret ? "Lasă gol pentru a păstra secretul existent" : "Introdu secretul webhook..."}
                value={editStoreWebhookSecret}
                onChange={(e) => setEditStoreWebhookSecret(e.target.value)}
              />
              <div className="p-3 bg-muted rounded-md space-y-2">
                <p className="text-xs font-medium">URL Webhook pentru Shopify:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/shopify` : '/api/webhooks/shopify'}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/api/webhooks/shopify`;
                      navigator.clipboard.writeText(url);
                      toast({
                        title: "Copiat",
                        description: "URL-ul a fost copiat în clipboard.",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configurează acest URL în Shopify pentru: Order creation, Order update, Order cancellation
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStoreDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => {
                if (editingStore) {
                  updateStoreMutation.mutate({
                    storeId: editingStore.id,
                    companyId: editStoreCompanyId,
                    invoiceSeriesId: editStoreSeriesId,
                    webhookSecret: editStoreWebhookSecret || undefined,
                  });
                }
              }}
              disabled={updateStoreMutation.isPending}
            >
              {updateStoreMutation.isPending ? "Se salveaza..." : "Salveaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
