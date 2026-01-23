"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RotateCcw,
  Store,
  Building,
  Hash,
  CalendarDays,
  ArrowLeft,
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
import { toast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";

interface FailedAttempt {
  id: string;
  orderId: string;
  errorCode: string;
  errorMessage: string;
  storeId: string | null;
  storeName: string | null;
  companyId: string | null;
  companyName: string | null;
  seriesId: string | null;
  seriesName: string | null;
  status: string;
  retriedAt: string | null;
  resolvedAt: string | null;
  attemptNumber: number;
  createdAt: string;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerEmail: string | null;
    totalPrice: string;
    status: string;
  };
}

interface FailedAttemptsResponse {
  attempts: FailedAttempt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function FailedInvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, refetch } = useQuery<FailedAttemptsResponse>({
    queryKey: ["failed-invoices", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      const res = await fetch(`/api/invoices/failed?${params}`);
      if (!res.ok) {
        throw new Error("Eroare la incarcarea datelor");
      }
      return res.json();
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      const res = await fetch("/api/invoices/failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Factura emisa cu succes",
          description: `Factura ${data.invoice?.series || ""}${data.invoice?.number || ""} a fost emisa.`,
        });
        queryClient.invalidateQueries({ queryKey: ["failed-invoices"] });
      } else {
        toast({
          title: "Eroare la reincercare",
          description: data.error || "Nu s-a putut emite factura.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Eroare",
        description: "Eroare la reincercarea facturii.",
        variant: "destructive",
      });
    },
  });

  const attempts = data?.attempts || [];
  const pagination = data?.pagination;

  // Filter by search query locally
  const filteredAttempts = searchQuery
    ? attempts.filter(
        (a) =>
          a.order.shopifyOrderNumber
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          a.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.errorMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : attempts;

  const stats = {
    total: attempts.length,
    pending: attempts.filter((a) => a.status === "pending").length,
    resolved: attempts.filter((a) => a.status === "resolved").length,
  };

  const getStatusBadge = (attempt: FailedAttempt) => {
    if (attempt.status === "resolved") {
      return (
        <Badge variant="outline" className="bg-status-success/10 text-status-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Rezolvat
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-status-warning/10 text-status-warning">
        <Clock className="h-3 w-3 mr-1" />
        In asteptare
      </Badge>
    );
  };

  const getErrorBadge = (errorCode: string) => {
    const errorColors: Record<string, string> = {
      NO_SERIES: "bg-status-error/10 text-status-error border-status-error/20",
      FACTURIS_ERROR: "bg-orange-100 text-orange-700 border-orange-200",
      VALIDATION_ERROR: "bg-yellow-100 text-yellow-700 border-yellow-200",
      UNKNOWN: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <Badge
        variant="outline"
        className={errorColors[errorCode] || errorColors.UNKNOWN}
      >
        {errorCode}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Inapoi la Facturi
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-status-warning" />
            Facturi Esuate
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Vizualizeaza si reincearca facturile care au esuat la emitere
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="md:size-default"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Reimprospatare</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-gradient-to-br from-status-warning/10 to-status-warning/5 border-status-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-status-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total incercari</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-status-error/10 to-status-error/5 border-status-error/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-status-error" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">In asteptare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-status-success/10 to-status-success/5 border-status-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-status-success" />
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Rezolvate</p>
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
                  placeholder="Cauta dupa comanda, magazin sau eroare..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="pending">In asteptare</SelectItem>
                <SelectItem value="resolved">Rezolvate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Failed Attempts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">Comanda</th>
                  <th className="p-4 text-left text-sm font-medium">Magazin</th>
                  <th className="p-4 text-left text-sm font-medium">Eroare</th>
                  <th className="p-4 text-left text-sm font-medium">Incercari</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Data</th>
                  <th className="p-4 text-left text-sm font-medium">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Se incarca...</p>
                    </td>
                  </tr>
                ) : filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-status-success opacity-50" />
                      <p className="text-muted-foreground">
                        {statusFilter === "pending"
                          ? "Nu exista facturi esuate in asteptare"
                          : "Nu exista incercari esuate"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        attempt.status === "resolved" && "opacity-60"
                      )}
                    >
                      <td className="p-4">
                        <div>
                          <a
                            href={`/orders/${attempt.order.id}`}
                            className="font-medium hover:text-primary hover:underline flex items-center gap-1"
                          >
                            <Hash className="h-3 w-3" />
                            {attempt.order.shopifyOrderNumber}
                          </a>
                          {attempt.order.customerEmail && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {attempt.order.customerEmail}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {attempt.storeName && (
                            <div className="flex items-center gap-1 text-sm">
                              <Store className="h-3 w-3 text-muted-foreground" />
                              {attempt.storeName}
                            </div>
                          )}
                          {attempt.companyName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building className="h-3 w-3" />
                              {attempt.companyName}
                            </div>
                          )}
                          {attempt.seriesName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              Seria: {attempt.seriesName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          {getErrorBadge(attempt.errorCode)}
                          <p
                            className="text-sm text-muted-foreground max-w-[300px] truncate"
                            title={attempt.errorMessage}
                          >
                            {attempt.errorMessage}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {attempt.attemptNumber}{" "}
                          {attempt.attemptNumber === 1 ? "incercare" : "incercari"}
                        </Badge>
                      </td>
                      <td className="p-4">{getStatusBadge(attempt)}</td>
                      <td className="p-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(attempt.createdAt)}
                          </div>
                          {attempt.retriedAt && (
                            <div className="text-xs text-muted-foreground">
                              Reinc.: {formatDate(attempt.retriedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {attempt.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryMutation.mutate(attempt.id)}
                              disabled={retryMutation.isPending}
                              className="text-status-info border-status-info/30 hover:bg-status-info/10"
                            >
                              {retryMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Reincearca
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/orders/${attempt.order.id}`)
                            }
                          >
                            Vezi comanda
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination info */}
          {pagination && pagination.total > 0 && (
            <div className="p-4 border-t text-sm text-muted-foreground">
              Afisare {filteredAttempts.length} din {pagination.total} incercari
              {pagination.pages > 1 && ` (pagina ${pagination.page} din ${pagination.pages})`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
