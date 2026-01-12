"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Eye,
  Trash2,
  Play,
  XCircle,
  BarChart3,
  RefreshCw,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { RequirePermission } from "@/hooks/use-permissions";

interface PickingList {
  id: string;
  code: string;
  name: string | null;
  status: string;
  totalItems: number;
  totalQuantity: number;
  pickedQuantity: number;
  assignedTo: string | null;
  createdBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    sku: string;
    title: string;
    quantityRequired: number;
    quantityPicked: number;
    isComplete: boolean;
  }>;
  awbs: Array<{
    awb: {
      id: string;
      awbNumber: string | null;
      order: {
        shopifyOrderNumber: string;
        customerFirstName: string | null;
        customerLastName: string | null;
      };
    };
  }>;
  _count: {
    items: number;
    awbs: number;
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  PENDING: { label: "În așteptare", variant: "warning" },
  IN_PROGRESS: { label: "În lucru", variant: "default" },
  COMPLETED: { label: "Finalizat", variant: "success" },
  CANCELLED: { label: "Anulat", variant: "secondary" },
};

export default function PickingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // Fetch picking lists
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pickingLists", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      
      const res = await fetch(`/api/picking?${params}`);
      return res.json();
    },
  });

  const pickingLists: PickingList[] = data?.pickingLists || [];
  const stats = data?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/picking/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Eroare la ștergere");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Picking list șters" });
      queryClient.invalidateQueries({ queryKey: ["pickingLists"] });
      setDeleteDialog({ open: false, id: null });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Eroare la anulare");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Picking list anulat" });
      queryClient.invalidateQueries({ queryKey: ["pickingLists"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const getProgress = (pl: PickingList) => {
    if (pl.totalQuantity === 0) return 0;
    return Math.round((pl.pickedQuantity / pl.totalQuantity) * 100);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 md:h-6 md:w-6" />
            Picking Lists
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Gestionează listele de picking pentru comenzi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="md:size-default" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          <Link href="/picking/create">
            <Button size="sm" className="md:size-default">
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Picking Nou</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">În așteptare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">În lucru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Finalizate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Anulate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după cod sau nume..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="PENDING">În așteptare</SelectItem>
            <SelectItem value="IN_PROGRESS">În lucru</SelectItem>
            <SelectItem value="COMPLETED">Finalizate</SelectItem>
            <SelectItem value="CANCELLED">Anulate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pickingLists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nu există picking lists</p>
            <Link href="/picking/create">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Creează primul picking list
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pickingLists.map((pl) => (
            <Card key={pl.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-lg">{pl.code}</span>
                      <Badge variant={statusConfig[pl.status]?.variant || "default"}>
                        {statusConfig[pl.status]?.label || pl.status}
                      </Badge>
                    </div>
                    {pl.name && (
                      <p className="text-sm text-gray-700">{pl.name}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {pl.totalItems} produse ({pl.totalQuantity} buc)
                      </span>
                      <span>•</span>
                      <span>{pl._count.awbs} AWB-uri</span>
                      <span>•</span>
                      <span>{formatDate(pl.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Progress */}
                    {pl.status === "IN_PROGRESS" && (
                      <div className="flex items-center gap-2 mr-4">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${getProgress(pl)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{getProgress(pl)}%</span>
                      </div>
                    )}

                    {/* Actions */}
                    {/* PDF buttons doar pentru finalizate */}
                    {pl.status === "COMPLETED" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/picking/${pl.id}/print?preview=true`, '_blank')}
                          title="Previzualizare PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/api/picking/${pl.id}/print`;
                            link.download = `picking-${pl.code}.pdf`;
                            link.click();
                            toast({ title: "PDF descărcat" });
                          }}
                          title="Descarcă PDF"
                        >
                      <Printer className="h-4 w-4" />
                    </Button>
                      </>
                    )}

                    <Link href={`/picking/${pl.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Vezi
                      </Button>
                    </Link>

                    {pl.status === "PENDING" && (
                      <RequirePermission permission="picking.create">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(pl.id)}
                          disabled={cancelMutation.isPending}
                          title="Anulează"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </RequirePermission>
                    )}

                    {(pl.status === "PENDING" || pl.status === "CANCELLED") && (
                      <RequirePermission permission="picking.create">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, id: pl.id })}
                          title="Șterge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </RequirePermission>
                    )}
                  </div>
                </div>

                {/* AWB preview */}
                {pl.awbs.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                      {pl.awbs.slice(0, 5).map((a) => (
                        <Badge key={a.awb.id} variant="outline" className="text-xs">
                          {a.awb.awbNumber || a.awb.order.shopifyOrderNumber}
                        </Badge>
                      ))}
                      {pl.awbs.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{pl.awbs.length - 5} altele
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Șterge picking list?</DialogTitle>
            <DialogDescription>
              Această acțiune nu poate fi anulată. Picking list-ul va fi șters definitiv.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: null })}>
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.id && deleteMutation.mutate(deleteDialog.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Șterge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
