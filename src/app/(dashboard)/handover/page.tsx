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
  Timer,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

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
  totalNotHandedOverAll: number;
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
  const [scanFeedback, setScanFeedback] = useState<"idle" | "success" | "error">("idle");
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [c0AlertDialog, setC0AlertDialog] = useState<{
    open: boolean;
    awb: HandoverAWB | null;
  }>({ open: false, awb: null });
  const [timeLeft, setTimeLeft] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer to 20:00
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const deadline = new Date();
      deadline.setHours(20, 0, 0, 0);

      if (now > deadline) {
        setTimeLeft("Sesiune finalizata");
        return;
      }

      const diff = deadline.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${hours}h ${mins}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

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
    totalNotHandedOverAll: 0,
    totalPending: 0,
    totalFromPrevDays: 0,
    totalC0Alerts: 0,
  };
  const session: HandoverSession | null = data?.data?.session || null;

  // Split AWBs into pending and scanned
  const pendingAwbs = awbs.filter(a => !a.handedOverAt);
  const scannedAwbs = awbs.filter(a => a.handedOverAt);
  const progressPercent = stats.totalIssued > 0
    ? Math.round((stats.totalHandedOver / stats.totalIssued) * 100)
    : 0;

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
        setScanFeedback("success");
        toast({
          title: result.type === "warning" ? "Atentie" : "Scanat",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
        queryClient.invalidateQueries({ queryKey: ["handover-c0-alerts"] });
      } else {
        setScanFeedback("error");
        toast({
          title: "Eroare",
          description: result.message,
          variant: "destructive",
        });
      }

      // Reset feedback after animation
      setTimeout(() => setScanFeedback("idle"), 2000);
      setTimeout(() => scanInputRef.current?.focus(), 100);
    },
    onError: (error: any) => {
      setScanFeedback("error");
      toast({
        title: "Eroare",
        description: error.message || "Eroare la scanare",
        variant: "destructive",
      });
      setScanInput("");
      setTimeout(() => setScanFeedback("idle"), 2000);
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
        toast({ title: "Predarea a fost finalizata" });
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
        toast({ title: "Predarea a fost redeschisa" });
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
        toast({ title: "Alerta rezolvata" });
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
        title: "Predare inchisa",
        description: "Redeschide predarea pentru a continua scanarea.",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(scanInput.trim());
  }, [scanInput, session, scanMutation]);

  // Auto-submit after scanning (scanner sends characters rapidly)
  const handleScanInputChange = useCallback((value: string) => {
    setScanInput(value);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

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
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 md:h-6 md:w-6" />
              Predare Curier
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">{today}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Countdown Timer */}
            <div className="flex items-center gap-2 bg-status-warning/10 border border-status-warning/20 px-3 py-1.5 rounded-lg">
              <Timer className="h-4 w-4 text-status-warning" />
              <span className="text-sm font-medium text-status-warning">
                Finalizare auto: {timeLeft}
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/handover/not-handed">
              <Button variant="outline" size="sm" className="border-status-warning/30 text-status-warning hover:bg-status-warning/10">
                <XCircle className="h-4 w-4 mr-2" />
                Nepredate ({stats.totalNotHandedOverAll})
              </Button>
            </Link>
            <Link href="/handover/report">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Rapoarte
              </Button>
            </Link>
          </div>
        </div>

        {/* C0 Alerts Banner */}
        {c0Alerts.length > 0 && (
          <Alert className="border-status-warning bg-status-warning/10">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
            <AlertTitle className="text-status-warning">
              Atentie: {c0Alerts.length} AWB-uri ridicate de curier fara scanare interna
            </AlertTitle>
            <AlertDescription className="text-status-warning">
              Aceste AWB-uri au primit confirmare C0 de la FanCourier dar nu au fost scanate in sistem.{" "}
              <Button
                variant="link"
                className="text-status-warning underline p-0 h-auto"
                onClick={() => setC0AlertDialog({ open: true, awb: c0Alerts[0] })}
              >
                Rezolva alertele
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Session Status */}
        {session?.status === "CLOSED" && (
          <Alert className="border-status-error bg-status-error/10">
            <Lock className="h-4 w-4 text-status-error" />
            <AlertTitle className="text-status-error">Predarea este inchisa</AlertTitle>
            <AlertDescription className="text-status-error flex items-center justify-between">
              <span>
                Finalizata la {formatTime(session.closedAt)} de {session.closedBy || "System"}
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

        {/* Large Progress Bar */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-3xl font-bold">
                {stats.totalHandedOver} / {stats.totalIssued}
              </div>
              <div className={cn(
                "text-3xl font-bold",
                progressPercent >= 100 ? "text-status-success" :
                progressPercent >= 75 ? "text-status-info" :
                progressPercent >= 50 ? "text-status-warning" : "text-status-warning"
              )}>
                {progressPercent}%
              </div>
            </div>
            <Progress
              value={progressPercent}
              className="h-4"
            />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Scanate: {stats.totalHandedOver}</span>
              <span>De scanat: {stats.totalPending}</span>
              {stats.totalFromPrevDays > 0 && (
                <span className="text-status-warning">+{stats.totalFromPrevDays} din zile anterioare</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scan Input with Visual Feedback */}
        <Card className={cn(
          "transition-all duration-300 border-2",
          scanFeedback === "success" && "border-status-success bg-status-success/10",
          scanFeedback === "error" && "border-status-error bg-status-error/10 animate-shake"
        )}>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Scan className="h-5 w-5 text-muted-foreground" />
                  <label className="text-sm font-medium">
                    Scaneaza AWB:
                  </label>
                  {scanFeedback === "success" && (
                    <CheckCircle2 className="h-6 w-6 text-status-success animate-bounce" />
                  )}
                  {scanFeedback === "error" && (
                    <XCircle className="h-6 w-6 text-status-error" />
                  )}
                </div>
                <form onSubmit={handleScan} className="flex gap-2">
                  <Input
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => handleScanInputChange(e.target.value)}
                    placeholder="Asteapta scanare..."
                    className="text-xl font-mono h-14"
                    disabled={session?.status === "CLOSED" || scanMutation.isPending}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 px-6"
                    disabled={!scanInput.trim() || session?.status === "CLOSED" || scanMutation.isPending}
                  >
                    {scanMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Scan className="h-5 w-5" />
                    )}
                  </Button>
                </form>
                {lastScanResult && (
                  <p
                    className={cn(
                      "text-sm mt-2 font-medium",
                      lastScanResult.type === "error" ? "text-status-error" :
                      lastScanResult.type === "warning" ? "text-status-warning" : "text-status-success"
                    )}
                  >
                    {lastScanResult.message}
                  </p>
                )}
              </div>

              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-48 h-14">
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
                  <Button
                    variant="destructive"
                    size="lg"
                    className="h-14"
                    onClick={() => setFinalizeDialog(true)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Finalizeaza
                  </Button>
                )}
              </RequirePermission>
            </div>
          </CardContent>
        </Card>

        {/* Split Screen Layout */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Pending AWBs */}
            <Card className="border-status-warning/20">
              <CardHeader className="bg-status-warning/10 border-b border-status-warning/20">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-status-warning">
                    <Clock className="h-5 w-5" />
                    De scanat ({pendingAwbs.length})
                  </div>
                  <Badge variant="outline" className="text-status-warning border-status-warning/30">
                    AWB-uri generate azi, nepredete inca
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {pendingAwbs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 text-status-success mb-2" />
                      <p>Toate scanate!</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {pendingAwbs.map((awb) => (
                        <div
                          key={awb.id}
                          className={cn(
                            "p-3 hover:bg-muted/50 transition-colors",
                            awb.hasC0WithoutScan && "bg-status-warning/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-lg">{awb.awbNumber || "-"}</div>
                              <div className="text-sm text-muted-foreground">
                                #{awb.orderNumber} - {awb.storeName}
                              </div>
                            </div>
                            {awb.hasC0WithoutScan ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-status-warning text-status-warning"
                                onClick={() => setC0AlertDialog({ open: true, awb })}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                C0
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-status-warning">
                                <Clock className="h-3 w-3 mr-1" />
                                Asteapta
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-medium">{awb.recipientName}</span>
                            <span className="text-muted-foreground"> - {awb.recipientCity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right: Scanned AWBs */}
            <Card className="border-status-success/20">
              <CardHeader className="bg-status-success/10 border-b border-status-success/20">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-status-success">
                    <CheckCircle2 className="h-5 w-5" />
                    Scanate ({scannedAwbs.length})
                  </div>
                  <Badge variant="outline" className="text-status-success border-status-success/30">
                    AWB-uri predate in aceasta sesiune
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {scannedAwbs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mb-2" />
                      <p>Niciun AWB scanat inca</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {scannedAwbs.map((awb) => (
                        <div key={awb.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-lg">{awb.awbNumber || "-"}</div>
                              <div className="text-sm text-muted-foreground">
                                #{awb.orderNumber} - {awb.storeName}
                              </div>
                            </div>
                            <Badge className="bg-status-success/10 text-status-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {formatTime(awb.handedOverAt)}
                            </Badge>
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-medium">{awb.recipientName}</span>
                            <span className="text-muted-foreground"> - {awb.recipientCity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        {stats.totalPending > 0 && session?.status === "OPEN" && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <Info className="h-4 w-4 inline mr-1" />
                  {stats.totalPending} AWB-uri nepredate. La finalizare vor fi marcate automat ca &quot;Nepredat&quot;.
                </div>
                <div className="flex gap-2">
                  <Link href="/handover/not-handed">
                    <Button variant="outline" size="sm">
                      <List className="h-4 w-4 mr-2" />
                      Vezi toate nepredatele
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finalize Dialog */}
        <Dialog open={finalizeDialog} onOpenChange={setFinalizeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizeaza predarea?</DialogTitle>
              <DialogDescription>
                Toate AWB-urile nescanate ({stats.totalPending}) vor fi marcate ca NEPREDAT.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total AWB-uri:</span>
                <span className="font-bold">{stats.totalIssued}</span>
              </div>
              <div className="flex justify-between text-status-success">
                <span>Scanate:</span>
                <span className="font-bold">{stats.totalHandedOver}</span>
              </div>
              <div className="flex justify-between text-status-error">
                <span>Vor fi marcate NEPREDAT:</span>
                <span className="font-bold">{stats.totalPending}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFinalizeDialog(false)}>
                Anuleaza
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
                Finalizeaza
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
              <DialogTitle className="flex items-center gap-2 text-status-warning">
                <AlertTriangle className="h-5 w-5" />
                Confirmare automata de ridicare
              </DialogTitle>
            </DialogHeader>
            {c0AlertDialog.awb && (
              <>
                <div className="space-y-3">
                  <p>
                    AWB-ul <strong>{c0AlertDialog.awb.awbNumber}</strong> (Comanda{" "}
                    <strong>#{c0AlertDialog.awb.orderNumber}</strong>) a fost marcat ca
                    &quot;Ridicat&quot; de FanCourier, dar NU a fost scanat in sistem.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data ridicare FanCourier:{" "}
                    {c0AlertDialog.awb.c0ReceivedAt
                      ? new Date(c0AlertDialog.awb.c0ReceivedAt).toLocaleString("ro-RO")
                      : "-"}
                  </p>
                  <p className="font-medium">Ce doriti sa faceti?</p>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() =>
                      resolveC0Mutation.mutate({
                        awbId: c0AlertDialog.awb!.id,
                        action: "mark_handed",
                      })
                    }
                    disabled={resolveC0Mutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcheaza predat
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
                    Lasa nescanat (investigheaza)
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
