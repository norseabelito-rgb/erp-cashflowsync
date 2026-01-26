"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
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

interface ReceiptItem {
  id?: string;
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
}

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
        toast({ title: "Succes", description: "Recepția a fost actualizată" });
        setIsEditing(false);
      } else {
        toast({ title: "Eroare", description: result.error, variant: "destructive" });
      }
    },
  });

  // Complete mutation
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
      })));
      setIsEditing(true);
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId || !itemQuantity) {
      toast({
        title: "Eroare",
        description: "Selectează un articol și introdu cantitatea",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(itemQuantity);
    if (quantity <= 0) {
      toast({
        title: "Eroare",
        description: "Cantitatea trebuie să fie pozitivă",
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
        description: "Adaugă cel puțin un articol în recepție",
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
    switch (status) {
      case "DRAFT":
        return <Badge variant="warning">Ciornă</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Finalizat</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Anulat</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
          <AlertTitle>Recepție negăsită</AlertTitle>
          <AlertDescription>
            Recepția cu ID-ul specificat nu a fost găsită.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/inventory/receipts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi la listă
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
            </div>
            <p className="text-muted-foreground">
              {receipt.supplier?.name || "Fără furnizor"} • {formatDate(receipt.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          {receipt.status === "DRAFT" && !isEditing && (
            <>
              <Button variant="outline" onClick={startEditing}>
                <Edit className="h-4 w-4 mr-2" />
                Editează
              </Button>
              <Button onClick={() => setCompleteDialogOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizează
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Alert for completed receipts */}
      {receipt.status === "COMPLETED" && (
        <Alert className="mb-6 border-status-success/50 bg-status-success/10">
          <CheckCircle2 className="h-4 w-4 text-status-success" />
          <AlertTitle>Recepție finalizată</AlertTitle>
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
              Informații document
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
                        <SelectValue placeholder="Selectează furnizor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Fără furnizor</SelectItem>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Număr document/factură</Label>
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
                {receipt.notes && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-sm text-muted-foreground">Note</p>
                    <p className="font-medium">{receipt.notes}</p>
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
              Articole recepționate
            </CardTitle>
            {isEditing && (
              <CardDescription>
                Modifică articolele și cantitățile
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
                      <SelectValue placeholder="Selectează articol" />
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
                  Adaugă
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
                    {isEditing && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing ? items : receipt.items).map((item: any) => (
                    <TableRow key={item.itemId || item.id}>
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
                    {isEditing ? items.length : receipt.items.length} articole, {Math.round(Number(totalQuantity))} unități total
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground mr-2">Valoare totală:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isEditing && (
          <div className="flex justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Șterge recepția
            </Button>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Anulează
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending || items.length === 0}>
                {updateMutation.isPending ? "Se salvează..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvează
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizare recepție</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să finalizezi recepția{" "}
              <strong>{receipt.receiptNumber}</strong>?
              <br /><br />
              Aceasta va adăuga {receipt.totalItems} articole în stoc
              cu o valoare totală de {formatCurrency(Number(receipt.totalValue))}.
              <br /><br />
              <span className="text-status-warning">
                Actiunea este ireversibila - receptiile finalizate nu pot fi modificate.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Se procesează..." : "Finalizează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare ștergere</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi recepția{" "}
              <strong>{receipt.receiptNumber}</strong>?
              <br /><br />
              Această acțiune nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
