"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
  X,
  RotateCcw,
  SkipForward,
  FileText,
  Truck,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface ProcessingError {
  id: string;
  orderId: string;
  orderNumber: string | null;
  type: "INVOICE" | "AWB" | "PICKING_LIST";
  status: "PENDING" | "RETRYING" | "RESOLVED" | "FAILED" | "SKIPPED";
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastRetryAt: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolution: string | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    store: { name: string };
  };
}

const TYPE_CONFIG = {
  INVOICE: { label: "Factură", icon: FileText, color: "text-blue-600" },
  AWB: { label: "AWB", icon: Truck, color: "text-orange-600" },
  PICKING_LIST: { label: "Picking List", icon: ClipboardList, color: "text-purple-600" },
};

const STATUS_CONFIG = {
  PENDING: { label: "În așteptare", variant: "warning" as const, icon: Clock },
  RETRYING: { label: "Se reîncearcă", variant: "default" as const, icon: RefreshCw },
  RESOLVED: { label: "Rezolvat", variant: "success" as const, icon: CheckCircle2 },
  FAILED: { label: "Eșuat", variant: "destructive" as const, icon: XCircle },
  SKIPPED: { label: "Sărit", variant: "secondary" as const, icon: SkipForward },
};

export default function ProcessingErrorsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    errorId: string | null;
    action: "retry" | "skip" | null;
  }>({ open: false, errorId: null, action: null });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["processing-errors", statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/processing-errors?${params}`);
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ errorId, action }: { errorId: string; action: "retry" | "skip" }) => {
      const res = await fetch("/api/processing-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, action }),
      });
      return res.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["processing-errors"] });
      if (result.success) {
        toast({
          title: variables.action === "retry" ? "Procesare reușită" : "Eroare sărită",
          description: result.message,
        });
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
      setConfirmDialog({ open: false, errorId: null, action: null });
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const errors: ProcessingError[] = data?.errors || [];
  const stats = data?.stats || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Erori Procesare
          </h1>
          <p className="text-muted-foreground">
            Comenzi care au întâmpinat erori la procesare (factură sau AWB)
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-amber-500" onClick={() => setStatusFilter("PENDING")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">În așteptare</p>
                <p className="text-2xl font-bold">{stats.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500" onClick={() => setStatusFilter("RETRYING")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Se reîncearcă</p>
                <p className="text-2xl font-bold">{stats.retrying || 0}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500" onClick={() => setStatusFilter("RESOLVED")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rezolvate</p>
                <p className="text-2xl font-bold">{stats.resolved || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500" onClick={() => setStatusFilter("FAILED")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eșuate</p>
                <p className="text-2xl font-bold">{stats.failed || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-gray-500" onClick={() => setStatusFilter("SKIPPED")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sărite</p>
                <p className="text-2xl font-bold">{stats.skipped || 0}</p>
              </div>
              <SkipForward className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            <SelectItem value="PENDING">În așteptare</SelectItem>
            <SelectItem value="RETRYING">Se reîncearcă</SelectItem>
            <SelectItem value="RESOLVED">Rezolvate</SelectItem>
            <SelectItem value="FAILED">Eșuate</SelectItem>
            <SelectItem value="SKIPPED">Sărite</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tip eroare" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            <SelectItem value="INVOICE">Factură</SelectItem>
            <SelectItem value="AWB">AWB</SelectItem>
            <SelectItem value="PICKING_LIST">Picking List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : errors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">Nicio eroare</h3>
            <p className="text-muted-foreground">
              Nu există erori de procesare pentru filtrele selectate
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {errors.map((error) => {
            const TypeIcon = TYPE_CONFIG[error.type]?.icon || AlertTriangle;
            const StatusIcon = STATUS_CONFIG[error.status]?.icon || AlertCircle;
            
            return (
              <Card key={error.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-muted ${TYPE_CONFIG[error.type]?.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            Comandă #{error.order.shopifyOrderNumber}
                          </span>
                          <Badge variant={STATUS_CONFIG[error.status]?.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[error.status]?.label}
                          </Badge>
                          <Badge variant="outline">
                            {TYPE_CONFIG[error.type]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {error.order.customerFirstName} {error.order.customerLastName} • {error.order.store.name}
                        </p>
                        <div className="bg-red-50 text-red-800 rounded p-2 text-sm">
                          {error.errorMessage}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Acum {formatDistanceToNow(new Date(error.createdAt), { locale: ro })}
                          </span>
                          <span>
                            Încercări: {error.retryCount}/{error.maxRetries}
                          </span>
                          {error.resolvedByName && (
                            <span>
                              Rezolvat de: {error.resolvedByName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {(error.status === "PENDING" || error.status === "FAILED") && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, errorId: error.id, action: "retry" })}
                          disabled={actionMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reîncearcă
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDialog({ open: true, errorId: error.id, action: "skip" })}
                          disabled={actionMutation.isPending}
                        >
                          <SkipForward className="h-4 w-4 mr-1" />
                          Sări
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, errorId: null, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "retry" ? "Reîncearcă procesarea?" : "Sări această eroare?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "retry"
                ? "Se va încerca din nou procesarea acestei comenzi."
                : "Eroarea va fi marcată ca sărită și nu va mai fi procesată automat."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.errorId && confirmDialog.action) {
                  actionMutation.mutate({
                    errorId: confirmDialog.errorId,
                    action: confirmDialog.action,
                  });
                }
              }}
            >
              {actionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmDialog.action === "retry" ? "Reîncearcă" : "Sări"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
