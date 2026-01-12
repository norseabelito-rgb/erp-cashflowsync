"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Info,
  ChevronRight,
  Pause,
  X,
  Building2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Platform icons (SVG inline)
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

interface AdsAccount {
  id: string;
  platform: "META" | "TIKTOK" | "GOOGLE";
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  businessId: string | null;
  businessName: string | null;
  status: "ACTIVE" | "PAUSED" | "ERROR" | "DISCONNECTED" | "PENDING_AUTH";
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncInProgress: boolean;
  createdAt: string;
  campaignsCount: number;
  pixelsCount: number;
}

interface SyncStatus {
  id?: string;
  status: string;
  progress?: {
    campaigns: { total: number; synced: number };
    adSets: { total: number; synced: number };
    ads: { total: number; synced: number };
    percent: number;
  };
  currentPhase?: string;
  error?: string;
  errorCode?: string;
  retryAt?: string;
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Activ", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  PAUSED: { label: "Pauză", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  ERROR: { label: "Eroare", color: "bg-red-100 text-red-800", icon: AlertCircle },
  DISCONNECTED: { label: "Deconectat", color: "bg-gray-100 text-gray-800", icon: XCircle },
  PENDING_AUTH: { label: "Așteaptă autorizare", color: "bg-blue-100 text-blue-800", icon: Clock },
};

const platformConfig: Record<string, { name: string; icon: any; color: string }> = {
  META: { name: "Meta (Facebook/Instagram)", icon: MetaIcon, color: "bg-blue-600" },
  TIKTOK: { name: "TikTok", icon: TikTokIcon, color: "bg-black" },
  GOOGLE: { name: "Google Ads", icon: null, color: "bg-red-500" },
};

interface AdsApp {
  id: string;
  platform: string;
  name: string;
  appId: string;
  accountsCount: number;
}

