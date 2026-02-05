"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Upload, File, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  supplierId: string;
  status: string;
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplier: Supplier;
  purchaseOrderId?: string;
  purchaseOrder?: { id: string; documentNumber: string };
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
}

interface SupplierInvoiceFormProps {
  initialData?: SupplierInvoice;
  onSuccess: (invoice: SupplierInvoice) => void;
  onCancel: () => void;
}

export function SupplierInvoiceForm({ initialData, onSuccess, onCancel }: SupplierInvoiceFormProps) {
  const isEdit = !!initialData;

  // Form state
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || "");
  const [purchaseOrderId, setPurchaseOrderId] = useState(initialData?.purchaseOrderId || "");
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || "");
  const [invoiceSeries, setInvoiceSeries] = useState(initialData?.invoiceSeries || "");
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoiceDate
      ? new Date(initialData.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [totalValue, setTotalValue] = useState(
    initialData?.totalValue ? String(initialData.totalValue) : ""
  );
  const [vatValue, setVatValue] = useState(
    initialData?.vatValue ? String(initialData.vatValue) : ""
  );
  const [totalWithVat, setTotalWithVat] = useState(
    initialData?.totalWithVat ? String(initialData.totalWithVat) : ""
  );
  const [paymentStatus, setPaymentStatus] = useState<"NEPLATITA" | "PARTIAL_PLATITA" | "PLATITA">(
    initialData?.paymentStatus || "NEPLATITA"
  );
  const [paymentDueDate, setPaymentDueDate] = useState(
    initialData?.paymentDueDate
      ? new Date(initialData.paymentDueDate).toISOString().split("T")[0]
      : ""
  );
  const [paidAt, setPaidAt] = useState(
    initialData?.paidAt
      ? new Date(initialData.paidAt).toISOString().split("T")[0]
      : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [documentPath, setDocumentPath] = useState(initialData?.documentPath || "");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch suppliers
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Eroare la incarcarea furnizorilor");
      return res.json();
    },
  });

  const suppliers: Supplier[] = suppliersData?.data || [];

  // Fetch purchase orders for selected supplier
  const { data: purchaseOrdersData } = useQuery({
    queryKey: ["purchase-orders", supplierId],
    queryFn: async () => {
      if (!supplierId) return { data: [] };
      const res = await fetch(`/api/purchase-orders?supplierId=${supplierId}`);
      if (!res.ok) throw new Error("Eroare la incarcarea precomenzilor");
      return res.json();
    },
    enabled: !!supplierId,
  });

  const purchaseOrders: PurchaseOrder[] = purchaseOrdersData?.data || [];

  // Auto-calculate totalWithVat when totalValue or vatValue changes
  useEffect(() => {
    if (totalValue && vatValue && !totalWithVat) {
      const calculated = parseFloat(totalValue) + parseFloat(vatValue);
      setTotalWithVat(calculated.toFixed(2));
    }
  }, [totalValue, vatValue, totalWithVat]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const url = isEdit ? `/api/supplier-invoices/${initialData.id}` : "/api/supplier-invoices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        // If we have a file to upload and this is a new invoice, upload it now
        if (selectedFile && !isEdit) {
          await uploadDocument(data.data.id);
        }
        onSuccess(data.data);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Upload document
  const uploadDocument = async (invoiceId: string) => {
    if (!selectedFile) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("supplierInvoiceId", invoiceId);

      const res = await fetch("/api/supplier-invoices/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setDocumentPath(data.documentPath);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    if (isEdit && initialData?.id) {
      // For existing invoices, upload immediately
      setSelectedFile(file);
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplierInvoiceId", initialData.id);

      try {
        const res = await fetch("/api/supplier-invoices/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setDocumentPath(data.documentPath);
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
    } else {
      // For new invoices, store file for upload after creation
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!supplierId) {
      toast({ title: "Eroare", description: "Selecteaza un furnizor", variant: "destructive" });
      return;
    }

    if (!invoiceNumber) {
      toast({ title: "Eroare", description: "Numarul facturii este obligatoriu", variant: "destructive" });
      return;
    }

    if (!invoiceDate) {
      toast({ title: "Eroare", description: "Data facturii este obligatorie", variant: "destructive" });
      return;
    }

    if (!totalValue) {
      toast({ title: "Eroare", description: "Valoarea facturii este obligatorie", variant: "destructive" });
      return;
    }

    const data: Record<string, unknown> = {
      supplierId,
      invoiceNumber,
      invoiceDate,
      totalValue: parseFloat(totalValue),
      paymentStatus,
    };

    if (invoiceSeries) data.invoiceSeries = invoiceSeries;
    if (purchaseOrderId) data.purchaseOrderId = purchaseOrderId;
    if (vatValue) data.vatValue = parseFloat(vatValue);
    if (totalWithVat) data.totalWithVat = parseFloat(totalWithVat);
    if (paymentDueDate) data.paymentDueDate = paymentDueDate;
    if (paidAt && paymentStatus === "PLATITA") data.paidAt = paidAt;
    if (notes) data.notes = notes;

    saveMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Supplier Selection */}
      <div className="space-y-2">
        <Label htmlFor="supplier">Furnizor *</Label>
        <Select
          value={supplierId}
          onValueChange={(value) => {
            setSupplierId(value);
            setPurchaseOrderId(""); // Reset PO when supplier changes
          }}
          disabled={isEdit}
        >
          <SelectTrigger>
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Selecteaza furnizorul" />
          </SelectTrigger>
          <SelectContent>
            {loadingSuppliers ? (
              <div className="p-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : (
              suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.code && `(${s.code})`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Purchase Order Link (optional) */}
      {supplierId && purchaseOrders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="purchaseOrder">Precomanda (optional)</Label>
          <Select value={purchaseOrderId} onValueChange={setPurchaseOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteaza precomanda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Fara precomanda</SelectItem>
              {purchaseOrders.map((po) => (
                <SelectItem key={po.id} value={po.id}>
                  {po.documentNumber} ({po.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceSeries">Serie factura</Label>
          <Input
            id="invoiceSeries"
            value={invoiceSeries}
            onChange={(e) => setInvoiceSeries(e.target.value)}
            placeholder="ex: ABC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Numar factura *</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="ex: 12345"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Data factura *</Label>
          <Input
            id="invoiceDate"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="totalValue">Valoare fara TVA *</Label>
          <Input
            id="totalValue"
            type="number"
            step="0.01"
            min="0"
            value={totalValue}
            onChange={(e) => {
              setTotalValue(e.target.value);
              // Reset totalWithVat when base value changes
              setTotalWithVat("");
            }}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vatValue">TVA</Label>
          <Input
            id="vatValue"
            type="number"
            step="0.01"
            min="0"
            value={vatValue}
            onChange={(e) => {
              setVatValue(e.target.value);
              // Auto-calculate total when VAT changes
              if (totalValue && e.target.value) {
                const calculated = parseFloat(totalValue) + parseFloat(e.target.value);
                setTotalWithVat(calculated.toFixed(2));
              }
            }}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalWithVat">Total cu TVA</Label>
          <Input
            id="totalWithVat"
            type="number"
            step="0.01"
            min="0"
            value={totalWithVat}
            onChange={(e) => setTotalWithVat(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Payment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentDueDate">Scadenta plata</Label>
          <Input
            id="paymentDueDate"
            type="date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Status plata</Label>
          <Select
            value={paymentStatus}
            onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}
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
        </div>
        {paymentStatus === "PLATITA" && (
          <div className="space-y-2">
            <Label htmlFor="paidAt">Data platii</Label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observatii</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observatii suplimentare..."
          rows={3}
        />
      </div>

      {/* Document Upload */}
      <div className="space-y-2">
        <Label>Document factura</Label>
        {documentPath ? (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <File className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Document incarcat</p>
              <a
                href={documentPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Vizualizeaza documentul
              </a>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Inlocuieste</span>
                </Button>
              </label>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <File className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Va fi incarcat la salvare
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                {uploadingFile ? "Se incarca..." : "Trage fisierul aici sau click pentru a selecta"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG sau WEBP (max 10MB)
              </p>
            </div>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadingFile}
            />
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={saveMutation.isPending || uploadingFile}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Se salveaza...
            </>
          ) : (
            isEdit ? "Salveaza modificarile" : "Creaza factura"
          )}
        </Button>
      </div>
    </form>
  );
}
