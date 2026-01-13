"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle2,
  FileText,
  Package,
  Building2,
  Calendar,
  Clock,
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

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
  documentNumber?: string;
  documentDate?: string;
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  notes?: string;
  createdAt: string;
  createdByName?: string;
  completedAt?: string;
  completedByName?: string;
  items: Array<{
    id: string;
    quantity: number;
    unitCost?: number;
    item: {
      id: string;
      sku: string;
      name: string;
      unit: string;
    };
  }>;
  _count?: {
    items: number;
  };
}

export default function GoodsReceiptsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  // Fetch receipts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["goods-receipts", search, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/goods-receipts?${params}`);
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goods-receipts?id=${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        toast({ title: "Succes", description: data.message });
        setDeleteDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goods-receipts/${id}/complete`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        toast({ title: "Succes", description: data.message });
        setCompleteDialogOpen(false);
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  const receipts: GoodsReceipt[] = data?.data?.receipts || [];
  const stats = data?.data?.stats || { total: 0, draft: 0, completed: 0, cancelled: 0 };

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

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Recepții"
        description="Gestionează recepțiile de marfă"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reîncarcă
            </Button>
            <Button onClick={() => router.push("/inventory/receipts/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Recepție nouă
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-status-warning/50">
          <CardHeader className="pb-2">
            <CardDescription>Ciorne</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-warning">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card className="border-status-success/50">
          <CardHeader className="pb-2">
            <CardDescription>Finalizate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-success">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anulate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după NIR, factură sau furnizor..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="DRAFT">Ciorne</SelectItem>
            <SelectItem value="COMPLETED">Finalizate</SelectItem>
            <SelectItem value="CANCELLED">Anulate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nr. NIR</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-center">Articole</TableHead>
              <TableHead className="text-right">Valoare</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : receipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search || filterStatus !== "all"
                      ? "Nicio recepție găsită"
                      : "Nu există recepții"}
                  </p>
                  {!search && filterStatus === "all" && (
                    <Button variant="outline" onClick={() => router.push("/inventory/receipts/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Creează prima recepție
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              receipts.map((receipt) => (
                <TableRow
                  key={receipt.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/inventory/receipts/${receipt.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {receipt.receiptNumber}
                  </TableCell>
                  <TableCell>
                    {receipt.supplier ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {receipt.supplier.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {receipt.documentNumber ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {receipt.documentNumber}
                        </div>
                        {receipt.documentDate && (
                          <div className="text-xs text-muted-foreground">
                            {formatDate(receipt.documentDate)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {receipt.totalItems}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(receipt.totalValue))}
                  </TableCell>
                  <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(receipt.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acțiuni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inventory/receipts/${receipt.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Vezi detalii
                        </DropdownMenuItem>
                        {receipt.status === "DRAFT" && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(receipt);
                                setCompleteDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Finalizează
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(receipt);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Șterge
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizare recepție</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să finalizezi recepția{" "}
              <strong>{selectedReceipt?.receiptNumber}</strong>?
              <br />
              <br />
              Aceasta va adăuga {selectedReceipt?.totalItems} articole în stoc
              cu o valoare totală de {formatCurrency(Number(selectedReceipt?.totalValue || 0))}.
              <br />
              <br />
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
              onClick={() => selectedReceipt && completeMutation.mutate(selectedReceipt.id)}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? "Se procesează..." : "Finalizează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmare ștergere</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi recepția{" "}
              <strong>{selectedReceipt?.receiptNumber}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReceipt && deleteMutation.mutate(selectedReceipt.id)}
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
