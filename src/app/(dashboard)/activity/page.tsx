"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  FileText,
  Truck,
  Package,
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const entityTypeIcons: Record<string, any> = {
  ORDER: FileText,
  INVOICE: FileText,
  AWB: Truck,
  STOCK: Package,
  PRODUCT: Package,
  SETTINGS: Settings,
  SYNC: RefreshCw,
};

const entityTypeColors: Record<string, string> = {
  ORDER: "bg-status-info/10 text-status-info",
  INVOICE: "bg-status-success/10 text-status-success",
  AWB: "bg-status-warning/10 text-status-warning",
  STOCK: "bg-purple-100 text-purple-800",
  PRODUCT: "bg-purple-100 text-purple-800",
  SETTINGS: "bg-gray-100 text-gray-800",
  SYNC: "bg-cyan-100 text-cyan-800",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-status-success/10 text-status-success",
  UPDATE: "bg-status-info/10 text-status-info",
  DELETE: "bg-status-error/10 text-status-error",
  CANCEL: "bg-status-error/10 text-status-error",
  ISSUE_INVOICE: "bg-status-success/10 text-status-success",
  CANCEL_INVOICE: "bg-status-error/10 text-status-error",
  CREATE_AWB: "bg-status-warning/10 text-status-warning",
  UPDATE_AWB_STATUS: "bg-status-warning/10 text-status-warning",
  STOCK_IN: "bg-status-success/10 text-status-success",
  STOCK_OUT: "bg-status-error/10 text-status-error",
  STOCK_ADJUST: "bg-status-warning/10 text-status-warning",
  STOCK_SYNC: "bg-cyan-100 text-cyan-800",
  PAYMENT_RECEIVED: "bg-status-success/10 text-status-success",
  ERROR: "bg-status-error/10 text-status-error",
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity", page, entityType, search, successFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "30");
      if (entityType !== "all") params.set("entityType", entityType);
      if (search) params.set("search", search);
      if (successFilter !== "all") params.set("success", successFilter);

      const res = await fetch(`/api/activity?${params.toString()}`);
      return res.json();
    },
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Istoric Activități</h1>
          <p className="text-muted-foreground mt-1">
            Toate acțiunile din platformă într-un singur loc
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută după număr comandă, factură, AWB..."
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
              value={entityType}
              onValueChange={(value) => {
                setEntityType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tip entitate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="ORDER">Comenzi</SelectItem>
                <SelectItem value="INVOICE">Facturi</SelectItem>
                <SelectItem value="AWB">AWB-uri</SelectItem>
                <SelectItem value="STOCK">Stocuri</SelectItem>
                <SelectItem value="SETTINGS">Setări</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={successFilter}
              onValueChange={(value) => {
                setSuccessFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="true">✅ Succes</SelectItem>
                <SelectItem value="false">❌ Erori</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Se încarcă...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nu s-au găsit activități
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Ora</TableHead>
                    <TableHead className="w-[100px]">Tip</TableHead>
                    <TableHead className="w-[150px]">Acțiune</TableHead>
                    <TableHead>Descriere</TableHead>
                    <TableHead className="w-[120px]">Comandă</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => {
                    const Icon = entityTypeIcons[log.entityType] || FileText;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss", { locale: ro })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={entityTypeColors[log.entityType]}>
                            <Icon className="h-3 w-3 mr-1" />
                            {log.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionColors[log.action] || "bg-gray-100"}>
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm truncate" title={log.description}>
                            {log.description}
                          </p>
                          {log.errorMessage && (
                            <p className="text-xs text-status-error mt-1 truncate" title={log.errorMessage}>
                              ❌ {log.errorMessage}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.orderNumber && (
                            <a 
                              href={`/orders/${log.orderId}`}
                              className="text-sm text-primary hover:underline"
                            >
                              #{log.orderNumber}
                            </a>
                          )}
                          {log.invoiceNumber && !log.orderNumber && (
                            <span className="text-sm">{log.invoiceSeries}{log.invoiceNumber}</span>
                          )}
                          {log.awbNumber && !log.orderNumber && (
                            <span className="text-sm">{log.awbNumber}</span>
                          )}
                          {log.productSku && !log.orderNumber && (
                            <span className="text-sm">{log.productSku}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <CheckCircle className="h-5 w-5 text-status-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-status-error" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Afișare {(pagination.page - 1) * 30 + 1} - {Math.min(pagination.page * 30, pagination.total)} din {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    Următor
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
