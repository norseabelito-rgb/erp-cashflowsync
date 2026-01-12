"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StoreData {
  id: string;
  name: string;
  shopifyDomain: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    orders: number;
  };
}

interface StoreFormData {
  name: string;
  shopifyDomain: string;
  accessToken: string;
}

export default function StoresPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    shopifyDomain: "",
    accessToken: "",
  });

  // Fetch stores
  const { data: storesData, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // Create store mutation
  const createMutation = useMutation({
    mutationFn: async (data: StoreFormData) => {
      console.log("[Store Frontend] Starting create request...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("[Store Frontend] Request timeout after 30s");
        controller.abort();
      }, 30000); // 30 sec timeout
      
      try {
        const res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log("[Store Frontend] Response status:", res.status);
        
        const result = await res.json();
        console.log("[Store Frontend] Response body:", result);
        
        if (!res.ok) {
          // Dacă e conflict (magazin există), nu e eroare critică
          if (res.status === 409) {
            throw new Error(result.error || "Acest magazin există deja");
          }
          throw new Error(result.error || "Eroare la adăugarea magazinului");
        }
        
        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[Store Frontend] Error:", err);
        
        if (err.name === 'AbortError') {
          throw new Error("Request-ul a expirat. Verifică conexiunea și încearcă din nou.");
        }
        throw err;
      }
    },
    onMutate: () => {
      // Dezactivează butonul imediat
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      console.log("[Store Frontend] Success:", data);
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Magazin adăugat",
        description: "Magazinul a fost adăugat cu succes.",
      });
    },
    onError: (error: Error) => {
      console.error("[Store Frontend] onError:", error.message);
      // Refresh lista oricum - poate magazinul a fost creat
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Update store mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StoreFormData & { isActive: boolean }> }) => {
      const res = await fetch(`/api/stores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la actualizarea magazinului");
      }
      return res.json();
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      setDialogOpen(false);
      setSelectedStore(null);
      resetForm();
      toast({
        title: "Magazin actualizat",
        description: "Magazinul a fost actualizat cu succes.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Delete store mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Eroare la ștergerea magazinului");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      setDeleteDialogOpen(false);
      setSelectedStore(null);
      toast({
        title: "Magazin șters",
        description: "Magazinul a fost șters cu succes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync store mutation
  const syncMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const res = await fetch(`/api/stores/${storeId}/sync`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Sincronizare completă",
        description: `${data.synced} comenzi sincronizate.`,
      });
    },
  });

  const stores: StoreData[] = storesData?.stores || [];

  const resetForm = () => {
    setFormData({
      name: "",
      shopifyDomain: "",
      accessToken: "",
    });
  };

  const handleEdit = (store: StoreData) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      shopifyDomain: store.shopifyDomain,
      accessToken: "", // Nu afișăm token-ul existent
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStore) {
      // Update - trimitem doar câmpurile completate
      const updateData: Partial<StoreFormData> = {
        name: formData.name,
        shopifyDomain: formData.shopifyDomain,
      };
      if (formData.accessToken) {
        updateData.accessToken = formData.accessToken;
      }
      updateMutation.mutate({ id: selectedStore.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (store: StoreData) => {
    updateMutation.mutate({
      id: store.id,
      data: { isActive: !store.isActive },
    });
  };

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Magazine</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Gestionează magazinele tale Shopify conectate
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedStore(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:size-default gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Adaugă Magazin</span>
              <span className="sm:hidden">Adaugă</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {selectedStore ? "Editează Magazin" : "Adaugă Magazin Nou"}
                </DialogTitle>
                <DialogDescription>
                  {selectedStore
                    ? "Actualizează detaliile magazinului Shopify"
                    : "Conectează un nou magazin Shopify la platformă"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nume Magazin</Label>
                  <Input
                    id="name"
                    placeholder="Magazinul Meu"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="domain">Domeniu Shopify</Label>
                  <Input
                    id="domain"
                    placeholder="magazin.myshopify.com"
                    value={formData.shopifyDomain}
                    onChange={(e) =>
                      setFormData({ ...formData, shopifyDomain: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Domeniul myshopify.com al magazinului (fără https://)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="token">Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder={selectedStore ? "Lasă gol pentru a păstra token-ul existent" : "shpat_..."}
                    value={formData.accessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, accessToken: e.target.value })
                    }
                    required={!selectedStore}
                  />
                  <p className="text-xs text-muted-foreground">
                    Token-ul Admin API din Shopify (cu permisiuni pentru comenzi)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setSelectedStore(null);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                >
                  {isSubmitting || createMutation.isPending || updateMutation.isPending
                    ? "Se salvează..."
                    : selectedStore
                    ? "Salvează"
                    : "Adaugă"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stores Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/2 mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : stores.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Nu ai magazine configurate încă.</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adaugă primul magazin
              </Button>
            </CardContent>
          </Card>
        ) : (
          stores.map((store) => (
            <Card
              key={store.id}
              className={cn(
                "transition-all duration-200",
                !store.isActive && "opacity-60"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        store.isActive ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      <Store
                        className={cn(
                          "h-5 w-5",
                          store.isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{store.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {store.shopifyDomain}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={store.isActive ? "success" : "neutral"}
                    className="cursor-pointer"
                    onClick={() => handleToggleActive(store)}
                  >
                    {store.isActive ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activ
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactiv
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold">{store._count.orders}</p>
                    <p className="text-sm text-muted-foreground">comenzi</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => syncMutation.mutate(store.id)}
                        disabled={syncMutation.isPending || !store.isActive}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            syncMutation.isPending && "animate-spin"
                          )}
                        />
                        Sincronizează
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>Sincronizează toate comenzile noi din acest magazin Shopify și actualizează statusurile existente.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(store)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editează
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a
                      href={`https://${store.shopifyDomain}/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedStore(store);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va șterge magazinul{" "}
              <strong>{selectedStore?.name}</strong> și toate datele asociate
              (comenzi, facturi, AWB-uri). Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedStore(null)}>
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStore && deleteMutation.mutate(selectedStore.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Se șterge..." : "Șterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
