"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PackageX,
  Scan,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  Clock,
  Link2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { RequirePermission } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface ScannedReturn {
  id: string;
  returnAwbNumber: string;
  status: string;
  scannedAt: string;
  scannedByName: string | null;
  notes: string | null;
  orderId: string | null;
  originalAwb: {
    awbNumber: string | null;
    order?: {
      id: string;
      shopifyOrderNumber: string;
      customerFirstName: string | null;
      customerLastName: string | null;
      totalPrice: number;
    } | null;
  } | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    totalPrice: number;
  } | null;
}

interface PendingReturn {
  id: string;
  awbNumber: string | null;
  currentStatus: string | null;
  updatedAt: string;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    shippingCity: string | null;
    totalPrice: number;
  } | null;
}

interface ReturnStats {
  totalScannedToday: number;
  totalUnmapped: number;
  totalPendingReturns: number;
}

interface ScanResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "warning";
  returnAwb?: {
    id: string;
    returnAwbNumber: string;
    originalAwbNumber: string | null;
    orderNumber: string | null;
    orderId: string | null;
    status: string;
  };
}

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [scanInput, setScanInput] = useState("");
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanFeedback, setScanFeedback] = useState<"idle" | "success" | "error" | "warning">("idle");
  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    returnAwb: ScannedReturn | null;
  }>({ open: false, returnAwb: null });
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch returns data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["returns"],
    queryFn: async () => {
      const res = await fetch("/api/returns");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const scannedReturns: ScannedReturn[] = data?.data?.scannedReturns || [];
  const pendingReturns: PendingReturn[] = data?.data?.pendingReturns || [];
  const stats: ReturnStats = data?.data?.stats || {
    totalScannedToday: 0,
    totalUnmapped: 0,
    totalPendingReturns: 0,
  };

  // Filter recent scans (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayScans = scannedReturns.filter(
    (r) => new Date(r.scannedAt) >= today
  );
  const unmappedReturns = scannedReturns.filter((r) => !r.orderId);

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (awbNumber: string) => {
      const res = await fetch("/api/returns/scan", {
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
        setScanFeedback(result.type === "warning" ? "warning" : "success");
        toast({
          title: result.type === "warning" ? "Atentie" : "Scanat",
          description: result.message,
        });
        queryClient.invalidateQueries({ queryKey: ["returns"] });
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
    onError: (error: Error) => {
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

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async ({ returnAwbId, orderId }: { returnAwbId: string; orderId: string }) => {
      const res = await fetch("/api/returns/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnAwbId, orderId }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      setLinkDialog({ open: false, returnAwb: null });
      if (result.success) {
        toast({ title: "Succes", description: result.message });
        queryClient.invalidateQueries({ queryKey: ["returns"] });
      } else {
        toast({
          title: "Eroare",
          description: result.message,
          variant: "destructive",
        });
      }
    },
  });

  // Handle scan input
  const handleScan = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!scanInput.trim()) return;
      scanMutation.mutate(scanInput.trim());
    },
    [scanInput, scanMutation]
  );

  // Auto-submit after scanning (scanner sends characters rapidly)
  const handleScanInputChange = useCallback(
    (value: string) => {
      setScanInput(value);

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      if (value.trim().length >= 5) {
        scanTimeoutRef.current = setTimeout(() => {
          scanMutation.mutate(value.trim());
        }, 100);
      }
    },
    [scanMutation]
  );

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ro-RO");
  };

  const todayStr = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <RequirePermission permission="handover.scan">
      <TooltipProvider>
        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <PackageX className="h-5 w-5 md:h-6 md:w-6" />
                Scanare Retururi
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">{todayStr}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-status-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scanate azi</p>
                    <p className="text-2xl font-bold">{stats.totalScannedToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-status-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nemapate</p>
                    <p className="text-2xl font-bold">{stats.totalUnmapped}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-status-info" />
                  <div>
                    <p className="text-sm text-muted-foreground">In retur</p>
                    <p className="text-2xl font-bold">{stats.totalPendingReturns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan Input with Visual Feedback */}
          <Card
            className={cn(
              "transition-all duration-300 border-2",
              scanFeedback === "success" && "border-status-success bg-status-success/10",
              scanFeedback === "warning" && "border-status-warning bg-status-warning/10",
              scanFeedback === "error" && "border-status-error bg-status-error/10 animate-shake"
            )}
          >
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="h-5 w-5 text-muted-foreground" />
                    <label className="text-sm font-medium">Scaneaza AWB de retur:</label>
                    {scanFeedback === "success" && (
                      <CheckCircle2 className="h-6 w-6 text-status-success animate-bounce" />
                    )}
                    {scanFeedback === "warning" && (
                      <AlertTriangle className="h-6 w-6 text-status-warning" />
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
                      placeholder="Asteapta scanare AWB retur..."
                      className="text-xl font-mono h-14"
                      disabled={scanMutation.isPending}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-6"
                      disabled={!scanInput.trim() || scanMutation.isPending}
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
                        lastScanResult.type === "error"
                          ? "text-status-error"
                          : lastScanResult.type === "warning"
                            ? "text-status-warning"
                            : "text-status-success"
                      )}
                    >
                      {lastScanResult.message}
                    </p>
                  )}
                </div>
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
              {/* Left: Scanned Returns */}
              <Card className="border-status-success/20">
                <CardHeader className="bg-status-success/10 border-b border-status-success/20">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-status-success">
                      <CheckCircle2 className="h-5 w-5" />
                      Scanate ({todayScans.length})
                    </div>
                    <Badge variant="outline" className="text-status-success border-status-success/30">
                      Retururi scanate azi
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {todayScans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mb-2" />
                        <p>Niciun retur scanat azi</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {todayScans.map((ret) => {
                          const orderInfo = ret.order || ret.originalAwb?.order;
                          const isMapped = !!ret.orderId;

                          return (
                            <div
                              key={ret.id}
                              className={cn(
                                "p-3 hover:bg-muted/50 transition-colors",
                                !isMapped && "bg-status-warning/10"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-mono font-bold text-lg">
                                    {ret.returnAwbNumber}
                                  </div>
                                  {orderInfo ? (
                                    <div className="text-sm text-muted-foreground">
                                      #{orderInfo.shopifyOrderNumber} -{" "}
                                      {orderInfo.customerFirstName} {orderInfo.customerLastName}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-status-warning">
                                      Comanda nemapata
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isMapped ? (
                                    <Badge className="bg-status-success/10 text-status-success">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Mapat
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-status-warning text-status-warning"
                                      onClick={() => setLinkDialog({ open: true, returnAwb: ret })}
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Mapeaza
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Scanat la {formatTime(ret.scannedAt)}{" "}
                                {ret.scannedByName && `de ${ret.scannedByName}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right: Pending Returns (AWBs in return status) */}
              <Card className="border-status-warning/20">
                <CardHeader className="bg-status-warning/10 border-b border-status-warning/20">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-status-warning">
                      <Clock className="h-5 w-5" />
                      In retur ({pendingReturns.length})
                    </div>
                    <Badge variant="outline" className="text-status-warning border-status-warning/30">
                      AWB-uri in asteptare retur fizic
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {pendingReturns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 text-status-success mb-2" />
                        <p>Niciun retur in asteptare</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {pendingReturns.map((awb) => (
                          <div key={awb.id} className="p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-mono font-bold text-lg">
                                  {awb.awbNumber || "-"}
                                </div>
                                {awb.order && (
                                  <div className="text-sm text-muted-foreground">
                                    #{awb.order.shopifyOrderNumber} -{" "}
                                    {awb.order.customerFirstName} {awb.order.customerLastName}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="text-status-warning">
                                {awb.currentStatus}
                              </Badge>
                            </div>
                            {awb.order?.shippingCity && (
                              <div className="text-sm mt-1 flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {awb.order.shippingCity}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              Status actualizat: {formatDate(awb.updatedAt)}
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

          {/* Unmapped Returns Section */}
          {unmappedReturns.length > 0 && (
            <Card className="border-status-warning">
              <CardHeader className="bg-status-warning/10">
                <CardTitle className="flex items-center gap-2 text-status-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Retururi nemapate ({unmappedReturns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Aceste retururi au fost scanate dar nu au fost asociate cu o comanda originala.
                  Selecteaza comanda pentru fiecare retur.
                </div>
                <div className="space-y-2">
                  {unmappedReturns.map((ret) => (
                    <div
                      key={ret.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-mono font-bold">{ret.returnAwbNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          Scanat pe {formatDate(ret.scannedAt)} la {formatTime(ret.scannedAt)}
                        </div>
                        {ret.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{ret.notes}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLinkDialog({ open: true, returnAwb: ret })}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Mapeaza la comanda
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Link Dialog */}
          <Dialog
            open={linkDialog.open}
            onOpenChange={(open) => setLinkDialog({ open, returnAwb: null })}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Mapeaza retur la comanda
                </DialogTitle>
                <DialogDescription>
                  Selecteaza comanda originala pentru AWB-ul de retur{" "}
                  <strong>{linkDialog.returnAwb?.returnAwbNumber}</strong>
                </DialogDescription>
              </DialogHeader>

              {pendingReturns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>Nu exista comenzi in status retur disponibile pentru mapare.</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {pendingReturns.map((awb) => (
                      <div
                        key={awb.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          if (linkDialog.returnAwb && awb.order) {
                            linkMutation.mutate({
                              returnAwbId: linkDialog.returnAwb.id,
                              orderId: awb.order.id,
                            });
                          }
                        }}
                      >
                        <div>
                          <div className="font-mono font-bold">{awb.awbNumber}</div>
                          {awb.order && (
                            <>
                              <div className="text-sm">
                                Comanda #{awb.order.shopifyOrderNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {awb.order.customerFirstName} {awb.order.customerLastName} -{" "}
                                {awb.order.shippingCity}
                              </div>
                              <div className="text-sm font-medium">
                                {Number(awb.order.totalPrice).toFixed(2)} RON
                              </div>
                            </>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={linkMutation.isPending || !awb.order}
                        >
                          {linkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 mr-2" />
                              Selecteaza
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLinkDialog({ open: false, returnAwb: null })}
                >
                  Anuleaza
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </RequirePermission>
  );
}
