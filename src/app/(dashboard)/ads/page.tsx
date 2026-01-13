"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
  Plus,
  Settings,
  BarChart3,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RequirePermission } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/utils";
import { AIInsights } from "@/components/ai-insights";

// Platform icons
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
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
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return value.toString();
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return value.toFixed(2) + "%";
}

export default function AdsDashboardPage() {
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("30d");

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["ads-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/ads/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const accounts = accountsData?.accounts || [];
  const hasAccounts = accounts.length > 0;

  // Fetch campaigns for stats
  const { data: campaignsData, isLoading: campaignsLoading, refetch } = useQuery({
    queryKey: ["ads-campaigns", accountFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountFilter !== "all") params.set("accountId", accountFilter);
      const res = await fetch(`/api/ads/campaigns?${params}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: hasAccounts,
  });

  const campaigns = campaignsData?.campaigns || [];
  const stats = campaignsData?.stats || {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    avgCTR: null,
    avgCPC: null,
    avgCPA: null,
    avgROAS: null,
  };

  const isLoading = accountsLoading || campaignsLoading;

  // Calculate ROAS color
  const getRoasColor = (roas: number | null) => {
    if (roas === null) return "text-gray-500";
    if (roas >= 3) return "text-status-success";
    if (roas >= 2) return "text-status-warning";
    return "text-status-error";
  };

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" />
              Ads Overview
            </h1>
            <p className="text-muted-foreground">
              Vizualizează performanța campaniilor tale de advertising
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/ads/accounts">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Conturi
              </Button>
            </Link>
          </div>
        </div>

        {/* No accounts warning */}
        {!accountsLoading && !hasAccounts && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Niciun cont conectat</AlertTitle>
            <AlertDescription>
              Conectează un cont de Meta Ads sau TikTok Ads pentru a vedea statisticile.
              <Link href="/ads/accounts" className="ml-2 text-primary hover:underline">
                Conectează acum →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {hasAccounts && (
          <>
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Toate conturile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate conturile</SelectItem>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        {account.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                        {account.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Perioada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Ultimele 7 zile</SelectItem>
                  <SelectItem value="30d">Ultimele 30 zile</SelectItem>
                  <SelectItem value="90d">Ultimele 90 zile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cheltuieli
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Impressions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.totalImpressions)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Clicks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.totalClicks)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    CTR: {formatPercent(stats.avgCTR)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Conversii
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalConversions}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    CPA: {stats.avgCPA ? formatCurrency(stats.avgCPA) : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    ROAS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getRoasColor(stats.avgROAS)}`}>
                    {stats.avgROAS ? stats.avgROAS.toFixed(2) + "x" : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revenue: {formatCurrency(stats.totalRevenue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights for Advertising */}
            <AIInsights
              filterType="AD_BUDGET,AD_STATUS,AD_BID"
              analyzeType="ads"
              showAnalyzeButton={true}
              compact={false}
              maxItems={5}
            />

            {/* Campaigns List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Campanii Active</CardTitle>
                    <CardDescription>
                      {campaigns.length} campanii găsite
                    </CardDescription>
                  </div>
                  <RequirePermission permission="ads.create">
                    <Button size="sm" disabled>
                      <Plus className="h-4 w-4 mr-2" />
                      Campanie Nouă
                      <Badge variant="secondary" className="ml-2 text-xs">Soon</Badge>
                    </Button>
                  </RequirePermission>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nu există campanii de afișat</p>
                    <p className="text-sm mt-1">Sincronizează conturile pentru a vedea campaniile</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice(0, 10).map((campaign: any) => (
                      <Link
                        key={campaign.id}
                        href={`/ads/campaigns/${campaign.id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer block"
                      >
                        <div className="flex items-center gap-4">
                          {/* Platform Icon */}
                          <div className={`p-2 rounded ${
                            campaign.account?.platform === "META"
                              ? "bg-status-info/10 text-status-info"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {campaign.account?.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                          </div>

                          {/* Campaign Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{campaign.name}</p>
                              <Badge variant={
                                campaign.status === "ACTIVE" ? "default" :
                                campaign.status === "PAUSED" ? "secondary" : "destructive"
                              }>
                                {campaign.status === "ACTIVE" ? "Activ" :
                                 campaign.status === "PAUSED" ? "Pauză" : campaign.status}
                              </Badge>
                              {campaign.namingValid && (
                                <Badge variant="outline" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Auto-mapped
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {campaign.objective || "No objective"} • 
                              {campaign.account?.name}
                            </p>
                          </div>
                        </div>

                        {/* Campaign Stats */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(Number(campaign.spend))}</p>
                            <p className="text-xs text-muted-foreground">Spend</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{campaign.conversions}</p>
                            <p className="text-xs text-muted-foreground">Conv.</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${getRoasColor(Number(campaign.roas))}`}>
                              {campaign.roas ? Number(campaign.roas).toFixed(2) + "x" : "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">ROAS</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}

                    {campaigns.length > 10 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" size="sm">
                          Vezi toate ({campaigns.length}) campaniile
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats by Product (placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle>Performance per SKU</CardTitle>
                <CardDescription>
                  Vezi care produse au cele mai bune rezultate în advertising
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Această funcționalitate va fi disponibilă în curând</p>
                  <p className="text-sm mt-1">
                    Denumește campaniile folosind convenția pentru a activa auto-mapping
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