// Connect Dialog Content Component
function ConnectDialogContent({ 
  onConnect, 
  isConnecting 
}: { 
  onConnect: (platform: string, appId?: string) => void;
  isConnecting: boolean;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<"META" | "TIKTOK" | null>(null);
  const [apps, setApps] = useState<AdsApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Load apps when platform is selected
  useEffect(() => {
    if (selectedPlatform) {
      setLoadingApps(true);
      fetch(`/api/ads/apps?platform=${selectedPlatform}`)
        .then(res => res.json())
        .then(data => {
          setApps(data.apps || []);
          setLoadingApps(false);
        })
        .catch(() => {
          setApps([]);
          setLoadingApps(false);
        });
    }
  }, [selectedPlatform]);

  // If no platform selected, show platform selection
  if (!selectedPlatform) {
    return (
      <div className="grid gap-4 py-4">
        {/* Meta */}
        <button
          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
          onClick={() => setSelectedPlatform("META")}
          disabled={isConnecting}
        >
          <div className="p-3 rounded-lg bg-blue-600 text-white">
            <MetaIcon />
          </div>
          <div className="flex-1">
            <p className="font-medium">Meta (Facebook / Instagram)</p>
            <p className="text-sm text-muted-foreground">
              Conectează conturile tale de Facebook Ads și Instagram Ads
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* TikTok */}
        <button
          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
          onClick={() => setSelectedPlatform("TIKTOK")}
          disabled={isConnecting}
        >
          <div className="p-3 rounded-lg bg-black text-white">
            <TikTokIcon />
          </div>
          <div className="flex-1">
            <p className="font-medium">TikTok Ads</p>
            <p className="text-sm text-muted-foreground">
              Conectează contul tău de TikTok for Business
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Google - Coming Soon */}
        <div className="flex items-center gap-4 p-4 border rounded-lg opacity-50 cursor-not-allowed">
          <div className="p-3 rounded-lg bg-red-500 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium">Google Ads</p>
            <p className="text-sm text-muted-foreground">În curând disponibil</p>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </div>
    );
  }

  // Loading apps
  if (loadingApps) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No apps configured
  if (apps.length === 0) {
    return (
      <div className="py-4 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Nicio aplicație configurată</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Trebuie să configurezi mai întâi o aplicație {platformConfig[selectedPlatform].name} în setări.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => setSelectedPlatform(null)}>
            Înapoi
          </Button>
          <Link href="/ads/settings">
            <Button>Mergi la Setări</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show app selection
  const platform = platformConfig[selectedPlatform];
  const Icon = platform.icon;

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPlatform(null)}>
          ← Înapoi
        </Button>
        <div className={`p-2 rounded-lg ${platform.color} text-white`}>
          {Icon && <Icon />}
        </div>
        <span className="font-medium">{platform.name}</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Selectează aplicația pentru conectare:
      </p>

      <div className="space-y-2">
        {apps.map((app) => (
          <button
            key={app.id}
            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left"
            onClick={() => onConnect(selectedPlatform, app.id)}
            disabled={isConnecting}
          >
            <div className="flex-1">
              <p className="font-medium">{app.name}</p>
              <p className="text-xs text-muted-foreground">
                App ID: {app.appId} • {app.accountsCount} conturi
              </p>
            </div>
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Sync Progress Component
function SyncProgressBar({ accountId, onComplete }: { accountId: string; onComplete: () => void }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Poll sync status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/ads/accounts/${accountId}/sync-status`);
        if (res.ok && mounted) {
          const data = await res.json();
          setSyncStatus(data);

          // If idle, completed, failed or cancelled - stop polling
          if (data.status === 'idle' || data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(interval);
            if (data.status !== 'idle') {
              setTimeout(() => {
                if (mounted) onComplete();
              }, 2000);
            } else {
              // Idle means no sync - complete immediately
              if (mounted) onComplete();
            }
          }
        }
      } catch (err) {
        console.error('Error fetching sync status:', err);
        // On error, stop polling to prevent spam
        clearInterval(interval);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds (was 1.5)

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [accountId, onComplete]);

  // Countdown timer for retry
  useEffect(() => {
    if (!syncStatus?.retryAt) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const retryTime = new Date(syncStatus.retryAt!).getTime();
      const diff = retryTime - now;

      if (diff <= 0) {
        setCountdown("Repornește acum...");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [syncStatus?.retryAt]);

  // Cancel sync mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ads/accounts/${accountId}/sync-status`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sincronizare anulată" });
      onComplete();
    },
  });

  if (!syncStatus || syncStatus.status === 'idle') {
    return null;
  }

  const progress = syncStatus.progress;
  const isPaused = syncStatus.status === 'paused';
  const isRunning = syncStatus.status === 'running';
  const isCompleted = syncStatus.status === 'completed';
  const isFailed = syncStatus.status === 'failed';

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          {isPaused && <Pause className="h-4 w-4 text-yellow-500" />}
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {isFailed && <XCircle className="h-4 w-4 text-red-500" />}
          
          <span className="font-medium text-sm">
            {isRunning && "Sincronizare în curs..."}
            {isPaused && "Sincronizare în pauză"}
            {isCompleted && "Sincronizare completă!"}
            {isFailed && "Sincronizare eșuată"}
          </span>
        </div>

        {(isRunning || isPaused) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Anulează
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      {progress && (
        <>
          <Progress value={progress.percent} className="h-2 mb-3" />

          {/* Progress Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">
                {progress.campaigns.synced}/{progress.campaigns.total || '?'}
              </div>
              <div className="text-xs text-muted-foreground">Campanii</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">
                {progress.adSets.synced}/{progress.adSets.total || '?'}
              </div>
              <div className="text-xs text-muted-foreground">Ad Sets</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">
                {progress.ads.synced}/{progress.ads.total || '?'}
              </div>
              <div className="text-xs text-muted-foreground">Ads</div>
            </div>
          </div>
        </>
      )}

      {/* Error / Retry Info */}
      {isPaused && syncStatus.error && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {syncStatus.errorCode === 'RATE_LIMIT' 
                  ? "Rate limit Meta atins - prea multe cereri într-un timp scurt"
                  : syncStatus.error
                }
              </p>
              {syncStatus.retryAt && (
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Repornește automat în: <span className="font-mono">{countdown}</span>
                </p>
              )}
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                ✓ Progresul a fost salvat. Sincronizarea va continua de unde a rămas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed message */}
      {isCompleted && progress && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Sincronizare completă: {progress.campaigns.synced} campanii, {progress.adSets.synced} ad sets
          </p>
        </div>
      )}

      {/* Current Phase */}
      {isRunning && syncStatus.currentPhase && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Sincronizez: {syncStatus.currentPhase === 'campaigns' ? 'campanii' : 
                       syncStatus.currentPhase === 'adsets' ? 'ad sets' : 
                       syncStatus.currentPhase === 'ads' ? 'ads' : syncStatus.currentPhase}
        </p>
      )}
    </div>
  );
}

export default function AdsAccountsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  
  const [connectDialog, setConnectDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: AdsAccount | null }>({
    open: false,
    account: null,
  });
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  
  // Filtre
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [bmFilter, setBmFilter] = useState<string>("all");

  // Check for success/error messages from OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    
    if (success) {
      toast({ title: "✓ Succes", description: success });
      window.history.replaceState({}, "", "/ads/accounts");
    }
    if (error) {
      toast({ title: "Eroare", description: error, variant: "destructive" });
      window.history.replaceState({}, "", "/ads/accounts");
    }
  }, [searchParams]);

  // Fetch accounts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/ads/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const allAccounts: AdsAccount[] = data?.accounts || [];
  
  // Extrage Business Manager-uri unice pentru filtru
  const businessManagers = useMemo(() => {
    const bms = new Map<string, string>();
    allAccounts.forEach(acc => {
      if (acc.businessId && acc.businessName) {
        bms.set(acc.businessId, acc.businessName);
      }
    });
    return Array.from(bms.entries()).map(([id, name]) => ({ id, name }));
  }, [allAccounts]);
  
  // Aplică filtrele
  const accounts = useMemo(() => {
    return allAccounts.filter(acc => {
      if (platformFilter !== "all" && acc.platform !== platformFilter) return false;
      if (bmFilter !== "all" && acc.businessId !== bmFilter) return false;
      return true;
    });
  }, [allAccounts, platformFilter, bmFilter]);

  // Check for accounts with syncInProgress on load
  useEffect(() => {
    const syncing = new Set<string>();
    allAccounts.forEach(acc => {
      if (acc.syncInProgress) {
        syncing.add(acc.id);
      }
    });
    if (syncing.size > 0) {
      setSyncingAccounts(prev => {
        const merged = new Set(prev);
        syncing.forEach(id => merged.add(id));
        return merged;
      });
    }
  }, [allAccounts]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async ({ platform, appId }: { platform: string; appId?: string }) => {
      const res = await fetch("/api/ads/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");
      return data;
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare la conectare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch("/api/ads/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action: "sync" }),
      });
      const data = await res.json();
      // Don't throw on paused - it's expected
      if (!res.ok && !data.paused) throw new Error(data.error || "Sync failed");
      return { ...data, accountId };
    },
    onMutate: (accountId) => {
      setSyncingAccounts(prev => new Set(prev).add(accountId));
    },
    onSuccess: (data) => {
      if (data.paused) {
        toast({
          title: "Sincronizare în pauză",
          description: "Rate limit atins - va continua automat",
        });
      } else if (data.success) {
        toast({
          title: "✓ Sincronizare completă",
          description: `${data.campaignsSynced} campanii, ${data.adSetsSynced} ad sets`,
        });
        setSyncingAccounts(prev => {
          const next = new Set(prev);
          next.delete(data.accountId);
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["ads-accounts"] });
      }
    },
    onError: (error: any, accountId) => {
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
      toast({
        title: "Eroare la sincronizare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/ads/accounts?id=${accountId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: "✓ Cont deconectat" });
      setDeleteDialog({ open: false, account: null });
      queryClient.invalidateQueries({ queryKey: ["ads-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare la deconectare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle sync complete
  const handleSyncComplete = useCallback((accountId: string) => {
    setSyncingAccounts(prev => {
      const next = new Set(prev);
      next.delete(accountId);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["ads-accounts"] });
  }, [queryClient]);

  return (
    <RequirePermission permission="ads.view">
      <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 md:h-8 md:w-8" />
              Conturi Advertising
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Gestionează conturile tale de Meta, TikTok și Google Ads
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="md:size-default" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Reîncarcă</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Reîncarcă lista de conturi și actualizează statusurile.</p>
              </TooltipContent>
            </Tooltip>
            <RequirePermission permission="ads.accounts">
              <Button size="sm" className="md:size-default" onClick={() => setConnectDialog(true)}>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Conectează cont</span>
                <span className="md:hidden">Adaugă</span>
              </Button>
            </RequirePermission>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sincronizare inteligentă</AlertTitle>
          <AlertDescription>
            Progresul se salvează automat. Dacă sincronizarea e întreruptă de rate limit, 
            va continua automat de unde a rămas. Vezi progress bar-ul pentru detalii în timp real.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        {allAccounts.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtre:</span>
            </div>
            
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Platformă" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate platformele</SelectItem>
                <SelectItem value="META">Meta</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="GOOGLE">Google</SelectItem>
              </SelectContent>
            </Select>
            
            {businessManagers.length > 0 && (
              <Select value={bmFilter} onValueChange={setBmFilter}>
                <SelectTrigger className="w-[200px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Business Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate BM-urile</SelectItem>
                  {businessManagers.map(bm => (
                    <SelectItem key={bm.id} value={bm.id}>
                      {bm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {(platformFilter !== "all" || bmFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setPlatformFilter("all"); setBmFilter("all"); }}
              >
                <X className="h-4 w-4 mr-1" />
                Resetează
              </Button>
            )}
            
            <span className="text-sm text-muted-foreground ml-auto">
              {accounts.length} din {allAccounts.length} conturi
            </span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No accounts */}
        {!isLoading && accounts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Niciun cont conectat</h3>
              <p className="text-muted-foreground mb-4">
                Conectează primul tău cont de advertising pentru a începe monitorizarea
              </p>
              <RequirePermission permission="ads.accounts">
                <Button onClick={() => setConnectDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Conectează cont
                </Button>
              </RequirePermission>
            </CardContent>
          </Card>
        )}

        {/* Accounts List */}
        {!isLoading && accounts.length > 0 && (
          <div className="space-y-4">
            {accounts.map((account) => {
              const platform = platformConfig[account.platform] || platformConfig.META;
              const status = statusConfig[account.status] || statusConfig.ACTIVE;
              const PlatformIcon = platform.icon;
              const StatusIcon = status.icon;
              const isSyncing = syncingAccounts.has(account.id) || account.syncInProgress;

              return (
                <Card key={account.id} className={isSyncing ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Platform Icon */}
                        <div className={`p-3 rounded-lg ${platform.color} text-white`}>
                          {PlatformIcon && <PlatformIcon />}
                        </div>

                        {/* Account Info */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{account.name}</h3>
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {isSyncing && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Sincronizare
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {platform.name}
                            {account.businessName && ` • ${account.businessName}`}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                            <span className="text-muted-foreground">
                              ID: <code className="bg-muted px-1 rounded">{account.externalId}</code>
                            </span>
                            <span>•</span>
                            <span>{account.campaignsCount} campanii</span>
                            <span>•</span>
                            <span>{account.pixelsCount} pixels</span>
                            <span>•</span>
                            <span>{account.currency}</span>
                          </div>

                          {account.lastSyncAt && !isSyncing && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ultima sincronizare: {formatDate(account.lastSyncAt)}
                            </p>
                          )}

                          {account.lastSyncError && !isSyncing && (
                            <p className="text-xs text-red-600 mt-1">
                              Eroare: {account.lastSyncError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/ads?accountId=${account.id}`}>
                          <Button variant="outline" size="sm">
                            Vezi campanii
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncMutation.mutate(account.id)}
                              disabled={isSyncing || syncMutation.isPending}
                            >
                              {isSyncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p>Sincronizează toate campaniile, ad sets și ads din acest cont. Progresul se salvează automat.</p>
                          </TooltipContent>
                        </Tooltip>

                        <RequirePermission permission="ads.accounts">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, account })}
                                disabled={isSyncing}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Deconectează acest cont</p>
                            </TooltipContent>
                          </Tooltip>
                        </RequirePermission>
                      </div>
                    </div>

                    {/* Progress Bar - only shown when syncing */}
                    {isSyncing && (
                      <SyncProgressBar
                        accountId={account.id}
                        onComplete={() => handleSyncComplete(account.id)}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Connect Dialog */}
        <Dialog open={connectDialog} onOpenChange={setConnectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Conectează un cont de advertising</DialogTitle>
              <DialogDescription>
                Selectează platforma și aplicația pe care vrei să o folosești
              </DialogDescription>
            </DialogHeader>

            <ConnectDialogContent 
              onConnect={(platform, appId) => {
                setConnectDialog(false);
                connectMutation.mutate({ platform, appId });
              }}
              isConnecting={connectMutation.isPending}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialog(false)}>
                Anulează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, account: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deconectează contul?</AlertDialogTitle>
              <AlertDialogDescription>
                Ești sigur că vrei să deconectezi contul{" "}
                <strong>{deleteDialog.account?.name}</strong>?
                <br /><br />
                Aceasta va șterge toate campaniile, statisticile și alertele asociate din platformă.
                Contul va trebui reconectat pentru a vedea din nou datele.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog.account && deleteMutation.mutate(deleteDialog.account.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Deconectează
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </TooltipProvider>
    </RequirePermission>
  );
}
