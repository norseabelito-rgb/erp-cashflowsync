"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Package,
  Building2,
  FileText,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Edit,
  Clock,
  User,
  AlertTriangle,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import NIRWorkflowActions from "@/components/inventory/NIRWorkflowActions";

interface ReceiptItem {
  id?: string;
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
  notes?: string;
}

// Status display configuration
const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "warning" | "success" | "destructive" | "info" }> = {
  DRAFT: { label: "Ciorna", variant: "warning" },
  GENERAT: { label: "Generat", variant: "secondary" },
  TRIMIS_OFFICE: { label: "Trimis Office", variant: "info" },
  VERIFICAT: { label: "Verificat", variant: "info" },
  APROBAT: { label: "Aprobat", variant: "success" },
  IN_STOC: { label: "In Stoc", variant: "success" },
  RESPINS: { label: "Respins", variant: "destructive" },
  COMPLETED: { label: "Finalizat", variant: "success" },
  CANCELLED: { label: "Anulat", variant: "secondary" },
};

// Workflow statuses for timeline
const WORKFLOW_STATUSES = ['GENERAT', 'TRIMIS_OFFICE', 'VERIFICAT', 'APROBAT', 'IN_STOC'];

export default function GoodsReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const receiptId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit state
  const [supplierId, setSupplierId] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnitCost, setItemUnitCost] = useState("");

  // Fetch receipt
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["goods-receipt", receiptId],
    queryFn: async () => {
      const res = await fetch(`/api/goods-receipts/${receiptId}`);
      return res.json();
    },
    enabled: !!receiptId,
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true");
      return res.json();
    },
    enabled: isEditing,
  });

  // Fetch inventory items
  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-for-receipt"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?isComposite=false&isActive=true&limit=500");
      return res.json();
    },
    enabled: isEditing,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData: {
      supplierId?: string;
      documentNumber?: string;
      documentDate?: string;
      notes?: string;
      items: Array<{
        itemId: string;
        quantity: number;
        unitCost?: number;
      }>;
    }) => {
      const res = await fetch(`/api/goods-receipts?id=${receiptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", receiptId] });
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        toast({ title: "Succes", description: "Receptia a fost actualizata" });
        setIsEditing(false);
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Complete mutation (for legacy DRAFT -> COMPLETED flow)
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts/${receiptId}/complete`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipt", receiptId] });
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({ title: "Succes", description: result.message });
        setCompleteDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goods-receipts?id=${receiptId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        toast({ title: "Succes", description: result.message });
        router.push("/inventory/receipts");
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  const receipt = data?.data;
  const suppliers = suppliersData?.data || [];
  const availableItems = itemsData?.data?.items || [];

  const startEditing = () => {
    if (receipt) {
      setSupplierId(receipt.supplierId || "");
      setDocumentNumber(receipt.documentNumber || "");
      setDocumentDate(receipt.documentDate ? receipt.documentDate.split("T")[0] : "");
      setNotes(receipt.notes || "");
      setItems(receipt.items.map((item: any) => ({
        id: item.id,
        itemId: item.itemId,
        sku: item.item?.sku || "",
        name: item.item?.name || "",
        unit: item.item?.unit || "",
        quantity: Number(item.quantity),
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        notes: item.notes || "",
      })));
      setIsEditing(true);
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId || !itemQuantity) {
      toast({
        title: "Eroare",
        description: "Selecteaza un articol si introdu cantitatea",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(itemQuantity);
    if (quantity <= 0) {
      toast({
        title: "Eroare",
        description: "Cantitatea trebuie sa fie pozitiva",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = availableItems.find((item: any) => item.id === selectedItemId);
    if (!selectedItem) return;

    const existingIndex = items.findIndex(i => i.itemId === selectedItemId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      if (itemUnitCost) {
        updated[existingIndex].unitCost = parseFloat(itemUnitCost);
      }
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          itemId: selectedItem.id,
          sku: selectedItem.sku,
          name: selectedItem.name,
          unit: selectedItem.unit,
          quantity,
          unitCost: itemUnitCost ? parseFloat(itemUnitCost) : selectedItem.costPrice ? Number(selectedItem.costPrice) : null,
        },
      ]);
    }

    setSelectedItemId("");
    setItemQuantity("");
    setItemUnitCost("");
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(i => i.itemId !== itemId));
  };

  const handleSave = () => {
    if (items.length === 0) {
      toast({
        title: "Eroare",
        description: "Adauga cel putin un articol in receptie",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      supplierId: supplierId || undefined,
      documentNumber: documentNumber || undefined,
      documentDate: documentDate || undefined,
      notes: notes || undefined,
      items: items.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitCost: i.unitCost || undefined,
      })),
    });
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
    return new Date(date).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  // Determine if this is a workflow NIR (has GENERAT or later status)
  const isWorkflowNir = receipt && WORKFLOW_STATUSES.includes(receipt.status);

  // Get current step index for timeline
  const getCurrentStepIndex = (status: string) => {
    if (status === 'RESPINS') return -1; // Rejected is special
    return WORKFLOW_STATUSES.indexOf(status);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Receptie negasita</AlertTitle>
          <AlertDescription>
            Receptia cu ID-ul specificat nu a fost gasita.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/inventory/receipts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Inapoi la lista
        </Button>
      </div>
    );
  }

  const totalQuantity = isEditing
    ? items.reduce((sum, i) => sum + i.quantity, 0)
    : receipt.totalQuantity;
  const totalValue = isEditing
    ? items.reduce((sum, i) => sum + (i.quantity * (i.unitCost || 0)), 0)
    : Number(receipt.totalValue);

  const currentStepIndex = getCurrentStepIndex(receipt.status);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/inventory/receipts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-mono">
                {receipt.receiptNumber}
              </h1>
              {getStatusBadge(receipt.status)}
              {receipt.hasDifferences && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Diferente
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {receipt.supplier?.name || "Fara furnizor"} - {formatDate(receipt.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reincarca
          </Button>
          {receipt.status === "DRAFT" && !isEditing && (
            <>
              <Button variant="outline" onClick={startEditing}>
                <Edit className="h-4 w-4 mr-2" />
                Editeaza
              </Button>
              <Button onClick={() => setCompleteDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizeaza
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Workflow Status Timeline (only for workflow NIRs) */}
      {isWorkflowNir && receipt.status !== 'RESPINS' && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progres Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {WORKFLOW_STATUSES.map((status, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const config = STATUS_CONFIG[status];

                return (
                  <div key={status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCompleted
                            ? 'bg-status-success text-white'
                            : isCurrent
                            ? 'bg-status-info text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                        {config?.label || status}
                      </span>
                    </div>
                    {index < WORKFLOW_STATUSES.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          index < currentStepIndex ? 'bg-status-success' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Status Alert */}
      {receipt.status === 'RESPINS' && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>NIR Respins</AlertTitle>
          <AlertDescription>
            Acest NIR a fost respins si nu poate fi procesat mai departe.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Alert for completed receipts (legacy flow) */}
      {receipt.status === "COMPLETED" && (
        <Alert className="mb-6 border-status-success/50 bg-status-success/10">
          <CheckCircle2 className="h-4 w-4 text-status-success" />
          <AlertTitle>Receptie finalizata</AlertTitle>
          <AlertDescription>
            Stocul a fost actualizat la {formatDateTime(receipt.completedAt)}
            {receipt.completedByName && ` de ${receipt.completedByName}`}.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Document Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informatii document
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Furnizor
                    </Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteaza furnizor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Fara furnizor</SelectItem>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Numar document/factura</Label>
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data document</Label>
                    <Input
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Note</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Furnizor
                  </p>
                  <p className="font-medium">{receipt.supplier?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Document
                  </p>
                  <p className="font-medium">{receipt.documentNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data document
                  </p>
                  <p className="font-medium">{formatDate(receipt.documentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Creat la
                  </p>
                  <p className="font-medium">{formatDateTime(receipt.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Creat de
                  </p>
                  <p className="font-medium">{receipt.createdByName || "-"}</p>
                </div>
                {receipt.notes && !receipt.notes.includes("[RESPINS") && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-muted-foreground">Note</p>
                    <p className="font-medium whitespace-pre-wrap">{receipt.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Articole receptionate
            </CardTitle>
            {isEditing && (
              <CardDescription>
                Modifica articolele si cantitatile
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add item form (edit mode only) */}
            {isEditing && (
              <div className="flex flex-wrap gap-2 items-end p-4 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-[200px]">
                  <Label>Articol</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteaza articol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableItems.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          <span className="font-mono text-xs">{item.sku}</span> - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Label>Cantitate</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Label>Cost unitar</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemUnitCost}
                    onChange={(e) => setItemUnitCost(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adauga
                </Button>
              </div>
            )}

            {/* Items table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Articol</TableHead>
                    <TableHead className="text-right">Cantitate</TableHead>
                    <TableHead className="text-right">Cost unitar</TableHead>
                    <TableHead className="text-right">Valoare</TableHead>
                    {!isEditing && <TableHead>Observatii</TableHead>}
                    {isEditing && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing ? items : receipt.items).map((item: any) => (
                    <TableRow
                      key={item.itemId || item.id}
                      className={item.notes ? "bg-status-warning/5" : ""}
                    >
                      <TableCell className="font-mono text-sm">
                        {item.sku || item.item?.sku}
                      </TableCell>
                      <TableCell>{item.name || item.item?.name}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="w-24 text-right ml-auto"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = items.map(i =>
                                i.itemId === item.itemId
                                  ? { ...i, quantity: parseFloat(e.target.value) || 0 }
                                  : i
                              );
                              setItems(updated);
                            }}
                          />
                        ) : (
                          <span>{Math.round(Number(item.quantity))} {item.item?.unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-28 text-right ml-auto"
                            value={item.unitCost ?? ""}
                            onChange={(e) => {
                              const updated = items.map(i =>
                                i.itemId === item.itemId
                                  ? { ...i, unitCost: e.target.value ? parseFloat(e.target.value) : null }
                                  : i
                              );
                              setItems(updated);
                            }}
                          />
                        ) : (
                          item.unitCost ? formatCurrency(Number(item.unitCost)) : "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isEditing
                          ? (item.unitCost ? formatCurrency(item.quantity * item.unitCost) : "-")
                          : (item.unitCost ? formatCurrency(Number(item.quantity) * Number(item.unitCost)) : "-")
                        }
                      </TableCell>
                      {!isEditing && (
                        <TableCell>
                          {item.notes ? (
                            <span className="text-status-warning text-sm">{item.notes}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {isEditing && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.itemId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {isEditing ? items.length : receipt.items.length} articole, {Math.round(Number(totalQuantity))} unitati total
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-2">Valoare totala:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow History (for workflow NIRs) */}
        {isWorkflowNir && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Istoric Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receipt.createdAt && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">NIR Generat</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(receipt.createdAt)} - {receipt.createdByName || "Sistem"}
                      </p>
                    </div>
                  </div>
                )}

                {receipt.sentToOfficeAt && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-status-info/20 flex items-center justify-center">
                      <Send className="h-4 w-4 text-status-info" />
                    </div>
                    <div>
                      <p className="font-medium">Trimis la Office</p>
                      <p className="text-muted-foreground">{formatDateTime(receipt.sentToOfficeAt)}</p>
                    </div>
                  </div>
                )}

                {receipt.verifiedAt && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-status-info/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-status-info" />
                    </div>
                    <div>
                      <p className="font-medium">Verificat de Office</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(receipt.verifiedAt)} - {receipt.verifiedByName || "-"}
                      </p>
                    </div>
                  </div>
                )}

                {receipt.differencesApprovedAt && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-status-warning/20 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-status-warning" />
                    </div>
                    <div>
                      <p className="font-medium">Diferente aprobate</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(receipt.differencesApprovedAt)} - {receipt.differencesApprovedByName || "-"}
                      </p>
                    </div>
                  </div>
                )}

                {receipt.status === 'RESPINS' && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-status-error/20 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-status-error" />
                    </div>
                    <div>
                      <p className="font-medium">NIR Respins</p>
                      <p className="text-muted-foreground text-status-error">
                        {receipt.notes?.includes("[RESPINS") &&
                          receipt.notes.split("[RESPINS").slice(-1)[0]?.split("]")[1]?.trim()
                        }
                      </p>
                    </div>
                  </div>
                )}

                {receipt.transferredToStockAt && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-8 h-8 rounded-full bg-status-success/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-status-success" />
                    </div>
                    <div>
                      <p className="font-medium">Transferat in stoc</p>
                      <p className="text-muted-foreground">{formatDateTime(receipt.transferredToStockAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflow Actions (for workflow NIRs) */}
        {isWorkflowNir && !isEditing && (
          <NIRWorkflowActions
            nir={{
              id: receipt.id,
              receiptNumber: receipt.receiptNumber,
              status: receipt.status,
              hasDifferences: receipt.hasDifferences,
              differencesApprovedBy: receipt.differencesApprovedBy,
              differencesApprovedByName: receipt.differencesApprovedByName,
              differencesApprovedAt: receipt.differencesApprovedAt,
              supplierInvoiceId: receipt.supplierInvoiceId,
              sentToOfficeAt: receipt.sentToOfficeAt,
              verifiedAt: receipt.verifiedAt,
              verifiedByName: receipt.verifiedByName,
              transferredToStockAt: receipt.transferredToStockAt,
              totalItems: receipt.totalItems,
              totalValue: receipt.totalValue,
              notes: receipt.notes,
            }}
            onAction={() => refetch()}
            userPermissions={{
              canVerify: true, // TODO: Check actual permissions
              canApproveDifferences: true, // TODO: Check actual permissions
              canEdit: true,
            }}
          />
        )}

        {/* Actions (edit mode for DRAFT) */}
        {isEditing && (
          <div className="flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sterge receptia
            </Button>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Anuleaza
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending || items.length === 0}>
                {updateMutation.isPending ? "Se salveaza..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salveaza
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Complete Dialog (legacy flow) */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizare receptie</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa finalizezi receptia{" "}
              <strong>{receipt.receiptNumber}</strong>?
              <br /><br />
              Aceasta va adauga {receipt.totalItems} articole in stoc
              cu o valoare totala de {formatCurrency(Number(receipt.totalValue))}.
              <br /><br />
              <span className="text-status-warning">
                Actiunea este ireversibila - receptiile finalizate nu pot fi modificate.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Se proceseaza..." : "Finalizeaza"}
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
              Esti sigur ca vrei sa stergi receptia{" "}
              <strong>{receipt.receiptNumber}</strong>?
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
