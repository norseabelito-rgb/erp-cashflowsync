"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Wrench, Loader2, XCircle, Search,
  Square, RotateCcw, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface AffectedInvoice {
  id: string;
  invoiceNumber: string | null;
  invoiceSeriesName: string | null;
  orderId: string | null;
  orderNumber: string;
  oblioClient: string;
  correctCustomer: string;
  total: number;
  currency: string;
  issuedAt: string;
  companyName: string;
  errorMessage?: string | null;
}

type RepairStatus = "pending" | "processing" | "repaired" | "error";

interface BulkProgress {
  isRunning: boolean;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentLabel: string;
}

export default function RepairInvoicesPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [repairStatuses, setRepairStatuses] = useState<Record<string, RepairStatus>>({});
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const abortRef = useRef(false);
  const queryClient = useQueryClient();

  // Fetch affected invoices from DB (pending + errored + repaired count)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["repair-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/admin/repair-invoices");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la incarcarea facturilor");
      }
      return res.json();
    },
  });

  const pendingInvoices: AffectedInvoice[] = data?.invoices || [];
  const errorInvoices: AffectedInvoice[] = data?.errors || [];
  const repairedCount: number = data?.repairedCount || 0;
  const lastScanAt: string | null = data?.lastScanAt || null;
  const totalAffected = pendingInvoices.length + errorInvoices.length + repairedCount;

  // Scan Oblio mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/repair-invoices", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la scanare");
      }
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Scanare completa",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["repair-invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la scanare Oblio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sequential repair: processes invoices one by one with progress tracking
  const processRepairs = useCallback(async (ids: string[], allInvoices: AffectedInvoice[]) => {
    abortRef.current = false;
    setBulkProgress({
      isRunning: true,
      total: ids.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
      currentLabel: "",
    });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) {
        toast({
          title: "Reparare oprita",
          description: `Oprit la ${i}/${ids.length}. ${succeeded} reparate, ${failed} erori.`,
        });
        break;
      }

      const id = ids[i];
      const inv = allInvoices.find((x) => x.id === id);
      const label = inv
        ? `${inv.invoiceSeriesName} ${inv.invoiceNumber} (${inv.orderNumber})`
        : id;

      setBulkProgress((prev) =>
        prev ? { ...prev, currentLabel: label } : null
      );
      setRepairStatuses((prev) => ({ ...prev, [id]: "processing" }));

      try {
        const res = await fetch(`/api/admin/repair-invoices/${id}/repair`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.error || "Eroare necunoscuta la reparare");
        }

        setRepairStatuses((prev) => ({ ...prev, [id]: "repaired" }));
        succeeded++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Eroare necunoscuta";
        setRepairStatuses((prev) => ({ ...prev, [id]: "error" }));
        failed++;
        // Don't toast individual errors - they're shown in the error panel
      }

      setBulkProgress((prev) =>
        prev
          ? { ...prev, completed: i + 1, succeeded, failed }
          : null
      );
    }

    setBulkProgress((prev) =>
      prev ? { ...prev, isRunning: false } : null
    );

    // Refresh data from DB to get final persistent state
    await refetch();

    if (!abortRef.current) {
      toast({
        title: "Reparare completa",
        description: `${succeeded} reparate cu succes, ${failed} erori din ${ids.length} total.`,
        variant: failed > 0 ? "destructive" : "default",
      });
    }

    setSelectedIds([]);
  }, [refetch]);

  // Individual repair mutation (for single "Repara" button)
  const repairMutation = useMutation({
    mutationFn: async (repairId: string) => {
      setRepairStatuses((prev) => ({ ...prev, [repairId]: "processing" }));
      const res = await fetch(`/api/admin/repair-invoices/${repairId}/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la reparare");
      }
      return result;
    },
    onSuccess: (result, repairId) => {
      setRepairStatuses((prev) => ({ ...prev, [repairId]: "repaired" }));
      toast({
        title: "Factura reparata",
        description: `${result.oldInvoice} → ${result.newInvoice}`,
      });
      refetch();
    },
    onError: (error: Error, repairId) => {
      setRepairStatuses((prev) => ({ ...prev, [repairId]: "error" }));
      toast({
        title: "Eroare la reparare",
        description: error.message,
        variant: "destructive",
      });
      refetch();
    },
  });

  const handleRepairSelected = () => {
    const allInvoices = [...pendingInvoices, ...errorInvoices];
    processRepairs(selectedIds, allInvoices);
  };

  const handleRepairAll = () => {
    const ids = pendingInvoices.map((inv) => inv.id);
    processRepairs(ids, pendingInvoices);
  };

  const handleRetryAllErrors = () => {
    const ids = errorInvoices.map((inv) => inv.id);
    processRepairs(ids, errorInvoices);
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const selectableIds = pendingInvoices
      .filter(
        (inv) =>
          !repairStatuses[inv.id] ||
          repairStatuses[inv.id] === "pending" ||
          repairStatuses[inv.id] === "error"
      )
      .map((inv) => inv.id);
    setSelectedIds(selectableIds);
  };

  const getStatusBadge = (invoiceId: string) => {
    const status = repairStatuses[invoiceId];
    if (!status || status === "pending") return null;

    switch (status) {
      case "processing":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Se proceseaza
          </Badge>
        );
      case "repaired":
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Reparat
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Eroare
          </Badge>
        );
    }
  };

  const isProcessing = bulkProgress?.isRunning || repairMutation.isPending;
  const progressPercentage = bulkProgress
    ? Math.round((bulkProgress.completed / bulkProgress.total) * 100)
    : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Reparare Facturi Auto-facturare"
        description={`Pending: ${pendingInvoices.length} | Erori: ${errorInvoices.length} | Reparate: ${repairedCount} | Total afectate: ${totalAffected}`}
      />

      {/* Info Card */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg h-fit">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Despre aceasta problema</h3>
              <p className="text-sm text-muted-foreground">
                Bug-ul: <code>billingCompanyId</code> pe Order era setat la companyId-ul store-ului,
                ceea ce facea ca factura sa fie emisa de la Aquaterra catre Aquaterra (firma emitenta = client).
                Aceasta pagina permite stornarea facturilor gresite si re-emiterea lor cu clientul corect.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Procesul de reparare:</strong> Pentru fiecare factura selectata, sistemul va:
                (1) storna factura veche in Oblio, (2) reseta billingCompanyId pe comanda,
                (3) re-emite factura cu datele corecte ale clientului.
              </p>
              {lastScanAt && (
                <p className="text-sm text-muted-foreground">
                  <strong>Ultimul scan:</strong> {formatDate(lastScanAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card - shown during active repair or after completion */}
      {bulkProgress && (
        <Card className={bulkProgress.isRunning ? "border-blue-300 dark:border-blue-700" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {bulkProgress.isRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                ) : bulkProgress.failed > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {bulkProgress.isRunning
                  ? "Se repara facturile..."
                  : bulkProgress.failed > 0
                  ? "Reparare completa cu erori"
                  : "Reparare completa"}
              </CardTitle>
              {bulkProgress.isRunning && (
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {bulkProgress.completed} / {bulkProgress.total} procesate
                ({progressPercentage}%)
              </span>
              <span className="flex gap-3">
                <span className="text-green-600">{bulkProgress.succeeded} reparate</span>
                {bulkProgress.failed > 0 && (
                  <span className="text-red-600">{bulkProgress.failed} erori</span>
                )}
              </span>
            </div>
            {bulkProgress.isRunning && bulkProgress.currentLabel && (
              <p className="text-xs text-muted-foreground">
                Se proceseaza: <span className="font-mono">{bulkProgress.currentLabel}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Card - persistent, shown when there are errored invoices in DB */}
      {errorInvoices.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                {errorInvoices.length} facturi cu erori
              </CardTitle>
              <CardDescription>
                Aceste facturi au esuat la reparare. Verifica erorile si incearca din nou.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryAllErrors}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry toate erorile ({errorInvoices.length})
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Serie + Numar</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Client Oblio</TableHead>
                  <TableHead>Client corect</TableHead>
                  <TableHead className="min-w-[300px]">Eroare</TableHead>
                  <TableHead>Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorInvoices.map((inv) => (
                  <TableRow key={inv.id} className="bg-red-50/50 dark:bg-red-950/10">
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.companyName}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.invoiceSeriesName} {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{inv.orderNumber}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400 max-w-[150px] truncate">
                      {inv.oblioClient}
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 max-w-[150px] truncate">
                      {inv.correctCustomer}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">
                        {inv.errorMessage || "Eroare necunoscuta"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {repairStatuses[inv.id] === "processing" ? (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Se proceseaza
                        </Badge>
                      ) : repairStatuses[inv.id] === "repaired" ? (
                        <Badge variant="default" className="bg-green-600 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Reparat
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => repairMutation.mutate(inv.id)}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Main Card - Pending invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Facturi pending
            </CardTitle>
            <CardDescription>
              {pendingInvoices.length} facturi asteapta reparare
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending || isProcessing}
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se scaneaza...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scaneaza Oblio
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Reincarca
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={pendingInvoices.length === 0 || isProcessing}
            >
              Selecteaza toate ({pendingInvoices.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0 || isProcessing}
            >
              Sterge selectia
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={handleRepairSelected}
              disabled={selectedIds.length === 0 || isProcessing}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Repara selectate ({selectedIds.length})
            </Button>
            <Button
              variant="default"
              onClick={handleRepairAll}
              disabled={pendingInvoices.length === 0 || isProcessing}
            >
              <Play className="h-4 w-4 mr-2" />
              Repara toate ({pendingInvoices.length})
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Se incarca din baza de date...</p>
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-4 opacity-50 text-green-500" />
              <p>
                {lastScanAt
                  ? "Nu exista facturi pending de reparat"
                  : "Apasa \"Scaneaza Oblio\" pentru a detecta facturile afectate"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Serie + Numar</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Client Oblio</TableHead>
                  <TableHead>Client corect</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className={
                      repairStatuses[inv.id] === "repaired"
                        ? "opacity-50"
                        : repairStatuses[inv.id] === "error"
                        ? "bg-red-50 dark:bg-red-950/10"
                        : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(inv.id)}
                        onCheckedChange={() => toggleInvoice(inv.id)}
                        disabled={repairStatuses[inv.id] === "repaired" || repairStatuses[inv.id] === "processing"}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.companyName}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.invoiceSeriesName} {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{inv.orderNumber}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400 max-w-[150px] truncate">
                      {inv.oblioClient}
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 max-w-[150px] truncate">
                      {inv.correctCustomer}
                    </TableCell>
                    <TableCell>
                      {inv.total.toFixed(2)} {inv.currency}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inv.issuedAt)}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.id)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => repairMutation.mutate(inv.id)}
                        disabled={
                          repairStatuses[inv.id] === "repaired" ||
                          repairStatuses[inv.id] === "processing" ||
                          isProcessing
                        }
                      >
                        {repairStatuses[inv.id] === "processing" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Repara"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
