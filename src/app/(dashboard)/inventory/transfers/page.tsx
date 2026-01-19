"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Plus,
  Loader2,
  ArrowRight,
  Eye,
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";
import { ro } from "date-fns/locale";

type TransferStatus = "DRAFT" | "COMPLETED" | "CANCELLED";

interface Transfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdByName: string | null;
  completedByName: string | null;
  fromWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  toWarehouse: {
    id: string;
    code: string;
    name: string;
  };
  _count: {
    items: number;
  };
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

const STATUS_CONFIG: Record<TransferStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  COMPLETED: { label: "Finalizat", variant: "default" },
  CANCELLED: { label: "Anulat", variant: "destructive" },
};

export default function TransfersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch warehouses for filter
  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Eroare la incarcarea depozitelor");
      return res.json();
    },
  });

  // Fetch transfers
  const { data: transfersData, isLoading } = useQuery({
    queryKey: ["transfers", page, statusFilter, warehouseFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (warehouseFilter !== "all") params.append("warehouseId", warehouseFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/transfers?${params}`);
      if (!res.ok) throw new Error("Eroare la incarcarea transferurilor");
      return res.json();
    },
  });

  const warehouses: Warehouse[] = warehousesData?.warehouses || [];
  const transfers: Transfer[] = transfersData?.transfers || [];
  const pagination = transfersData?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transferuri</h1>
          <p className="text-muted-foreground">
            Gestioneaza transferurile intre depozite
          </p>
        </div>
        <Button onClick={() => router.push("/inventory/transfers/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Transfer Nou
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cauta dupa numar transfer..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="COMPLETED">Finalizate</SelectItem>
                <SelectItem value="CANCELLED">Anulate</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={warehouseFilter}
              onValueChange={(value) => {
                setWarehouseFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Depozit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate depozitele</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Niciun transfer</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || statusFilter !== "all" || warehouseFilter !== "all"
                ? "Nu exista transferuri care sa corespunda filtrelor."
                : "Creeaza primul transfer pentru a muta stocul intre depozite."}
            </p>
            {!search && statusFilter === "all" && warehouseFilter === "all" && (
              <Button onClick={() => router.push("/inventory/transfers/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Creeaza Transfer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numar</TableHead>
                  <TableHead>Din</TableHead>
                  <TableHead></TableHead>
                  <TableHead>In</TableHead>
                  <TableHead className="text-center">Articole</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transfer.fromWarehouse.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.fromWarehouse.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transfer.toWarehouse.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.toWarehouse.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{transfer._count.items}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[transfer.status].variant}>
                        {STATUS_CONFIG[transfer.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {format(new Date(transfer.createdAt), "dd MMM yyyy", {
                            locale: ro,
                          })}
                        </span>
                      </div>
                      {transfer.createdByName && (
                        <p className="text-xs text-muted-foreground">
                          de {transfer.createdByName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/inventory/transfers/${transfer.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Vezi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Afisare {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, pagination.total)} din {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Pagina {page} din {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
