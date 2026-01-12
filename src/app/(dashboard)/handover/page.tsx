"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  PackageCheck,
  Scan,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  FileText,
  Store,
  Package,
  Truck,
  Info,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";

interface HandoverAWB {
  id: string;
  awbNumber: string | null;
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeId: string;
  recipientName: string;
  recipientCity: string;
  products: string;
  fanCourierStatusCode: string | null;
  fanCourierStatusName: string | null;
  fanCourierStatusDesc: string | null;
  handedOverAt: string | null;
  handedOverByName: string | null;
  notHandedOver: boolean;
  hasC0WithoutScan: boolean;
  c0ReceivedAt: string | null;
  createdAt: string;
}

interface HandoverStats {
  totalIssued: number;
  totalHandedOver: number;
  totalNotHandedOver: number;
  totalPending: number;
  totalFromPrevDays: number;
  totalC0Alerts: number;
}

interface HandoverSession {
  id: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
  closedBy: string | null;
  closeType: string | null;
}

interface ScanResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "warning";
  awb?: HandoverAWB;
}

export default function HandoverPage() {
  const queryClient = useQueryClient();
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [scanInput, setScanInput] = useState("");
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [c0AlertDialog, setC0AlertDialog] = useState<{
    open: boolean;
    awb: HandoverAWB | null;
  }>({ open: false, awb: null });
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stores for filter
  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });
  const stores = storesData?.stores || [];

  // Fetch today's handover data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["handover-today", storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      const res = await fetch(`/api/handover/today?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const awbs: HandoverAWB[] = data?.data?.awbs || [];
  const stats: HandoverStats = data?.data?.stats || {
    totalIssued: 0,
    totalHandedOver: 0,
    totalNotHandedOver: 0,
    totalPending: 0,
    totalFromPrevDays: 0,
    totalC0Alerts: 0,
  };
  const session: HandoverSession | null = data?.data?.session || null;

  // Fetch C0 alerts
  const { data: c0AlertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["handover-c0-alerts", storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      const res = await fetch(`/api/handover/c0-alerts?${params}`);
      return res.json();
    },
    refetchInterval: 60000,
  });
  const c0Alerts: HandoverAWB[] = c0AlertsData?.data?.alerts || [];

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (awbNumber: string) => {
      const res = await fetch("/api/handover/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbNumber }),
      });
      return res.json();
    },
    onSuccess: (result: ScanResult) => {
      setLastScanResult(result);
      setScanInput("");
      
      if (result.success) {
        toast({
          title: result.type === "warning" ? "⚠️ Atenție" : "✓ Scanat",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
        queryClient.invalidateQueries({ queryKey: ["handover-c0-alerts"] });
      } else {
        toast({
          title: "Eroare",
          description: result.message,
          variant: "destructive",
        });
      }
      
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message || "Eroare la scanare",
        variant: "destructive",
      });
      setScanInput("");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/handover/finalize", { method: "POST" });
      return res.json();
    },
    onSuccess: (result) => {
      setFinalizeDialog(false);
      if (result.success) {
        toast({ title: "✓ Predarea a fost finalizată" });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
      } else {
        toast({ title: "Eroare", description: result.message, variant: "destructive" });
      }
    },
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/handover/reopen", { method: "POST" });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "✓ Predarea a fost redeschisă" });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
      } else {
        toast({ title: "Eroare", description: result.message, variant: "destructive" });
      }
    },
  });

  // Resolve C0 alert mutation
  const resolveC0Mutation = useMutation({
    mutationFn: async ({ awbId, action }: { awbId: string; action: string }) => {
      const res = await fetch("/api/handover/c0-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbId, action }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      setC0AlertDialog({ open: false, awb: null });
      if (result.success) {
        toast({ title: "✓ Alertă rezolvată" });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
        queryClient.invalidateQueries({ queryKey: ["handover-c0-alerts"] });
      }
    },
  });

  // Handle scan input
  const handleScan = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    if (session?.status === "CLOSED") {
      toast({
        title: "Predare închisă",
        description: "Redeschide predarea pentru a continua scanarea.",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(scanInput.trim());
  }, [scanInput, session, scanMutation]);

  // Auto-submit după scanare (scanner-ul trimite rapid caracterele)
  const handleScanInputChange = useCallback((value: string) => {
    setScanInput(value);
    
    // Clear previous timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Auto-submit după 100ms de la ultima tastă (scanner-ul e rapid)
    if (value.trim().length >= 5 && session?.status !== "CLOSED") {
      scanTimeoutRef.current = setTimeout(() => {
        scanMutation.mutate(value.trim());
      }, 100);
    }
  }, [session, scanMutation]);

  // Auto-focus scan input
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Format time
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 md:h-6 md:w-6" />
              Predare Curier
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">{today}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="md:size-default" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Link href="/handover/not-handed">
              <Button variant="outline" size="sm" className="md:size-default">
                <XCircle className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Nepredate</span>
              </Button>
            </Link>
            <Link href="/handover/report">
              <Button variant="outline" size="sm" className="md:size-default">
                <FileText className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Rapoarte</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* C0 Alerts Banner */}
        {c0Alerts.length > 0 && (
          <Alert className="border-orange-500 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">
              Atenție: {c0Alerts.length} AWB-uri ridicate de curier fără scanare internă
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              Aceste AWB-uri au primit confirmare C0 de la FanCourier dar nu au fost scanate în sistem.{" "}
              <Button
                variant="link"
                className="text-orange-800 underline p-0 h-auto"
                onClick={() => setC0AlertDialog({ open: true, awb: c0Alerts[0] })}
              >
                Rezolvă alertele
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Session Status */}
        {session?.status === "CLOSED" && (
          <Alert className="border-red-500 bg-red-50">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Predarea este închisă</AlertTitle>
            <AlertDescription className="text-red-700 flex items-center justify-between">
              <span>
                Finalizată la {formatTime(session.closedAt)} de {session.closedBy || "System"}
              </span>
              <RequirePermission permission="handover.finalize">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reopenMutation.mutate()}
                  disabled={reopenMutation.isPending}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Redeschide predarea
                </Button>
              </RequirePermission>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total emise azi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIssued}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Scanate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{stats.totalHandedOver}</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">De scanat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">{stats.totalPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Din zile anterioare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFromPrevDays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Procent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalIssued > 0
                  ? `${Math.round((stats.totalHandedOver / stats.totalIssued) * 100)}%`
                  : "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scan Input + Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="text-sm text-muted-foreground mb-2 block">
              🔍 Scanează AWB:
            </label>
            <form onSubmit={handleScan} className="flex gap-2">
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => handleScanInputChange(e.target.value)}
                placeholder="Așteaptă scanare..."
                className="text-lg font-mono"
                disabled={session?.status === "CLOSED" || scanMutation.isPending}
                autoFocus
              />
              <Button
                type="submit"
                disabled={!scanInput.trim() || session?.status === "CLOSED" || scanMutation.isPending}
              >
                {scanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
              </Button>
            </form>
            {lastScanResult && (
              <p
                className={`text-sm mt-1 ${
                  lastScanResult.type === "error"
                    ? "text-red-600"
                    : lastScanResult.type === "warning"
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {lastScanResult.message}
              </p>
            )}
          </div>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-48">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Magazin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate magazinele</SelectItem>
              {stores.map((store: any) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <RequirePermission permission="handover.finalize">
            {session?.status === "OPEN" && (
              <Button variant="destructive" onClick={() => setFinalizeDialog(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Finalizează predarea
              </Button>
            )}
          </RequirePermission>
        </div>

        {/* AWB List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : awbs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Toate AWB-urile au fost scanate!</p>
              <p className="text-muted-foreground">Nu mai sunt colete de predat pentru azi.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AWB</TableHead>
                    <TableHead>Comandă</TableHead>
                    <TableHead>Magazin</TableHead>
                    <TableHead>Destinatar</TableHead>
                    <TableHead>Produse</TableHead>
                    <TableHead>Status FanCourier</TableHead>
                    <TableHead>Status intern</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awbs.map((awb) => (
                    <TableRow key={awb.id} className={awb.hasC0WithoutScan ? "bg-orange-50" : ""}>
                      <TableCell className="font-mono font-medium">{awb.awbNumber || "-"}</TableCell>
                      <TableCell>
                        <Link href={`/orders/${awb.orderId}`} className="text-blue-600 hover:underline">
                          #{awb.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{awb.storeName}</TableCell>
                      <TableCell>
                        <div>{awb.recipientName}</div>
                        <div className="text-xs text-muted-foreground">{awb.recipientCity}</div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{awb.products}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">{awb.products}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {awb.fanCourierStatusCode ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="cursor-help">
                                <Truck className="h-3 w-3 mr-1" />
                                {awb.fanCourierStatusCode} - {awb.fanCourierStatusName}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{awb.fanCourierStatusDesc}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-sm">- fără evenimente</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {awb.handedOverAt ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {formatTime(awb.handedOverAt)}
                          </Badge>
                        ) : awb.hasC0WithoutScan ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-500 text-orange-700"
                            onClick={() => setC0AlertDialog({ open: true, awb })}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            C0 fără scanare
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Așteaptă scanare
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Finalize Dialog */}
        <Dialog open={finalizeDialog} onOpenChange={setFinalizeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizează predarea?</DialogTitle>
              <DialogDescription>
                Toate AWB-urile nescanate ({stats.totalPending}) vor fi marcate ca NEPREDAT.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total AWB-uri:</span>
                <span className="font-bold">{stats.totalIssued}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Scanate:</span>
                <span className="font-bold">{stats.totalHandedOver}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Vor fi marcate NEPREDAT:</span>
                <span className="font-bold">{stats.totalPending}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFinalizeDialog(false)}>
                Anulează
              </Button>
              <Button
                variant="destructive"
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Finalizează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* C0 Alert Dialog */}
        <Dialog
          open={c0AlertDialog.open}
          onOpenChange={(open) => setC0AlertDialog({ open, awb: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Confirmare automată de ridicare
              </DialogTitle>
            </DialogHeader>
            {c0AlertDialog.awb && (
              <>
                <div className="space-y-3">
                  <p>
                    AWB-ul <strong>{c0AlertDialog.awb.awbNumber}</strong> (Comanda{" "}
                    <strong>#{c0AlertDialog.awb.orderNumber}</strong>) a fost marcat ca
                    "Ridicat" de FanCourier, dar NU a fost scanat în sistem.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data ridicare FanCourier:{" "}
                    {c0AlertDialog.awb.c0ReceivedAt
                      ? new Date(c0AlertDialog.awb.c0ReceivedAt).toLocaleString("ro-RO")
                      : "-"}
                  </p>
                  <p className="font-medium">Ce doriți să faceți?</p>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      resolveC0Mutation.mutate({
                        awbId: c0AlertDialog.awb!.id,
                        action: "mark_handed",
                      })
                    }
                    disabled={resolveC0Mutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marchează predat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      resolveC0Mutation.mutate({
                        awbId: c0AlertDialog.awb!.id,
                        action: "ignore",
                      })
                    }
                    disabled={resolveC0Mutation.isPending}
                  >
                    Lasă nescanat (investighează)
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
