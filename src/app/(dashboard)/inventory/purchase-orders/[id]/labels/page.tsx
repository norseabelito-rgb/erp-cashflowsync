"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Package,
  Loader2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Label {
  id: string;
  labelCode: string;
  printed: boolean;
  printedAt: string | null;
  printedBy: string | null;
  createdAt: string;
  item?: {
    sku: string;
    name: string;
    quantity: number;
  };
  purchaseOrder?: {
    documentNumber: string;
    supplier?: {
      id: string;
      name: string;
    };
  };
}

interface LabelsResponse {
  success: boolean;
  data: {
    labels: Label[];
    purchaseOrder: {
      id: string;
      documentNumber: string;
      status: string;
      supplier: { id: string; name: string };
      itemCount: number;
    };
    stats: {
      total: number;
      printed: number;
      notPrinted: number;
    };
  };
  message?: string;
  error?: string;
}

export default function LabelsPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [markPrintedDialogOpen, setMarkPrintedDialogOpen] = useState(false);
  const [labelsToPrint, setLabelsToPrint] = useState<Label[]>([]);

  // Fetch labels
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchase-order-labels", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${orderId}/labels`);
      return res.json() as Promise<LabelsResponse>;
    },
    enabled: !!orderId,
  });

  // Generate labels mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${orderId}/labels`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-order-labels", orderId] });
        toast({
          title: "Succes",
          description: result.message || "Etichetele au fost generate",
        });
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  // Mark as printed mutation
  const markPrintedMutation = useMutation({
    mutationFn: async (labelIds: string[]) => {
      const res = await fetch(`/api/purchase-orders/${orderId}/labels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-order-labels", orderId] });
        toast({
          title: "Succes",
          description: result.message || "Etichetele au fost marcate ca printate",
        });
        setSelectedLabels(new Set());
        setMarkPrintedDialogOpen(false);
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
  });

  const labels = data?.data?.labels || [];
  const purchaseOrder = data?.data?.purchaseOrder;
  const stats = data?.data?.stats || { total: 0, printed: 0, notPrinted: 0 };

  const handleSelectLabel = (labelId: string, checked: boolean) => {
    const newSelected = new Set(selectedLabels);
    if (checked) {
      newSelected.add(labelId);
    } else {
      newSelected.delete(labelId);
    }
    setSelectedLabels(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unprintedIds = labels.filter((l) => !l.printed).map((l) => l.id);
      setSelectedLabels(new Set(unprintedIds));
    } else {
      setSelectedLabels(new Set());
    }
  };

  const handlePrint = (labelsToPrint: Label[]) => {
    setLabelsToPrint(labelsToPrint);

    // Create print window
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut deschide fereastra de printare",
        variant: "destructive",
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichete ${purchaseOrder?.documentNumber || ""}</title>
        <style>
          @page {
            size: 100mm 50mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
          }
          .label {
            width: 100mm;
            height: 50mm;
            padding: 3mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 1px solid #ccc;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .label-code {
            font-size: 14pt;
            font-weight: bold;
            font-family: monospace;
            text-align: center;
            padding: 2mm 0;
            background: #f0f0f0;
            border: 1px solid #000;
            letter-spacing: 1px;
          }
          .product-info {
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .sku {
            font-size: 16pt;
            font-weight: bold;
            font-family: monospace;
          }
          .name {
            font-size: 10pt;
            color: #333;
            margin-top: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 2mm;
          }
          @media print {
            .label {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        ${labelsToPrint.map((label) => `
          <div class="label">
            <div class="label-code">${label.labelCode}</div>
            <div class="product-info">
              <div class="sku">${label.item?.sku || "-"}</div>
              <div class="name">${label.item?.name || "-"}</div>
            </div>
            <div class="footer">
              <span>${purchaseOrder?.documentNumber || ""}</span>
              <span>Cantitate: ${label.item?.quantity || "-"}</span>
            </div>
          </div>
        `).join("")}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();

      // Check if user wants to mark as printed
      printWindow.onafterprint = () => {
        printWindow.close();
        const unprintedIds = labelsToPrint.filter((l) => !l.printed).map((l) => l.id);
        if (unprintedIds.length > 0) {
          setMarkPrintedDialogOpen(true);
        }
      };
    };
  };

  const handlePrintSelected = () => {
    const selected = labels.filter((l) => selectedLabels.has(l.id));
    if (selected.length === 0) {
      toast({
        title: "Selecteaza etichete",
        description: "Selecteaza cel putin o eticheta pentru printare",
        variant: "destructive",
      });
      return;
    }
    handlePrint(selected);
  };

  const handlePrintAll = () => {
    if (labels.length === 0) {
      toast({
        title: "Nu exista etichete",
        description: "Genereaza etichete inainte de printare",
        variant: "destructive",
      });
      return;
    }
    handlePrint(labels);
  };

  const handleConfirmMarkPrinted = () => {
    const unprintedIds = labelsToPrint.filter((l) => !l.printed).map((l) => l.id);
    if (unprintedIds.length > 0) {
      markPrintedMutation.mutate(unprintedIds);
    } else {
      setMarkPrintedDialogOpen(false);
    }
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

  if (!purchaseOrder) {
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

  const canGenerate = (purchaseOrder.status === "APROBATA" || purchaseOrder.status === "IN_RECEPTIE") && labels.length === 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/inventory/purchase-orders/${orderId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Tag className="h-8 w-8" />
              Etichete
            </h1>
            <p className="text-muted-foreground">
              {purchaseOrder.documentNumber} • {purchaseOrder.supplier?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reincarca
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total etichete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Printate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.printed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Neprintate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.notPrinted}</div>
          </CardContent>
        </Card>
      </div>

      {/* No labels - Generate */}
      {labels.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Tag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Nu exista etichete</h3>
              {canGenerate ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Genereaza etichete pentru cele {purchaseOrder.itemCount} produse din precomanda.
                  </p>
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Se genereaza...
                      </>
                    ) : (
                      <>
                        <Tag className="h-4 w-4 mr-2" />
                        Genereaza etichete
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Etichetele pot fi generate doar pentru precomenzile aprobate.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labels list */}
      {labels.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Lista etichete
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrintSelected}
                  disabled={selectedLabels.size === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Printeaza selectate ({selectedLabels.size})
                </Button>
                <Button onClick={handlePrintAll}>
                  <Printer className="h-4 w-4 mr-2" />
                  Printeaza toate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          labels.filter((l) => !l.printed).length > 0 &&
                          selectedLabels.size === labels.filter((l) => !l.printed).length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Cod eticheta</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produs</TableHead>
                    <TableHead className="text-center">Cantitate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Printat la</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labels.map((label) => (
                    <TableRow key={label.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLabels.has(label.id)}
                          onCheckedChange={(checked) =>
                            handleSelectLabel(label.id, checked as boolean)
                          }
                          disabled={label.printed}
                        />
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {label.labelCode}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {label.item?.sku || "-"}
                      </TableCell>
                      <TableCell>{label.item?.name || "-"}</TableCell>
                      <TableCell className="text-center">
                        {label.item?.quantity || "-"}
                      </TableCell>
                      <TableCell>
                        {label.printed ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Printat
                          </Badge>
                        ) : (
                          <Badge variant="warning">Neprintat</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTime(label.printedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as printed dialog */}
      <Dialog open={markPrintedDialogOpen} onOpenChange={setMarkPrintedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcheaza ca printate?</DialogTitle>
            <DialogDescription>
              Vrei sa marchezi {labelsToPrint.filter((l) => !l.printed).length} etichete ca printate?
              <br /><br />
              Aceasta te ajuta sa urmaresti care etichete au fost deja printate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPrintedDialogOpen(false)}>
              Nu acum
            </Button>
            <Button
              onClick={handleConfirmMarkPrinted}
              disabled={markPrintedMutation.isPending}
            >
              {markPrintedMutation.isPending ? "Se proceseaza..." : "Da, marcheaza"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
