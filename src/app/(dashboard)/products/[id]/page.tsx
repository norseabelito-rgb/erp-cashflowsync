"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/hooks/use-toast";
import { formatDate, getDriveImageUrl } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  type: string;
  store?: { shopifyDomain: string };
}

interface ProductChannel {
  id: string;
  channelId: string;
  isPublished: boolean;
  isActive: boolean;
  overrides: Record<string, any>;
  lastSyncedAt?: string;
  syncTag?: string;
  channel: Channel;
}

interface Product {
  id: string;
  sku: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  tags: string[];
  stock: number;
  isActive: boolean;
  categoryId?: string;
  category?: { id: string; name: string };
  driveFolderUrl?: string;
  images: { id: string; url: string; position: number }[];
  channels: ProductChannel[];
  createdAt: string;
}

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("master");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    tags: "",
    categoryId: "",
    driveFolderUrl: "",
    isActive: true,
  });

  const [propagateDialogOpen, setPropagateDialogOpen] = useState(false);
  const [channelsWithOverrides, setChannelsWithOverrides] = useState<string[]>([]);
  const [addingChannelId, setAddingChannelId] = useState<string | null>(null);
  const [removeChannelDialogOpen, setRemoveChannelDialogOpen] = useState(false);
  const [channelToRemove, setChannelToRemove] = useState<{ channelId: string; channelName: string } | null>(null);

  // Fetch product
  const { data: productData, isLoading, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      return res.json();
    },
    enabled: !!productId,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  useEffect(() => {
    if (productData?.product) {
      const p = productData.product;
      setFormData({
        title: p.title || "",
        description: p.description || "",
        price: String(p.price) || "",
        compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
        tags: (p.tags || []).join(", "),
        categoryId: p.categoryId || "",
        driveFolderUrl: p.driveFolderUrl || "",
        isActive: p.isActive !== false,
      });
    }
  }, [productData]);

  // Save master mutation
  const saveMasterMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, ...data }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const product = productData?.product;
        const channelsWithOv = product?.channels
          ?.filter((pc: ProductChannel) => Object.keys(pc.overrides || {}).length > 0)
          .map((pc: ProductChannel) => pc.channelId) || [];

        if (channelsWithOv.length > 0) {
          setChannelsWithOverrides(channelsWithOv);
          setPropagateDialogOpen(true);
        } else {
          queryClient.invalidateQueries({ queryKey: ["product", productId] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          toast({ title: "Produs salvat" });
        }
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (data: { channelId: string; updates: any }) => {
      const res = await fetch(`/api/products/${productId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: data.channelId, ...data.updates }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["product", productId] });
        toast({ title: "Canal actualizat" });
      }
    },
  });

  // Add channel mutation
  const addChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      setAddingChannelId(channelId);
      const res = await fetch(`/api/products/${productId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, isPublished: true, isActive: true }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAddingChannelId(null);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["product", productId] });
        toast({ title: "Canal adăugat", description: data.message });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      setAddingChannelId(null);
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Remove channel mutation
  const removeChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch(`/api/products/${productId}/channels?channelId=${channelId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast({ title: "Canal eliminat" });
    },
  });

  // Reset overrides mutation
  const resetOverridesMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await fetch(`/api/products/${productId}/channels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, resetAll: true }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast({ title: "Override-uri resetate" });
    },
  });

  const handleSaveMaster = () => {
    saveMasterMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      price: parseFloat(formData.price) || 0,
      compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      categoryId: formData.categoryId || undefined,
      driveFolderUrl: formData.driveFolderUrl || undefined,
      isActive: formData.isActive,
    });
  };

  const handleSaveChannelOverride = (channelId: string, field: string, value: any) => {
    const pc = product?.channels?.find(c => c.channelId === channelId);
    const currentOverrides = pc?.overrides || {};
    const newOverrides = { ...currentOverrides, [field]: value };

    if (product && (product as any)[field] === value) {
      delete newOverrides[field];
    }

    updateChannelMutation.mutate({
      channelId,
      updates: { overrides: newOverrides },
    });
  };

  const handlePropagateToChannels = (channelIds: string[]) => {
    channelIds.forEach(channelId => resetOverridesMutation.mutate(channelId));
    setPropagateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["product", productId] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Modificări propagate" });
  };

  const product: Product | null = productData?.product || null;
  const allChannels: Channel[] = productData?.allChannels || [];
  const categories = categoriesData?.categories || [];
  const availableChannels = allChannels.filter(
    ch => !product?.channels?.find(pc => pc.channelId === ch.id)
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Produsul nu a fost găsit</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <Badge variant="secondary" className="font-mono">{product.sku}</Badge>
            </div>
            <p className="text-muted-foreground">Stoc: {product.stock}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reîncarcă
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="master">Master</TabsTrigger>
          {product.channels?.map((pc) => (
            <TabsTrigger key={pc.channelId} value={pc.channelId} className="gap-2">
              {pc.channel.name}
              {Object.keys(pc.overrides || {}).length > 0 && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger value="add-channel" className="text-muted-foreground">
            <Plus className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* TAB: Master */}
        <TabsContent value="master" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informații Produs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>SKU (read-only)</Label>
                    <Input value={product.sku} disabled className="bg-muted" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Titlu *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descriere</Label>
                    <Textarea
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Preț (RON) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Preț comparat</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.compareAtPrice}
                        onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tag-uri</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="tag1, tag2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categorie</Label>
                    <Select
                      value={formData.categoryId || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Fără categorie</SelectItem>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Google Drive URL</Label>
                    <Input
                      value={formData.driveFolderUrl}
                      onChange={(e) => setFormData({ ...formData, driveFolderUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label>Produs activ</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Imagini
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {product.images?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {product.images.map((img, idx) => (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img src={getDriveImageUrl(img.url)} alt="" className="object-cover w-full h-full" />
                          {idx === 0 && <Badge className="absolute top-1 left-1 text-xs">Principal</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nu există imagini</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Canale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {product.channels?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nu e pe niciun canal</p>
                    ) : (
                      product.channels?.map((pc) => (
                        <div key={pc.channelId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pc.isPublished && pc.isActive ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : pc.isPublished ? (
                              <MinusCircle className="h-4 w-4 text-blue-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm">{pc.channel.name}</span>
                          </div>
                          {Object.keys(pc.overrides || {}).length > 0 && (
                            <Badge variant="warning" className="text-xs">Override</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg" onClick={handleSaveMaster} disabled={saveMasterMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMasterMutation.isPending ? "Se salvează..." : "Salvează Master"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Channel */}
        {product.channels?.map((pc) => (
          <TabsContent key={pc.channelId} value={pc.channelId} className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{pc.channel.name}</CardTitle>
                  <CardDescription>
                    {pc.lastSyncedAt ? `Sincronizat: ${formatDate(pc.lastSyncedAt)}` : "Nesincronizat"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {Object.keys(pc.overrides || {}).length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => resetOverridesMutation.mutate(pc.channelId)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset la Master
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => {
                    setChannelToRemove({ channelId: pc.channelId, channelName: pc.channel.name });
                    setRemoveChannelDialogOpen(true);
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimină
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={pc.isPublished}
                      onCheckedChange={(checked) => updateChannelMutation.mutate({ channelId: pc.channelId, updates: { isPublished: checked } })}
                    />
                    <Label>Publicat</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={pc.isActive}
                      onCheckedChange={(checked) => updateChannelMutation.mutate({ channelId: pc.channelId, updates: { isActive: checked } })}
                    />
                    <Label>Sync activ</Label>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">Override-uri ({Object.keys(pc.overrides || {}).length})</h4>
                  
                  <OverrideField
                    label="Titlu"
                    masterValue={product.title}
                    overrideValue={(pc.overrides as any)?.title}
                    onSave={(v) => handleSaveChannelOverride(pc.channelId, "title", v)}
                  />
                  <OverrideField
                    label="Preț"
                    masterValue={String(product.price)}
                    overrideValue={(pc.overrides as any)?.price !== undefined ? String((pc.overrides as any).price) : undefined}
                    onSave={(v) => handleSaveChannelOverride(pc.channelId, "price", parseFloat(v))}
                    type="number"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* TAB: Add Channel */}
        <TabsContent value="add-channel">
          <Card>
            <CardHeader>
              <CardTitle>Adaugă pe canal</CardTitle>
            </CardHeader>
            <CardContent>
              {availableChannels.length === 0 ? (
                <p className="text-muted-foreground">Pe toate canalele</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableChannels.map((ch) => {
                    const isLoading = addingChannelId === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => addChannelMutation.mutate(ch.id)}
                        disabled={addingChannelId !== null}
                        className="p-4 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed relative"
                      >
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        <div className="font-medium">{ch.name}</div>
                        <Badge variant="secondary">{ch.type}</Badge>
                        {isLoading && (
                          <p className="text-xs text-muted-foreground mt-2">Se creează în Shopify...</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Propagate Dialog */}
      <Dialog open={propagateDialogOpen} onOpenChange={setPropagateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canale cu override-uri</DialogTitle>
            <DialogDescription>Actualizezi și canalele cu override-uri?</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {channelsWithOverrides.map((channelId) => {
              const pc = product?.channels?.find(c => c.channelId === channelId);
              return (
                <div key={channelId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox id={channelId} defaultChecked />
                  <label htmlFor={channelId}>{pc?.channel.name}</label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPropagateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["product", productId] });
              toast({ title: "Produs salvat" });
            }}>
              Păstrează override-urile
            </Button>
            <Button onClick={() => handlePropagateToChannels(channelsWithOverrides)}>
              Actualizează toate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Channel Confirmation Dialog */}
      <AlertDialog open={removeChannelDialogOpen} onOpenChange={setRemoveChannelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimini de pe canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să elimini produsul de pe {channelToRemove?.channelName}?
              Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (channelToRemove) {
                  removeChannelMutation.mutate(channelToRemove.channelId);
                }
                setRemoveChannelDialogOpen(false);
                setChannelToRemove(null);
              }}
            >
              Elimină
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OverrideField({ label, masterValue, overrideValue, onSave, type = "text" }: {
  label: string;
  masterValue: string;
  overrideValue?: string;
  onSave: (value: string) => void;
  type?: "text" | "number";
}) {
  const [value, setValue] = useState(overrideValue ?? masterValue);
  const [editing, setEditing] = useState(false);
  const hasOverride = overrideValue !== undefined;

  useEffect(() => { setValue(overrideValue ?? masterValue); }, [overrideValue, masterValue]);

  return (
    <div className={`p-4 rounded-lg border ${hasOverride ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <Label>{label} {hasOverride && <Badge variant="warning" className="ml-2 text-xs">Override</Badge>}</Label>
      </div>
      <div className="flex gap-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => { setValue(e.target.value); setEditing(true); }}
        />
        {editing && (
          <Button onClick={() => { onSave(value); setEditing(false); }} size="sm">
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!hasOverride && <p className="text-xs text-muted-foreground mt-1">Master: {masterValue}</p>}
    </div>
  );
}
