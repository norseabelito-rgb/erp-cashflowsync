"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Play,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Package,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

type TransferStatus = "DRAFT" | "COMPLETED" | "CANCELLED";

interface Transfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdById: string | null;
  createdByName: string | null;
  completedById: string | null;
  completedByName: string | null;
  fromWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  toWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  items: TransferItem[];
}

interface TransferItem {
  id: string;
  itemId: string;
  quantity: number;
  notes: string | null;
  fromStockBefore: number | null;
  fromStockAfter: number | null;
  toStockBefore: number | null;
  toStockAfter: number | null;
  sourceStock?: number;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
  };
}

interface PreviewData {
  items: {
    item: { sku: string; name: string; unit: string };
    quantity: number;
    fromWarehouse: { currentStock: number; newStock: number; minStock: number };
    toWarehouse: { currentStock: number; newStock: number };
    status: { hasSufficientStock: boolean; willBeBelowMinStock: boolean; isValid: boolean };
  }[];
  summary: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    warningItems: number;
    canExecute: boolean;
  };
  errors: { sku: string; name: string; reason: string }[];
  warnings: { sku: string; name: string; reason: string }[];
}

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: any }
> = {
  DRAFT: { label: "Draft", variant: "secondary", icon: Package },
  COMPLETED: { label: "Finalizat", variant: "default", icon: CheckCircle },
  CANCELLED: { label: "Anulat", variant: "destructive", icon: X },
};

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Fetch transfer
  const { data: transfer, isLoading } = useQuery<Transfer>({
    queryKey: ["transfer", id],
    queryFn: async () => {
      const res = await fetch(`/api/transfers/${id}`);
      if (!res.ok) throw new Error("Eroare la incarcarea transferului");
      return res.json();
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transfers/${id}/preview`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la preview");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreviewDialog(true);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transfers/${id}/execute`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la executie");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer", id] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast({ title: "Transfer executat cu succes" });
      setShowPreviewDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transfers/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la anulare");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer", id] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast({ title: "Transfer anulat" });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la stergere");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast({ title: "Transfer sters" });
      router.push("/inventory/transfers");
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Transfer negasit</h3>
            <Button onClick={() => router.push("/inventory/transfers")}>
              Inapoi la transferuri
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[transfer.status].icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{transfer.transferNumber}</h1>
              <Badge variant={STATUS_CONFIG[transfer.status].variant}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {STATUS_CONFIG[transfer.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {transfer.fromWarehouse.name} → {transfer.toWarehouse.name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {transfer.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
              >
                <X className="h-4 w-4 mr-2" />
                Anuleaza
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sterge
              </Button>
              <Button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Executa Transfer
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transfer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Direction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Directia Transferului</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Din</p>
                  <p className="font-semibold text-lg">{transfer.fromWarehouse.name}</p>
                  <Badge variant="outline">{transfer.fromWarehouse.code}</Badge>
                </div>
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">In</p>
                  <p className="font-semibold text-lg">{transfer.toWarehouse.name}</p>
                  <Badge variant="outline">{transfer.toWarehouse.code}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Articole ({transfer.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Articol</TableHead>
                    <TableHead className="text-right">Cantitate</TableHead>
                    {transfer.status === "DRAFT" && (
                      <TableHead className="text-right">Stoc Sursa</TableHead>
                    )}
                    {transfer.status === "COMPLETED" && (
                      <>
                        <TableHead className="text-right">Stoc Sursa</TableHead>
                        <TableHead className="text-right">Stoc Dest.</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.item.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.item.name}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(item.quantity).toFixed(2)} {item.item.unit}
                      </TableCell>
                      {transfer.status === "DRAFT" && (
                        <TableCell className="text-right">
                          <span
                            className={
                              Number(item.sourceStock || 0) < Number(item.quantity)
                                ? "text-destructive"
                                : ""
                            }
                          >
                            {Number(item.sourceStock || 0).toFixed(2)} {item.item.unit}
                          </span>
                        </TableCell>
                      )}
                      {transfer.status === "COMPLETED" && (
                        <>
                          <TableCell className="text-right text-sm">
                            <span className="text-muted-foreground">
                              {Number(item.fromStockBefore).toFixed(2)}
                            </span>
                            <span className="mx-1">→</span>
                            <span>{Number(item.fromStockAfter).toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="text-muted-foreground">
                              {Number(item.toStockBefore).toFixed(2)}
                            </span>
                            <span className="mx-1">→</span>
                            <span>{Number(item.toStockAfter).toFixed(2)}</span>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informatii</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Creat</p>
                  <p className="font-medium">
                    {format(new Date(transfer.createdAt), "dd MMMM yyyy, HH:mm", {
                      locale: ro,
                    })}
                  </p>
                </div>
              </div>
              {transfer.createdByName && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Creat de</p>
                    <p className="font-medium">{transfer.createdByName}</p>
                  </div>
                </div>
              )}
              {transfer.completedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Finalizat</p>
                    <p className="font-medium">
                      {format(
                        new Date(transfer.completedAt),
                        "dd MMMM yyyy, HH:mm",
                        { locale: ro }
                      )}
                    </p>
                  </div>
                </div>
              )}
              {transfer.completedByName && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Finalizat de</p>
                    <p className="font-medium">{transfer.completedByName}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {transfer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observatii</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{transfer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmare Executie Transfer</DialogTitle>
            <DialogDescription>
              Verifica detaliile inainte de executie. Aceasta actiune este ireversibila.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{previewData.summary.totalItems}</p>
                    <p className="text-sm text-muted-foreground">Articole</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {previewData.summary.validItems}
                    </p>
                    <p className="text-sm text-muted-foreground">Valide</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">
                      {previewData.summary.invalidItems}
                    </p>
                    <p className="text-sm text-muted-foreground">Erori</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {previewData.summary.warningItems}
                    </p>
                    <p className="text-sm text-muted-foreground">Avertizari</p>
                  </CardContent>
                </Card>
              </div>

              {/* Errors */}
              {previewData.errors.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Erori ({previewData.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {previewData.errors.map((err, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-medium">{err.sku}:</span>
                          <span className="text-muted-foreground">{err.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {previewData.warnings.length > 0 && (
                <Card className="border-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      Avertizari ({previewData.warnings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {previewData.warnings.map((warn, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-medium">{warn.sku}:</span>
                          <span className="text-muted-foreground">{warn.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Items Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Preview Modificari Stoc</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Articol</TableHead>
                        <TableHead className="text-right">Cantitate</TableHead>
                        <TableHead className="text-right">Stoc Sursa</TableHead>
                        <TableHead className="text-right">Stoc Dest.</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <p className="font-medium">{item.item.sku}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.item.name}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="text-muted-foreground">
                              {item.fromWarehouse.currentStock}
                            </span>
                            <span className="mx-1">→</span>
                            <span
                              className={
                                item.status.willBeBelowMinStock ? "text-amber-600" : ""
                              }
                            >
                              {item.fromWarehouse.newStock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className="text-muted-foreground">
                              {item.toWarehouse.currentStock}
                            </span>
                            <span className="mx-1">→</span>
                            <span>{item.toWarehouse.newStock}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.status.isValid ? (
                              item.status.willBeBelowMinStock ? (
                                <AlertTriangle className="h-4 w-4 text-amber-600 mx-auto" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                              )
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => executeMutation.mutate()}
              disabled={
                executeMutation.isPending || !previewData?.summary.canExecute
              }
            >
              {executeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Executa Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anuleaza transferul?</AlertDialogTitle>
            <AlertDialogDescription>
              Transferul va fi marcat ca anulat. Aceasta actiune nu poate fi anulata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Inapoi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Anuleaza Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sterge transferul?</AlertDialogTitle>
            <AlertDialogDescription>
              Transferul va fi sters definitiv. Aceasta actiune nu poate fi anulata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Inapoi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Sterge Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
