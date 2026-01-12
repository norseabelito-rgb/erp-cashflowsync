"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Package,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Filter,
  Eye,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { formatDate, formatCurrency } from "@/lib/utils";

interface AWB {
  id: string;
  awbNumber: string | null;
  currentStatus: string;
  createdAt: string;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    shippingCity: string | null;
    totalPrice: string;
    currency: string;
    lineItems: Array<{
      id: string;
      sku: string | null;
      title: string;
      quantity: number;
    }>;
  };
}

interface AggregatedProduct {
  sku: string;
  barcode: string | null;
  title: string;
  variantTitle: string | null;
  quantity: number;
  imageUrl: string | null;
  location: string | null;
  awbCount: number;
}

export default function CreatePickingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [selectedAwbs, setSelectedAwbs] = useState<Set<string>>(new Set());
  const [pickingName, setPickingName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch AWBs (doar cele care nu sunt livrate/anulate)
  const { data: awbsData, isLoading: awbsLoading } = useQuery({
    queryKey: ["awbs-for-picking", searchQuery, skuFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("showAll", "false"); // Exclude livrări și anulate
      params.set("noPagination", "true");
      if (searchQuery) params.set("search", searchQuery);
      if (skuFilter) params.set("containsSku", skuFilter);
      
      const res = await fetch(`/api/awb?${params}`);
      return res.json();
    },
  });

  const awbs: AWB[] = awbsData?.awbs || [];

  // Aggregate products mutation (pentru preview)
  const aggregateMutation = useMutation({
    mutationFn: async (awbIds: string[]) => {
      const res = await fetch("/api/picking/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbIds }),
      });
      if (!res.ok) throw new Error("Eroare la agregare");
      return res.json();
    },
  });

  // Create picking list mutation
  const createMutation = useMutation({
    mutationFn: async (data: { awbIds: string[]; name?: string }) => {
      const res = await fetch("/api/picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la creare");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Picking list creat", 
        description: data.message 
      });
      router.push(`/picking/${data.pickingList.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Eroare", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const toggleAwb = (id: string) => {
    const newSelected = new Set(selectedAwbs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAwbs(newSelected);
  };

  const toggleAll = () => {
    if (selectedAwbs.size === awbs.length) {
      setSelectedAwbs(new Set());
    } else {
      setSelectedAwbs(new Set(awbs.map((a) => a.id)));
    }
  };

  const handlePreview = async () => {
    if (selectedAwbs.size === 0) {
      toast({ title: "Selectează cel puțin un AWB", variant: "destructive" });
      return;
    }
    await aggregateMutation.mutateAsync(Array.from(selectedAwbs));
    setPreviewOpen(true);
  };

  const handleCreate = () => {
    if (selectedAwbs.size === 0) {
      toast({ title: "Selectează cel puțin un AWB", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      awbIds: Array.from(selectedAwbs),
      name: pickingName || undefined,
    });
  };

  const aggregatedProducts: AggregatedProduct[] = aggregateMutation.data?.products || [];
  const aggregateStats = aggregateMutation.data?.stats;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/picking">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Înapoi
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Creare Picking List</h1>
          <p className="text-muted-foreground">
            Selectează AWB-urile pentru care vrei să creezi un picking list
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Caută AWB / Comandă / Client</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Caută..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Filtrează după SKU produs</Label>
              <Input
                placeholder="Ex: SKU-001"
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nume picking list (opțional)</Label>
              <Input
                placeholder="Ex: Lot dimineață"
                value={pickingName}
                onChange={(e) => setPickingName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection info */}
      <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={selectedAwbs.size === awbs.length && awbs.length > 0}
            onCheckedChange={toggleAll}
            id="select-all"
          />
          <Label htmlFor="select-all" className="cursor-pointer">
            {selectedAwbs.size === 0
              ? "Selectează toate"
              : `${selectedAwbs.size} din ${awbs.length} selectate`}
          </Label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={selectedAwbs.size === 0 || aggregateMutation.isPending}
          >
            {aggregateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview Produse
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedAwbs.size === 0 || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ClipboardList className="h-4 w-4 mr-2" />
            )}
            Creează Picking List
          </Button>
        </div>
      </div>

      {/* AWBs list */}
      {awbsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : awbs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nu există AWB-uri disponibile</p>
            <p className="text-sm text-muted-foreground">
              (sunt excluse cele livrate, anulate sau șterse)
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {awbs.map((awb) => (
            <Card
              key={awb.id}
              className={`cursor-pointer transition-all ${
                selectedAwbs.has(awb.id)
                  ? "border-primary bg-primary/5"
                  : "hover:border-gray-300"
              }`}
              onClick={() => toggleAwb(awb.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedAwbs.has(awb.id)}
                    onCheckedChange={() => toggleAwb(awb.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-mono font-bold">
                        {awb.awbNumber || "Fără AWB"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {awb.order.shopifyOrderNumber}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {[awb.order.customerFirstName, awb.order.customerLastName]
                          .filter(Boolean)
                          .join(" ") || "Client"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {awb.order.shippingCity || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">
                        {awb.order.lineItems.length} produs(e)
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {awb.order.lineItems.slice(0, 2).map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.sku || item.title.substring(0, 15)}
                          </Badge>
                        ))}
                        {awb.order.lineItems.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{awb.order.lineItems.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(parseFloat(awb.order.totalPrice), awb.order.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(awb.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Preview Picking List
            </DialogTitle>
            <DialogDescription>
              Produse agregate din {selectedAwbs.size} AWB-uri selectate
            </DialogDescription>
          </DialogHeader>

          {aggregateStats && (
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{aggregateStats.totalProducts}</p>
                <p className="text-sm text-muted-foreground">Produse unice</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{aggregateStats.totalQuantity}</p>
                <p className="text-sm text-muted-foreground">Total bucăți</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{aggregateStats.productsWithBarcode}</p>
                <p className="text-sm text-muted-foreground">Cu barcode</p>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {aggregatedProducts.map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{product.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                    {product.barcode && (
                      <>
                        <span>•</span>
                        <span>Barcode: {product.barcode}</span>
                      </>
                    )}
                    {product.location && (
                      <>
                        <span>•</span>
                        <span>📍 {product.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{product.quantity}</p>
                  <p className="text-xs text-muted-foreground">
                    în {product.awbCount} AWB-uri
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Închide
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ClipboardList className="h-4 w-4 mr-2" />
              )}
              Creează Picking List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
