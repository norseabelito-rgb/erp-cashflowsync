"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Info,
  Plus,
  Trash2,
  Edit2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { RequirePermission } from "@/hooks/use-permissions";
import { WebhookConfigSection } from "@/components/ads/webhook-config";

// Platform icons
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface AdsApp {
  id: string;
  platform: "META" | "TIKTOK" | "GOOGLE";
  name: string;
  appId: string;
  redirectUri: string;
  isActive: boolean;
  accountsCount: number;
  createdAt: string;
}

interface AppFormState {
  name: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
}

const platformInfo = {
  META: {
    name: "Meta (Facebook/Instagram)",
    icon: MetaIcon,
    color: "bg-blue-600",
    docsUrl: "https://developers.facebook.com/apps",
    instructions: [
      "Accesează Facebook Developers și creează o aplicație nouă",
      "Selectează tipul 'Business' pentru aplicație",
      "În Settings > Basic, copiază App ID și App Secret",
      "Adaugă domeniul tău în 'App Domains'",
      "În Products, adaugă 'Facebook Login' și configurează OAuth Redirect URI",
      "Solicită permisiunile: ads_management, ads_read, business_management, read_insights",
    ],
  },
  TIKTOK: {
    name: "TikTok Ads",
    icon: TikTokIcon,
    color: "bg-black",
    docsUrl: "https://ads.tiktok.com/marketing_api/apps",
    instructions: [
      "Accesează TikTok Marketing API și creează o aplicație nouă",
      "Completează informațiile despre companie",
      "Copiază App ID și App Secret din setările aplicației",
      "Configurează OAuth Redirect URI în setări",
      "Solicită acces la API-urile necesare pentru Ads Management",
    ],
  },
  GOOGLE: {
    name: "Google Ads",
    icon: null,
    color: "bg-status-error",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    instructions: ["În curând disponibil"],
  },
};

