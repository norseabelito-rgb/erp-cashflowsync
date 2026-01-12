"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Megaphone,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  ExternalLink,
  MoreVertical,
  Settings,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

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

function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Activ", color: "bg-green-100 text-green-800", icon: Play },
  PAUSED: { label: "Pauză", color: "bg-yellow-100 text-yellow-800", icon: Pause },
  ARCHIVED: { label: "Arhivat", color: "bg-gray-100 text-gray-800", icon: null },
  DELETED: { label: "Șters", color: "bg-red-100 text-red-800", icon: null },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ads.manage");
  
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  
  const [budgetDialog, setBudgetDialog] = useState<{ open: boolean; campaign: any | null }>({
    open: false,
    campaign: null,
  });
  const [newBudget, setNewBudget] = useState("");

  // Fetch campaigns
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ads-campaigns-list", search, platformFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "25");
      
      const res = await fetch(`/api/ads/campaigns?${params}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: async ({ campaignId, action, status, dailyBudget }: any) => {
      const res = await fetch("/api/ads/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, action, status, dailyBudget }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "✓ Actualizat", description: result.message });
      queryClient.invalidateQueries({ queryKey: ["ads-campaigns-list"] });
      setBudgetDialog({ open: false, campaign: null });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusToggle = (campaign: any) => {
    const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    updateMutation.mutate({
      campaignId: campaign.id,
      action: "updateStatus",
      status: newStatus,
    });
  };

  const handleBudgetSave = () => {
    if (!budgetDialog.campaign || !newBudget) return;
    updateMutation.mutate({
      campaignId: budgetDialog.campaign.id,
      action: "updateBudget",
      dailyBudget: parseFloat(newBudget),
    });
  };

  const getRoasColor = (roas: number | null) => {
    if (roas === null) return "text-gray-500";
    if (roas >= 3) return "text-green-600";
    if (roas >= 2) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6" />
              Campanii
            </h1>
            <p className="text-muted-foreground">
              Gestionează și monitorizează campaniile de advertising
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Link href="/ads/campaigns/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Campanie Nouă
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Caută campanie..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platformă" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="META">Meta</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">În pauză</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nu există campanii</p>
                <p className="text-muted-foreground">
                  {search || platformFilter !== "all" || statusFilter !== "all"
                    ? "Încearcă alte filtre"
                    : "Conectează un cont pentru a vedea campaniile"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Campanie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Buget/zi</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign: any) => {
                    const status = statusConfig[campaign.status] || statusConfig.PAUSED;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1 rounded",
                              campaign.account?.platform === "META" ? "bg-blue-100" : "bg-gray-100"
                            )}>
                              {campaign.account?.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                            </div>
                            <div>
                              <p className="font-medium truncate max-w-[250px]" title={campaign.name}>
                                {campaign.name}
                              </p>
                              {campaign.namingValid && campaign.parsedCodes?.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {campaign.parsedCodes.slice(0, 3).map((code: string) => (
                                    <Badge key={code} variant="secondary" className="text-xs">
                                      {code}
                                    </Badge>
                                  ))}
                                  {campaign.parsedCodes.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{campaign.parsedCodes.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {!campaign.namingValid && (
                                <p className="text-xs text-amber-600">⚠️ Denumire non-standard</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(campaign.spend || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.impressions || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(campaign.clicks || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.ctr ? `${campaign.ctr.toFixed(2)}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {campaign.conversions || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.cpa ? formatCurrency(campaign.cpa) : "-"}
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", getRoasColor(campaign.roas))}>
                          {campaign.roas ? `${campaign.roas.toFixed(2)}x` : "-"}
                        </TableCell>
                        <TableCell>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStatusToggle(campaign)}
                                  disabled={updateMutation.isPending}
                                >
                                  {campaign.status === "ACTIVE" ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Pune în pauză
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Activează
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setBudgetDialog({ open: true, campaign });
                                    setNewBudget(campaign.dailyBudget?.toString() || "");
                                  }}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Modifică buget
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/ads/campaigns/${campaign.id}`}>
                                    <ChevronRight className="h-4 w-4 mr-2" />
                                    Vezi detalii
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {pagination.total} campanii
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-sm">
                  {page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Următor
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Budget Dialog */}
        <Dialog open={budgetDialog.open} onOpenChange={(open) => setBudgetDialog({ open, campaign: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifică Bugetul</DialogTitle>
              <DialogDescription>
                Campanie: {budgetDialog.campaign?.name}
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
              {budgetDialog.campaign?.dailyBudget && (
                <p className="text-sm text-muted-foreground mt-2">
                  Buget actual: {formatCurrency(budgetDialog.campaign.dailyBudget)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBudgetDialog({ open: false, campaign: null })}>
                Anulează
              </Button>
              <Button onClick={handleBudgetSave} disabled={updateMutation.isPending || !newBudget}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequirePermission>
  );
}
