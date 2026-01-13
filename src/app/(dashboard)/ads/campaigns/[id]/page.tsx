"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  TrendingUp,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
  Package,
  Bell,
  BarChart3,
  Calendar,
  Sparkles,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";
import { cn, formatDate } from "@/lib/utils";
import { CampaignPerformanceCharts } from "@/components/ads/campaign-charts";
import { CampaignAIInsights } from "./campaign-ai-insights";

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

function formatCurrency(value: number, currency: string = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Activ", color: "bg-status-success/10 text-status-success", icon: Play },
  PAUSED: { label: "Pauză", color: "bg-status-warning/10 text-status-warning", icon: Pause },
  ARCHIVED: { label: "Arhivat", color: "bg-gray-100 text-gray-800", icon: null },
  DELETED: { label: "Șters", color: "bg-status-error/10 text-status-error", icon: null },
};

function KPICard({ title, value, icon: Icon, suffix, trend }: {
  title: string;
  value: string | number;
  icon: any;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">
              {value}{suffix}
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ads.manage");

  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [addSkuDialog, setAddSkuDialog] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  // Fetch campaign details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads-campaign", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/ads/campaigns/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json();
    },
  });

  const campaign = data?.campaign;

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch("/api/ads/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: params.id,
          action: "updateStatus",
          status,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ Status actualizat" });
      queryClient.invalidateQueries({ queryKey: ["ads-campaign", params.id] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update budget mutation
  const budgetMutation = useMutation({
    mutationFn: async (dailyBudget: number) => {
      const res = await fetch("/api/ads/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: params.id,
          action: "updateBudget",
          dailyBudget,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ Buget actualizat" });
      setBudgetDialog(false);
      queryClient.invalidateQueries({ queryKey: ["ads-campaign", params.id] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Refresh campaign insights
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async (full: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/ads/campaigns/${params.id}/refresh${full ? "?full=true" : ""}`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      toast({ 
        title: "✓ Date actualizate", 
        description: full ? "Sincronizare completă" : "Insights actualizate" 
      });
      
      queryClient.invalidateQueries({ queryKey: ["ads-campaign", params.id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-insights", params.id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-compare", params.id] });
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add SKU mapping
  const addSkuMutation = useMutation({
    mutationFn: async (sku: string) => {
      const res = await fetch(`/api/ads/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addProductMapping", sku }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ SKU adăugat" });
      setAddSkuDialog(false);
      setNewSku("");
      queryClient.invalidateQueries({ queryKey: ["ads-campaign", params.id] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Remove SKU mapping
  const removeSkuMutation = useMutation({
    mutationFn: async (sku: string) => {
      const res = await fetch(`/api/ads/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeProductMapping", sku }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ SKU eliminat" });
      queryClient.invalidateQueries({ queryKey: ["ads-campaign", params.id] });
    },
  });

  const toggleAdSet = (id: string) => {
    const newSet = new Set(expandedAdSets);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedAdSets(newSet);
  };

  const getRoasColor = (roas: number | null) => {
    if (roas === null) return "text-gray-500";
    if (roas >= 3) return "text-status-success";
    if (roas >= 2) return "text-status-warning";
    return "text-status-error";
  };

  if (isLoading) {
    return (
      <RequirePermission permission="ads.view">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RequirePermission>
    );
  }

  if (!campaign) {
    return (
      <RequirePermission permission="ads.view">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Campania nu a fost găsită</AlertDescription>
          </Alert>
        </div>
      </RequirePermission>
    );
  }

  const status = statusConfig[campaign.status] || statusConfig.PAUSED;
  const StatusIcon = status.icon;

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  campaign.account?.platform === "META" ? "bg-status-info/10" : "bg-gray-100"
                )}>
                  {campaign.account?.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{campaign.name}</h1>
                  <p className="text-muted-foreground">
                    {campaign.account?.name} • {campaign.objective}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={status.color}>
                  {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                  {status.label}
                </Badge>
                {campaign.namingValid ? (
                  <Badge variant="outline" className="text-status-success">
                    ✓ Denumire validă
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-status-warning">
                    ⚠️ Denumire non-standard
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate(campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : campaign.status === "ACTIVE" ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {campaign.status === "ACTIVE" ? "Pauză" : "Activează"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBudgetDialog(true);
                  setNewBudget(campaign.dailyBudget?.toString() || "");
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Modifică Buget
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleRefresh(false)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard title="Spend" value={formatCurrency(campaign.spend || 0)} icon={DollarSign} />
          <KPICard title="Impressions" value={formatNumber(campaign.impressions || 0)} icon={Eye} />
          <KPICard title="Clicks" value={formatNumber(campaign.clicks || 0)} icon={MousePointer} />
          <KPICard title="CTR" value={campaign.ctr?.toFixed(2) || "-"} suffix="%" icon={Target} />
          <KPICard title="Conversii" value={campaign.conversions || 0} icon={ShoppingCart} />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ROAS</p>
                  <p className={cn("text-xl font-bold mt-1", getRoasColor(campaign.roas))}>
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : "-"}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Buget/zi</p>
              <p className="text-lg font-semibold">
                {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">CPC</p>
              <p className="text-lg font-semibold">
                {campaign.cpc ? formatCurrency(campaign.cpc) : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">CPM</p>
              <p className="text-lg font-semibold">
                {campaign.cpm ? formatCurrency(campaign.cpm) : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">CPA</p>
              <p className="text-lg font-semibold">
                {campaign.cpa ? formatCurrency(campaign.cpa) : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-semibold">
                {formatCurrency(campaign.revenue || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance">
          <TabsList>
            <TabsTrigger value="performance">📊 Performanță</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="structure">Structură ({campaign.adSets?.length || 0} Ad Sets)</TabsTrigger>
            <TabsTrigger value="products">Produse ({campaign.productMappings?.length || 0})</TabsTrigger>
            <TabsTrigger value="alerts">Alerte ({campaign.alerts?.length || 0})</TabsTrigger>
            <TabsTrigger value="stats">Istoric</TabsTrigger>
          </TabsList>
          
          {/* Performance Tab - Grafice și comparații */}
          <TabsContent value="performance" className="mt-4">
            <CampaignPerformanceCharts 
              campaignId={campaign.id} 
              currency={campaign.account?.currency || "RON"}
            />
          </TabsContent>

          {/* AI Insights Tab - On-demand analysis */}
          <TabsContent value="ai" className="mt-4">
            <CampaignAIInsights 
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </TabsContent>

          {/* Structure Tab - Ad Sets & Ads */}
          <TabsContent value="structure" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {campaign.adSets?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Niciun Ad Set sincronizat</p>
                    <p className="text-sm">Rulează sync-ul pentru a importa structura</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {campaign.adSets?.map((adSet: any) => (
                      <Collapsible
                        key={adSet.id}
                        open={expandedAdSets.has(adSet.id)}
                        onOpenChange={() => toggleAdSet(adSet.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="p-4 hover:bg-muted/50 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <ChevronRight className={cn(
                                  "h-4 w-4 transition-transform",
                                  expandedAdSets.has(adSet.id) && "rotate-90"
                                )} />
                                <div>
                                  <p className="font-medium">{adSet.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={adSet.status === "ACTIVE" ? "default" : "secondary"}>
                                      {adSet.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {adSet.ads?.length || 0} ads
                                    </span>
                                    {adSet.targeting && (
                                      <span className="text-xs text-muted-foreground">
                                        • {adSet.targeting}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                  <p className="text-muted-foreground">Spend</p>
                                  <p className="font-medium">{formatCurrency(adSet.spend || 0)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground">Conv.</p>
                                  <p className="font-medium">{adSet.conversions || 0}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground">ROAS</p>
                                  <p className={cn("font-medium", getRoasColor(adSet.roas))}>
                                    {adSet.roas ? `${adSet.roas.toFixed(2)}x` : "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pl-11">
                            {adSet.ads?.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">Niciun ad</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Ad</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Spend</TableHead>
                                    <TableHead className="text-right">Impr.</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                    <TableHead className="text-right">CTR</TableHead>
                                    <TableHead className="text-right">Conv.</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {adSet.ads?.map((ad: any) => (
                                    <TableRow key={ad.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {ad.thumbnailUrl && (
                                            <img
                                              src={ad.thumbnailUrl}
                                              alt=""
                                              className="h-8 w-8 rounded object-cover"
                                            />
                                          )}
                                          <span className="truncate max-w-[200px]">{ad.name}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={ad.status === "ACTIVE" ? "default" : "secondary"}>
                                          {ad.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">{formatCurrency(ad.spend || 0)}</TableCell>
                                      <TableCell className="text-right">{formatNumber(ad.impressions || 0)}</TableCell>
                                      <TableCell className="text-right">{formatNumber(ad.clicks || 0)}</TableCell>
                                      <TableCell className="text-right">{ad.ctr?.toFixed(2) || "-"}%</TableCell>
                                      <TableCell className="text-right">{ad.conversions || 0}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Produse Asociate</CardTitle>
                    <CardDescription>
                      SKU-uri mapate la această campanie pentru tracking performanță
                    </CardDescription>
                  </div>
                  {canManage && (
                    <Button onClick={() => setAddSkuDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă SKU
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {campaign.productMappings?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Niciun produs asociat</p>
                    {campaign.namingValid && campaign.parsedCodes?.length > 0 && (
                      <p className="text-sm mt-2">
                        Din denumire: {campaign.parsedCodes.join(", ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaign.productMappings?.map((mapping: any) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {mapping.masterProduct?.imageUrl ? (
                            <img
                              src={mapping.masterProduct.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{mapping.sku}</p>
                            {mapping.masterProduct?.title && (
                              <p className="text-sm text-muted-foreground">
                                {mapping.masterProduct.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {mapping.mappingSource === "AUTO_NAME" ? "Auto" : "Manual"}
                          </Badge>
                          {mapping.masterProduct && (
                            <Link href={`/products/${mapping.masterProduct.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSkuMutation.mutate(mapping.sku)}
                            >
                              <X className="h-4 w-4 text-status-error" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alerte Recente</CardTitle>
                <CardDescription>
                  Alertele declanșate pentru această campanie
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.alerts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nicio alertă pentru această campanie</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaign.alerts?.map((alert: any) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 border rounded-lg",
                          alert.status === "NEW" && "border-status-error/30 bg-status-error/10"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={alert.status === "NEW" ? "destructive" : "secondary"}>
                                {alert.status}
                              </Badge>
                              <span className="font-medium">{alert.rule?.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Acțiune: {alert.actionTaken}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab - Daily History */}
          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Istoric Zilnic
                </CardTitle>
                <CardDescription>
                  Ultimele 30 de zile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.dailyStats?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nicio statistică zilnică</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Impr.</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Conv.</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaign.dailyStats?.map((day: any) => (
                        <TableRow key={day.id}>
                          <TableCell>{formatDate(day.date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(day.spend)}</TableCell>
                          <TableCell className="text-right">{formatNumber(day.impressions)}</TableCell>
                          <TableCell className="text-right">{formatNumber(day.clicks)}</TableCell>
                          <TableCell className="text-right">{day.conversions}</TableCell>
                          <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add SKU Dialog */}
        <Dialog open={addSkuDialog} onOpenChange={setAddSkuDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adaugă SKU</DialogTitle>
              <DialogDescription>
                Asociază un produs la această campanie pentru tracking
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>SKU Produs</Label>
              <Input
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                placeholder="Ex: PAT001"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSkuDialog(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => addSkuMutation.mutate(newSku)}
                disabled={!newSku || addSkuMutation.isPending}
              >
                {addSkuMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Adaugă
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Budget Dialog */}
        <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifică Bugetul</DialogTitle>
              <DialogDescription>
                Setează bugetul zilnic pentru această campanie
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Buget zilnic (RON)</Label>
              <Input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="Ex: 100"
                className="mt-2"
              />
              {campaign.dailyBudget && (
                <p className="text-sm text-muted-foreground mt-2">
                  Buget actual: {formatCurrency(campaign.dailyBudget)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBudgetDialog(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => budgetMutation.mutate(parseFloat(newBudget))}
                disabled={!newBudget || budgetMutation.isPending}
              >
                {budgetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
