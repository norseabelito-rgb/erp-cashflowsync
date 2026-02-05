"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Package,
  Camera,
  ClipboardCheck,
  Loader2,
  Check,
  X,
  Building2,
  Calendar,
  Link2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ReceptionItemsTable, ReceptionItem } from "@/components/inventory/ReceptionItemsTable";
import { ReceptionPhotoUpload } from "@/components/inventory/ReceptionPhotoUpload";

interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalWithVat: number;
  supplier?: {
    name: string;
  };
}

interface ReceptionPhoto {
  id: string;
  category: "OVERVIEW" | "ETICHETE" | "DETERIORARI" | "FACTURA";
  filename: string;
  storagePath: string;
  mimeType: string;
}

interface ReceptionReport {
  id: string;
  reportNumber: string;
  status: "DESCHIS" | "IN_COMPLETARE" | "FINALIZAT";
  hasDifferences: boolean;
  signatureConfirmed: boolean;
  supplierInvoiceId: string | null;
  createdAt: string;
  finalizedAt: string | null;
  purchaseOrder: {
    id: string;
    documentNumber: string;
    expectedDate: string | null;
    supplier: {
      id: string;
      name: string;
    };
  };
  supplierInvoice: SupplierInvoice | null;
  items: ReceptionItem[];
  photos: ReceptionPhoto[];
  goodsReceipt?: {
    id: string;
    receiptNumber: string;
    status: string;
  };
}

// Status badge helper
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "success" | "warning"> = {
    DESCHIS: "secondary",
    IN_COMPLETARE: "default",
    FINALIZAT: "success",
  };
  const labels: Record<string, string> = {
    DESCHIS: "Deschis",
    IN_COMPLETARE: "In completare",
    FINALIZAT: "Finalizat",
  };
  return (
    <Badge variant={variants[status] || "secondary"}>
      {labels[status] || status}
    </Badge>
  );
}

// Validation check item
function ValidationCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={passed ? "text-muted-foreground" : "text-red-600 font-medium"}>
        {label}
      </span>
    </div>
  );
}

