"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Package,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Calendar,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  expectedDate: string | null;
  supplier: Supplier;
  totalItems: number;
  totalQuantity: number;
  status: string;
}

interface ReceptionReport {
  id: string;
  reportNumber: string;
  status: string;
  hasDifferences: boolean;
  createdAt: string;
  finalizedAt: string | null;
  purchaseOrder: {
    documentNumber: string;
    supplier: Supplier;
  };
  supplierInvoice?: {
    id: string;
    invoiceNumber: string;
  };
  _count: {
    items: number;
    photos: number;
  };
  goodsReceipt?: {
    receiptNumber: string;
  };
}

// Helper to format date
function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ro-RO");
}

// Check if expected date is past
function isPastDue(expectedDate: string | null): boolean {
  if (!expectedDate) return false;
  return new Date(expectedDate) < new Date(new Date().toDateString());
}

export default function ReceptionDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [startingPOId, setStartingPOId] = useState<string | null>(null);

  // Fetch pending purchase orders (APROBATA)
  const { data: pendingPOs, isLoading: loadingPOs, refetch: refetchPOs } = useQuery({
    queryKey: ["purchase-orders", "APROBATA"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders?status=APROBATA&limit=50");
      if (!res.ok) throw new Error("Eroare la incarcarea precomenzilor");
      const data = await res.json();
      return data.data?.orders || [];
    },
  });

  // Fetch active receptions (DESCHIS, IN_COMPLETARE)
  const { data: activeReceptions, isLoading: loadingActive, refetch: refetchActive } = useQuery({
    queryKey: ["reception-reports", "active"],
    queryFn: async () => {
      const res = await fetch("/api/reception-reports?status=DESCHIS,IN_COMPLETARE&limit=50");
      if (!res.ok) throw new Error("Eroare la incarcarea receptiilor");
      const data = await res.json();
      return data.data?.reports || [];
    },
  });

  // Fetch completed today
  const { data: completedToday, isLoading: loadingCompleted, refetch: refetchCompleted } = useQuery({
    queryKey: ["reception-reports", "completed-today"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/reception-reports?status=FINALIZAT&limit=20`);
      if (!res.ok) throw new Error("Eroare la incarcarea receptiilor finalizate");
      const data = await res.json();
      // Filter client-side for today
      const reports = data.data?.reports || [];
      return reports.filter((r: ReceptionReport) => {
        if (!r.finalizedAt) return false;
        return r.finalizedAt.startsWith(today);
      });
    },
  });

  // Start reception mutation
  const startReceptionMutation = useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      const res = await fetch("/api/reception-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseOrderId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Eroare la crearea receptiei");
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["reception-reports"] });
      toast({
        title: "Receptie inceputa",
        description: `Raport ${data.reportNumber} creat cu succes`,
      });
      router.push(`/inventory/reception/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
      setStartingPOId(null);
    },
  });

  const handleStartReception = (purchaseOrderId: string) => {
    setStartingPOId(purchaseOrderId);
    startReceptionMutation.mutate(purchaseOrderId);
  };

  const handleRefreshAll = () => {
    refetchPOs();
    refetchActive();
    refetchCompleted();
  };

  const pendingOrders: PurchaseOrder[] = pendingPOs || [];
  const activeReports: ReceptionReport[] = activeReceptions || [];
  const completedReports: ReceptionReport[] = completedToday || [];

  const isLoading = loadingPOs || loadingActive || loadingCompleted;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Receptie Marfa"
        description="Dashboard gestionar - receptie si verificare marfa primita"
        actions={
          <ActionTooltip action="Reincarca" consequence="Se actualizeaza datele">
            <Button variant="outline" onClick={handleRefreshAll} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Reincarca
            </Button>
          </ActionTooltip>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              In asteptare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">precomezi de receptionat</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              In curs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReports.length}</div>
            <p className="text-xs text-muted-foreground">receptii active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finalizate azi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReports.length}</div>
            <p className="text-xs text-muted-foreground">receptii complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Purchase Orders Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Precomezi in asteptare
          </CardTitle>
          <CardDescription>
            Precomezi aprobate care asteapta receptia marfii
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPOs ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista precomezi in asteptare</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map((po) => (
                <Card key={po.id} className={`border ${isPastDue(po.expectedDate) ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-mono">
                          {po.documentNumber}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-foreground">
                          {po.supplier.name}
                        </CardDescription>
                      </div>
                      {isPastDue(po.expectedDate) && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Intarziat
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Asteptat: {formatDate(po.expectedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{po.totalItems} produse ({po.totalQuantity} buc)</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleStartReception(po.id)}
                      disabled={startingPOId === po.id}
                    >
                      {startingPOId === po.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Se creeaza...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Incepe receptia
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Receptions Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receptii in curs
          </CardTitle>
          <CardDescription>
            Receptii incepute care necesita finalizare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActive ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista receptii in curs</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeReports.map((report) => (
                <Card key={report.id} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-mono">
                          {report.reportNumber}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {report.purchaseOrder.documentNumber}
                        </CardDescription>
                      </div>
                      <Badge variant={report.status === "IN_COMPLETARE" ? "default" : "secondary"}>
                        {report.status === "IN_COMPLETARE" ? "In completare" : "Deschis"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="text-sm font-medium">
                        {report.purchaseOrder.supplier.name}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{report._count.items} produse</span>
                        <span>{report._count.photos} poze</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Inceput {formatDistanceToNow(new Date(report.createdAt), { locale: ro, addSuffix: true })}
                      </div>
                      {report.hasDifferences && (
                        <Badge variant="warning" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Diferente
                        </Badge>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => router.push(`/inventory/reception/${report.id}`)}
                    >
                      Continua
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Today Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Finalizate azi
          </CardTitle>
          <CardDescription>
            Receptii finalizate in ziua curenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCompleted ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : completedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nicio receptie finalizata azi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/inventory/reception/${report.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-mono text-sm">{report.reportNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {report.purchaseOrder.supplier.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {report.goodsReceipt && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {report.goodsReceipt.receiptNumber}
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {report.finalizedAt && new Date(report.finalizedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
