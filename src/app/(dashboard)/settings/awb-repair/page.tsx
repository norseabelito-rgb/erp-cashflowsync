"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RefreshCw, CheckCircle2, AlertCircle, Search, Wrench, AlertTriangle, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface AWBItem {
  id: string;
  awbNumber: string;
  awbLength: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  possiblyTruncated: boolean;
}

interface RepairDetail {
  awbId: string;
  orderId: string;
  orderNumber: string;
  oldAwb: string;
  newAwb?: string;
  status: "repaired" | "skipped" | "error";
  message: string;
}

interface RepairResult {
  success: boolean;
  dryRun: boolean;
  checked: number;
  repaired: number;
  skipped: number;
  errors: number;
  details: RepairDetail[];
}

export default function AWBRepairPage() {
  const [selectedAwbs, setSelectedAwbs] = useState<string[]>([]);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [manualRepairAwb, setManualRepairAwb] = useState<AWBItem | null>(null);
  const [correctAwbNumber, setCorrectAwbNumber] = useState("");
  const [daysBack, setDaysBack] = useState(14); // Days of borderou data to fetch

  // Fetch AWB list
  const { data: awbData, isLoading, refetch } = useQuery({
    queryKey: ["awb-repair-list"],
    queryFn: async () => {
      const res = await fetch("/api/awb/repair/list?limit=100");
      return res.json();
    },
  });

  const awbs: AWBItem[] = awbData?.awbs || [];

  // Repair mutation
  const repairMutation = useMutation({
    mutationFn: async ({ awbIds, dryRun, skipTracking }: { awbIds: string[]; dryRun: boolean; skipTracking: boolean }) => {
      const res = await fetch("/api/awb/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbIds, dryRun, skipTracking }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRepairResult(data);
      if (data.success) {
        if (data.dryRun) {
          toast({
            title: "Dry Run complet",
            description: `${data.repaired} AWB-uri ar fi reparate din ${data.checked} verificate`,
          });
        } else {
          toast({
            title: "Reparare completa",
            description: `${data.repaired} AWB-uri reparate din ${data.checked} verificate`,
          });
          refetch();
        }
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut efectua repararea",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk repair mutation (smarter prefix matching)
  const bulkRepairMutation = useMutation({
    mutationFn: async ({ awbIds, dryRun, daysBack }: { awbIds: string[]; dryRun: boolean; daysBack: number }) => {
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch("/api/awb/repair/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbIds, dryRun, limit: awbIds.length || 100, startDate }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const repairedCount = data.dryRun ? data.matched : data.repaired;
        toast({
          title: data.dryRun ? "Bulk Dry Run complet" : "Bulk Repair complet",
          description: `${repairedCount} AWB-uri ${data.dryRun ? "ar fi" : "au fost"} reparate din ${data.checked} verificate. Map: ${data.prefixMapSize} prefixuri din ${data.bordeauxFetched} AWB-uri FanCourier.`,
        });
        // Convert to standard repair result format
        setRepairResult({
          success: true,
          dryRun: data.dryRun,
          checked: data.checked,
          repaired: repairedCount,
          skipped: data.alreadyCorrect,
          errors: data.noMatch + data.errors,
          details: data.details.map((d: any) => ({
            ...d,
            orderId: d.orderNumber,
            status: d.status === "already_correct" ? "skipped" : d.status === "no_match" ? "skipped" : d.status,
          })),
        });
        if (!data.dryRun) {
          refetch();
        }
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut efectua repararea",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual repair mutation
  const manualRepairMutation = useMutation({
    mutationFn: async ({ awbId, correctAwbNumber }: { awbId: string; correctAwbNumber: string }) => {
      const res = await fetch("/api/awb/repair/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbId, correctAwbNumber, dryRun: false }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "AWB reparat",
          description: `${data.oldAwb} → ${data.newAwb}`,
        });
        setManualRepairAwb(null);
        setCorrectAwbNumber("");
        refetch();
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut repara AWB-ul",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAwb = (awbId: string) => {
    setSelectedAwbs(prev =>
      prev.includes(awbId)
        ? prev.filter(id => id !== awbId)
        : [...prev, awbId]
    );
  };

  const clearSelection = () => {
    setSelectedAwbs([]);
    setRepairResult(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Reparare AWB-uri Truncate"
        description="Repara AWB-urile FanCourier care au fost salvate cu caractere lipsa din cauza unei probleme de precizie numerica"
      />

      {/* Info Card */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg h-fit">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Despre aceasta problema</h3>
              <p className="text-sm text-muted-foreground">
                AWB-urile FanCourier au fost salvate cu caractere lipsa la final din cauza unei probleme
                de precizie numerica in JavaScript. Aceasta pagina te ajuta sa repari AWB-urile existente
                prin interogarea API-ului FanCourier pentru a obtine numerele complete.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Reparare automata (Bulk):</strong> Selecteaza AWB-urile si numarul de zile, apoi apasa &quot;Bulk Dry Run&quot;.
                Sistemul va descarca toate AWB-urile din FanCourier pentru perioada selectata si va cauta
                AWB-uri care incep cu primele 13 caractere ale AWB-ului trunchiat. Incepe cu 7-14 zile pentru viteza.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Reparare manuala:</strong> Daca stii numarul AWB corect din portalul FanCourier, apasa butonul
                &quot;Manual&quot; de langa AWB pentru a-l introduce direct.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              AWB-uri pentru reparare
            </CardTitle>
            <CardDescription>
              {awbs.length} AWB-uri in baza de date - selecteaza-le si apasa Dry Run pentru verificare
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Reincarca
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAwbs(awbs.map(a => a.id))}
              disabled={awbs.length === 0}
            >
              Selecteaza toate ({awbs.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              disabled={selectedAwbs.length === 0}
            >
              Sterge selectia
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Label htmlFor="daysBack" className="text-sm whitespace-nowrap">Zile:</Label>
              <select
                id="daysBack"
                value={daysBack}
                onChange={(e) => setDaysBack(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={7}>7 zile</option>
                <option value={14}>14 zile</option>
                <option value={30}>30 zile</option>
                <option value={60}>60 zile</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => bulkRepairMutation.mutate({ awbIds: selectedAwbs, dryRun: true, daysBack })}
              disabled={selectedAwbs.length === 0 || bulkRepairMutation.isPending}
            >
              <Search className="h-4 w-4 mr-2" />
              {bulkRepairMutation.isPending ? "Se cauta..." : `Bulk Dry Run (${selectedAwbs.length})`}
            </Button>
            <Button
              variant="default"
              onClick={() => bulkRepairMutation.mutate({ awbIds: selectedAwbs, dryRun: false, daysBack })}
              disabled={selectedAwbs.length === 0 || bulkRepairMutation.isPending}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {bulkRepairMutation.isPending ? "Se repara..." : `Bulk Repara (${selectedAwbs.length})`}
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Se incarca AWB-urile...</p>
            </div>
          ) : awbs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>Nu exista AWB-uri cu numar valid in baza de date</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>AWB</TableHead>
                  <TableHead>Lungime</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awbs.map((awb) => (
                  <TableRow key={awb.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAwbs.includes(awb.id)}
                        onCheckedChange={() => toggleAwb(awb.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{awb.awbNumber}</TableCell>
                    <TableCell>
                      <Badge variant={awb.awbLength < 13 ? "destructive" : "secondary"}>
                        {awb.awbLength} chars
                      </Badge>
                    </TableCell>
                    <TableCell>{awb.orderNumber}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{awb.customerName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(awb.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setManualRepairAwb(awb);
                          setCorrectAwbNumber("");
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Manual
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {repairResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {repairResult.dryRun ? (
                <>
                  <Search className="h-5 w-5" />
                  Rezultat Dry Run
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Rezultat Reparare
                </>
              )}
            </CardTitle>
            <CardDescription>
              Verificate: {repairResult.checked} |
              Reparate: {repairResult.repaired} |
              Omise: {repairResult.skipped} |
              Erori: {repairResult.errors}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comanda</TableHead>
                  <TableHead>AWB Vechi</TableHead>
                  <TableHead>AWB Nou</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mesaj</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairResult.details.map((detail, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{detail.orderNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{detail.oldAwb}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {detail.newAwb || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          detail.status === "repaired" ? "default" :
                          detail.status === "error" ? "destructive" : "secondary"
                        }
                      >
                        {detail.status === "repaired" ? "Reparat" :
                         detail.status === "error" ? "Eroare" : "Omis"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {detail.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Repair Dialog */}
      <Dialog open={!!manualRepairAwb} onOpenChange={(open) => !open && setManualRepairAwb(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reparare manuala AWB</DialogTitle>
            <DialogDescription>
              Introdu numarul AWB corect din portalul FanCourier.
            </DialogDescription>
          </DialogHeader>
          {manualRepairAwb && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Comanda</Label>
                <div className="text-sm font-medium">{manualRepairAwb.orderNumber}</div>
              </div>
              <div className="space-y-2">
                <Label>AWB curent (trunchiat)</Label>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {manualRepairAwb.awbNumber}
                  <span className="text-muted-foreground ml-2">({manualRepairAwb.awbLength} chars)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="correctAwb">AWB corect (din FanCourier)</Label>
                <Input
                  id="correctAwb"
                  placeholder="ex: 7000121028926001F2491"
                  value={correctAwbNumber}
                  onChange={(e) => setCorrectAwbNumber(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Copiaza numarul AWB complet din portalul FanCourier
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualRepairAwb(null)}>
              Anuleaza
            </Button>
            <Button
              onClick={() => {
                if (manualRepairAwb && correctAwbNumber) {
                  manualRepairMutation.mutate({
                    awbId: manualRepairAwb.id,
                    correctAwbNumber,
                  });
                }
              }}
              disabled={!correctAwbNumber || manualRepairMutation.isPending}
            >
              {manualRepairMutation.isPending ? "Se repara..." : "Repara AWB"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
