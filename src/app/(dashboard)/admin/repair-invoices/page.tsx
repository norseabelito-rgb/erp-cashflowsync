"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RefreshCw, CheckCircle2, AlertCircle, Wrench, AlertTriangle, Loader2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  orderId: string;
  orderNumber: string;
  wrongCustomer: string;
  correctCustomer: string;
  total: number;
  currency: string;
  issuedAt: string;
  companyName: string;
}

type RepairStatus = "pending" | "processing" | "repaired" | "error";

interface RepairResult {
  invoiceId: string;
  success: boolean;
  oldInvoice?: string;
  newInvoice?: string;
  orderNumber?: string;
  error?: string;
}

export default function RepairInvoicesPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [repairStatuses, setRepairStatuses] = useState<Record<string, RepairStatus>>({});
  const [repairResults, setRepairResults] = useState<RepairResult[]>([]);

  // Fetch affected invoices
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

  const invoices: AffectedInvoice[] = data?.invoices || [];

  // Individual repair mutation
  const repairMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      setRepairStatuses((prev) => ({ ...prev, [invoiceId]: "processing" }));
      const res = await fetch(`/api/admin/repair-invoices/${invoiceId}/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la reparare");
      }
      return result;
    },
    onSuccess: (result, invoiceId) => {
      setRepairStatuses((prev) => ({ ...prev, [invoiceId]: "repaired" }));
      setRepairResults((prev) => [
        ...prev,
        {
          invoiceId,
          success: true,
          oldInvoice: result.oldInvoice,
          newInvoice: result.newInvoice,
          orderNumber: result.orderNumber,
        },
      ]);
      toast({
        title: "Factura reparata",
        description: `${result.oldInvoice} → ${result.newInvoice}`,
      });
    },
    onError: (error: Error, invoiceId) => {
      setRepairStatuses((prev) => ({ ...prev, [invoiceId]: "error" }));
      setRepairResults((prev) => [
        ...prev,
        { invoiceId, success: false, error: error.message },
      ]);
      toast({
        title: "Eroare la reparare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk repair mutation
  const bulkRepairMutation = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      // Mark all as processing
      const statuses: Record<string, RepairStatus> = {};
      invoiceIds.forEach((id) => (statuses[id] = "processing"));
      setRepairStatuses((prev) => ({ ...prev, ...statuses }));

      const res = await fetch("/api/admin/repair-invoices/bulk-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Eroare la reparare bulk");
      }
      return result;
    },
    onSuccess: (data) => {
      const newStatuses: Record<string, RepairStatus> = {};
      const newResults: RepairResult[] = [];

      for (const r of data.results) {
        newStatuses[r.invoiceId] = r.success ? "repaired" : "error";
        newResults.push(r);
      }

      setRepairStatuses((prev) => ({ ...prev, ...newStatuses }));
      setRepairResults((prev) => [...prev, ...newResults]);

      toast({
        title: "Reparare bulk completa",
        description: `${data.succeeded} reparate, ${data.failed} erori din ${data.total} total`,
      });

      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la reparare bulk",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const selectableIds = invoices
      .filter((inv) => !repairStatuses[inv.id] || repairStatuses[inv.id] === "pending" || repairStatuses[inv.id] === "error")
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

  const isPending = repairMutation.isPending || bulkRepairMutation.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Reparare Facturi Auto-facturare"
        description={`Facturi emise gresit (client = firma emitenta) din cauza bug-ului billingCompanyId. Total afectate: ${data?.total ?? "..."}`}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Facturi afectate
            </CardTitle>
            <CardDescription>
              {invoices.length} facturi gasite - selecteaza si apasa Repara
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
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
              disabled={invoices.length === 0 || isPending}
            >
              Selecteaza toate ({invoices.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0 || isPending}
            >
              Sterge selectia
            </Button>
            <div className="flex-1" />
            <Button
              variant="default"
              onClick={() => bulkRepairMutation.mutate(selectedIds)}
              disabled={selectedIds.length === 0 || isPending}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {bulkRepairMutation.isPending
                ? "Se repara..."
                : `Repara selectate (${selectedIds.length})`}
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Se incarca facturile...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-4 opacity-50 text-green-500" />
              <p>Nu exista facturi afectate de bug-ul de auto-facturare</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Serie + Numar</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Client gresit</TableHead>
                  <TableHead>Client corect</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
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
                    <TableCell className="font-mono text-sm">
                      {inv.invoiceSeriesName} {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>{inv.orderNumber}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400 max-w-[150px] truncate">
                      {inv.wrongCustomer}
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
                          isPending
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

      {/* Results Card */}
      {repairResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Rezultate reparare
            </CardTitle>
            <CardDescription>
              {repairResults.filter((r) => r.success).length} reparate,{" "}
              {repairResults.filter((r) => !r.success).length} erori
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Factura veche</TableHead>
                  <TableHead>Factura noua</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalii</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{result.orderNumber || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.oldInvoice || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.newInvoice || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Reparat" : "Eroare"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {result.success
                        ? `${result.oldInvoice} → ${result.newInvoice}`
                        : result.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
