"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  CheckCircle2,
  Tag,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Loader2,
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
import { ActionTooltip } from "@/components/ui/action-tooltip";

type PurchaseOrderStatus = "DRAFT" | "APROBATA" | "IN_RECEPTIE" | "RECEPTIONATA" | "ANULATA";

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  createdAt: string;
  supplier: Supplier | null;
  _count: {
    items: number;
    labels: number;
  };
}

interface PurchaseOrdersResponse {
  success: boolean;
  data: {
    orders: PurchaseOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      total: number;
      draft: number;
      aprobata: number;
      inReceptie: number;
      receptionata: number;
      anulata: number;
    };
  };
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" }> = {
  DRAFT: { label: "Ciorna", variant: "secondary" },
  APROBATA: { label: "Aprobata", variant: "default" },
  IN_RECEPTIE: { label: "In receptie", variant: "warning" },
  RECEPTIONATA: { label: "Receptionata", variant: "success" },
  ANULATA: { label: "Anulata", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch suppliers for filter
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-for-filter"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers?isActive=true&limit=200");
      return res.json();
    },
  });

  const suppliers: Supplier[] = suppliersData?.data || [];

  // Fetch purchase orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchase-orders", search, statusFilter, supplierFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (supplierFilter !== "all") params.set("supplierId", supplierFilter);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/purchase-orders?${params}`);
      return res.json() as Promise<PurchaseOrdersResponse>;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchase-orders/${id}/approve`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast({
          title: "Succes",
          description: result.message || "Precomanda a fost aprobata",
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

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || { page: 1, limit, total: 0, totalPages: 1 };
  const stats = data?.data?.stats || { total: 0, draft: 0, aprobata: 0, inReceptie: 0, receptionata: 0, anulata: 0 };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleApprove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    approveMutation.mutate(id);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Precomenzi"
        description="Gestioneaza precomenzile catre furnizori"
        actions={
          <>
            <ActionTooltip action="Reincarca lista" consequence="Se actualizeaza datele">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reincarca
              </Button>
            </ActionTooltip>
            <ActionTooltip action="Creeaza precomanda noua" consequence="Se deschide formularul">
              <Button onClick={() => router.push("/inventory/purchase-orders/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Precomanda noua
              </Button>
            </ActionTooltip>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ciorne</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aprobate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.aprobata}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In receptie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inReceptie}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receptionate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.receptionata}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa numar, furnizor..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            <SelectItem value="DRAFT">Ciorna</SelectItem>
            <SelectItem value="APROBATA">Aprobata</SelectItem>
            <SelectItem value="IN_RECEPTIE">In receptie</SelectItem>
            <SelectItem value="RECEPTIONATA">Receptionata</SelectItem>
            <SelectItem value="ANULATA">Anulata</SelectItem>
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Furnizor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toti furnizorii</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nr. Document</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data estimata</TableHead>
              <TableHead className="text-center">Produse</TableHead>
              <TableHead className="text-right">Valoare</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Se incarca...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    {search || statusFilter !== "all" || supplierFilter !== "all"
                      ? "Nicio precomanda gasita"
                      : "Nu exista precomenzi"}
                  </p>
                  {!search && statusFilter === "all" && supplierFilter === "all" && (
                    <Button variant="outline" onClick={() => router.push("/inventory/purchase-orders/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Creeaza prima precomanda
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/inventory/purchase-orders/${order.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/inventory/purchase-orders/${order.id}`}
                      className="font-mono text-sm font-medium hover:underline text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.supplier?.name || "-"}</TableCell>
                  <TableCell>{formatDate(order.expectedDate)}</TableCell>
                  <TableCell className="text-center">{order.totalItems}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(order.totalValue))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[order.status].variant}>
                      {STATUS_CONFIG[order.status].label}
                    </Badge>
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
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inventory/purchase-orders/${order.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Vezi detalii
                        </DropdownMenuItem>
                        {order.status === "DRAFT" && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/inventory/purchase-orders/${order.id}?edit=true`);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editeaza
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleApprove(order.id, e)}
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Aproba
                            </DropdownMenuItem>
                          </>
                        )}
                        {(order.status === "APROBATA" || order.status === "IN_RECEPTIE") && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inventory/purchase-orders/${order.id}/labels`);
                          }}>
                            <Tag className="h-4 w-4 mr-2" />
                            Etichete
                          </DropdownMenuItem>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.page} din {pagination.totalPages} ({pagination.total} total)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Urmator
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
