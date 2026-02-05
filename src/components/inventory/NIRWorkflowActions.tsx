"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Package,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface NIRWorkflowActionsProps {
  nir: {
    id: string;
    receiptNumber: string;
    status: string;
    hasDifferences?: boolean;
    differencesApprovedBy?: string;
    differencesApprovedByName?: string;
    differencesApprovedAt?: string;
    supplierInvoiceId?: string;
    sentToOfficeAt?: string;
    verifiedAt?: string;
    verifiedByName?: string;
    transferredToStockAt?: string;
    totalItems: number;
    totalValue: number;
    notes?: string;
  };
  onAction: () => void;
  userPermissions?: {
    canVerify?: boolean;
    canApproveDifferences?: boolean;
    canEdit?: boolean;
  };
}

export default function NIRWorkflowActions({
  nir,
  onAction,
  userPermissions = {},
}: NIRWorkflowActionsProps) {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Send to Office mutation (GENERAT -> TRIMIS_OFFICE)
  const sendToOfficeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts/${nir.id}/send-office`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: "NIR trimis la Office" });
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", nir.id] });
        onAction();
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Verify mutation (TRIMIS_OFFICE -> VERIFICAT)
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts/${nir.id}/verify`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.warning) {
          toast({
            title: "NIR verificat",
            description: data.warning,
            variant: "default",
          });
        } else {
          toast({ title: "Succes", description: data.message });
        }
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", nir.id] });
        onAction();
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Approve differences mutation
  const approveDiffMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts/${nir.id}/approve-differences`, {
        method: "POST",
      });
      return res.json();
    },
  });

  // Approve mutation (VERIFICAT -> APROBAT)
  const approveMutation = useMutation({
    mutationFn: async () => {
      // If has differences, first approve them
      if (nir.hasDifferences && !nir.differencesApprovedBy) {
        const diffRes = await approveDiffMutation.mutateAsync();
        if (!diffRes.success) {
          throw new Error(diffRes.error);
        }
      }
      const res = await fetch(`/api/goods-receipts/${nir.id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: "NIR aprobat" });
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", nir.id] });
        setApproveDialogOpen(false);
        onAction();
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Reject mutation (VERIFICAT -> RESPINS)
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/goods-receipts/${nir.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "NIR respins", description: data.message });
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", nir.id] });
        setRejectDialogOpen(false);
        setRejectReason("");
        onAction();
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Transfer stock mutation (APROBAT -> IN_STOC)
  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts/${nir.id}/transfer-stock`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: data.message });
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", nir.id] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        setTransferDialogOpen(false);
        onAction();
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

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

  const isLoading =
    sendToOfficeMutation.isPending ||
    verifyMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    transferMutation.isPending;

  // Render based on status
  const renderStatusContent = () => {
    switch (nir.status) {
      case "GENERAT":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                NIR Generat
              </CardTitle>
              <CardDescription>
                NIR-ul este generat si gata de trimis la Office pentru verificare.
                {!nir.supplierInvoiceId && (
                  <span className="block mt-2 text-status-warning">
                    Atentie: Factura furnizor este obligatorie pentru trimitere la Office.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => sendToOfficeMutation.mutate()}
                disabled={isLoading || !nir.supplierInvoiceId}
              >
                {sendToOfficeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Trimite la Office
              </Button>
            </CardContent>
          </Card>
        );

      case "TRIMIS_OFFICE":
        return (
          <Card className="border-status-info/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-status-info" />
                Asteptare verificare Office
              </CardTitle>
              <CardDescription>
                NIR-ul a fost trimis la Office pentru verificare.
                <br />
                Trimis: {formatDateTime(nir.sentToOfficeAt)}
              </CardDescription>
            </CardHeader>
            {userPermissions.canVerify && (
              <CardContent>
                <Button
                  onClick={() => verifyMutation.mutate()}
                  disabled={isLoading}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Verifica NIR
                </Button>
              </CardContent>
            )}
          </Card>
        );

      case "VERIFICAT":
        const needsManagerApproval = nir.hasDifferences && !nir.differencesApprovedBy;

        return (
          <Card className={needsManagerApproval ? "border-status-warning/50" : "border-status-info/50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {needsManagerApproval ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-status-warning" />
                    Asteptare aprobare diferente
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-status-info" />
                    NIR Verificat
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Verificat de {nir.verifiedByName} la {formatDateTime(nir.verifiedAt)}
                {needsManagerApproval && (
                  <span className="block mt-2 text-status-warning font-medium">
                    NIR-ul are diferente. Este necesara aprobarea managerului.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nir.hasDifferences && nir.differencesApprovedBy && (
                <Alert className="border-status-success/50 bg-status-success/10">
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                  <AlertTitle>Diferente aprobate</AlertTitle>
                  <AlertDescription>
                    Aprobat de {nir.differencesApprovedByName} la {formatDateTime(nir.differencesApprovedAt)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 flex-wrap">
                {needsManagerApproval && userPermissions.canApproveDifferences && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={isLoading}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Respinge
                    </Button>
                    <Button
                      onClick={() => setApproveDialogOpen(true)}
                      disabled={isLoading}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aproba diferentele
                    </Button>
                  </>
                )}

                {!needsManagerApproval && userPermissions.canVerify && (
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={isLoading}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Aproba
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case "APROBAT":
        return (
          <Card className="border-status-success/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-status-success" />
                NIR Aprobat - Gata de transfer
              </CardTitle>
              <CardDescription>
                NIR-ul este aprobat si gata pentru transferul in stoc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-status-warning/50 bg-status-warning/10">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                <AlertTitle>Atentie</AlertTitle>
                <AlertDescription>
                  Aceasta actiune va adauga {nir.totalItems} articole in stoc cu o valoare de{" "}
                  {formatCurrency(Number(nir.totalValue))}. Actiunea este ireversibila.
                </AlertDescription>
              </Alert>

              {userPermissions.canVerify && (
                <Button
                  onClick={() => setTransferDialogOpen(true)}
                  disabled={isLoading}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Transfer in stoc
                </Button>
              )}
            </CardContent>
          </Card>
        );

      case "IN_STOC":
        return (
          <Card className="border-status-success/50 bg-status-success/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
                Stocul a fost transferat
              </CardTitle>
              <CardDescription>
                Transferul in stoc a fost realizat la {formatDateTime(nir.transferredToStockAt)}.
                <br />
                {nir.totalItems} articole au fost adaugate in stoc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="success" className="text-base px-3 py-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizat
              </Badge>
            </CardContent>
          </Card>
        );

      case "RESPINS":
        return (
          <Card className="border-status-error/50 bg-status-error/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-status-error" />
                NIR Respins
              </CardTitle>
              <CardDescription>
                Acest NIR a fost respins. Nu se pot efectua actiuni suplimentare.
              </CardDescription>
            </CardHeader>
            {nir.notes && nir.notes.includes("[RESPINS") && (
              <CardContent>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Motivul respingerii</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">
                    {nir.notes.split("[RESPINS").slice(-1)[0]?.split("]")[1]?.trim() || nir.notes}
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Status: {nir.status}</CardTitle>
            </CardHeader>
          </Card>
        );
    }
  };

  return (
    <>
      {renderStatusContent()}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobare diferente</DialogTitle>
            <DialogDescription>
              Confirmati aprobarea diferentelor pentru NIR-ul{" "}
              <strong>{nir.receiptNumber}</strong>?
              <br /><br />
              Dupa aprobare, NIR-ul va trece in status APROBAT si va fi gata pentru transferul in stoc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Se proceseaza..." : "Aproba diferentele"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respingere NIR</DialogTitle>
            <DialogDescription>
              Introduceti motivul respingerii pentru NIR-ul{" "}
              <strong>{nir.receiptNumber}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Motivul respingerii *</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Introduceti motivul respingerii..."
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason("");
            }}>
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectReason)}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? "Se proceseaza..." : "Respinge NIR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer in stoc</DialogTitle>
            <DialogDescription>
              Confirmati transferul in stoc pentru NIR-ul{" "}
              <strong>{nir.receiptNumber}</strong>?
              <br /><br />
              Aceasta actiune va adauga <strong>{nir.totalItems} articole</strong> in stoc
              cu o valoare totala de <strong>{formatCurrency(Number(nir.totalValue))}</strong>.
              <br /><br />
              <span className="text-status-warning font-medium">
                Actiunea este ireversibila.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => transferMutation.mutate()}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Se proceseaza..." : "Transfer in stoc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
