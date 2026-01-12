"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw,
  Store, Calculator, Truck, Plus, Trash2, Copy,
  Download, Apple, Monitor, Package, FolderOpen, Wifi, WifiOff,
  ShoppingBag, Search, ExternalLink, Sparkles, Brain, Clock, Zap,
  HardDrive, Upload, Database
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Settings {
  // SmartBill
  smartbillEmail: string;
  smartbillToken: string;
  smartbillCompanyCif: string;
  smartbillSeriesName: string;
  smartbillWarehouseName: string;
  smartbillUseStock: boolean;
  smartbillTaxName: string;
  smartbillTaxPercent: number;
  smartbillDueDays: number;
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

interface SmartBillData {
  series: Array<{ name: string; nextNumber: string; type: string }>;
  taxes: Array<{ name: string; percentage: number }>;
  warehouses: string[];
  cacheUpdated?: string | Date;
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
  createdAt: string;
  _count?: { orders: number };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stores");
  const [showSmartbillToken, setShowSmartbillToken] = useState(false);
  const [showFancourierPassword, setShowFancourierPassword] = useState(false);
  const [showTrendyolSecret, setShowTrendyolSecret] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [smartbillData, setSmartbillData] = useState<SmartBillData | null>(null);
  const [fancourierServices, setFancourierServices] = useState<FanCourierService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Dialog pentru magazin nou
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState({ name: "", shopifyDomain: "", accessToken: "" });

  const [settings, setSettings] = useState<Settings>({
    smartbillEmail: "",
    smartbillToken: "",
    smartbillCompanyCif: "",
    smartbillSeriesName: "",
    smartbillWarehouseName: "",
    smartbillUseStock: false,
    smartbillTaxName: "Normala",
    smartbillTaxPercent: 21,
    smartbillDueDays: 0,
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

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings({
        smartbillEmail: settingsData.settings.smartbillEmail || "",
        smartbillToken: settingsData.settings.smartbillToken || "",
        smartbillCompanyCif: settingsData.settings.smartbillCompanyCif || "",
        smartbillSeriesName: settingsData.settings.smartbillSeriesName || "",
        smartbillWarehouseName: settingsData.settings.smartbillWarehouseName || "",
        smartbillUseStock: settingsData.settings.smartbillUseStock || false,
        smartbillTaxName: settingsData.settings.smartbillTaxName || "Normala",
        smartbillTaxPercent: Number(settingsData.settings.smartbillTaxPercent) || 21,
        smartbillDueDays: Number(settingsData.settings.smartbillDueDays) || 0,
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

  // Load SmartBill data from API (fresh)
  const loadSmartbillDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/smartbill-data", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setSmartbillData(data.data);
        
        // AUTO-SYNC: Dacă avem o cotă TVA selectată, actualizăm procentul cu cel din SmartBill
        if (data.data.taxes && data.data.taxes.length > 0 && settings.smartbillTaxName) {
          const matchingTax = data.data.taxes.find(
            (t: { name: string; percentage: number }) => t.name === settings.smartbillTaxName
          );
          if (matchingTax && matchingTax.percentage !== settings.smartbillTaxPercent) {
            console.log(`🔄 Auto-sync TVA: "${settings.smartbillTaxName}" ${settings.smartbillTaxPercent}% → ${matchingTax.percentage}%`);
            setSettings(prev => ({
              ...prev,
              smartbillTaxPercent: matchingTax.percentage
            }));
            toast({ 
              title: "TVA actualizat", 
              description: `Cota "${settings.smartbillTaxName}" actualizată la ${matchingTax.percentage}%` 
            });
          }
        }
        
        toast({ title: "Date încărcate", description: data.message });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Load SmartBill data from cache on mount
  useEffect(() => {
    const loadSmartbillCache = async () => {
      try {
        const res = await fetch("/api/settings/smartbill-data");
        const data = await res.json();
        if (data.success && data.data) {
          // Doar dacă avem date în cache
          if ((data.data.series && data.data.series.length > 0) || 
              (data.data.taxes && data.data.taxes.length > 0) ||
              (data.data.warehouses && data.data.warehouses.length > 0)) {
            setSmartbillData(data.data);
            
            // AUTO-SYNC: Actualizăm procentul TVA din cache dacă diferă
            if (data.data.taxes && data.data.taxes.length > 0) {
              const currentTaxName = settingsData?.settings?.smartbillTaxName;
              const currentTaxPercent = settingsData?.settings?.smartbillTaxPercent;
              if (currentTaxName) {
                const matchingTax = data.data.taxes.find(
                  (t: { name: string; percentage: number }) => t.name === currentTaxName
                );
                if (matchingTax && matchingTax.percentage !== currentTaxPercent) {
                  console.log(`🔄 Auto-sync TVA from cache: "${currentTaxName}" ${currentTaxPercent}% → ${matchingTax.percentage}%`);
                  // Nu actualizăm automat settings aici, doar afișăm warning
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading SmartBill cache:", error);
      }
    };
    
    // Încarcă cache-ul după ce setările s-au încărcat din DB
    if (settingsData?.settings?.smartbillEmail && settingsData?.settings?.smartbillToken) {
      loadSmartbillCache();
    }
  }, [settingsData?.settings?.smartbillEmail, settingsData?.settings?.smartbillToken, settingsData?.settings?.smartbillTaxName, settingsData?.settings?.smartbillTaxPercent]);

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

  // Test SmartBill connection
  const testSmartbillMutation = useMutation({
    mutationFn: async () => {
      // Trimite credențialele din formular pentru a testa ÎNAINTE de salvare
      const res = await fetch("/api/smartbill/test", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: settings.smartbillEmail,
          token: settings.smartbillToken,
          cif: settings.smartbillCompanyCif,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ 
          title: "✅ Conexiune reușită", 
          description: data.message || `Conectat la SmartBill: ${data.company || "OK"}` 
        });
      } else {
        toast({ 
          title: "❌ Conexiune eșuată", 
          description: data.error || "Nu s-a putut conecta la SmartBill", 
          variant: "destructive" 
        });
      }
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiat!", description: `${label} a fost copiat în clipboard` });
  };

  const stores: StoreType[] = storesData?.stores || [];

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Setări</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Configurează integrările și preferințele aplicației</p>
      </div>

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
                      <TableHead>Status</TableHead>
                      <TableHead>Comenzi</TableHead>
                      <TableHead>Data adăugării</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell className="text-muted-foreground">{store.shopifyDomain}</TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? "success" : "neutral"}>
                            {store.isActive ? "Activ" : "Inactiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>{store._count?.orders || 0}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(store.createdAt)}
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
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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

        {/* TAB: Contabilitate (SmartBill) */}
        <TabsContent value="accounting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SmartBill - Credențiale API</CardTitle>
              <CardDescription>Conectează-te la SmartBill pentru emiterea automată a facturilor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Email cont SmartBill</Label>
                  <Input
                    type="email"
                    placeholder="email@company.ro"
                    value={settings.smartbillEmail}
                    onChange={(e) => setSettings({ ...settings, smartbillEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Token API</Label>
                  <div className="relative">
                    <Input
                      type={showSmartbillToken ? "text" : "password"}
                      placeholder="Token din SmartBill Cloud"
                      value={settings.smartbillToken}
                      onChange={(e) => setSettings({ ...settings, smartbillToken: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSmartbillToken(!showSmartbillToken)}
                    >
                      {showSmartbillToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>CIF Companie</Label>
                  <Input
                    placeholder="RO12345678"
                    value={settings.smartbillCompanyCif}
                    onChange={(e) => setSettings({ ...settings, smartbillCompanyCif: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => testSmartbillMutation.mutate()}
                      disabled={testSmartbillMutation.isPending || !settings.smartbillEmail || !settings.smartbillToken}
                    >
                      {testSmartbillMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-2" />
                      )}
                      Testează conexiunea
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Verifică dacă credențialele SmartBill sunt valide și conexiunea funcționează corect.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => loadSmartbillDataMutation.mutate()}
                      disabled={loadSmartbillDataMutation.isPending || !settings.smartbillEmail || !settings.smartbillToken}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadSmartbillDataMutation.isPending ? "animate-spin" : ""}`} />
                      Încarcă date SmartBill
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Încarcă seriile de facturare și depozitele disponibile din contul SmartBill.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setări Facturare</CardTitle>
              <CardDescription>Configurează opțiunile de facturare</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Serie Factură</Label>
                  {smartbillData?.series ? (
                    <Select
                      value={settings.smartbillSeriesName}
                      onValueChange={(value) => setSettings({ ...settings, smartbillSeriesName: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selectează seria" /></SelectTrigger>
                      <SelectContent>
                        {smartbillData.series.filter(s => s.type === "f").map((series) => (
                          <SelectItem key={series.name} value={series.name}>
                            {series.name} (următorul: {series.nextNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="ex: FACT"
                      value={settings.smartbillSeriesName}
                      onChange={(e) => setSettings({ ...settings, smartbillSeriesName: e.target.value })}
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Cotă TVA</Label>
                  {smartbillData?.taxes && smartbillData.taxes.length > 0 ? (
                    <>
                      <Select
                        value={settings.smartbillTaxName}
                        onValueChange={(value) => {
                          const tax = smartbillData.taxes.find(t => t.name === value);
                          setSettings({ 
                            ...settings, 
                            smartbillTaxName: value,
                            smartbillTaxPercent: tax?.percentage || 21
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează cota TVA">
                            {settings.smartbillTaxName ? (
                              `${settings.smartbillTaxName} (${settings.smartbillTaxPercent}%)`
                            ) : (
                              "Selectează cota TVA"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {smartbillData.taxes.map((tax) => (
                            <SelectItem key={tax.name} value={tax.name}>
                              {tax.name} ({tax.percentage}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Warning dacă procentul din settings diferă de cel din SmartBill */}
                      {settings.smartbillTaxName && (() => {
                        const matchingTax = smartbillData.taxes.find(t => t.name === settings.smartbillTaxName);
                        if (matchingTax && matchingTax.percentage !== settings.smartbillTaxPercent) {
                          return (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-xs text-amber-800 font-medium">
                                ⚠️ Procentul salvat ({settings.smartbillTaxPercent}%) diferă de SmartBill ({matchingTax.percentage}%)!
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-1 h-7 text-xs"
                                onClick={() => {
                                  setSettings({
                                    ...settings,
                                    smartbillTaxPercent: matchingTax.percentage
                                  });
                                  toast({
                                    title: "TVA actualizat",
                                    description: `Procentul a fost actualizat la ${matchingTax.percentage}%`
                                  });
                                }}
                              >
                                🔄 Actualizează la {matchingTax.percentage}%
                              </Button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="ex: Normala"
                        value={settings.smartbillTaxName}
                        onChange={(e) => setSettings({ ...settings, smartbillTaxName: e.target.value })}
                      />
                      <p className="text-xs text-amber-600">
                        ⚠️ Click "Încarcă date SmartBill" pentru a vedea cotele TVA disponibile
                      </p>
                    </div>
                  )}
                  {settings.smartbillTaxName && (
                    <p className="text-xs text-muted-foreground">
                      Se va folosi: <strong>{settings.smartbillTaxName}</strong> cu <strong>{settings.smartbillTaxPercent}%</strong>
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Zile scadență</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.smartbillDueDays}
                    onChange={(e) => setSettings({ ...settings, smartbillDueDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Gestiune Stoc</Label>
                  {smartbillData?.warehouses ? (
                    <Select
                      value={settings.smartbillWarehouseName}
                      onValueChange={(value) => setSettings({ ...settings, smartbillWarehouseName: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selectează gestiunea" /></SelectTrigger>
                      <SelectContent>
                        {smartbillData.warehouses.map((wh) => (
                          <SelectItem key={wh} value={wh}>{wh}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="ex: Gestiune Principală"
                      value={settings.smartbillWarehouseName}
                      onChange={(e) => setSettings({ ...settings, smartbillWarehouseName: e.target.value })}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <Switch
                    checked={settings.smartbillUseStock}
                    onCheckedChange={(checked) => setSettings({ ...settings, smartbillUseStock: checked })}
                  />
                  <div>
                    <Label>Descărcare stoc SmartBill (gestiune externă)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dezactivați pentru a folosi doar inventarul local. Stocul local se descarcă automat.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status actual configurare */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                Configurare curentă pentru emitere facturi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Serie factură:</span>
                  <p className="font-medium">{settings.smartbillSeriesName || <span className="text-red-500">Nesetat</span>}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cotă TVA:</span>
                  <p className="font-medium">
                    {settings.smartbillTaxName ? (
                      <>{settings.smartbillTaxName} ({settings.smartbillTaxPercent}%)</>
                    ) : (
                      <span className="text-red-500">Nesetat (default: Normala 19%)</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Scadență:</span>
                  <p className="font-medium">{settings.smartbillDueDays > 0 ? `${settings.smartbillDueDays} zile` : "Fără"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stoc:</span>
                  <p className="font-medium">
                    {settings.smartbillUseStock 
                      ? (settings.smartbillWarehouseName || <span className="text-amber-500">Gestiune nesetată!</span>)
                      : "Dezactivat"}
                  </p>
                </div>
              </div>
              {smartbillData?.cacheUpdated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Date SmartBill încărcate: {formatDate(new Date(smartbillData.cacheUpdated))}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Se salvează..." : "Salvează Setări Contabilitate"}
            </Button>
          </div>
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
                  <Zap className="h-4 w-4 text-yellow-500" />
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
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
    </div>
    </TooltipProvider>
  );
}
