"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface GoodsReceiptItem {
  id: string;
  itemId: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
}

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
  verifiedBy?: string;
  verifiedByName?: string;
  differencesApprovedBy?: string;
  differencesApprovedByName?: string;
  differencesApprovedAt?: string;
  createdAt: string;
  items?: GoodsReceiptItem[];
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedNir, setSelectedNir] = useState<GoodsReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch NIRs with differences awaiting approval
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["nirs-pending-approval"],
    queryFn: async () => {
      const res = await fetch("/api/goods-receipts?status=VERIFICAT");
      return res.json();
    },
  });

  // Fetch NIR details when expanded
  const { data: detailData } = useQuery({
    queryKey: ["nir-detail", expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const res = await fetch(`/api/goods-receipts/${expandedId}`);
      return res.json();
    },
    enabled: !!expandedId,
  });

  // Approve differences mutation
  const approveDiffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goods-receipts/${id}/approve-differences`, {
        method: "POST",
      });
      return res.json();
    },
  });

  // Approve NIR mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      // First approve differences
      const diffRes = await approveDiffMutation.mutateAsync(id);
      if (!diffRes.success) {
        throw new Error(diffRes.error);
      }
      // Then approve NIR
      const res = await fetch(`/api/goods-receipts/${id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["nirs-pending-approval"] });
        toast({ title: "Succes", description: "NIR aprobat cu succes" });
        setApproveDialogOpen(false);
        setExpandedId(null);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Reject NIR mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/goods-receipts/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["nirs-pending-approval"] });
        toast({ title: "NIR respins", description: data.message });
        setRejectDialogOpen(false);
        setRejectReason("");
        setExpandedId(null);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Filter to only show NIRs with differences awaiting approval
  const pendingApprovalNirs: GoodsReceipt[] = (data?.data?.receipts || [])
    .filter((n: GoodsReceipt) => n.hasDifferences && !n.differencesApprovedBy);

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

  const nirDetail: GoodsReceipt | null = detailData?.data || null;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Aprobare diferente"
        description="NIR-uri cu diferente care necesita aprobarea managerului"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reincarca
          </Button>
        }
      />

      {/* Info Alert */}
      <Alert className="mb-6 border-status-warning/50 bg-status-warning/10">
        <AlertTriangle className="h-4 w-4 text-status-warning" />
        <AlertTitle>Diferente de receptie</AlertTitle>
        <AlertDescription>
          Aceste NIR-uri au diferente intre cantitatea comandata si cea primita, sau diferente de pret.
          Verificati detaliile si aprobati sau respingeti diferentele.
        </AlertDescription>
      </Alert>

      {/* NIRs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
            NIR-uri cu diferente ({pendingApprovalNirs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingApprovalNirs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista NIR-uri cu diferente de aprobat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovalNirs.map((nir) => (
                <Collapsible
                  key={nir.id}
                  open={expandedId === nir.id}
                  onOpenChange={(open) => setExpandedId(open ? nir.id : null)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* NIR Header Row */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="font-mono font-bold">{nir.receiptNumber}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {nir.supplier?.name || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Verificat: {formatDateTime(nir.verifiedAt)}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {nir.verifiedByName || "-"}
                            </p>
                          </div>
                          <div>
                            <Badge variant="warning" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Diferente
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(Number(nir.totalValue))}</p>
                            <p className="text-sm text-muted-foreground">{nir.totalItems} articole</p>
                          </div>
                          {expandedId === nir.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Expanded Details */}
                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-4">
                        {nirDetail && nirDetail.id === nir.id ? (
                          <div className="space-y-4">
                            {/* Notes/Observations */}
                            {nirDetail.notes && (
                              <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertTitle>Observatii</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap">
                                  {nirDetail.notes}
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Items Table */}
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Articole ({nirDetail.items?.length || 0})
                              </h4>
                              <div className="border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead>SKU</TableHead>
                                      <TableHead>Denumire</TableHead>
                                      <TableHead className="text-right">Cantitate</TableHead>
                                      <TableHead className="text-right">Pret unitar</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                      <TableHead>Observatii</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(nirDetail.items || []).map((item) => (
                                      <TableRow
                                        key={item.id}
                                        className={item.notes ? "bg-status-warning/5" : ""}
                                      >
                                        <TableCell className="font-mono text-sm">
                                          {item.item?.sku}
                                        </TableCell>
                                        <TableCell>{item.item?.name}</TableCell>
                                        <TableCell className="text-right">
                                          {Math.round(Number(item.quantity))} {item.item?.unit}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {item.unitCost ? formatCurrency(Number(item.unitCost)) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {item.totalCost ? formatCurrency(Number(item.totalCost)) : "-"}
                                        </TableCell>
                                        <TableCell>
                                          {item.notes ? (
                                            <span className="text-status-warning text-sm">
                                              {item.notes}
                                            </span>
                                          ) : (
                                            "-"
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => router.push(`/inventory/receipts/${nir.id}`)}
                              >
                                Vezi pagina completa
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedNir(nir);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Respinge
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedNir(nir);
                                    setApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Aproba diferentele
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobare diferente</DialogTitle>
            <DialogDescription>
              Confirmati aprobarea diferentelor pentru NIR-ul{" "}
              <strong>{selectedNir?.receiptNumber}</strong>?
              <br /><br />
              Dupa aprobare, NIR-ul va trece in status APROBAT si va fi gata pentru transferul in stoc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => selectedNir && approveMutation.mutate(selectedNir.id)}
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
              <strong>{selectedNir?.receiptNumber}</strong>.
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
              onClick={() => selectedNir && rejectMutation.mutate({
                id: selectedNir.id,
                reason: rejectReason
              })}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? "Se proceseaza..." : "Respinge NIR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
