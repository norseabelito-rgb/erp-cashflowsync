"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SupplierInvoiceForm } from "@/components/inventory/SupplierInvoiceForm";

interface Supplier {
  id: string;
  name: string;
  code?: string;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
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
}

interface Stats {
  NEPLATITA: { count: number; total: number };
  PARTIAL_PLATITA: { count: number; total: number };
  PLATITA: { count: number; total: number };
}

export default function SupplierInvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);

  // Fetch suppliers for filter dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Eroare la incarcarea furnizorilor");
      return res.json();
    },
  });

  const suppliers: Supplier[] = suppliersData?.data || [];

  // Fetch invoices
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["supplier-invoices", search, filterSupplier, filterStatus, dateFrom, dateTo, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterSupplier !== "all") params.set("supplierId", filterSupplier);
      if (filterStatus !== "all") params.set("paymentStatus", filterStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/supplier-invoices?${params}`);
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/supplier-invoices/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
        toast({ title: "Succes", description: data.message || "Factura a fost stearsa" });
        setDeleteDialogOpen(false);
        setSelectedInvoice(null);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const invoices: SupplierInvoice[] = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const stats: Stats = data?.stats || {
    NEPLATITA: { count: 0, total: 0 },
    PARTIAL_PLATITA: { count: 0, total: 0 },
    PLATITA: { count: 0, total: 0 },
  };

  // Calculate totals for stats cards
  const totalUnpaid = stats.NEPLATITA.total + stats.PARTIAL_PLATITA.total;

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

  const handleRowClick = (invoice: SupplierInvoice) => {
    router.push(`/inventory/supplier-invoices/${invoice.id}`);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
    toast({ title: "Succes", description: "Factura a fost creata" });
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedInvoice(null);
    queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
    toast({ title: "Succes", description: "Factura a fost actualizata" });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Facturi Furnizori"
        description="Gestioneaza facturile primite de la furnizori"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reincarca
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Factura noua
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-status-error/50">
          <CardHeader className="pb-2">
            <CardDescription>Neplatite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-error">{stats.NEPLATITA.count}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(stats.NEPLATITA.total)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-warning/50">
          <CardHeader className="pb-2">
            <CardDescription>Partial platite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-warning">{stats.PARTIAL_PLATITA.count}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(stats.PARTIAL_PLATITA.total)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-success/50">
          <CardHeader className="pb-2">
            <CardDescription>Platite luna aceasta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-success">{stats.PLATITA.count}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(stats.PLATITA.total)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total neplatit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUnpaid)}</div>
            <div className="text-sm text-muted-foreground">
              {stats.NEPLATITA.count + stats.PARTIAL_PLATITA.count} facturi
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa numar, serie sau furnizor..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={filterSupplier} onValueChange={(v) => { setFilterSupplier(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Furnizor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toti furnizorii</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status plata" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            <SelectItem value="NEPLATITA">Neplatita</SelectItem>
            <SelectItem value="PARTIAL_PLATITA">Partial platita</SelectItem>
            <SelectItem value="PLATITA">Platita</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-[140px]"
            placeholder="De la"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-[140px]"
            placeholder="Pana la"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Serie/Nr Factura</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data factura</TableHead>
              <TableHead className="text-right">Valoare</TableHead>
              <TableHead>Scadenta</TableHead>
              <TableHead>Status plata</TableHead>
              <TableHead className="text-center">Document</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se incarca...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search || filterSupplier !== "all" || filterStatus !== "all"
                      ? "Nicio factura gasita"
                      : "Nu exista facturi furnizori"}
                  </p>
                  {!search && filterSupplier === "all" && filterStatus === "all" && (
                    <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adauga prima factura
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(invoice)}
                >
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {invoice.invoiceSeries && `${invoice.invoiceSeries} `}
                      {invoice.invoiceNumber}
                    </div>
                    {invoice.purchaseOrder && (
                      <div className="text-xs text-muted-foreground mt-1">
                        PC: {invoice.purchaseOrder.documentNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {invoice.supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(invoice.invoiceDate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(invoice.totalWithVat || invoice.totalValue))}
                  </TableCell>
                  <TableCell>
                    {invoice.paymentDueDate ? (
                      <div className={`flex items-center gap-1 ${isOverdue(invoice.paymentDueDate, invoice.paymentStatus) ? "text-status-error" : ""}`}>
                        {isOverdue(invoice.paymentDueDate, invoice.paymentStatus) && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {formatDate(invoice.paymentDueDate)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.paymentStatus)}</TableCell>
                  <TableCell className="text-center">
                    {invoice.documentPath ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(invoice.documentPath, "_blank");
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actiuni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inventory/supplier-invoices/${invoice.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Vezi detalii
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editeaza
                        </DropdownMenuItem>
                        {invoice.purchaseOrder && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/inventory/purchase-orders/${invoice.purchaseOrder!.id}`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Vezi precomanda
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sterge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} facturi)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Urmator
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factura noua furnizor</DialogTitle>
            <DialogDescription>
              Adauga o factura primita de la un furnizor
            </DialogDescription>
          </DialogHeader>
          <SupplierInvoiceForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setSelectedInvoice(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editeaza factura</DialogTitle>
            <DialogDescription>
              Modifica datele facturii {selectedInvoice?.invoiceSeries} {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <SupplierInvoiceForm
              initialData={selectedInvoice}
              onSuccess={handleEditSuccess}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedInvoice(null);
              }}
            />
          )}
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
                {selectedInvoice?.invoiceSeries && `${selectedInvoice.invoiceSeries} `}
                {selectedInvoice?.invoiceNumber}
              </strong>{" "}
              de la furnizorul <strong>{selectedInvoice?.supplier.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedInvoice && deleteMutation.mutate(selectedInvoice.id)}
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
