"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Receipt,
  AlertTriangle,
  Download,
  Upload,
  Pencil,
  Trash2,
  ClipboardList,
  Package,
  RefreshCw,
  ExternalLink,
  Loader2,
  CreditCard,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SupplierInvoiceForm } from "@/components/inventory/SupplierInvoiceForm";

interface Supplier {
  id: string;
  name: string;
  code?: string;
  cif?: string;
  address?: string;
  city?: string;
  county?: string;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  status: string;
  totalValue?: number;
  createdAt: string;
}

interface ReceptionReport {
  id: string;
  documentNumber: string;
  status: string;
  createdAt: string;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  status: string;
  createdAt: string;
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplier: Supplier;
  purchaseOrderId?: string;
  purchaseOrder?: PurchaseOrder;
  invoiceNumber: string;
  invoiceSeries?: string;
  invoiceDate: string;
  totalValue: number;
  vatValue?: number;
  totalWithVat?: number;
  paymentStatus: "NEPLATITA" | "PARTIAL_PLATITA" | "PLATITA";
  paymentDueDate?: string;
  paidAt?: string;
  documentPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receptionReports?: ReceptionReport[];
  goodsReceipts?: GoodsReceipt[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierInvoiceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Fetch invoice details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["supplier-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/supplier-invoices/${id}`);
      return res.json();
    },
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/supplier-invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["supplier-invoice", id] });
        toast({ title: "Succes", description: "Status plata actualizat" });
        setPaymentDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/supplier-invoices/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: data.message || "Factura a fost stearsa" });
        router.push("/inventory/supplier-invoices");
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const invoice: SupplierInvoice | undefined = data?.data;

  // Check if date is overdue
  const isOverdue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === "PLATITA") return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEPLATITA":
        return <Badge variant="destructive">Neplatita</Badge>;
      case "PARTIAL_PLATITA":
        return <Badge variant="warning">Partial platita</Badge>;
      case "PLATITA":
        return <Badge variant="success">Platita</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

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
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invoice) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Eroare",
        description: "Tip de fisier invalid. Acceptat: PDF, JPG, PNG, WEBP",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Eroare",
        description: "Fisierul este prea mare. Maximum 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("supplierInvoiceId", invoice.id);

    try {
      const res = await fetch("/api/supplier-invoices/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["supplier-invoice", id] });
        toast({ title: "Succes", description: "Documentul a fost incarcat" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "Eroare la incarcarea documentului",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["supplier-invoice", id] });
    toast({ title: "Succes", description: "Factura a fost actualizata" });
  };

  // Check if deletion is allowed
  const canDelete = !invoice?.receptionReports?.length && !invoice?.goodsReceipts?.length;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Factura nu a fost gasita</p>
            <Button onClick={() => router.push("/inventory/supplier-invoices")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Inapoi la lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build invoice identifier for title
  const invoiceIdentifier = invoice.invoiceSeries
    ? `${invoice.invoiceSeries} ${invoice.invoiceNumber}`
    : invoice.invoiceNumber;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title={`Factura ${invoiceIdentifier}`}
        description={`Factura de la ${invoice.supplier.name}`}
        backHref="/inventory/supplier-invoices"
        backLabel="Facturi furnizori"
        badge={
          <div className="flex items-center gap-2">
            {getStatusBadge(invoice.paymentStatus)}
            {isOverdue(invoice.paymentDueDate, invoice.paymentStatus) && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Scadenta depasita
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reincarca
            </Button>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Actualizeaza plata
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editeaza
            </Button>
            {canDelete && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Sterge
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Supplier Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Furnizor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nume</p>
              <p className="font-medium">{invoice.supplier.name}</p>
            </div>
            {invoice.supplier.code && (
              <div>
                <p className="text-sm text-muted-foreground">Cod</p>
                <p className="font-medium">{invoice.supplier.code}</p>
              </div>
            )}
            {invoice.supplier.cif && (
              <div>
                <p className="text-sm text-muted-foreground">CIF</p>
                <p className="font-medium">{invoice.supplier.cif}</p>
              </div>
            )}
            {(invoice.supplier.address || invoice.supplier.city) && (
              <div>
                <p className="text-sm text-muted-foreground">Adresa</p>
                <p className="font-medium">
                  {[invoice.supplier.address, invoice.supplier.city, invoice.supplier.county]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
            <div className="pt-2">
              <Link href={`/inventory/suppliers/${invoice.supplier.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Vezi furnizor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalii factura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Serie/Numar</p>
              <p className="font-medium font-mono">
                {invoice.invoiceSeries && `${invoice.invoiceSeries} `}
                {invoice.invoiceNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data factura</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(invoice.invoiceDate)}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Valoare fara TVA</p>
              <p className="font-medium">{formatCurrency(Number(invoice.totalValue))}</p>
            </div>
            {invoice.vatValue && (
              <div>
                <p className="text-sm text-muted-foreground">TVA</p>
                <p className="font-medium">{formatCurrency(Number(invoice.vatValue))}</p>
              </div>
            )}
            {invoice.totalWithVat && (
              <div>
                <p className="text-sm text-muted-foreground">Total cu TVA</p>
                <p className="text-lg font-bold">{formatCurrency(Number(invoice.totalWithVat))}</p>
              </div>
            )}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Observatii</p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalii plata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Status plata</p>
              <div className="mt-1">{getStatusBadge(invoice.paymentStatus)}</div>
            </div>
            {invoice.paymentDueDate && (
              <div>
                <p className="text-sm text-muted-foreground">Scadenta</p>
                <p
                  className={`font-medium flex items-center gap-1 ${
                    isOverdue(invoice.paymentDueDate, invoice.paymentStatus)
                      ? "text-status-error"
                      : ""
                  }`}
                >
                  {isOverdue(invoice.paymentDueDate, invoice.paymentStatus) && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {formatDate(invoice.paymentDueDate)}
                </p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-sm text-muted-foreground">Platita la</p>
                <p className="font-medium">{formatDate(invoice.paidAt)}</p>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Creata la</p>
              <p className="text-sm">{formatDateTime(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ultima actualizare</p>
              <p className="text-sm">{formatDateTime(invoice.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-4 w-4" />
            Document factura
          </CardTitle>
          <CardDescription>
            Scanarea sau fotografia facturii originale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoice.documentPath ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <File className="h-10 w-10 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Document incarcat</p>
                <a
                  href={invoice.documentPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {invoice.documentPath.split("/").pop()}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(invoice.documentPath, "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descarca
                </Button>
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <Button variant="outline" asChild disabled={uploadingFile}>
                    <span>
                      {uploadingFile ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Inlocuieste
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploadingFile ? (
                  <Loader2 className="h-8 w-8 mb-2 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  {uploadingFile ? "Se incarca..." : "Incarca document (PDF, JPG, PNG, WEBP - max 10MB)"}
                </p>
              </div>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingFile}
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Linked Documents Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Documente asociate</CardTitle>
          <CardDescription>
            Precomanda, rapoarte de receptie si NIR-uri legate de aceasta factura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Purchase Order */}
          {invoice.purchaseOrder && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Precomanda
              </h4>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-mono font-medium">{invoice.purchaseOrder.documentNumber}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{invoice.purchaseOrder.status}</Badge>
                    <span>{formatDate(invoice.purchaseOrder.createdAt)}</span>
                    {invoice.purchaseOrder.totalValue && (
                      <span>{formatCurrency(Number(invoice.purchaseOrder.totalValue))}</span>
                    )}
                  </div>
                </div>
                <Link href={`/inventory/purchase-orders/${invoice.purchaseOrder.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Vezi
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Reception Reports */}
          {invoice.receptionReports && invoice.receptionReports.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Rapoarte de receptie ({invoice.receptionReports.length})
              </h4>
              <div className="space-y-2">
                {invoice.receptionReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-mono font-medium">{report.documentNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{report.status}</Badge>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                    <Link href={`/inventory/reception/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Vezi
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goods Receipts (NIRs) */}
          {invoice.goodsReceipts && invoice.goodsReceipts.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                NIR-uri ({invoice.goodsReceipts.length})
              </h4>
              <div className="space-y-2">
                {invoice.goodsReceipts.map((nir) => (
                  <div
                    key={nir.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-mono font-medium">{nir.receiptNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{nir.status}</Badge>
                        <span>{formatDate(nir.createdAt)}</span>
                      </div>
                    </div>
                    <Link href={`/inventory/receipts/${nir.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Vezi
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No linked documents */}
          {!invoice.purchaseOrder &&
            (!invoice.receptionReports || invoice.receptionReports.length === 0) &&
            (!invoice.goodsReceipts || invoice.goodsReceipts.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                Niciun document asociat
              </p>
            )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editeaza factura</DialogTitle>
            <DialogDescription>
              Modifica datele facturii {invoice.invoiceSeries} {invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <SupplierInvoiceForm
            initialData={invoice}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizeaza status plata</DialogTitle>
            <DialogDescription>
              Schimba statusul platii pentru factura{" "}
              {invoice.invoiceSeries && `${invoice.invoiceSeries} `}
              {invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              defaultValue={invoice.paymentStatus}
              onValueChange={(value) => updatePaymentMutation.mutate(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEPLATITA">Neplatita</SelectItem>
                <SelectItem value="PARTIAL_PLATITA">Partial platita</SelectItem>
                <SelectItem value="PLATITA">Platita</SelectItem>
              </SelectContent>
            </Select>
            {updatePaymentMutation.isPending && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Se actualizeaza...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Inchide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare stergere</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi factura{" "}
              <strong>
                {invoice.invoiceSeries && `${invoice.invoiceSeries} `}
                {invoice.invoiceNumber}
              </strong>{" "}
              de la furnizorul <strong>{invoice.supplier.name}</strong>?
              <br />
              <br />
              <span className="text-status-warning">
                Aceasta actiune este ireversibila.
              </span>
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
