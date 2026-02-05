"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  RefreshCw,
  Edit,
  CheckCircle2,
  Tag,
  Trash2,
  Building2,
  Calendar,
  FileText,
  Package,
  User,
  Clock,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PurchaseOrderForm } from "@/components/inventory/PurchaseOrderForm";

type PurchaseOrderStatus = "DRAFT" | "APROBATA" | "IN_RECEPTIE" | "RECEPTIONATA" | "ANULATA";

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface PurchaseOrderItem {
  id: string;
  inventoryItemId: string;
  quantityOrdered: number;
  unitPrice: number | null;
  totalPrice: number | null;
  inventoryItem: InventoryItem;
}

interface Label {
  id: string;
  labelCode: string;
  printed: boolean;
  printedAt: string | null;
}

interface ReceptionReport {
  id: string;
  reportNumber: string;
  status: string;
  createdAt: string;
}

interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  expectedDate: string | null;
  notes: string | null;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  approvedAt: string | null;
  approvedByName: string | null;
  supplier: Supplier;
  items: PurchaseOrderItem[];
  labels: Label[];
  receptionReports: ReceptionReport[];
  supplierInvoices: SupplierInvoice[];
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" }> = {
  DRAFT: { label: "Ciorna", variant: "secondary" },
  APROBATA: { label: "Aprobata", variant: "default" },
  IN_RECEPTIE: { label: "In receptie", variant: "warning" },
  RECEPTIONATA: { label: "Receptionata", variant: "success" },
  ANULATA: { label: "Anulata", variant: "destructive" },
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check URL param for edit mode
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Fetch purchase order
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchase-order", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${orderId}`);
      return res.json();
    },
    enabled: !!orderId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${orderId}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast({
          title: "Succes",
          description: result.message || "Precomanda a fost aprobata",
        });
        setApproveDialogOpen(false);
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast({
          title: "Succes",
          description: result.message || "Precomanda a fost stearsa",
        });
        router.push("/inventory/purchase-orders");
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  const order: PurchaseOrder | null = data?.data;

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Precomanda negasita</AlertTitle>
          <AlertDescription>
            Precomanda cu ID-ul specificat nu a fost gasita.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/inventory/purchase-orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Inapoi la lista
        </Button>
      </div>
    );
  }

  // Render edit mode
  if (isEditing && order.status === "DRAFT") {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Editeaza {order.documentNumber}
            </h1>
            <p className="text-muted-foreground">Modifica precomanda</p>
          </div>
        </div>

        <PurchaseOrderForm
          initialData={order}
          onSuccess={() => {
            setIsEditing(false);
            refetch();
          }}
        />
      </div>
    );
  }

  // Render detail view
  const printedLabels = order.labels.filter((l) => l.printed).length;
  const totalLabels = order.labels.length;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/inventory/purchase-orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-mono">
                {order.documentNumber}
              </h1>
              <Badge variant={STATUS_CONFIG[order.status].variant}>
                {STATUS_CONFIG[order.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {order.supplier.name} • {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reincarca
          </Button>
          {order.status === "DRAFT" && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editeaza
              </Button>
              <Button onClick={() => setApproveDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aproba
              </Button>
            </>
          )}
          {(order.status === "APROBATA" || order.status === "IN_RECEPTIE") && (
            <Button onClick={() => router.push(`/inventory/purchase-orders/${orderId}/labels`)}>
              <Tag className="h-4 w-4 mr-2" />
              Etichete
              {totalLabels > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {printedLabels}/{totalLabels}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Approval Alert */}
      {order.status !== "DRAFT" && order.approvedAt && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertTitle>Precomanda aprobata</AlertTitle>
          <AlertDescription>
            Aprobata la {formatDateTime(order.approvedAt)}
            {order.approvedByName && ` de ${order.approvedByName}`}.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Document Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informatii precomanda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Furnizor
                </p>
                <p className="font-medium">{order.supplier.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data estimata livrare
                </p>
                <p className="font-medium">{formatDate(order.expectedDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Creat la
                </p>
                <p className="font-medium">{formatDateTime(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Creat de
                </p>
                <p className="font-medium">{order.createdByName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Total produse
                </p>
                <p className="font-medium">{order.totalItems} produse, {Math.round(Number(order.totalQuantity))} unitati</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valoare totala</p>
                <p className="font-medium text-lg">{formatCurrency(Number(order.totalValue))}</p>
              </div>
              {order.notes && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm text-muted-foreground">Observatii</p>
                  <p className="font-medium">{order.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produse comandate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Produs</TableHead>
                    <TableHead className="text-right">Cantitate</TableHead>
                    <TableHead className="text-right">Pret unitar</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    <TableHead className="text-right">Stoc actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.inventoryItem.sku}
                      </TableCell>
                      <TableCell>{item.inventoryItem.name}</TableCell>
                      <TableCell className="text-right">
                        {Math.round(Number(item.quantityOrdered))} {item.inventoryItem.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unitPrice ? formatCurrency(Number(item.unitPrice)) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.totalPrice ? formatCurrency(Number(item.totalPrice)) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {Math.round(Number(item.inventoryItem.currentStock))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {order.items.length} produse, {Math.round(Number(order.totalQuantity))} unitati total
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-2">Valoare totala:</span>
                    <span className="text-lg font-bold">{formatCurrency(Number(order.totalValue))}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Documents */}
        {(order.receptionReports.length > 0 || order.supplierInvoices.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Documente asociate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.receptionReports.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Rapoarte de receptie</p>
                  <div className="space-y-2">
                    {order.receptionReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <Link
                            href={`/inventory/reception/${report.id}`}
                            className="font-mono text-sm hover:underline text-primary"
                          >
                            {report.reportNumber}
                          </Link>
                          <span className="text-muted-foreground text-sm ml-2">
                            {formatDate(report.createdAt)}
                          </span>
                        </div>
                        <Badge variant="outline">{report.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {order.supplierInvoices.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Facturi furnizor</p>
                  <div className="space-y-2">
                    {order.supplierInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <Link
                            href={`/inventory/supplier-invoices/${invoice.id}`}
                            className="font-mono text-sm hover:underline text-primary"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <span className="text-muted-foreground text-sm ml-2">
                            {formatDate(invoice.invoiceDate)}
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(Number(invoice.totalAmount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete action for DRAFT */}
        {order.status === "DRAFT" && (
          <div className="flex justify-start">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sterge precomanda
            </Button>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobare precomanda</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa aprobi precomanda{" "}
              <strong>{order.documentNumber}</strong>?
              <br /><br />
              Dupa aprobare, vei putea genera etichete pentru depozit.
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
              {approveMutation.isPending ? "Se proceseaza..." : "Aproba"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare stergere</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi precomanda{" "}
              <strong>{order.documentNumber}</strong>?
              <br /><br />
              Aceasta actiune nu poate fi anulata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Se sterge..." : "Sterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
