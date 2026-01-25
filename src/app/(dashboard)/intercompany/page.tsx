"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building,
  FileText,
  Loader2,
  Check,
  Clock,
  Eye,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Company {
  id: string;
  name: string;
  code: string;
}

interface IntercompanyInvoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalValue: string;
  totalItems: number;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
  issuedByCompany: Company;
  receivedByCompany: Company;
  oblioInvoiceId?: string | null;
  oblioSeriesName?: string | null;
  oblioInvoiceNumber?: string | null;
  oblioLink?: string | null;
  _count: {
    orders: number;
  };
}

// Eligible order from the API
interface EligibleOrder {
  id: string;
  orderNumber: string;
  date: string;
  client: string;
  totalPrice: number;
  productCount: number;
  costTotal: number;
  paymentType: "cod" | "online";
  hasMissingCostPrice: boolean;
}

// Settlement preview with extended cost-based calculations
interface SettlementPreview {
  companyId: string;
  companyName: string;
  companyCode: string;
  periodStart: string;
  periodEnd: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalPrice: number;
    costTotal: number;
    processedAt: string;
    productCount: number;
    paymentType: "cod" | "online";
    selected: boolean;
  }>;
  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    unitCost: number;
    markup: number;
    lineTotal: number;
    hasCostPrice?: boolean;
  }>;
  totalOrders: number;
  totalItems: number;
  subtotal: number;
  markup: number;
  markupAmount: number;
  total: number;
  warnings: string[];
  totals?: {
    orderCount: number;
    subtotal: number;
    markupPercent: number;
    markupAmount: number;
    total: number;
  };
}