function AppCard({ 
  app, 
  onEdit, 
  onDelete 
}: { 
  app: AdsApp; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const info = platformInfo[app.platform];
  const Icon = info.icon;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${info.color} text-white`}>
              {Icon && <Icon />}
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {app.name}
                {app.isActive ? (
                  <Badge variant="outline" className="text-status-success border-status-success">Activ</Badge>
                ) : (
                  <Badge variant="secondary">Inactiv</Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                App ID: <code className="bg-muted px-1 rounded">{app.appId}</code>
              </p>
              <p className="text-sm text-muted-foreground">
                {app.accountsCount} conturi conectate
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              disabled={app.accountsCount > 0}
              className={app.accountsCount > 0 ? "opacity-50" : "text-status-error hover:text-status-error/80"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppFormDialog({
  open,
  onOpenChange,
  platform,
  editingApp,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: "META" | "TIKTOK";
  editingApp: AdsApp | null;
  onSave: (data: AppFormState) => void;
  isSaving: boolean;
}) {
  const info = platformInfo[platform];
  
  const defaultRedirectUri = typeof window !== "undefined" 
    ? `${window.location.origin}/api/ads/accounts/callback/${platform.toLowerCase()}`
    : "";

  const [formState, setFormState] = useState<AppFormState>({
    name: "",
    appId: "",
    appSecret: "",
    redirectUri: defaultRedirectUri,
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingApp) {
        setFormState({
          name: editingApp.name,
          appId: editingApp.appId,
          appSecret: "",
          redirectUri: editingApp.redirectUri,
        });
      } else {
        setFormState({
          name: "",
          appId: "",
          appSecret: "",
          redirectUri: defaultRedirectUri,
        });
      }
    }
  }, [open, editingApp, defaultRedirectUri]);

  const handleSubmit = () => {
    if (!formState.name.trim()) {
      toast({ title: "Eroare", description: "Numele este obligatoriu", variant: "destructive" });
      return;
    }
    if (!formState.appId.trim()) {
      toast({ title: "Eroare", description: "App ID este obligatoriu", variant: "destructive" });
      return;
    }
    if (!editingApp && !formState.appSecret.trim()) {
      toast({ title: "Eroare", description: "App Secret este obligatoriu", variant: "destructive" });
      return;
    }
    onSave(formState);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiat!", description: "URL-ul a fost copiat în clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingApp ? "Editează aplicația" : `Adaugă aplicație ${info.name}`}
          </DialogTitle>
          <DialogDescription>
            {editingApp 
              ? "Modifică credențialele aplicației OAuth"
              : "Configurează credențialele pentru a conecta conturi din acest Business Manager"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="app-name">Nume aplicație *</Label>
            <Input
              id="app-name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Business Manager Principal, Client ABC"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Un nume descriptiv pentru a identifica ușor aplicația
            </p>
          </div>

          <div>
            <Label htmlFor="app-id">App ID / Client ID *</Label>
            <Input
              id="app-id"
              value={formState.appId}
              onChange={(e) => setFormState(prev => ({ ...prev, appId: e.target.value }))}
              placeholder="Introdu App ID"
            />
          </div>

          <div>
            <Label htmlFor="app-secret">
              App Secret / Client Secret {editingApp ? "(lasă gol pentru a păstra)" : "*"}
            </Label>
            <div className="relative">
              <Input
                id="app-secret"
                type={showSecret ? "text" : "password"}
                value={formState.appSecret}
                onChange={(e) => setFormState(prev => ({ ...prev, appSecret: e.target.value }))}
                placeholder={editingApp ? "••••••••••••" : "Introdu App Secret"}
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

          <div>
            <Label htmlFor="redirect-uri">OAuth Redirect URI *</Label>
            <div className="flex gap-2">
              <Input
                id="redirect-uri"
                value={formState.redirectUri}
                onChange={(e) => setFormState(prev => ({ ...prev, redirectUri: e.target.value }))}
                placeholder={defaultRedirectUri}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(formState.redirectUri)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Copiază acest URL în setările aplicației tale {info.name}
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Pași pentru configurare</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                {info.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <a
                href={info.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-status-info hover:underline flex items-center gap-1 mt-2"
              >
                Deschide {info.name} Developers
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingApp ? "Salvează" : "Adaugă"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlatformAppsSection({ platform }: { platform: "META" | "TIKTOK" }) {
  const queryClient = useQueryClient();
  const info = platformInfo[platform];
  const Icon = info.icon;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdsApp | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; app: AdsApp | null }>({ 
    open: false, 
    app: null 
  });

  const { data, isLoading } = useQuery({
    queryKey: ["ads-apps", platform],
    queryFn: async () => {
      const res = await fetch(`/api/ads/apps?platform=${platform}`);
      if (!res.ok) throw new Error("Failed to fetch apps");
      return res.json();
    },
  });

  const apps: AdsApp[] = data?.apps || [];

  const saveMutation = useMutation({
    mutationFn: async ({ appId, data }: { appId?: string; data: AppFormState }) => {
      const method = appId ? "PUT" : "POST";
      const body = appId 
        ? { id: appId, ...data }
        : { platform, ...data };
      
      const res = await fetch("/api/ads/apps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "✓ Salvat", description: result.message });
      queryClient.invalidateQueries({ queryKey: ["ads-apps"] });
      setAddDialogOpen(false);
      setEditingApp(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/ads/apps?id=${appId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "✓ Șters", description: result.message });
      queryClient.invalidateQueries({ queryKey: ["ads-apps"] });
      setDeleteDialog({ open: false, app: null });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (data: AppFormState) => {
    saveMutation.mutate({ appId: editingApp?.id, data });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${info.color} text-white`}>
            {Icon && <Icon />}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{info.name}</h2>
            <p className="text-sm text-muted-foreground">
              {apps.length} aplicații configurate
            </p>
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adaugă aplicație
        </Button>
      </div>

      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>Aplicații multiple</AlertTitle>
        <AlertDescription>
          Poți adăuga mai multe aplicații pentru a conecta conturi din diferite Business Manager-uri.
          Fiecare aplicație {info.name} este legată de un anumit Business Manager.
        </AlertDescription>
      </Alert>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && apps.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nicio aplicație configurată</h3>
            <p className="text-muted-foreground mb-4">
              Adaugă prima aplicație {info.name} pentru a putea conecta conturi de advertising
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă aplicație
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && apps.length > 0 && (
        <div className="space-y-3">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onEdit={() => setEditingApp(app)}
              onDelete={() => setDeleteDialog({ open: true, app })}
            />
          ))}
        </div>
      )}

      <AppFormDialog
        open={addDialogOpen || !!editingApp}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingApp(null);
          }
        }}
        platform={platform}
        editingApp={editingApp}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, app: deleteDialog.app })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge aplicația?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi aplicația "{deleteDialog.app?.name}"?
              {deleteDialog.app?.accountsCount && deleteDialog.app.accountsCount > 0 ? (
                <span className="block mt-2 text-status-error">
                  Această aplicație are {deleteDialog.app.accountsCount} conturi conectate și nu poate fi ștearsă.
                </span>
              ) : (
                <span className="block mt-2">
                  Această acțiune nu poate fi anulată.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.app && deleteMutation.mutate(deleteDialog.app.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteDialog.app?.accountsCount ? deleteDialog.app.accountsCount > 0 : false}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdsSettingsPage() {
  const [activeTab, setActiveTab] = useState("META");

  return (
    <RequirePermission permission="ads.accounts">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Setări Advertising
          </h1>
          <p className="text-muted-foreground">
            Gestionează aplicațiile OAuth pentru platformele de advertising
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Aplicații multiple per platformă</AlertTitle>
          <AlertDescription>
            Poți configura mai multe aplicații pentru fiecare platformă, utile când ai conturi 
            în diferite Business Manager-uri. La conectarea unui cont nou, vei putea alege 
            ce aplicație să folosești.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="META" className="flex items-center gap-2">
              <MetaIcon />
              Meta
            </TabsTrigger>
            <TabsTrigger value="TIKTOK" className="flex items-center gap-2">
              <TikTokIcon />
              TikTok
            </TabsTrigger>
            <TabsTrigger value="GOOGLE" className="flex items-center gap-2">
              Google
              <Badge variant="secondary" className="text-xs">Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="META" className="mt-6">
            <PlatformAppsSection platform="META" />
          </TabsContent>

          <TabsContent value="TIKTOK" className="mt-6">
            <PlatformAppsSection platform="TIKTOK" />
          </TabsContent>

          <TabsContent value="GOOGLE" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">În curând</h3>
                <p className="text-muted-foreground">
                  Integrarea cu Google Ads va fi disponibilă în curând.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Webhook Configuration Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Notificări în timp real</h2>
          <WebhookConfigSection />
        </div>
      </div>
    </RequirePermission>
  );
}
