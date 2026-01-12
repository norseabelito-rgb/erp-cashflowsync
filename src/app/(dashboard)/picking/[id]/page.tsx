"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Printer,
  Barcode,
  MapPin,
  AlertCircle,
  Check,
  X,
  FileText,
  User,
  Plus,
  Minus,
  Beaker,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { formatDate } from "@/lib/utils";

interface PickingListItem {
  id: string;
  sku: string;
  barcode: string | null;
  title: string;
  variantTitle: string | null;
  imageUrl: string | null;
  location: string | null;
  quantityRequired: number;
  quantityPicked: number;
  isComplete: boolean;
  pickedAt: string | null;
  isRecipeParent?: boolean;
  parentItemId?: string | null;
}

interface PickingList {
  id: string;
  code: string;
  name: string | null;
  status: string;
  totalItems: number;
  totalQuantity: number;
  pickedQuantity: number;
  createdBy: string | null;
  createdByName: string | null;
  startedBy: string | null;
  startedByName: string | null;
  completedBy: string | null;
  completedByName: string | null;
  assignedTo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: PickingListItem[];
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
    isPrinted: boolean;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "În așteptare", color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS: { label: "În lucru", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Finalizat", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Anulat", color: "bg-gray-100 text-gray-800" },
};

export default function PickingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const id = params.id as string;
  
  const [scanInput, setScanInput] = useState("");
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    message: string;
    item?: PickingListItem;
  } | null>(null);
  const [completeDialog, setCompleteDialog] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // State pentru modal cantitate
  const [quantityModal, setQuantityModal] = useState<{
    open: boolean;
    item: PickingListItem | null;
    quantity: number;
  }>({ open: false, item: null, quantity: 1 });

  // Fetch picking list
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pickingList", id],
    queryFn: async () => {
      const res = await fetch(`/api/picking/${id}`);
      if (!res.ok) throw new Error("Picking list nu a fost găsit");
      return res.json();
    },
    refetchInterval: 5000, // Refresh la fiecare 5 secunde
  });

  const pickingList: PickingList | null = data?.pickingList || null;
  const progress = data?.progress || { percentComplete: 0, totalQuantity: 0, pickedQuantity: 0 };

  // Start picking mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "start",
          userId: session?.user?.id,
          userName: session?.user?.name || session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la preluare");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Picking preluat cu succes" });
      queryClient.invalidateQueries({ queryKey: ["pickingList", id] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Nu s-a putut prelua", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Scan mutation (pentru scanner)
  const scanMutation = useMutation({
    mutationFn: async (input: string) => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "scan",
          barcode: input,
          sku: input,
          quantity: 1,
          userId: session?.user?.id,
          userName: session?.user?.name || session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Eroare la scanare");
      }
      return data;
    },
    onSuccess: (data) => {
      setLastScanResult({
        success: true,
        message: data.message,
        item: data.item,
      });
      queryClient.invalidateQueries({ queryKey: ["pickingList", id] });
      setScanInput("");
      
      // Vibrație pentru feedback (dacă e disponibil)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    },
    onError: (error: any) => {
      setLastScanResult({
        success: false,
        message: error.message,
      });
      
      // Vibrație mai lungă pentru eroare
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    },
  });

  // Pick item mutation (pentru click manual cu cantitate)
  const pickItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "pickItem",
          itemId,
          quantity,
          userId: session?.user?.id,
          userName: session?.user?.name || session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Eroare la marcare");
      }
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Produs marcat", 
        description: `${data.item?.title}: ${data.item?.quantityPicked}/${data.item?.quantityRequired}` 
      });
      queryClient.invalidateQueries({ queryKey: ["pickingList", id] });
      setQuantityModal({ open: false, item: null, quantity: 1 });
      
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Eroare", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "complete",
          userId: session?.user?.id,
          userName: session?.user?.name || session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Picking list finalizat!" });
      queryClient.invalidateQueries({ queryKey: ["pickingList", id] });
      setCompleteDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Reset item mutation
  const resetItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/picking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetItem", itemId }),
      });
      if (!res.ok) throw new Error("Eroare la reset");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      queryClient.invalidateQueries({ queryKey: ["pickingList", id] });
    },
  });

  // Handle scan submit
  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    if (pickingList?.status !== "IN_PROGRESS") {
      toast({
        title: "Picking nu este în lucru",
        description: "Începe picking-ul pentru a putea scana.",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(scanInput.trim());
  };

  // Auto-submit după scanare (scanner-ul trimite rapid caracterele)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleScanInputChange = (value: string) => {
    setScanInput(value);
    
    // Clear previous timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Auto-submit după 100ms de la ultima tastă (scanner-ul e rapid)
    if (value.trim().length >= 5 && pickingList?.status === "IN_PROGRESS") {
      scanTimeoutRef.current = setTimeout(() => {
        scanMutation.mutate(value.trim());
        setScanInput("");
      }, 100);
    }
  };

  // Focus pe input când se încarcă pagina
  useEffect(() => {
    if (pickingList?.status === "IN_PROGRESS") {
      scanInputRef.current?.focus();
    }
  }, [pickingList?.status]);

  // Clear last scan result after 3 seconds
  useEffect(() => {
    if (lastScanResult) {
      const timer = setTimeout(() => setLastScanResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastScanResult]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!pickingList) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p>Picking list nu a fost găsit</p>
            <Link href="/picking">
              <Button className="mt-4">Înapoi la liste</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Produsele părinte (cu rețetă) sunt doar informative, nu se ridică direct
  const recipeParents = pickingList.items.filter((i) => i.isRecipeParent);
  // Produsele de ridicat sunt cele care NU sunt părinte
  const pickableItems = pickingList.items.filter((i) => !i.isRecipeParent);
  const incompleteItems = pickableItems.filter((i) => !i.isComplete);
  const completeItems = pickableItems.filter((i) => i.isComplete);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/picking">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{pickingList.code}</h1>
            {pickingList.name && (
              <p className="text-muted-foreground">{pickingList.name}</p>
            )}
          </div>
          <Badge className={statusConfig[pickingList.status]?.color}>
            {statusConfig[pickingList.status]?.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          {/* Butoanele PDF apar doar pentru picking finalizat */}
          {pickingList.status === "COMPLETED" && (
            <>
              <Button variant="outline" asChild>
                <a href={`/api/picking/${id}/print?preview=true`} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Previzualizare
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/picking/${id}/print`} download={`picking-${pickingList.code}.pdf`}>
                  <Printer className="h-4 w-4 mr-2" />
                  Descarcă PDF
                </a>
              </Button>
            </>
          )}
          
          {pickingList.status === "PENDING" && (
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Picking
            </Button>
          )}
          {pickingList.status === "IN_PROGRESS" && (
            <Button onClick={() => setCompleteDialog(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizează
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Progres picking</span>
            <span className="text-sm text-white">
              {progress.pickedQuantity} / {progress.totalQuantity} produse
            </span>
          </div>
          <Progress value={progress.percentComplete} className="h-3" />
          <div className="flex justify-between mt-2 text-sm">
            <span className="font-semibold text-white">{incompleteItems.length} rămase</span>
            <span className="font-bold text-lg text-white">{progress.percentComplete}%</span>
            <span className="text-green-400">{completeItems.length} completate</span>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Input - doar când picking-ul e în lucru */}
      {pickingList.status === "IN_PROGRESS" && (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <label className="text-sm text-slate-300 mb-2 block">
              🔍 Scanează produs (barcode sau SKU):
            </label>
            <form onSubmit={handleScan} className="flex gap-2">
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => handleScanInputChange(e.target.value)}
                placeholder="Așteaptă scanare..."
                className="flex-1 max-w-md text-lg font-mono bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                disabled={scanMutation.isPending}
                autoFocus
              />
              <Button
                type="submit"
                disabled={!scanInput.trim() || scanMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {scanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4" />
                )}
              </Button>
            </form>
            {lastScanResult && (
              <p
                className={`text-sm mt-2 ${
                  lastScanResult.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {lastScanResult.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info despre cine a creat/preluat/finalizat */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-100 border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-700" />
              <div>
                <p className="text-xs text-slate-600 font-medium">Creat de</p>
                <p className="font-semibold text-slate-900">{pickingList.createdByName || "-"}</p>
                <p className="text-xs text-slate-600">
                  {pickingList.createdAt ? formatDate(pickingList.createdAt) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={pickingList.startedByName ? "bg-blue-100 border-blue-400" : "bg-gray-50 border-gray-200"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className={`h-5 w-5 ${pickingList.startedByName ? "text-blue-700" : "text-gray-400"}`} />
              <div>
                <p className={`text-xs font-medium ${pickingList.startedByName ? "text-blue-700" : "text-gray-500"}`}>Preluat de</p>
                <p className={`font-semibold ${pickingList.startedByName ? "text-blue-900" : "text-gray-400"}`}>
                  {pickingList.startedByName || "Nepreluat încă"}
                </p>
                <p className={`text-xs ${pickingList.startedByName ? "text-blue-700" : "text-gray-400"}`}>
                  {pickingList.startedAt ? formatDate(pickingList.startedAt) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={pickingList.completedByName ? "bg-green-100 border-green-400" : "bg-gray-50 border-gray-200"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`h-5 w-5 ${pickingList.completedByName ? "text-green-700" : "text-gray-400"}`} />
              <div>
                <p className={`text-xs font-medium ${pickingList.completedByName ? "text-green-700" : "text-gray-500"}`}>Finalizat de</p>
                <p className={`font-semibold ${pickingList.completedByName ? "text-green-900" : "text-gray-400"}`}>
                  {pickingList.completedByName || "Nefinalizat"}
                </p>
                <p className={`text-xs ${pickingList.completedByName ? "text-green-700" : "text-gray-400"}`}>
                  {pickingList.completedAt ? formatDate(pickingList.completedAt) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produse compuse (informative) */}
      {recipeParents.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2 text-purple-700">
            <Beaker className="h-5 w-5" />
            Produse Compuse ({recipeParents.length})
          </h2>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-700 mb-3">
              Aceste produse au rețete. Componentele lor sunt listate mai jos la "Produse de ridicat".
            </p>
            <div className="space-y-2">
              {recipeParents.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border border-purple-100">
                  <div>
                    <p className="font-medium text-purple-900">{item.title}</p>
                    <p className="text-sm text-purple-600">{item.sku}</p>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {item.quantityRequired} buc
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products to pick */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produse de ridicat ({incompleteItems.length})
        </h2>
        
        {incompleteItems.length === 0 ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="flex items-center justify-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-600 mr-3" />
              <span className="text-lg font-medium text-green-800">
                Toate produsele au fost ridicate!
              </span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {incompleteItems.map((item) => (
              <Card 
                key={item.id} 
                className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-white"
                onClick={() => {
                  if (pickingList?.status === "IN_PROGRESS") {
                    const remaining = item.quantityRequired - item.quantityPicked;
                    setQuantityModal({ 
                      open: true, 
                      item, 
                      quantity: Math.min(1, remaining) 
                    });
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="bg-slate-800 rounded-lg px-3 py-2 inline-block">
                        <p className="font-semibold text-white text-base">{item.title}</p>
                        <p className="font-mono text-slate-300 text-sm">{item.sku}</p>
                      </div>
                      {item.variantTitle && (
                        <p className="text-sm text-gray-700 mt-1">{item.variantTitle}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        {item.barcode && (
                          <span className="text-gray-600">
                            <Barcode className="h-3 w-3 inline mr-1" />
                            {item.barcode}
                          </span>
                        )}
                        {item.location && (
                          <span className="text-blue-700 font-medium">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="text-2xl font-bold text-gray-900">
                          {item.quantityPicked} / {item.quantityRequired}
                        </div>
                        <Progress 
                          value={(item.quantityPicked / item.quantityRequired) * 100} 
                          className="w-24 h-2 mt-1"
                        />
                      </div>
                      {pickingList?.status === "IN_PROGRESS" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const remaining = item.quantityRequired - item.quantityPicked;
                            setQuantityModal({ 
                              open: true, 
                              item, 
                              quantity: Math.min(1, remaining) 
                            });
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed products */}
      {completeItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Completate ({completeItems.length})
          </h2>
          <div className="space-y-2">
            {completeItems.map((item) => (
              <Card key={item.id} className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-900">{item.title}</p>
                        <p className="text-sm text-green-700 font-mono">{item.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-800">
                        {item.quantityPicked} / {item.quantityRequired}
                      </span>
                      {pickingList.status === "IN_PROGRESS" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetItemMutation.mutate(item.id)}
                          disabled={resetItemMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AWBs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AWB-uri incluse ({pickingList.awbs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {pickingList.awbs.map((a) => (
              <Badge key={a.awb.id} variant="outline" className="py-2 px-3">
                <Truck className="h-3 w-3 mr-2" />
                <span className="font-mono">{a.awb.awbNumber || a.awb.order.shopifyOrderNumber}</span>
                {a.isPrinted && <Printer className="h-3 w-3 ml-2 text-green-600" />}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complete Dialog */}
      {/* Complete Dialog */}
      <AlertDialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizează picking list?</AlertDialogTitle>
            <AlertDialogDescription>
              {incompleteItems.length > 0 ? (
                <>
                  Mai sunt <strong>{incompleteItems.length} produse</strong> incomplete.
                  Nu poți finaliza până nu sunt toate produsele ridicate.
                </>
              ) : (
                "Toate produsele au fost ridicate. Finalizează picking list-ul."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || incompleteItems.length > 0}
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Finalizează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quantity Modal */}
      <Dialog 
        open={quantityModal.open} 
        onOpenChange={(open) => !open && setQuantityModal({ open: false, item: null, quantity: 1 })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Câte bucăți ai preluat?</DialogTitle>
            <DialogDescription>
              {quantityModal.item && (
                <span className="block mt-2">
                  <strong>{quantityModal.item.title}</strong>
                  {quantityModal.item.variantTitle && ` - ${quantityModal.item.variantTitle}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {quantityModal.item && (
            <div className="py-6">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantityModal(prev => ({
                    ...prev,
                    quantity: Math.max(1, prev.quantity - 1)
                  }))}
                  disabled={quantityModal.quantity <= 1}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                
                <div className="text-center">
                  <Input
                    type="number"
                    value={quantityModal.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const max = quantityModal.item!.quantityRequired - quantityModal.item!.quantityPicked;
                      setQuantityModal(prev => ({
                        ...prev,
                        quantity: Math.min(Math.max(1, val), max)
                      }));
                    }}
                    className="w-20 text-center text-2xl font-bold h-14"
                    min={1}
                    max={quantityModal.item.quantityRequired - quantityModal.item.quantityPicked}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    din {quantityModal.item.quantityRequired - quantityModal.item.quantityPicked} rămase
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantityModal(prev => ({
                    ...prev,
                    quantity: Math.min(
                      prev.quantity + 1, 
                      prev.item!.quantityRequired - prev.item!.quantityPicked
                    )
                  }))}
                  disabled={quantityModal.quantity >= (quantityModal.item.quantityRequired - quantityModal.item.quantityPicked)}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>

              {/* Quick buttons */}
              <div className="flex justify-center gap-2 mt-4">
                {[1, 5, 10].map(n => {
                  const max = quantityModal.item!.quantityRequired - quantityModal.item!.quantityPicked;
                  if (n > max) return null;
                  return (
                    <Button
                      key={n}
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuantityModal(prev => ({ ...prev, quantity: n }))}
                    >
                      {n}
                    </Button>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuantityModal(prev => ({ 
                    ...prev, 
                    quantity: prev.item!.quantityRequired - prev.item!.quantityPicked 
                  }))}
                >
                  Toate ({quantityModal.item.quantityRequired - quantityModal.item.quantityPicked})
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setQuantityModal({ open: false, item: null, quantity: 1 })}
            >
              Anulează
            </Button>
            <Button 
              onClick={() => {
                if (quantityModal.item) {
                  pickItemMutation.mutate({
                    itemId: quantityModal.item.id,
                    quantity: quantityModal.quantity,
                  });
                }
              }}
              disabled={pickItemMutation.isPending}
            >
              {pickItemMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