export default function IntercompanyPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [previewData, setPreviewData] = useState<SettlementPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch companies (doar secundare)
  const { data: companiesData } = useQuery({
    queryKey: ["companies-secondary"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("Eroare la incarcarea firmelor");
      const data = await res.json();
      return data.companies.filter((c: any) => !c.isPrimary && c.isActive);
    },
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["intercompany-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/intercompany/invoices");
      if (!res.ok) throw new Error("Eroare la incarcarea facturilor");
      return res.json();
    },
  });

  // Load eligible orders when company is selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setEligibleOrders([]);
      setSelectedOrderIds(new Set());
      return;
    }

    const fetchEligibleOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const res = await fetch(`/api/intercompany/eligible-orders?companyId=${selectedCompanyId}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setEligibleOrders(data.orders || []);
        // Pre-select all orders by default
        setSelectedOrderIds(new Set((data.orders || []).map((o: EligibleOrder) => o.id)));
      } catch (error: any) {
        toast({
          title: "Eroare",
          description: error.message,
          variant: "destructive",
        });
        setEligibleOrders([]);
        setSelectedOrderIds(new Set());
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchEligibleOrders();
  }, [selectedCompanyId]);

  // Generate invoice mutation
  const generateMutation = useMutation({
    mutationFn: async ({ companyId, orderIds }: { companyId: string; orderIds: string[] }) => {
      const res = await fetch("/api/intercompany/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, orderIds }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intercompany-invoices"] });

      // Show success with Oblio info
      let description = `Factura ${data.invoiceNumber} a fost generata.`;
      if (data.oblio?.success) {
        description += ` Oblio: ${data.oblio.seriesName}${data.oblio.invoiceNumber}`;
      } else if (data.oblio?.error) {
        description += ` Atentie: Factura Oblio nu s-a generat - ${data.oblio.error}`;
      }

      toast({
        title: "Decontare generata",
        description,
      });
      setIsPreviewOpen(false);
      setPreviewData(null);
      setSelectedOrderIds(new Set());
      setEligibleOrders([]);
      setSelectedCompanyId("");
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retry Oblio invoice generation mutation
  const retryOblioMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`/api/intercompany/invoices/${invoiceId}/oblio`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intercompany-invoices"] });
      toast({
        title: "Factura Oblio generata",
        description: `Factura Oblio: ${data.oblioSeriesName}${data.oblioInvoiceNumber}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`/api/intercompany/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intercompany-invoices"] });
      toast({
        title: "Factura platita",
        description: "Factura a fost marcata ca platita.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle order selection toggle
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Select all orders
  const selectAllOrders = () => {
    setSelectedOrderIds(new Set(eligibleOrders.map((o) => o.id)));
  };

  // Deselect all orders
  const deselectAllOrders = () => {
    setSelectedOrderIds(new Set());
  };

  // Check if any order has missing cost price
  const hasOrdersWithMissingCostPrice = useMemo(() => {
    return eligibleOrders.some((o) => o.hasMissingCostPrice);
  }, [eligibleOrders]);

  // Calculate selection stats
  const selectionStats = useMemo(() => {
    const selectedOrders = eligibleOrders.filter((o) => selectedOrderIds.has(o.id));
    return {
      selectedCount: selectedOrders.length,
      totalCount: eligibleOrders.length,
      totalCost: selectedOrders.reduce((sum, o) => sum + o.costTotal, 0),
      totalCustomerPrice: selectedOrders.reduce((sum, o) => sum + o.totalPrice, 0),
    };
  }, [eligibleOrders, selectedOrderIds]);

  // Generate preview for selected orders
  const handlePreview = async () => {
    if (!selectedCompanyId || selectedOrderIds.size === 0) {
      toast({
        title: "Selecteaza comenzi",
        description: "Trebuie sa ai cel putin o comanda selectata pentru preview.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const res = await fetch("/api/intercompany/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          orderIds: Array.from(selectedOrderIds),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      if (!data.preview) {
        toast({
          title: "Nicio comanda eligibila",
          description: "Nu exista comenzi eligibile pentru decontare.",
        });
        return;
      }

      setPreviewData(data.preview);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const companies: Company[] = companiesData || [];
  const invoices: IntercompanyInvoice[] = invoicesData?.invoices || [];

  // Calculate stats for invoice cards
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.totalValue), 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + Number(i.totalValue), 0);

  // Selection state for header checkbox
  const allSelected = selectedOrderIds.size === eligibleOrders.length && eligibleOrders.length > 0;
  const someSelected = selectedOrderIds.size > 0 && selectedOrderIds.size < eligibleOrders.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decontari Intercompany</h1>
          <p className="text-muted-foreground">
            Gestioneaza decontarile intre firma principala si firmele secundare
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Facturi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">De Incasat</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPending.toLocaleString("ro-RO")} RON
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incasate</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPaid.toLocaleString("ro-RO")} RON
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Firme Secundare</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Settlement */}
      <Card>
        <CardHeader>
          <CardTitle>Genereaza Decontare</CardTitle>
          <CardDescription>
            Selecteaza o firma pentru a vizualiza comenzile eligibile si genera o factura de decontare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label>Firma Secundara</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteaza firma" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warning Banner for Missing Cost Prices */}
          {selectedCompanyId && hasOrdersWithMissingCostPrice && (
            <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Atentie</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Unele produse nu au pret de achizitie configurat.
                Acestea vor fi calculate cu valoare 0.
              </AlertDescription>
            </Alert>
          )}

          {/* Eligible Orders Table */}
          {selectedCompanyId && (
            <div className="space-y-4">
              {isLoadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : eligibleOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  Nu exista comenzi eligibile pentru decontare pentru aceasta firma.
                </div>
              ) : (
                <>
                  {/* Selection Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllOrders}
                        disabled={allSelected}
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Selecteaza toate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllOrders}
                        disabled={selectedOrderIds.size === 0}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Deselecteaza toate
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{selectionStats.selectedCount}</span> din{" "}
                      <span className="font-medium">{selectionStats.totalCount}</span> comenzi selectate
                      {selectionStats.selectedCount > 0 && (
                        <span className="ml-2">
                          ({selectionStats.totalCost.toLocaleString("ro-RO")} RON cost achizitie)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllOrders();
                                } else {
                                  deselectAllOrders();
                                }
                              }}
                              className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                            />
                          </TableHead>
                          <TableHead>Nr. Comanda</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-center">Produse</TableHead>
                          <TableHead className="text-right">Total Client</TableHead>
                          <TableHead className="text-right">Cost Achizitie</TableHead>
                          <TableHead>Tip Plata</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eligibleOrders.map((order) => (
                          <TableRow
                            key={order.id}
                            className={selectedOrderIds.has(order.id) ? "bg-muted/50" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedOrderIds.has(order.id)}
                                onCheckedChange={() => toggleOrderSelection(order.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(order.date), "dd MMM yyyy", { locale: ro })}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate" title={order.client}>
                              {order.client}
                            </TableCell>
                            <TableCell className="text-center">{order.productCount}</TableCell>
                            <TableCell className="text-right">
                              {order.totalPrice.toLocaleString("ro-RO")} RON
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {order.costTotal.toLocaleString("ro-RO")} RON
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={order.paymentType === "cod" ? "secondary" : "default"}
                                className={
                                  order.paymentType === "cod"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-green-100 text-green-800"
                                }
                              >
                                {order.paymentType === "cod" ? "COD" : "Online"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.hasMissingCostPrice && (
                                <AlertTriangle
                                  className="h-4 w-4 text-yellow-500"
                                  title="Produse fara pret de achizitie"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Preview Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePreview}
                      disabled={selectedOrderIds.size === 0 || isLoadingPreview}
                    >
                      {isLoadingPreview ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview Decontare ({selectedOrderIds.size} comenzi)
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facturi Intercompany</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nu exista facturi intercompany. Genereaza prima decontare folosind formularul de mai sus.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr. Factura</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Perioada</TableHead>
                  <TableHead>Comenzi</TableHead>
                  <TableHead className="text-right">Valoare</TableHead>
                  <TableHead>Oblio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emis la</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{invoice.receivedByCompany.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {invoice.receivedByCompany.code}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(invoice.periodStart), "dd MMM", { locale: ro })} -{" "}
                        {format(new Date(invoice.periodEnd), "dd MMM yyyy", { locale: ro })}
                      </div>
                    </TableCell>
                    <TableCell>{invoice._count.orders}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(invoice.totalValue).toLocaleString("ro-RO")} RON
                    </TableCell>
                    <TableCell>
                      {invoice.oblioLink ? (
                        <a
                          href={invoice.oblioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {invoice.oblioSeriesName}
                          {invoice.oblioInvoiceNumber}
                        </a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-yellow-600">
                            Doar intern
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryOblioMutation.mutate(invoice.id)}
                            disabled={retryOblioMutation.isPending}
                            title="Genereaza factura Oblio"
                          >
                            {retryOblioMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {invoice.status === "paid" ? "Platita" : "De incasat"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.issuedAt
                        ? format(new Date(invoice.issuedAt), "dd MMM yyyy", { locale: ro })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markPaidMutation.mutate(invoice.id)}
                          disabled={markPaidMutation.isPending}
                        >
                          {markPaidMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <DollarSign className="h-4 w-4" />
                          )}
                          <span className="ml-1">Marcheaza platita</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Decontare</DialogTitle>
            <DialogDescription>
              Verifica detaliile inainte de a genera factura intercompany.
              <span className="block mt-1 text-yellow-600 font-medium">
                Calculat la pret achizitie (cost furnizor)
              </span>
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {/* Warnings */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">Avertismente</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <ul className="list-disc list-inside mt-2">
                      {previewData.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {previewData.warnings.length > 5 && (
                        <li>...si inca {previewData.warnings.length - 5} avertismente</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Firma</p>
                  <p className="font-medium">{previewData.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Perioada</p>
                  <p className="font-medium">
                    {format(new Date(previewData.periodStart), "dd MMM yyyy", { locale: ro })} -{" "}
                    {format(new Date(previewData.periodEnd), "dd MMM yyyy", { locale: ro })}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Comenzi</p>
                    <p className="text-2xl font-bold">
                      {previewData.totals?.orderCount || previewData.totalOrders}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Subtotal (cost achizitie)</p>
                    <p className="text-2xl font-bold">
                      {(previewData.totals?.subtotal || previewData.subtotal).toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Adaos ({previewData.totals?.markupPercent || previewData.markup}%)
                    </p>
                    <p className="text-2xl font-bold">
                      +{(previewData.totals?.markupAmount || previewData.markupAmount).toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary">
                  <CardContent className="pt-4">
                    <p className="text-sm text-primary">Total Factura</p>
                    <p className="text-2xl font-bold text-primary">
                      {(previewData.totals?.total || previewData.total).toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="font-medium mb-2">Produse agregate (pret achizitie)</h4>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produs</TableHead>
                        <TableHead className="text-right">Cantitate</TableHead>
                        <TableHead className="text-right">Pret/buc</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.lineItems.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {item.sku}
                            {item.hasCostPrice === false && (
                              <AlertTriangle className="h-3 w-3 text-yellow-500 inline ml-1" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.title}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {item.unitCost.toFixed(2)} RON
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.lineTotal.toFixed(2)} RON
                          </TableCell>
                        </TableRow>
                      ))}
                      {previewData.lineItems.length > 20 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            ...si inca {previewData.lineItems.length - 20} produse
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Anuleaza
            </Button>
            <Button
              onClick={() =>
                previewData &&
                generateMutation.mutate({
                  companyId: previewData.companyId,
                  orderIds: Array.from(selectedOrderIds),
                })
              }
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Genereaza Factura in Oblio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