export default function ReceptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Local state for pending changes
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<{
    quantityReceived: number | null;
    verified: boolean;
    observations: string | null;
  }>>>({});
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Fetch report data
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["reception-report", id],
    queryFn: async () => {
      const res = await fetch(`/api/reception-reports/${id}`);
      if (!res.ok) throw new Error("Eroare la incarcarea raportului");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as ReceptionReport;
    },
    enabled: !!id,
  });

  // Fetch available supplier invoices for linking
  const { data: invoicesData } = useQuery({
    queryKey: ["supplier-invoices", report?.purchaseOrder?.supplier?.id],
    queryFn: async () => {
      const supplierId = report?.purchaseOrder?.supplier?.id;
      const res = await fetch(`/api/supplier-invoices?supplierId=${supplierId}&limit=50`);
      if (!res.ok) throw new Error("Eroare la incarcarea facturilor");
      const data = await res.json();
      return data.data?.invoices || [];
    },
    enabled: !!report?.purchaseOrder?.supplier?.id && invoiceDialogOpen,
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (report) {
      setSignatureConfirmed(report.signatureConfirmed);
    }
  }, [report]);

  // Save items mutation
  const saveItemsMutation = useMutation({
    mutationFn: async (items: Array<{
      itemId: string;
      quantityReceived: number | null;
      verified: boolean;
      observations: string | null;
    }>) => {
      const res = await fetch(`/api/reception-reports/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-report", id] });
      setPendingChanges({});
      toast({
        title: "Salvat",
        description: "Progresul a fost salvat cu succes",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update metadata mutation (invoice, signature)
  const updateMetadataMutation = useMutation({
    mutationFn: async (data: { supplierInvoiceId?: string; signatureConfirmed?: boolean }) => {
      const res = await fetch(`/api/reception-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-report", id] });
      toast({
        title: "Actualizat",
        description: "Raportul a fost actualizat",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reception-reports/${id}/finalize`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reception-report", id] });
      queryClient.invalidateQueries({ queryKey: ["reception-reports"] });
      toast({
        title: "Receptie finalizata",
        description: `NIR ${data.data?.receiptNumber} generat cu succes`,
      });
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/inventory/reception");
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare la finalizare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle item update from table
  const handleItemUpdate = useCallback((itemId: string, updates: Partial<{
    quantityReceived: number | null;
    verified: boolean;
    observations: string | null;
  }>) => {
    setPendingChanges((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...updates },
    }));
  }, []);

  // Save progress handler
  const handleSaveProgress = () => {
    if (!report) return;

    const itemsToSave = report.items.map((item) => {
      const changes = pendingChanges[item.id] || {};
      return {
        itemId: item.id,
        quantityReceived: changes.quantityReceived !== undefined
          ? changes.quantityReceived
          : item.quantityReceived,
        verified: changes.verified !== undefined
          ? changes.verified
          : item.verified,
        observations: changes.observations !== undefined
          ? changes.observations
          : item.observations,
      };
    });

    saveItemsMutation.mutate(itemsToSave);
  };

  // Link invoice handler
  const handleLinkInvoice = () => {
    if (!selectedInvoiceId) return;
    updateMetadataMutation.mutate({ supplierInvoiceId: selectedInvoiceId });
    setInvoiceDialogOpen(false);
    setSelectedInvoiceId("");
  };

  // Signature change handler
  const handleSignatureChange = (checked: boolean) => {
    setSignatureConfirmed(checked);
    updateMetadataMutation.mutate({ signatureConfirmed: checked });
  };

  // Photos change callback
  const handlePhotosChange = () => {
    refetch();
  };

  // Compute validation status
  const validation = useMemo(() => {
    if (!report) return null;

    // Merge pending changes with report items for validation
    const mergedItems = report.items.map((item) => {
      const changes = pendingChanges[item.id] || {};
      return {
        ...item,
        quantityReceived: changes.quantityReceived !== undefined
          ? changes.quantityReceived
          : item.quantityReceived,
        verified: changes.verified !== undefined
          ? changes.verified
          : item.verified,
        observations: changes.observations !== undefined
          ? changes.observations
          : item.observations,
      };
    });

    // V1: All items have quantityReceived
    const allHaveQuantity = mergedItems.every((i) => i.quantityReceived !== null);

    // V2: All items verified
    const allVerified = mergedItems.every((i) => i.verified);

    // V3: Items with differences have observations
    const itemsWithDiff = mergedItems.filter((i) => {
      if (i.quantityReceived === null) return false;
      return Number(i.quantityReceived) !== Number(i.quantityExpected);
    });
    const diffHaveObs = itemsWithDiff.every((i) => i.observations && i.observations.trim());

    // V4: Required photos
    const photoCategories = new Set(report.photos.map((p) => p.category));
    const hasOverview = photoCategories.has("OVERVIEW");
    const hasEtichete = photoCategories.has("ETICHETE");
    const hasFactura = photoCategories.has("FACTURA");

    // V5: Deteriorari photo if needed
    const hasDeteriorationNotes = mergedItems.some(
      (i) => i.observations && i.observations.toLowerCase().includes("deteriora")
    );
    const hasDeteriorari = photoCategories.has("DETERIORARI");
    const deteriorariOk = !hasDeteriorationNotes || hasDeteriorari;

    // V6: Invoice linked
    const hasInvoice = !!report.supplierInvoiceId;

    // V7: Signature confirmed
    const sigConfirmed = signatureConfirmed;

    const allPassed = allHaveQuantity && allVerified && diffHaveObs &&
      hasOverview && hasEtichete && hasFactura && deteriorariOk && hasInvoice && sigConfirmed;

    return {
      allHaveQuantity,
      allVerified,
      diffHaveObs,
      hasOverview,
      hasEtichete,
      hasFactura,
      deteriorariOk,
      hasDeteriorationNotes,
      hasInvoice,
      sigConfirmed,
      allPassed,
    };
  }, [report, pendingChanges, signatureConfirmed]);

  const isEditable = report?.status !== "FINALIZAT";
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const invoices: SupplierInvoice[] = invoicesData || [];

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Raportul nu a fost gasit</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/inventory/reception")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Inapoi la dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/inventory/reception")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{report.reportNumber}</h1>
            <StatusBadge status={report.status} />
            {report.hasDifferences && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Diferente
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Precomanda: {report.purchaseOrder.documentNumber} | {report.purchaseOrder.supplier.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionTooltip action="Reincarca" consequence="Se actualizeaza datele">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </ActionTooltip>
          {isEditable && hasPendingChanges && (
            <ActionTooltip action="Salveaza progresul" consequence="Se salveaza modificarile">
              <Button onClick={handleSaveProgress} disabled={saveItemsMutation.isPending}>
                {saveItemsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salveaza progres
              </Button>
            </ActionTooltip>
          )}
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Supplier Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Furnizor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{report.purchaseOrder.supplier.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              Asteptat: {report.purchaseOrder.expectedDate
                ? new Date(report.purchaseOrder.expectedDate).toLocaleDateString("ro-RO")
                : "-"
              }
            </div>
          </CardContent>
        </Card>

        {/* Invoice Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Factura furnizor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.supplierInvoice ? (
              <div>
                <div className="font-mono font-medium">{report.supplierInvoice.invoiceNumber}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(report.supplierInvoice.invoiceDate).toLocaleDateString("ro-RO")}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Nicio factura atasata</p>
                {isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInvoiceDialogOpen(true)}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Ataseaza factura
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Articole receptie
          </CardTitle>
          <CardDescription>
            Completati cantitatile primite si verificati fiecare articol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceptionItemsTable
            items={report.items}
            onItemUpdate={handleItemUpdate}
            disabled={!isEditable}
          />
        </CardContent>
      </Card>

      {/* Photos Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Documentare foto
          </CardTitle>
          <CardDescription>
            Incarcati poze pentru fiecare categorie (obligatorii: overview, etichete, factura)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceptionPhotoUpload
            receptionReportId={id}
            photos={report.photos}
            onPhotosChange={handlePhotosChange}
            disabled={!isEditable}
          />
        </CardContent>
      </Card>

      {/* Finalization Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Finalizare receptie
          </CardTitle>
          <CardDescription>
            Verificati ca toate cerintele sunt indeplinite inainte de finalizare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.status === "FINALIZAT" ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium text-green-700 dark:text-green-300">
                  Receptie finalizata
                </div>
                {report.goodsReceipt && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-mono">
                    NIR: {report.goodsReceipt.receiptNumber}
                  </div>
                )}
                {report.finalizedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Finalizat la {new Date(report.finalizedAt).toLocaleString("ro-RO")}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Validation Checklist */}
              {validation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
                  <ValidationCheck
                    passed={validation.allHaveQuantity}
                    label="Toate cantitatile completate"
                  />
                  <ValidationCheck
                    passed={validation.allVerified}
                    label="Toate articolele verificate"
                  />
                  <ValidationCheck
                    passed={validation.diffHaveObs}
                    label="Observatii pentru diferente"
                  />
                  <ValidationCheck
                    passed={validation.hasOverview}
                    label="Poza overview"
                  />
                  <ValidationCheck
                    passed={validation.hasEtichete}
                    label="Poza etichete"
                  />
                  <ValidationCheck
                    passed={validation.hasFactura}
                    label="Poza factura"
                  />
                  {validation.hasDeteriorationNotes && (
                    <ValidationCheck
                      passed={validation.deteriorariOk}
                      label="Poza deteriorari (notat in observatii)"
                    />
                  )}
                  <ValidationCheck
                    passed={validation.hasInvoice}
                    label="Factura furnizor atasata"
                  />
                  <ValidationCheck
                    passed={validation.sigConfirmed}
                    label="Semnatura gestionar confirmata"
                  />
                </div>
              )}

              {/* Signature Checkbox */}
              <div className="flex items-start gap-3 p-4 border rounded-lg mb-4">
                <Checkbox
                  id="signature"
                  checked={signatureConfirmed}
                  onCheckedChange={handleSignatureChange}
                  disabled={updateMetadataMutation.isPending}
                />
                <div>
                  <label htmlFor="signature" className="font-medium cursor-pointer">
                    Confirm semnatura gestionar
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Confirm ca am verificat personal marfa receptionata si ca datele introduse sunt corecte.
                  </p>
                </div>
              </div>

              {/* Finalize Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => finalizeMutation.mutate()}
                disabled={!validation?.allPassed || finalizeMutation.isPending || hasPendingChanges}
              >
                {finalizeMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Se finalizeaza...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Finalizeaza receptia
                  </>
                )}
              </Button>
              {hasPendingChanges && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  Salvati progresul inainte de finalizare
                </p>
              )}
              {!validation?.allPassed && !hasPendingChanges && (
                <p className="text-xs text-red-600 text-center mt-2">
                  Completati toate cerintele pentru a finaliza receptia
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Selection Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ataseaza factura furnizor</DialogTitle>
            <DialogDescription>
              Selecteaza factura de la {report.purchaseOrder.supplier.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {invoices.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nu exista facturi disponibile pentru acest furnizor</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setInvoiceDialogOpen(false);
                    router.push("/inventory/supplier-invoices/new");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adauga factura noua
                </Button>
              </div>
            ) : (
              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteaza factura..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{inv.invoiceNumber}</span>
                        <span className="text-muted-foreground">
                          ({new Date(inv.invoiceDate).toLocaleDateString("ro-RO")})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={handleLinkInvoice}
              disabled={!selectedInvoiceId || updateMetadataMutation.isPending}
            >
              {updateMetadataMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Ataseaza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
