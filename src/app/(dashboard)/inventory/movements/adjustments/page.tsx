"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Wrench,
  Package,
  TrendingUp,
  TrendingDown,
  Save,
  AlertTriangle,
  CheckCircle2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

type AdjustmentType = "ADJUSTMENT_PLUS" | "ADJUSTMENT_MINUS";

const COMMON_REASONS = {
  ADJUSTMENT_PLUS: [
    "Inventariere - surplus constatat",
    "Returnare marfă",
    "Corecție eroare înregistrare",
    "Stoc inițial",
    "Transfer primire",
    "Altul",
  ],
  ADJUSTMENT_MINUS: [
    "Inventariere - lipsă constatată",
    "Marfă deteriorată/expirată",
    "Corecție eroare înregistrare",
    "Pierdere/Furt",
    "Consum intern",
    "Transfer expediere",
    "Altul",
  ],
};

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("ADJUSTMENT_PLUS");
  const [quantity, setQuantity] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch inventory items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items-for-adjustment"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items?isComposite=false&isActive=true&limit=500");
      return res.json();
    },
  });

  // Fetch recent adjustments
  const { data: recentData } = useQuery({
    queryKey: ["recent-adjustments"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-items/stock-adjustment?limit=10");
      return res.json();
    },
  });

  // Adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      type: AdjustmentType;
      quantity: number;
      reason: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/inventory-items/stock-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
        queryClient.invalidateQueries({ queryKey: ["recent-adjustments"] });
        queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
        toast({
          title: "Succes",
          description: result.message,
        });
        // Reset form
        setSelectedItemId("");
        setQuantity("");
        setSelectedReason("");
        setCustomReason("");
        setNotes("");
      } else {
        toast({
          title: "Eroare",
          description: result.error,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la ajustarea stocului",
        variant: "destructive",
      });
    },
  });

  const items = itemsData?.data?.items || [];
  const recentAdjustments = recentData?.data?.movements || [];
  const selectedItem = items.find((i: any) => i.id === selectedItemId);

  const handleSubmit = () => {
    if (!selectedItemId) {
      toast({
        title: "Eroare",
        description: "Selectează un articol",
        variant: "destructive",
      });
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast({
        title: "Eroare",
        description: "Cantitatea trebuie să fie mai mare decât 0",
        variant: "destructive",
      });
      return;
    }

    const reason = selectedReason === "Altul" ? customReason : selectedReason;
    if (!reason) {
      toast({
        title: "Eroare",
        description: "Introdu un motiv pentru ajustare",
        variant: "destructive",
      });
      return;
    }

    // Check if adjustment would result in negative stock
    if (adjustmentType === "ADJUSTMENT_MINUS" && selectedItem) {
      const currentStock = Number(selectedItem.currentStock);
      if (qty > currentStock) {
        toast({
          title: "Eroare",
          description: `Cantitatea de scăzut (${qty}) depășește stocul curent (${currentStock})`,
          variant: "destructive",
        });
        return;
      }
    }

    adjustMutation.mutate({
      itemId: selectedItemId,
      type: adjustmentType,
      quantity: qty,
      reason,
      notes: notes || undefined,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Ajustări stoc
          </h1>
          <p className="text-muted-foreground">Corecții manuale pentru stocul din inventar</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Adjustment Type */}
          <Card>
            <CardHeader>
              <CardTitle>Tip ajustare</CardTitle>
              <CardDescription>Alege dacă adaugi sau scazi din stoc</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAdjustmentType("ADJUSTMENT_PLUS")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adjustmentType === "ADJUSTMENT_PLUS"
                      ? "border-status-success bg-status-success/10"
                      : "border-muted hover:border-status-success/50"
                  }`}
                >
                  <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${
                    adjustmentType === "ADJUSTMENT_PLUS" ? "text-status-success" : "text-muted-foreground"
                  }`} />
                  <p className={`font-medium ${
                    adjustmentType === "ADJUSTMENT_PLUS" ? "text-status-success" : ""
                  }`}>
                    Adăugare stoc
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Crește cantitatea
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentType("ADJUSTMENT_MINUS")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    adjustmentType === "ADJUSTMENT_MINUS"
                      ? "border-status-error bg-status-error/10"
                      : "border-muted hover:border-status-error/50"
                  }`}
                >
                  <TrendingDown className={`h-8 w-8 mx-auto mb-2 ${
                    adjustmentType === "ADJUSTMENT_MINUS" ? "text-status-error" : "text-muted-foreground"
                  }`} />
                  <p className={`font-medium ${
                    adjustmentType === "ADJUSTMENT_MINUS" ? "text-status-error" : ""
                  }`}>
                    Scădere stoc
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reduce cantitatea
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Articol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selectează articolul *</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Caută și selectează un articol" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{item.sku}</span>
                          <span>-</span>
                          <span>{item.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {Number(item.currentStock).toFixed(2)} {item.unit}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertTitle>{selectedItem.name}</AlertTitle>
                  <AlertDescription>
                    Stoc curent: <strong>{Number(selectedItem.currentStock).toFixed(3)} {selectedItem.unit}</strong>
                    {selectedItem.minStock && (
                      <span className="ml-2 text-muted-foreground">
                        (Minim: {Number(selectedItem.minStock).toFixed(3)})
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Cantitate *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="0.000"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="flex-1"
                  />
                  {selectedItem && (
                    <span className="text-muted-foreground">{selectedItem.unit}</span>
                  )}
                </div>
                {selectedItem && quantity && (
                  <p className="text-sm mt-1">
                    Stoc nou:{" "}
                    <strong className={adjustmentType === "ADJUSTMENT_PLUS" ? "text-status-success" : "text-status-error"}>
                      {(
                        Number(selectedItem.currentStock) +
                        (adjustmentType === "ADJUSTMENT_PLUS" ? 1 : -1) * parseFloat(quantity || "0")
                      ).toFixed(3)}{" "}
                      {selectedItem.unit}
                    </strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardHeader>
              <CardTitle>Motiv ajustare</CardTitle>
              <CardDescription>Documentează motivul pentru audit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Motiv *</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează motivul" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_REASONS[adjustmentType].map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedReason === "Altul" && (
                <div>
                  <Label>Specifică motivul *</Label>
                  <Input
                    placeholder="Introdu motivul ajustării"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Note suplimentare</Label>
                <Textarea
                  placeholder="Detalii adiționale (opțional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning for negative adjustment */}
          {adjustmentType === "ADJUSTMENT_MINUS" && selectedItem && quantity && (
            parseFloat(quantity) > Number(selectedItem.currentStock) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenție</AlertTitle>
                <AlertDescription>
                  Cantitatea de scăzut ({quantity}) depășește stocul curent ({Number(selectedItem.currentStock).toFixed(3)}).
                  Stocul nu poate deveni negativ.
                </AlertDescription>
              </Alert>
            )
          )}

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={adjustMutation.isPending}
          >
            {adjustMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Se procesează...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvează ajustarea
              </>
            )}
          </Button>
        </div>

        {/* Recent Adjustments Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Ajustări recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAdjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nu există ajustări recente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAdjustments
                    .filter((m: any) => m.type.startsWith("ADJUSTMENT"))
                    .slice(0, 5)
                    .map((movement: any) => (
                      <div key={movement.id} className="border-b pb-2 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate flex-1">
                            {movement.item?.name}
                          </p>
                          <Badge
                            variant={movement.type === "ADJUSTMENT_PLUS" ? "success" : "destructive"}
                            className="ml-2"
                          >
                            {Number(movement.quantity) > 0 ? "+" : ""}
                            {Number(movement.quantity).toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </p>
                        {movement.reason && (
                          <p className="text-xs text-muted-foreground truncate">
                            {movement.reason}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4"
                onClick={() => router.push("/inventory/movements")}
              >
                Vezi tot istoricul
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
