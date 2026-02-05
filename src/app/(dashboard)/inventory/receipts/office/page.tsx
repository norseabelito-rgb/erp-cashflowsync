"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Package,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
  documentNumber?: string;
  documentDate?: string;
  status: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  notes?: string;
  hasDifferences?: boolean;
  sentToOfficeAt?: string;
  verifiedAt?: string;
  verifiedByName?: string;
  differencesApprovedBy?: string;
  differencesApprovedByName?: string;
  differencesApprovedAt?: string;
  createdAt: string;
}

export default function OfficeVerificationDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedNir, setSelectedNir] = useState<GoodsReceipt | null>(null);

  // Fetch NIRs pending verification (TRIMIS_OFFICE)
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["nirs-pending-verification"],
    queryFn: async () => {
      const res = await fetch("/api/goods-receipts?status=TRIMIS_OFFICE");
      return res.json();
    },
  });

  // Fetch verified NIRs awaiting approval (VERIFICAT with differences)
  const { data: awaitingApprovalData, refetch: refetchAwaiting } = useQuery({
    queryKey: ["nirs-awaiting-approval"],
    queryFn: async () => {
      const res = await fetch("/api/goods-receipts?status=VERIFICAT");
      return res.json();
    },
  });

  // Fetch NIRs ready for stock transfer (APROBAT)
  const { data: readyData, refetch: refetchReady } = useQuery({
    queryKey: ["nirs-ready-transfer"],
    queryFn: async () => {
      const res = await fetch("/api/goods-receipts?status=APROBAT");
      return res.json();
    },
  });

  // Fetch today's stats
  const { data: todayData } = useQuery({
    queryKey: ["nirs-today-stats"],
    queryFn: async () => {
      // Get all completed NIRs to count today's
      const statuses = ['VERIFICAT', 'APROBAT', 'IN_STOC'];
      const today = new Date().toISOString().split('T')[0];
      let todayCount = 0;

      for (const status of statuses) {
        const res = await fetch(`/api/goods-receipts?status=${status}`);
        const data = await res.json();
        const nirs = data?.data?.receipts || [];
        todayCount += nirs.filter((n: GoodsReceipt) =>
          n.verifiedAt && n.verifiedAt.startsWith(today)
        ).length;
      }

      return { count: todayCount };
    },
  });

  // Verify NIR mutation
  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goods-receipts/${id}/verify`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["nirs-pending-verification"] });
        queryClient.invalidateQueries({ queryKey: ["nirs-awaiting-approval"] });
        queryClient.invalidateQueries({ queryKey: ["nirs-today-stats"] });
        if (data.warning) {
          toast({
            title: "NIR verificat",
            description: data.warning,
            variant: "default",
          });
        } else {
          toast({ title: "Succes", description: data.message });
        }
        setVerifyDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Transfer stock mutation
  const transferMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goods-receipts/${id}/transfer-stock`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["nirs-ready-transfer"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({ title: "Succes", description: data.message });
        setTransferDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const refetchAll = () => {
    refetchPending();
    refetchAwaiting();
    refetchReady();
  };

  const pendingNirs: GoodsReceipt[] = pendingData?.data?.receipts || [];
  const awaitingApprovalNirs: GoodsReceipt[] = (awaitingApprovalData?.data?.receipts || [])
    .filter((n: GoodsReceipt) => n.hasDifferences && !n.differencesApprovedBy);
  const readyNirs: GoodsReceipt[] = readyData?.data?.receipts || [];

  // Count NIRs with differences in pending
  const withDifferencesCount = pendingNirs.filter(n => n.hasDifferences).length +
    awaitingApprovalNirs.length;

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Verificare NIR-uri"
        description="Dashboard Office pentru verificarea receptiilor"
        actions={
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reincarca
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-status-warning/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Asteptare verificare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-warning">{pendingNirs.length}</div>
          </CardContent>
        </Card>

        <Card className={withDifferencesCount > 0 ? "border-status-error/50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cu diferente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${withDifferencesCount > 0 ? "text-status-error" : ""}`}>
              {withDifferencesCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-status-success/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Verificate azi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-success">{todayData?.count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verification Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            De verificat
          </CardTitle>
          <CardDescription>
            NIR-uri trimise de depozit, asteptand verificarea Office
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingNirs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Toate NIR-urile au fost verificate</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nr. NIR</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead>Data trimitere</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    <TableHead>Diferente</TableHead>
                    <TableHead className="text-right">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingNirs.map((nir) => (
                    <TableRow key={nir.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell
                        className="font-mono font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {nir.receiptNumber}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {nir.supplier ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {nir.supplier.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDateTime(nir.sentToOfficeAt)}
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {formatCurrency(Number(nir.totalValue))}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {nir.hasDifferences ? (
                          <Badge variant="warning" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Da
                          </Badge>
                        ) : (
                          <Badge variant="success">Nu</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalii
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedNir(nir);
                              setVerifyDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Verifica
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Awaiting Manager Approval Section */}
      {awaitingApprovalNirs.length > 0 && (
        <Card className="mb-6 border-status-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-warning">
              <AlertTriangle className="h-5 w-5" />
              Asteptare aprobare diferente
            </CardTitle>
            <CardDescription>
              NIR-uri verificate cu diferente, asteptand aprobarea managerului
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nr. NIR</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead>Data verificare</TableHead>
                    <TableHead>Verificat de</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    <TableHead className="text-right">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingApprovalNirs.map((nir) => (
                    <TableRow key={nir.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell
                        className="font-mono font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {nir.receiptNumber}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {nir.supplier?.name || "-"}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {formatDateTime(nir.verifiedAt)}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {nir.verifiedByName || "-"}
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {formatCurrency(Number(nir.totalValue))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/inventory/receipts/pending-approval`)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          La aprobare
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready for Stock Transfer Section */}
      {readyNirs.length > 0 && (
        <Card className="border-status-success/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-success">
              <Package className="h-5 w-5" />
              Gata de transfer
            </CardTitle>
            <CardDescription>
              NIR-uri aprobate, gata pentru transferul in stoc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nr. NIR</TableHead>
                    <TableHead>Furnizor</TableHead>
                    <TableHead className="text-center">Articole</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    <TableHead className="text-right">Actiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyNirs.map((nir) => (
                    <TableRow key={nir.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell
                        className="font-mono font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {nir.receiptNumber}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/inventory/receipts/${nir.id}`)}>
                        {nir.supplier?.name || "-"}
                      </TableCell>
                      <TableCell
                        className="text-center"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        <Badge variant="outline">
                          <Package className="h-3 w-3 mr-1" />
                          {nir.totalItems}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                      >
                        {formatCurrency(Number(nir.totalValue))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedNir(nir);
                            setTransferDialogOpen(true);
                          }}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Transfer in stoc
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verify Confirmation Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare verificare</DialogTitle>
            <DialogDescription>
              Confirmati verificarea NIR-ului{" "}
              <strong>{selectedNir?.receiptNumber}</strong>?
              {selectedNir?.hasDifferences && (
                <>
                  <br /><br />
                  <span className="text-status-warning">
                    Atentie: Acest NIR are diferente. Dupa verificare, va fi necesar aprobarea managerului.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => selectedNir && verifyMutation.mutate(selectedNir.id)}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Se proceseaza..." : "Confirma verificare"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Confirmation Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer in stoc</DialogTitle>
            <DialogDescription>
              Confirmati transferul in stoc pentru NIR-ul{" "}
              <strong>{selectedNir?.receiptNumber}</strong>?
              <br /><br />
              Aceasta actiune va adauga <strong>{selectedNir?.totalItems} articole</strong> in stoc
              cu o valoare totala de <strong>{formatCurrency(Number(selectedNir?.totalValue || 0))}</strong>.
              <br /><br />
              <span className="text-status-warning">
                Actiunea este ireversibila.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => selectedNir && transferMutation.mutate(selectedNir.id)}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Se proceseaza..." : "Transfer in stoc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
