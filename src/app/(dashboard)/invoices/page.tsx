"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  RefreshCw,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Ban,
  Clock,
  CreditCard,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  HelpCircle,
  DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface Invoice {
  id: string;
  smartbillNumber: string | null;
  smartbillSeries: string | null;
  status: string;
  errorMessage: string | null;
  pdfUrl: string | null;
  issuedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  paymentStatus: string;
  paidAmount: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  stornoNumber: string | null;
  stornoSeries: string | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    totalPrice: string;
    currency: string;
    financialStatus: string | null;
    store: { name: string };
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Dialog pentru anulare factură
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [cancelReason, setCancelReason] = useState("");
  
  // Dialog Help
  const [helpOpen, setHelpOpen] = useState(false);
  
  // Dialog pentru marcare ca plătită
  const [payDialog, setPayDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ["invoices", statusFilter, paymentFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/invoices?${params}`);
      return res.json();
    },
  });

  // Mutation pentru anulare factură
  const cancelMutation = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Factură anulată",
          description: data.message || "Factura a fost anulată cu succes.",
        });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        setCancelDialog({ open: false, invoice: null });
        setCancelReason("");
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut anula factura.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la anularea facturii.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation pentru marcare ca plătită
  const payMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, method }: { invoiceId: string; amount: number; method: string }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✅ Plată înregistrată",
          description: data.message || "Factura a fost marcată ca plătită.",
        });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        setPayDialog({ open: false, invoice: null });
        setPaymentAmount("");
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut înregistra plata.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la înregistrarea plății.",
        variant: "destructive",
      });
    },
  });

  const invoices: Invoice[] = invoicesData?.invoices || [];

  const stats = {
    total: invoices.length,
    issued: invoices.filter((i) => i.status === "issued").length,
    cancelled: invoices.filter((i) => i.status === "cancelled").length,
    errors: invoices.filter((i) => i.status === "error").length,
    pending: invoices.filter((i) => i.status === "pending").length,
    paid: invoices.filter((i) => i.paymentStatus === "paid").length,
    unpaid: invoices.filter((i) => i.status === "issued" && i.paymentStatus === "unpaid").length,
    overdue: invoices.filter((i) => {
      if (i.status !== "issued" || i.paymentStatus === "paid" || !i.dueDate) return false;
      return new Date(i.dueDate) < new Date();
    }).length,
  };

  const handleCancelInvoice = (invoice: Invoice) => {
    setCancelDialog({ open: true, invoice });
  };

  const confirmCancel = () => {
    if (cancelDialog.invoice) {
      cancelMutation.mutate({
        invoiceId: cancelDialog.invoice.id,
        reason: cancelReason,
      });
    }
  };

  const getPaymentStatusBadge = (invoice: Invoice) => {
    if (invoice.status === "cancelled") {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700">
          <Ban className="h-3 w-3 mr-1" />
          Anulată
        </Badge>
      );
    }

    if (invoice.paymentStatus === "paid") {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700">
          <CreditCard className="h-3 w-3 mr-1" />
          Plătită
        </Badge>
      );
    }

    // Verifică dacă e depășită scadența
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Scadentă
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
        <Clock className="h-3 w-3 mr-1" />
        Neplătită
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (invoice: Invoice) => {
    if (invoice.status === "cancelled") {
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Anulată
        </Badge>
      );
    }
    if (invoice.status === "issued") {
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Emisă
        </Badge>
      );
    }
    if (invoice.status === "error") {
      return (
        <Badge variant="destructive" title={invoice.errorMessage || ""}>
          <XCircle className="h-3 w-3 mr-1" />
          Eroare
        </Badge>
      );
    }
    return (
      <Badge variant="warning">
        <RefreshCw className="h-3 w-3 mr-1" />
        În așteptare
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Facturi</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestionează facturile emise prin SmartBill
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="md:size-default" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Help - Statusuri</span>
          </Button>
          <Button variant="outline" size="sm" className="md:size-default" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Reîmprospătează</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5 mb-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total facturi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{stats.paid}</p>
                <p className="text-sm text-muted-foreground">Plătite</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.unpaid}</p>
                <p className="text-sm text-muted-foreground">Neplătite</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Scadente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-sm text-muted-foreground">Anulate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după număr factură sau comandă..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status factură" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="issued">Emise</SelectItem>
                <SelectItem value="pending">În așteptare</SelectItem>
                <SelectItem value="cancelled">Anulate</SelectItem>
                <SelectItem value="error">Cu erori</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status plată" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate plățile</SelectItem>
                <SelectItem value="paid">Plătite</SelectItem>
                <SelectItem value="unpaid">Neplătite</SelectItem>
                <SelectItem value="partial">Parțial plătite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">Factură</th>
                  <th className="p-4 text-left text-sm font-medium">Comandă</th>
                  <th className="p-4 text-left text-sm font-medium">Client</th>
                  <th className="p-4 text-left text-sm font-medium">Valoare</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Plată</th>
                  <th className="p-4 text-left text-sm font-medium">Scadență</th>
                  <th className="p-4 text-left text-sm font-medium">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Se încarcă...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Nu există facturi</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors cursor-pointer",
                        invoice.status === "cancelled" && "opacity-60"
                      )}
                      onClick={() => router.push(`/orders/${invoice.order.id}`)}
                    >
                      <td className="p-4">
                        <div>
                          {invoice.status === "issued" || invoice.status === "cancelled" ? (
                            <span className={cn(
                              "font-mono font-semibold",
                              invoice.status === "cancelled" && "line-through"
                            )}>
                              {invoice.smartbillSeries}
                              {invoice.smartbillNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {invoice.stornoNumber && (
                            <div className="text-xs text-red-600 mt-1">
                              Stornare: {invoice.stornoSeries}{invoice.stornoNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <a 
                            href={`/orders/${invoice.order.id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {invoice.order.shopifyOrderNumber}
                          </a>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {invoice.order.store.name}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span>
                          {invoice.order.customerFirstName}{" "}
                          {invoice.order.customerLastName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold">
                          {formatCurrency(
                            parseFloat(invoice.order.totalPrice),
                            invoice.order.currency
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        {getInvoiceStatusBadge(invoice)}
                      </td>
                      <td className="p-4">
                        {invoice.status === "issued" && getPaymentStatusBadge(invoice)}
                      </td>
                      <td className="p-4">
                        {invoice.dueDate ? (
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            new Date(invoice.dueDate) < new Date() && invoice.paymentStatus !== "paid"
                              ? "text-red-600 font-medium"
                              : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(invoice.dueDate)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.pdfUrl && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descarcă PDF
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Deschide în SmartBill
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem asChild>
                              <a
                                href={`/orders/${invoice.order.id}`}
                                className="flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Vezi comanda
                              </a>
                            </DropdownMenuItem>
                            {invoice.status === "issued" && (
                              <>
                                {invoice.paymentStatus !== "paid" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPayDialog({ open: true, invoice });
                                        setPaymentAmount(invoice.order.totalPrice);
                                      }}
                                      className="text-emerald-600 focus:text-emerald-600"
                                    >
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Marchează ca plătită
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancelInvoice(invoice)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Anulează factura
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Anulare Factură */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCancelDialog({ open: false, invoice: null });
          setCancelReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Anulare Factură
            </DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să anulezi factura{" "}
              <strong>
                {cancelDialog.invoice?.smartbillSeries}
                {cancelDialog.invoice?.smartbillNumber}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Atenție!</p>
                  <p>Această acțiune va emite o factură de stornare în SmartBill. Ambele facturi vor rămâne în sistem pentru evidența contabilă.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancelReason">Motivul anulării (opțional)</Label>
              <Textarea
                id="cancelReason"
                placeholder="Ex: Client a solicitat anularea, produs indisponibil..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, invoice: null })}
            >
              Renunță
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Se anulează...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Anulează factura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Help Statusuri */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              Ghid Statusuri Facturi
            </DialogTitle>
            <DialogDescription>
              Explicație detaliată pentru toate statusurile din sistem
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status Factură */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status Factură
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-800">Emisă (issued)</p>
                    <p className="text-sm text-emerald-700">Factura a fost emisă cu succes în SmartBill și are un număr valid.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">În așteptare (pending)</p>
                    <p className="text-sm text-amber-700">Factura este în curs de procesare sau așteaptă să fie emisă.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Eroare (error)</p>
                    <p className="text-sm text-red-700">A apărut o eroare la emiterea facturii. Verifică mesajul de eroare pentru detalii.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Ban className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">Anulată (cancelled)</p>
                    <p className="text-sm text-orange-700">Factura a fost anulată. Dacă a fost stornată în SmartBill, va exista o factură de stornare.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <XCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Ștearsă (deleted)</p>
                    <p className="text-sm text-gray-700">Factura a fost ștearsă din SmartBill (posibil manual sau prin sincronizare).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Plată */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Status Plată
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-800">Plătită (paid)</p>
                    <p className="text-sm text-emerald-700">Factura a fost încasată integral. Plata este înregistrată și în SmartBill.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Parțial plătită (partial)</p>
                    <p className="text-sm text-amber-700">S-a încasat doar o parte din valoarea facturii.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Neplătită (unpaid)</p>
                    <p className="text-sm text-red-700">Factura nu a fost încă plătită. Verifică dacă a trecut de scadență.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scadență */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scadență
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">În termen</p>
                    <p className="text-sm text-blue-700">Scadența nu a trecut încă. Factura poate fi plătită fără penalizări.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Scadentă (în roșu)</p>
                    <p className="text-sm text-red-700">Data scadenței a trecut și factura nu este plătită. Necesită atenție urgentă.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acțiuni disponibile */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Acțiuni disponibile</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span><strong>Marchează ca plătită</strong> - Înregistrează plata în sistem și în SmartBill</span>
                </li>
                <li className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span><strong>Anulează factura</strong> - Creează stornare în SmartBill și marchează ca anulată</span>
                </li>
                <li className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <span><strong>Descarcă PDF</strong> - Descarcă factura în format PDF</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Am înțeles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Marcare Plătită */}
      <Dialog open={payDialog.open} onOpenChange={(open) => {
        if (!open) {
          setPayDialog({ open: false, invoice: null });
          setPaymentAmount("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="h-5 w-5" />
              Înregistrare Plată
            </DialogTitle>
            <DialogDescription>
              Marchează factura{" "}
              <strong>
                {payDialog.invoice?.smartbillSeries}
                {payDialog.invoice?.smartbillNumber}
              </strong>
              {" "}ca plătită
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Informații factură</p>
                  <p>Client: {payDialog.invoice?.order.customerFirstName} {payDialog.invoice?.order.customerLastName}</p>
                  <p>Valoare: {payDialog.invoice ? formatCurrency(parseFloat(payDialog.invoice.order.totalPrice), payDialog.invoice.order.currency) : '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Suma încasată (RON)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Metoda de plată</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Numerar (Cash)</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer bancar</SelectItem>
                  <SelectItem value="ramburs">Ramburs curier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p>💡 Plata va fi înregistrată și în SmartBill automat.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialog({ open: false, invoice: null })}
            >
              Renunță
            </Button>
            <Button
              onClick={() => {
                if (payDialog.invoice && paymentAmount) {
                  payMutation.mutate({
                    invoiceId: payDialog.invoice.id,
                    amount: parseFloat(paymentAmount),
                    method: paymentMethod,
                  });
                }
              }}
              disabled={payMutation.isPending || !paymentAmount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {payMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Se înregistrează...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmă plata
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
