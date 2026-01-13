"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Settings2,
  Monitor,
  History,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

interface PrinterData {
  id: string;
  name: string;
  appToken: string;
  printerToken: string;
  paperSize: string;
  orientation: string;
  copies: number;
  autoPrint: boolean;
  outputFormat: string;
  isConnected: boolean;
  lastSeenAt: string | null;
  lastError: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { printJobs: number };
}

interface PrintJob {
  id: string;
  documentType: string;
  documentNumber: string | null;
  orderNumber: string | null;
  status: string;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  completedAt: string | null;
  printer: { id: string; name: string };
}

const PAPER_SIZES = [
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "A6", label: "A6 (105 × 148 mm) - AWB" },
  { value: "10x15", label: "10 × 15 cm" },
];

export default function PrintersPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [historyPrinterId, setHistoryPrinterId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    paperSize: "A6",
    orientation: "portrait",
    copies: 1,
    autoPrint: true,
    outputFormat: "PDF",
  });

  // Fetch printers
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["printers"],
    queryFn: async () => {
      const res = await fetch("/api/printers");
      if (!res.ok) throw new Error("Eroare la încărcarea imprimantelor");
      return res.json();
    },
    refetchInterval: 30000, // Refresh la fiecare 30 secunde
  });

  const printers: PrinterData[] = data?.printers || [];

  // Fetch print jobs history for selected printer
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["print-jobs", historyPrinterId],
    queryFn: async () => {
      if (!historyPrinterId) return { printJobs: [] };
      const res = await fetch(`/api/print-jobs?printerId=${historyPrinterId}&limit=50`);
      if (!res.ok) throw new Error("Eroare la încărcarea istoricului");
      return res.json();
    },
    enabled: !!historyPrinterId,
  });

  const printJobs: PrintJob[] = historyData?.printJobs || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast({ title: "Imprimantă adăugată" });
      setIsCreateOpen(false);
      resetForm();
      // Arată tokenurile pentru noua imprimantă
      setEditingPrinter(result.printer);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PrinterData> & { id: string }) => {
      const res = await fetch("/api/printers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast({ title: "Imprimantă actualizată" });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/printers?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      toast({ title: "Imprimantă ștearsă" });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      paperSize: "A6",
      orientation: "portrait",
      copies: 1,
      autoPrint: true,
      outputFormat: "pdf",
    });
  };

  const copyToken = (token: string, type: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(type);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Token copiat" });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imprimante</h1>
          <p className="text-muted-foreground">
            Configurează imprimantele pentru printare automată AWB
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Imprimantă
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Monitor className="h-4 w-4" />
        <AlertDescription>
          Pentru a printa automat, instalează <strong>Cash Flow Print Client</strong> pe calculatorul 
          conectat la imprimantă și configurează-l cu tokenurile de mai jos.
        </AlertDescription>
      </Alert>

      {/* Printers Grid */}
      {printers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Printer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nicio imprimantă configurată</h3>
            <p className="text-muted-foreground mb-4">
              Adaugă o imprimantă pentru a activa printarea automată a AWB-urilor
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adaugă Prima Imprimantă
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {printers.map((printer) => (
            <Card key={printer.id} className={!printer.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${printer.isConnected ? "bg-status-success/10" : "bg-muted"}`}>
                      <Printer className={`h-5 w-5 ${printer.isConnected ? "text-status-success" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {printer.name}
                        {printer.isConnected ? (
                          <Badge className="bg-status-success">
                            <Wifi className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {printer.lastSeenAt
                          ? `Văzut ${formatDistanceToNow(new Date(printer.lastSeenAt), { addSuffix: true, locale: ro })}`
                          : "Niciodată conectat"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={printer.isActive}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: printer.id, isActive: checked })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Setări */}
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Hârtie</p>
                    <p className="font-medium">{printer.paperSize}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Orientare</p>
                    <p className="font-medium capitalize">{printer.orientation}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Copii</p>
                    <p className="font-medium">{printer.copies}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground text-xs">Format</p>
                    <p className="font-medium">{printer.outputFormat || 'PDF'}</p>
                  </div>
                </div>

                {/* Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">App Token</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowTokens({ ...showTokens, [`app-${printer.id}`]: !showTokens[`app-${printer.id}`] })}
                      >
                        {showTokens[`app-${printer.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToken(printer.appToken, `app-${printer.id}`)}
                      >
                        {copiedToken === `app-${printer.id}` ? <Check className="h-3 w-3 text-status-success" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <code className="block p-2 rounded bg-muted text-xs font-mono break-all">
                    {showTokens[`app-${printer.id}`] ? printer.appToken : "••••••••••••••••••••••••••••••••"}
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Printer Token</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowTokens({ ...showTokens, [`printer-${printer.id}`]: !showTokens[`printer-${printer.id}`] })}
                      >
                        {showTokens[`printer-${printer.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToken(printer.printerToken, `printer-${printer.id}`)}
                      >
                        {copiedToken === `printer-${printer.id}` ? <Check className="h-3 w-3 text-status-success" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <code className="block p-2 rounded bg-muted text-xs font-mono break-all">
                    {showTokens[`printer-${printer.id}`] ? printer.printerToken : "••••••••••••••••••••••••••••••••"}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingPrinter(printer)}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Setări
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(printer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPrinterId(printer.id)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Istoric
                  </Button>
                </div>

                {/* Stats */}
                <p className="text-xs text-muted-foreground text-center">
                  {printer._count.printJobs} joburi procesate
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă Imprimantă</DialogTitle>
            <DialogDescription>
              Configurează o nouă imprimantă pentru printare AWB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nume imprimantă</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Imprimantă Depozit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dimensiune hârtie</Label>
                <Select
                  value={formData.paperSize}
                  onValueChange={(v) => setFormData({ ...formData, paperSize: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientare</Label>
                <Select
                  value={formData.orientation}
                  onValueChange={(v) => setFormData({ ...formData, orientation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Număr de copii</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={formData.copies}
                onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Format ieșire</Label>
              <Select
                value={formData.outputFormat}
                onValueChange={(v) => setFormData({ ...formData, outputFormat: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF (imprimante normale)</SelectItem>
                  <SelectItem value="ZPL">ZPL (imprimante termice Zebra)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pentru imprimante Zebra/TSC selectează ZPL pentru dimensiuni corecte
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Printare automată</p>
                <p className="text-sm text-muted-foreground">
                  Printează automat AWB-urile la emitere
                </p>
              </div>
              <Switch
                checked={formData.autoPrint}
                onCheckedChange={(v) => setFormData({ ...formData, autoPrint: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adaugă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPrinter} onOpenChange={() => setEditingPrinter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setări Imprimantă</DialogTitle>
            <DialogDescription>
              Modifică setările pentru {editingPrinter?.name}
            </DialogDescription>
          </DialogHeader>
          {editingPrinter && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nume imprimantă</Label>
                <Input
                  value={editingPrinter.name}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dimensiune hârtie</Label>
                  <Select
                    value={editingPrinter.paperSize}
                    onValueChange={(v) => setEditingPrinter({ ...editingPrinter, paperSize: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientare</Label>
                  <Select
                    value={editingPrinter.orientation}
                    onValueChange={(v) => setEditingPrinter({ ...editingPrinter, orientation: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Număr de copii</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={editingPrinter.copies}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, copies: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Format ieșire</Label>
                <Select
                  value={editingPrinter.outputFormat || "PDF"}
                  onValueChange={(v) => setEditingPrinter({ ...editingPrinter, outputFormat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF (imprimante normale)</SelectItem>
                    <SelectItem value="ZPL">ZPL (imprimante termice Zebra)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pentru imprimante Zebra/TSC selectează ZPL pentru dimensiuni corecte
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Printare automată</p>
                  <p className="text-sm text-muted-foreground">
                    Printează automat AWB-urile la emitere
                  </p>
                </div>
                <Switch
                  checked={editingPrinter.autoPrint}
                  onCheckedChange={(v) => setEditingPrinter({ ...editingPrinter, autoPrint: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrinter(null)}>
              Anulează
            </Button>
            <Button
              onClick={() => {
                if (editingPrinter) {
                  updateMutation.mutate({
                    id: editingPrinter.id,
                    name: editingPrinter.name,
                    paperSize: editingPrinter.paperSize,
                    orientation: editingPrinter.orientation,
                    copies: editingPrinter.copies,
                    autoPrint: editingPrinter.autoPrint,
                    outputFormat: editingPrinter.outputFormat,
                  });
                  setEditingPrinter(null);
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi imprimanta?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Toate joburile de printare asociate vor fi de asemenea șterse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Dialog */}
      <Dialog open={!!historyPrinterId} onOpenChange={() => setHistoryPrinterId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Istoric Printare
            </DialogTitle>
            <DialogDescription>
              {printers.find(p => p.id === historyPrinterId)?.name} - Ultimele 50 de joburi
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : printJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Niciun job de printare pentru această imprimantă</p>
              </div>
            ) : (
              <div className="space-y-2">
                {printJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-3 rounded-lg border ${
                      job.status === 'COMPLETED' ? 'bg-status-success/10 border-status-success/30' :
                      job.status === 'FAILED' ? 'bg-status-error/10 border-status-error/30' :
                      job.status === 'PRINTING' ? 'bg-status-info/10 border-status-info/30' :
                      job.status === 'PENDING' ? 'bg-status-warning/10 border-status-warning/30' :
                      'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {job.status === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-status-success" />}
                        {job.status === 'FAILED' && <XCircle className="h-5 w-5 text-status-error" />}
                        {job.status === 'PRINTING' && <Loader2 className="h-5 w-5 text-status-info animate-spin" />}
                        {job.status === 'PENDING' && <Clock className="h-5 w-5 text-status-warning" />}
                        {job.status === 'CANCELLED' && <AlertCircle className="h-5 w-5 text-gray-500" />}
                        
                        <div>
                          <p className="font-medium">
                            {job.documentType === 'awb' ? 'AWB' : job.documentType === 'picking' ? 'Picking List' : job.documentType}
                            {job.documentNumber && `: ${job.documentNumber}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {job.orderNumber && `Comandă: ${job.orderNumber} • `}
                            {new Date(job.createdAt).toLocaleString('ro-RO')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge
                          variant={
                            job.status === 'COMPLETED' ? 'default' :
                            job.status === 'FAILED' ? 'destructive' :
                            job.status === 'PRINTING' ? 'default' :
                            'secondary'
                          }
                          className={
                            job.status === 'COMPLETED' ? 'bg-status-success' :
                            job.status === 'PRINTING' ? 'bg-status-info' :
                            ''
                          }
                        >
                          {job.status === 'COMPLETED' && 'Printat'}
                          {job.status === 'FAILED' && 'Eșuat'}
                          {job.status === 'PRINTING' && 'Se printează'}
                          {job.status === 'PENDING' && 'În așteptare'}
                          {job.status === 'CANCELLED' && 'Anulat'}
                        </Badge>
                        {job.attempts > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Încercări: {job.attempts}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {job.status === 'FAILED' && job.errorMessage && (
                      <div className="mt-2 p-2 bg-status-error/10 rounded text-sm text-status-error">
                        <strong>Eroare:</strong> {job.errorMessage}
                      </div>
                    )}
                    
                    {job.completedAt && job.status === 'COMPLETED' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Finalizat: {new Date(job.completedAt).toLocaleString('ro-RO')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryPrinterId(null)}>
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
