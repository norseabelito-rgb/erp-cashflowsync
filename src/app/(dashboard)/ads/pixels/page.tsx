"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Code,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";
import { cn, formatDate } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  OK: { label: "Activ", color: "bg-status-success/10 text-status-success", icon: CheckCircle2 },
  WARNING: { label: "Avertisment", color: "bg-status-warning/10 text-status-warning", icon: AlertCircle },
  ERROR: { label: "Eroare", color: "bg-status-error/10 text-status-error", icon: XCircle },
};

export default function PixelsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ads.manage");

  const [accountFilter, setAccountFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; pixel: any | null }>({
    open: false,
    pixel: null,
  });
  const [newPixel, setNewPixel] = useState({ accountId: "", pixelId: "", name: "" });

  // Fetch pixels
  const { data: pixelsData, isLoading: pixelsLoading, refetch } = useQuery({
    queryKey: ["ads-pixels", accountFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountFilter !== "all") params.set("accountId", accountFilter);
      const res = await fetch(`/api/ads/pixels?${params}`);
      if (!res.ok) throw new Error("Failed to fetch pixels");
      return res.json();
    },
  });

  // Fetch accounts for filter
  const { data: accountsData } = useQuery({
    queryKey: ["ads-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/ads/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  const pixels = pixelsData?.pixels || [];
  const accounts = accountsData?.accounts || [];

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch("/api/ads/pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", accountId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "✓ Sincronizat", description: result.message });
      queryClient.invalidateQueries({ queryKey: ["ads-pixels"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Check mutation
  const checkMutation = useMutation({
    mutationFn: async (pixelId: string) => {
      const res = await fetch("/api/ads/pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", pixelId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: result.status === "OK" ? "✓ Pixel OK" : "⚠️ Verificare",
        description: result.message,
        variant: result.status === "ERROR" ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ["ads-pixels"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ads/pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...newPixel }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      toast({ title: "✓ Adăugat", description: result.message });
      setAddDialog(false);
      setNewPixel({ accountId: "", pixelId: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["ads-pixels"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (pixelId: string) => {
      const res = await fetch(`/api/ads/pixels?id=${pixelId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "✓ Șters" });
      setDeleteDialog({ open: false, pixel: null });
      queryClient.invalidateQueries({ queryKey: ["ads-pixels"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  return (
    <RequirePermission permission="ads.view">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6" />
              Pixeli Tracking
            </h1>
            <p className="text-muted-foreground">
              Gestionează și monitorizează pixelii Meta și TikTok
            </p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => setAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Manual
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>Monitorizare Pixeli</AlertTitle>
          <AlertDescription>
            Pixelii sunt utilizați pentru tracking conversii și remarketing. 
            Sincronizează din conturile conectate sau adaugă manual ID-ul pixelului.
          </AlertDescription>
        </Alert>

        {/* Sync Cards per Account */}
        {canManage && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.filter((a: any) => a.status === "ACTIVE").map((account: any) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        account.platform === "META" ? "bg-status-info/10" : "bg-gray-100"
                      )}>
                        {account.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pixels.filter((p: any) => p.accountId === account.id).length} pixeli
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncMutation.mutate(account.id)}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Toate conturile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate conturile</SelectItem>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pixels Table */}
        <Card>
          <CardContent className="p-0">
            {pixelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pixels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Code className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Niciun pixel</p>
                <p className="text-muted-foreground">
                  Sincronizează pixelii din conturile conectate sau adaugă manual
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pixel</TableHead>
                    <TableHead>Cont</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evenimente</TableHead>
                    <TableHead>Ultima verificare</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pixels.map((pixel: any) => {
                    const status = statusConfig[pixel.checkStatus] || {
                      label: "Necunoscut",
                      color: "bg-gray-100 text-gray-800",
                      icon: AlertCircle,
                    };
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={pixel.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded",
                              pixel.platform === "META" ? "bg-status-info/10" : "bg-gray-100"
                            )}>
                              {pixel.platform === "META" ? <MetaIcon /> : <TikTokIcon />}
                            </div>
                            <div>
                              <p className="font-medium">{pixel.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {pixel.externalId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{pixel.account?.name}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {pixel.checkMessage && (
                              <p className="text-xs text-muted-foreground">
                                {pixel.checkMessage}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pixel.eventsTracked && pixel.eventsTracked.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pixel.eventsTracked.slice(0, 3).map((event: string) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                              {pixel.eventsTracked.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{pixel.eventsTracked.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {pixel.lastCheckedAt ? formatDate(pixel.lastCheckedAt) : "Niciodată"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => checkMutation.mutate(pixel.id)}
                              disabled={checkMutation.isPending}
                            >
                              {checkMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4" />
                              )}
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, pixel })}
                              >
                                <Trash2 className="h-4 w-4 text-status-error" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adaugă Pixel Manual</DialogTitle>
              <DialogDescription>
                Introdu ID-ul pixelului dacă nu apare prin sincronizare
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Cont</Label>
                <Select
                  value={newPixel.accountId}
                  onValueChange={(v) => setNewPixel({ ...newPixel, accountId: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selectează contul" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a: any) => a.status === "ACTIVE").map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.platform})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pixel ID</Label>
                <Input
                  value={newPixel.pixelId}
                  onChange={(e) => setNewPixel({ ...newPixel, pixelId: e.target.value })}
                  placeholder="Ex: 1234567890123456"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Nume</Label>
                <Input
                  value={newPixel.name}
                  onChange={(e) => setNewPixel({ ...newPixel, name: e.target.value })}
                  placeholder="Ex: Website Principal"
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialog(false)}>
                Anulează
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newPixel.accountId || !newPixel.pixelId || !newPixel.name || addMutation.isPending}
              >
                {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Adaugă
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ open, pixel: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Șterge Pixelul?</AlertDialogTitle>
              <AlertDialogDescription>
                Pixelul "{deleteDialog.pixel?.name}" va fi eliminat din ERP.
                Aceasta nu va afecta pixelul din platformă.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog.pixel && deleteMutation.mutate(deleteDialog.pixel.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Șterge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePermission>
  );
}
