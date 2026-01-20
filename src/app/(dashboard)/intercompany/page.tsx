"use client";

import { useState } from "react";
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
  ChevronRight,
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
  _count: {
    orders: number;
  };
}

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
    processedAt: string;
  }>;
  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    unitCost: number;
    markup: number;
    lineTotal: number;
  }>;
  totalOrders: number;
  totalItems: number;
  subtotal: number;
  markup: number;
  markupAmount: number;
  total: number;
}

export default function IntercompanyPage() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [previewData, setPreviewData] = useState<SettlementPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch companies (doar secundare)
  const { data: companiesData } = useQuery({
    queryKey: ["companies-secondary"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("Eroare la încărcarea firmelor");
      const data = await res.json();
      return data.companies.filter((c: any) => !c.isPrimary && c.isActive);
    },
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["intercompany-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/intercompany/invoices");
      if (!res.ok) throw new Error("Eroare la încărcarea facturilor");
      return res.json();
    },
  });

  // Generate invoice mutation
  const generateMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await fetch("/api/intercompany/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intercompany-invoices"] });
      toast({
        title: "Factură generată",
        description: `Factura ${data.invoiceNumber} a fost generată cu succes.`,
      });
      setIsPreviewOpen(false);
      setPreviewData(null);
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
        title: "Factură plătită",
        description: "Factura a fost marcată ca plătită.",
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

  const handlePreview = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Selectează o firmă",
        description: "Trebuie să selectezi o firmă pentru a genera preview-ul.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/intercompany/preview?companyId=${selectedCompanyId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      if (!data.preview) {
        toast({
          title: "Nicio comandă eligibilă",
          description: "Nu există comenzi eligibile pentru decontare pentru această firmă.",
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

  // Calculăm statistici
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.totalValue), 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + Number(i.totalValue), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decontări Intercompany</h1>
          <p className="text-muted-foreground">
            Gestionează decontările între firma principală și firmele secundare
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
            <CardTitle className="text-sm font-medium">De Încasat</CardTitle>
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
            <CardTitle className="text-sm font-medium">Încasate</CardTitle>
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
          <CardTitle>Generează Decontare</CardTitle>
          <CardDescription>
            Selectează o firmă pentru a genera o factură de decontare pentru comenzile procesate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label>Firmă Secundară</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează firma" />
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
            <Button onClick={handlePreview} disabled={!selectedCompanyId || isLoadingPreview}>
              {isLoadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Decontare
            </Button>
          </div>
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
              Nu există facturi intercompany. Generează prima decontare folosind formularul de mai sus.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr. Factură</TableHead>
                  <TableHead>Firmă</TableHead>
                  <TableHead>Perioadă</TableHead>
                  <TableHead>Comenzi</TableHead>
                  <TableHead className="text-right">Valoare</TableHead>
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
                      <Badge
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {invoice.status === "paid" ? "Plătită" : "De încasat"}
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
                          <span className="ml-1">Marchează plătită</span>
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
              Verifică detaliile înainte de a genera factura intercompany
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Firmă</p>
                  <p className="font-medium">{previewData.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Perioadă</p>
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
                    <p className="text-2xl font-bold">{previewData.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-2xl font-bold">
                      {previewData.subtotal.toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Adaos ({previewData.markup}%)
                    </p>
                    <p className="text-2xl font-bold">
                      +{previewData.markupAmount.toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary">
                  <CardContent className="pt-4">
                    <p className="text-sm text-primary">Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {previewData.total.toLocaleString("ro-RO")} RON
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="font-medium mb-2">Produse agregate</h4>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Produs</TableHead>
                        <TableHead className="text-right">Cantitate</TableHead>
                        <TableHead className="text-right">Preț/buc</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.lineItems.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
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
                            ...și încă {previewData.lineItems.length - 20} produse
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
              Anulează
            </Button>
            <Button
              onClick={() => previewData && generateMutation.mutate(previewData.companyId)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generează Factură
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
