"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  FileText,
  Truck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Phone,
  MapPin,
  Search,
  Ban,
  Trash2,
  RotateCcw,
  Clock,
  Package,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { RequirePermission, usePermissions } from "@/hooks/use-permissions";

interface Order {
  id: string;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  storeId: string;
  store: { id: string; name: string };
  customerEmail: string | null;
  customerPhone: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingZip: string | null;
  totalPrice: string;
  currency: string;
  status: string;
  phoneValidation: string;
  phoneValidationMsg: string | null;
  addressValidation: string;
  addressValidationMsg: string | null;
  createdAt: string;
  invoice: { id: string; smartbillNumber: string; smartbillSeries: string; status: string; errorMessage: string | null } | null;
  awb: { id: string; awbNumber: string; currentStatus: string; currentStatusDate: string | null; errorMessage: string | null } | null;
  lineItems?: Array<{
    id: string;
    title: string;
    variantTitle?: string;
    sku: string;
    quantity: number;
    price: string;
  }>;
}

interface Store {
  id: string;
  name: string;
}

interface ProcessError {
  orderId: string;
  orderNumber: string;
  success: boolean;
  invoiceSuccess?: boolean;
  invoiceNumber?: string;
  invoiceError?: string;
  awbSuccess?: boolean;
  awbNumber?: string;
  awbError?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "neutral" }> = {
  PENDING: { label: "În așteptare", variant: "warning" },
  VALIDATED: { label: "Validat", variant: "info" },
  VALIDATION_FAILED: { label: "Validare eșuată", variant: "destructive" },
  INVOICED: { label: "Facturat", variant: "success" },
  PICKING: { label: "În picking", variant: "info" },
  PACKED: { label: "Împachetat", variant: "success" },
  SHIPPED: { label: "Expediat", variant: "info" },
  DELIVERED: { label: "Livrat", variant: "success" },
  RETURNED: { label: "Returnat", variant: "destructive" },
  CANCELLED: { label: "Anulat", variant: "neutral" },
  INVOICE_ERROR: { label: "Eroare factură", variant: "destructive" },
  AWB_ERROR: { label: "Eroare AWB", variant: "destructive" },
  AWB_PENDING: { label: "Necesită AWB", variant: "warning" },
  INVOICE_PENDING: { label: "Necesită factură", variant: "warning" },
};

// Funcție pentru a determina statusul vizual al AWB-ului
function getAWBStatusInfo(awb: Order['awb']): {
  variant: "default" | "success" | "warning" | "destructive" | "info" | "outline";
  icon: React.ElementType;
  label: string;
  className?: string;
  isDeleted?: boolean;
  isCancelled?: boolean;
  isDelivered?: boolean;
  isReturned?: boolean;
} {
  if (!awb || !awb.awbNumber) {
    if (awb?.errorMessage) {
      return { variant: "destructive", icon: AlertCircle, label: "Eroare", className: "bg-red-100 text-red-700 border-red-200" };
    }
    return { variant: "outline", icon: Package, label: "Fără AWB" };
  }

  const status = awb.currentStatus?.toLowerCase() || "";

  // Șters
  if (status.includes("șters") || status.includes("sters") || status.includes("deleted")) {
    return { 
      variant: "outline", 
      icon: Trash2, 
      label: awb.awbNumber, 
      className: "bg-gray-100 text-gray-500 border-gray-300 line-through opacity-70",
      isDeleted: true,
    };
  }

  // Anulat
  if (status.includes("anulat") || status.includes("cancelled") || status.includes("canceled")) {
    return { 
      variant: "destructive", 
      icon: Ban, 
      label: awb.awbNumber, 
      className: "bg-red-100 text-red-700 border-red-200 line-through",
      isCancelled: true,
    };
  }

  // Returnat/Refuzat
  if (status.includes("retur") || status.includes("refuz") || status.includes("return")) {
    return { 
      variant: "default", 
      icon: RotateCcw, 
      label: awb.awbNumber, 
      className: "bg-orange-100 text-orange-700 border-orange-200",
      isReturned: true,
    };
  }

  // Livrat
  if (status.includes("livrat") || status.includes("delivered")) {
    return { 
      variant: "success", 
      icon: CheckCircle2, 
      label: awb.awbNumber, 
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      isDelivered: true,
    };
  }

  // În tranzit/livrare
  if (status.includes("tranzit") || status.includes("transit") || status.includes("livrare") || 
      status.includes("preluat") || status.includes("ridicat") || status.includes("sortare") ||
      status.includes("depozit") || status.includes("expedit")) {
    return { 
      variant: "info", 
      icon: Truck, 
      label: awb.awbNumber, 
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }

  // În așteptare
  if (status.includes("așteptare") || status.includes("asteptare") || status.includes("pending") ||
      status.includes("avizat") || status.includes("contact") || status.includes("reprogramat")) {
    return { 
      variant: "default", 
      icon: Clock, 
      label: awb.awbNumber, 
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }

  // Eroare în status
  if (status.includes("eroare") || status.includes("error") || status.includes("greșit") ||
      status.includes("incomplet") || status.includes("nu raspunde") || awb.errorMessage) {
    return { 
      variant: "destructive", 
      icon: AlertCircle, 
      label: awb.awbNumber, 
      className: "bg-red-100 text-red-700 border-red-200",
    };
  }

  // Default - AWB creat dar fără status special
  return { 
    variant: "info", 
    icon: Package, 
    label: awb.awbNumber, 
    className: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [awbModalOpen, setAwbModalOpen] = useState(false);
  const [awbOrderId, setAwbOrderId] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [deleteAwbDialogOpen, setDeleteAwbDialogOpen] = useState(false);
  const [awbToDelete, setAwbToDelete] = useState<{ id: string; awbNumber: string } | null>(null);
  const [awbSettings, setAwbSettings] = useState({
    useDefaults: true,
    serviceType: "Standard",
    paymentType: "destinatar",
    weight: "1",
    packages: "1",
    observations: "",
    createPickingList: true, // Crează automat picking list
  });

  // State pentru erori de procesare
  const [processErrors, setProcessErrors] = useState<ProcessError[]>([]);
  const [errorsDialogOpen, setErrorsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", statusFilter, storeFilter, searchQuery, startDate, endDate, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/orders?${params}`);
      return res.json();
    },
  });

  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const res = await fetch("/api/invoices/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.success) {
        toast({ title: "Succes", description: `${data.issued} facturi emise` });
        // Actualizăm viewOrder dacă e deschis
        if (viewOrder && variables.includes(viewOrder.id)) {
          // Reîncărcăm datele comenzii
          fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
            if (orderData.order) {
              setViewOrder(orderData.order);
            }
          });
        }
      } else {
        toast({ title: "Eroare facturare", description: data.error || "Verifică setările SmartBill", variant: "destructive" });
        // Actualizăm și la eroare pentru a vedea mesajul
        if (viewOrder && variables.includes(viewOrder.id)) {
          fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
            if (orderData.order) {
              setViewOrder(orderData.order);
            }
          });
        }
      }
      setSelectedOrders([]);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message || "Eroare la emiterea facturii", variant: "destructive" });
    },
  });

  const awbMutation = useMutation({
    mutationFn: async ({ orderIds, options, createPickingList, pickingListName }: { 
      orderIds: string[]; 
      options?: any; 
      createPickingList?: boolean;
      pickingListName?: string;
    }) => {
      const res = await fetch("/api/awb/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, options, createPickingList, pickingListName }),
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pickingLists"] });
      if (data.success) {
        let message = `${data.created} AWB-uri create`;
        if (data.pickingList) {
          message += `. Picking list creat: ${data.pickingList.code} (${data.pickingList.totalItems} produse)`;
        }
        toast({ title: "Succes", description: message });
      } else {
        toast({ title: "Eroare AWB", description: data.error || data.errors?.join(", ") || "Verifică setările FanCourier", variant: "destructive" });
      }
      // Actualizăm viewOrder dacă e deschis
      if (viewOrder && variables.orderIds.includes(viewOrder.id)) {
        fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
          if (orderData.order) {
            setViewOrder(orderData.order);
          }
        });
      }
      setSelectedOrders([]);
      setAwbModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message || "Eroare la crearea AWB", variant: "destructive" });
    },
  });

  // Mutație pentru ștergerea AWB
  const deleteAwbMutation = useMutation({
    mutationFn: async (awbId: string) => {
      const res = await fetch(`/api/awb/${awbId}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.success) {
        toast({ title: "AWB șters", description: data.message });
        // Actualizăm viewOrder dacă e deschis
        if (viewOrder) {
          fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
            if (orderData.order) {
              setViewOrder(orderData.order);
            }
          });
        }
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message || "Eroare la ștergerea AWB", variant: "destructive" });
    },
  });

  // Mutație pentru procesare completă (Factură + AWB)
  const processAllMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const awbOptions = awbSettings.useDefaults ? undefined : {
        serviceType: awbSettings.serviceType,
        paymentType: awbSettings.paymentType,
        weight: parseFloat(awbSettings.weight),
        packages: parseInt(awbSettings.packages),
        observations: awbSettings.observations || undefined,
      };
      const res = await fetch("/api/orders/process-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, awbOptions }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pickingLists"] });
      
      if (data.errors && data.errors.length > 0) {
        // Salvăm erorile și deschidem dialogul
        setProcessErrors(data.errors);
        setErrorsDialogOpen(true);
        toast({
          title: `⚠️ Procesare parțială`,
          description: `${data.stats.success} comenzi procesate, ${data.stats.failed} erori`,
          variant: "default",
        });
      } else {
        const pickingInfo = data.pickingList 
          ? ` | 📋 Picking List: ${data.pickingList.code}`
          : "";
        toast({
          title: "✅ Procesare completă!",
          description: `${data.stats.invoicesIssued} facturi, ${data.stats.awbsCreated} AWB-uri${pickingInfo}`,
          action: data.pickingList ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/picking/${data.pickingList.id}`, '_blank')}
            >
              Vezi Picking
            </Button>
          ) : undefined,
        });
      }
      setSelectedOrders([]);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      // Construim mesajul de rezultat
      const messages: string[] = [];
      messages.push(`${data.synced || 0} comenzi sincronizate din Shopify`);
      
      // Verificăm rezultatele sincronizării bilaterale
      if (data.bilateral) {
        if (data.bilateral.invoices) {
          const inv = data.bilateral.invoices;
          if (inv.deleted > 0) {
            messages.push(`🧾 ${inv.deleted} facturi șterse/anulate în SmartBill`);
          }
        }
        if (data.bilateral.awbs) {
          const awb = data.bilateral.awbs;
          if (awb.statusChanges > 0) {
            messages.push(`🚚 ${awb.statusChanges} AWB-uri cu status schimbat`);
          }
        }
        
        // Afișăm detalii dacă au fost modificări
        if (data.bilateral.changes && data.bilateral.changes.length > 0) {
          data.bilateral.changes.forEach((change: any) => {
            const icon = change.type === 'invoice' ? '🧾' : '🚚';
            console.log(`${icon} ${change.action}: Comandă ${change.orderNumber} - ${change.message}`);
          });
        }
      }
      
      if (data.errors && data.errors.length > 0) {
        toast({ 
          title: "Sincronizare parțială", 
          description: messages.join('\n') + `\n⚠️ ${data.errors.length} erori.`, 
          variant: "default" 
        });
      } else {
        toast({ 
          title: "Sincronizare completă", 
          description: messages.join(' • '),
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare sincronizare", description: error.message, variant: "destructive" });
    },
  });

  // Sincronizare comandă individuală (status AWB + factură)
  const syncSingleOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch("/api/sync/full", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      if (data.success) {
        toast({ 
          title: "✅ Sincronizare completă", 
          description: `AWB-uri: ${data.stats?.awbsUpdated || 0} actualizate, Facturi: ${data.stats?.invoicesChecked || 0} verificate`,
        });
      } else {
        toast({ 
          title: "⚠️ Sincronizare cu erori", 
          description: data.error || "Verifică istoricul pentru detalii",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare sincronizare", description: error.message, variant: "destructive" });
    },
  });

  const orders: Order[] = ordersData?.orders || [];
  const stores: Store[] = storesData?.stores || [];
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;

  const handleSelectAll = () => {
    setSelectedOrders(allSelected ? [] : orders.map((o) => o.id));
  };

  const handleViewOrder = (order: Order) => {
    setViewOrder(order);
    setViewModalOpen(true);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleIssueInvoices = () => {
    if (selectedOrders.length === 0) {
      toast({ title: "Selectează comenzi", description: "Selectează cel puțin o comandă", variant: "destructive" });
      return;
    }
    invoiceMutation.mutate(selectedOrders);
  };

  const handleOpenAwbModal = (orderId?: string) => {
    if (orderId) {
      setAwbOrderId(orderId);
    } else if (selectedOrders.length === 0) {
      toast({ title: "Selectează comenzi", variant: "destructive" });
      return;
    } else {
      setAwbOrderId(null);
    }
    setAwbModalOpen(true);
  };

  const handleCreateAwb = () => {
    const orderIds = awbOrderId ? [awbOrderId] : selectedOrders;
    const options = awbSettings.useDefaults ? undefined : {
      serviceType: awbSettings.serviceType,
      paymentType: awbSettings.paymentType,
      weight: parseFloat(awbSettings.weight),
      packages: parseInt(awbSettings.packages),
      observations: awbSettings.observations || undefined,
    };
    awbMutation.mutate({ 
      orderIds, 
      options,
      createPickingList: awbSettings.createPickingList && orderIds.length > 1, // Doar pentru bulk
      pickingListName: `Picking ${new Date().toLocaleDateString("ro-RO")} - ${orderIds.length} comenzi`,
    });
  };

  const handleExportOrders = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/orders/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comenzi_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export finalizat", description: "Fișierul CSV a fost descărcat" });
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const getValidationIcon = (status: string) => {
    if (status === "PASSED") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "FAILED") return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  return (
    <TooltipProvider>
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Comenzi</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestionează comenzile din toate magazinele</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleExportOrders}
                disabled={isExporting}
                size="sm"
                className="md:size-default"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Export CSV</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Exportă comenzile filtrate într-un fișier CSV. Respectă filtrele active (status, magazin, dată).</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => syncMutation.mutate()} loading={syncMutation.isPending} size="sm" className="md:size-default">
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sincronizare</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Sincronizează comenzile noi din toate magazinele Shopify. Actualizează statusurile și validează adresele.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Caută comandă, client, telefon..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="PENDING">În așteptare</SelectItem>
                <SelectItem value="VALIDATED">Validate</SelectItem>
                <SelectItem value="VALIDATION_FAILED">Validare eșuată</SelectItem>
                <SelectItem value="INVOICED">Facturate</SelectItem>
                <SelectItem value="SHIPPED">Expediate</SelectItem>
                <SelectItem value="DELIVERED">Livrate</SelectItem>
                <SelectItem value="RETURNED">Returnate</SelectItem>
                <SelectItem value="CANCELLED">Anulate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Magazin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate magazinele</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtre pe date */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Interval:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
              >
                <X className="h-4 w-4 mr-1" />
                Resetează
              </Button>
            )}
            
            {/* Info paginare */}
            {ordersData?.pagination && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {ordersData.pagination.total} comenzi găsite
                  {ordersData.pagination.totalPages > 1 && (
                    <> • Pagina {ordersData.pagination.page} din {ordersData.pagination.totalPages}</>
                  )}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOrders.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between animate-fade-in">
          <span className="text-sm font-medium">{selectedOrders.length} comenzi selectate</span>
          <div className="flex gap-2">
            <RequirePermission permission="invoices.create">
              <Button size="sm" variant="outline" onClick={handleIssueInvoices} disabled={invoiceMutation.isPending}>
                <FileText className="h-4 w-4 mr-2" />
                {invoiceMutation.isPending ? "Se emit..." : "Emite Facturi"}
              </Button>
            </RequirePermission>
            <RequirePermission permission="awb.create">
              <Button size="sm" variant="outline" onClick={() => handleOpenAwbModal()} disabled={awbMutation.isPending}>
                <Truck className="h-4 w-4 mr-2" />
                {awbMutation.isPending ? "Se creează..." : "Creează AWB"}
              </Button>
            </RequirePermission>
            <RequirePermission permission="orders.process">
              <Button 
                size="sm" 
                onClick={() => processAllMutation.mutate(selectedOrders)} 
                disabled={processAllMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {processAllMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Procesare...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Emite Tot (Factură + AWB)
                  </>
                )}
              </Button>
            </RequirePermission>
          </div>
        </div>
      )}

      {/* Buton pentru a vedea erorile de procesare */}
      {processErrors.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">
              {processErrors.length} comenzi cu erori la procesare
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setErrorsDialogOpen(true)}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vezi erori
            </Button>
            <Button 
              size="sm" 
              onClick={() => processAllMutation.mutate(processErrors.map(e => e.orderId))}
              disabled={processAllMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", processAllMutation.isPending && "animate-spin")} />
              Reîncearcă toate
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setProcessErrors([])}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left"><Checkbox checked={allSelected} onCheckedChange={handleSelectAll} /></th>
                  <th className="p-4 text-left text-sm font-medium">Comandă</th>
                  <th className="p-4 text-left text-sm font-medium">Client</th>
                  <th className="p-4 text-left text-sm font-medium">Validări</th>
                  <th className="p-4 text-left text-sm font-medium">Valoare</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Factură</th>
                  <th className="p-4 text-left text-sm font-medium">AWB</th>
                  <th className="p-4 text-left text-sm font-medium">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr><td colSpan={9} className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" /><p className="text-muted-foreground">Se încarcă...</p></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center"><ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="text-muted-foreground">Nu există comenzi</p></td></tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className={cn("border-b hover:bg-muted/50 transition-colors cursor-pointer", selectedOrders.includes(order.id) && "bg-primary/5")}
                      onClick={() => handleViewOrder(order)}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => handleSelectOrder(order.id)} /></td>
                      <td className="p-4">
                        <span className="font-medium">{order.shopifyOrderNumber}</span>
                        <div className="flex items-center gap-1 mt-1"><Badge variant="outline" className="text-xs">{order.store.name}</Badge></div>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{order.customerFirstName} {order.customerLastName}</p>
                        <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                        <p className="text-sm text-muted-foreground">{order.shippingCity}, {order.shippingProvince}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2" title={order.phoneValidationMsg || ""}><Phone className="h-3 w-3 text-muted-foreground" />{getValidationIcon(order.phoneValidation)}</div>
                          <div className="flex items-center gap-2" title={order.addressValidationMsg || ""}><MapPin className="h-3 w-3 text-muted-foreground" />{getValidationIcon(order.addressValidation)}</div>
                        </div>
                      </td>
                      <td className="p-4"><span className="font-semibold">{formatCurrency(parseFloat(order.totalPrice), order.currency)}</span></td>
                      <td className="p-4"><Badge variant={statusConfig[order.status]?.variant || "default"}>{statusConfig[order.status]?.label || order.status}</Badge></td>
                      <td className="p-4">
                        {order.invoice ? (
                          order.invoice.status === "issued" ? (
                            <Badge variant="success">{order.invoice.smartbillSeries}{order.invoice.smartbillNumber}</Badge>
                          ) : order.invoice.status === "deleted" ? (
                            <Badge variant="neutral" title={order.invoice.errorMessage || "Factură ștearsă în SmartBill"}>🗑️ Ștearsă</Badge>
                          ) : order.invoice.status === "cancelled" ? (
                            <Badge variant="warning" title={order.invoice.errorMessage || "Factură anulată în SmartBill"}>❌ Anulată</Badge>
                          ) : order.invoice.status === "error" ? (
                            <Badge variant="destructive" title={order.invoice.errorMessage || ""}>Eroare</Badge>
                          ) : (
                            <Badge variant="neutral" title={order.invoice.errorMessage || ""}>În așteptare</Badge>
                          )
                        ) : (
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); invoiceMutation.mutate([order.id]); }} disabled={invoiceMutation.isPending}><FileText className="h-4 w-4" /></Button>
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        {order.awb?.awbNumber ? (
                          (() => {
                            const awbInfo = getAWBStatusInfo(order.awb);
                            const Icon = awbInfo.icon;
                            return (
                              <div className="flex flex-col gap-1">
                                <Badge 
                                  variant={awbInfo.variant as any}
                                  title={order.awb.currentStatus || "AWB creat"}
                                  className={cn("cursor-help gap-1", awbInfo.className)}
                                >
                                  <Icon className="h-3 w-3" />
                                  {awbInfo.label}
                                </Badge>
                                {order.awb.currentStatus && (
                                  <span className={cn(
                                    "text-xs",
                                    awbInfo.isDeleted && "text-gray-500 line-through",
                                    awbInfo.isCancelled && "text-red-600",
                                    awbInfo.isReturned && "text-orange-600",
                                    awbInfo.isDelivered && "text-emerald-600",
                                    !awbInfo.isDeleted && !awbInfo.isCancelled && !awbInfo.isReturned && !awbInfo.isDelivered && "text-muted-foreground"
                                  )}>
                                    {order.awb.currentStatus.length > 25 
                                      ? order.awb.currentStatus.substring(0, 25) + "..." 
                                      : order.awb.currentStatus}
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : order.awb?.errorMessage ? (
                          <Badge variant="destructive" title={order.awb.errorMessage} className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Eroare
                          </Badge>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenAwbModal(order.id); }} disabled={awbMutation.isPending}><Truck className="h-4 w-4" /></Button>
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}><Button size="sm" variant="ghost" onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4" /></Button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginare */}
          {ordersData?.pagination && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Afișate {((page - 1) * limit) + 1} - {Math.min(page * limit, ordersData.pagination.total)} din {ordersData.pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pe pagină:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1); // Reset la prima pagină când schimbăm limita
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={150}>150</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
              </div>
              {ordersData.pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  Prima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  {page} / {ordersData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(ordersData.pagination.totalPages, p + 1))}
                  disabled={page === ordersData.pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(ordersData.pagination.totalPages)}
                  disabled={page === ordersData.pagination.totalPages}
                >
                  Ultima
                </Button>
              </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={awbModalOpen} onOpenChange={setAwbModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creare AWB</DialogTitle>
            <DialogDescription>{awbOrderId ? "Configurează opțiunile pentru AWB" : `Creează AWB pentru ${selectedOrders.length} comenzi`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="useDefaults" checked={awbSettings.useDefaults} onCheckedChange={(checked) => setAwbSettings((prev) => ({ ...prev, useDefaults: !!checked }))} />
              <Label htmlFor="useDefaults">Folosește setările predefinite</Label>
            </div>
            {!awbSettings.useDefaults && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tip serviciu</Label>
                    <Select value={awbSettings.serviceType} onValueChange={(v) => setAwbSettings((prev) => ({ ...prev, serviceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Express">Express</SelectItem>
                        <SelectItem value="ExpressLoco">Express Loco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Plătitor</Label>
                    <Select value={awbSettings.paymentType} onValueChange={(v) => setAwbSettings((prev) => ({ ...prev, paymentType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="destinatar">Destinatar (Ramburs)</SelectItem>
                        <SelectItem value="expeditor">Expeditor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Greutate (kg)</Label><Input type="number" step="0.1" value={awbSettings.weight} onChange={(e) => setAwbSettings((prev) => ({ ...prev, weight: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Nr. colete</Label><Input type="number" value={awbSettings.packages} onChange={(e) => setAwbSettings((prev) => ({ ...prev, packages: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Observații</Label><Input placeholder="Observații opționale..." value={awbSettings.observations} onChange={(e) => setAwbSettings((prev) => ({ ...prev, observations: e.target.value }))} /></div>
              </div>
            )}
            
            {/* Opțiune Picking List - doar pentru bulk */}
            {selectedOrders.length > 1 && !awbOrderId && (
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox 
                  id="createPickingList" 
                  checked={awbSettings.createPickingList} 
                  onCheckedChange={(checked) => setAwbSettings((prev) => ({ ...prev, createPickingList: !!checked }))} 
                />
                <div>
                  <Label htmlFor="createPickingList" className="cursor-pointer">Creează Picking List automat</Label>
                  <p className="text-xs text-muted-foreground">Se va crea o listă de picking cu toate produsele din cele {selectedOrders.length} comenzi</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwbModalOpen(false)}>Anulează</Button>
            <Button onClick={handleCreateAwb} loading={awbMutation.isPending}><Truck className="h-4 w-4 mr-2" />Creează AWB</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Vizualizare Comandă */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comandă {viewOrder?.shopifyOrderNumber}</DialogTitle>
            <DialogDescription>Din magazinul {viewOrder?.store.name}</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-6 py-4">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Client</h4>
                  <p>{viewOrder.customerFirstName} {viewOrder.customerLastName}</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.customerEmail}</p>
                  <p className="text-sm text-muted-foreground">{viewOrder.customerPhone}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Adresă livrare</h4>
                  <p className="text-sm">{viewOrder.shippingAddress1}</p>
                  {viewOrder.shippingAddress2 && <p className="text-sm">{viewOrder.shippingAddress2}</p>}
                  <p className="text-sm">{viewOrder.shippingCity}, {viewOrder.shippingProvince}</p>
                  {viewOrder.shippingZip && <p className="text-sm text-muted-foreground">Cod poștal: {viewOrder.shippingZip}</p>}
                </div>
              </div>

              {/* Status & Validări */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={statusConfig[viewOrder.status]?.variant || "default"}>
                    {statusConfig[viewOrder.status]?.label || viewOrder.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Valoare</h4>
                  <p className="text-xl font-bold">{formatCurrency(parseFloat(viewOrder.totalPrice), viewOrder.currency)}</p>
                </div>
              </div>

              {/* Validări */}
              <div>
                <h4 className="font-semibold mb-2">Validări</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {viewOrder.phoneValidation === "PASSED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{viewOrder.phoneValidationMsg || "Telefon"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {viewOrder.addressValidation === "PASSED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{viewOrder.addressValidationMsg || "Adresă"}</span>
                  </div>
                </div>
              </div>

              {/* Factură & AWB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Factură</h4>
                  {viewOrder.invoice ? (
                    viewOrder.invoice.status === "issued" ? (
                      <Badge variant="success">{viewOrder.invoice.smartbillSeries}{viewOrder.invoice.smartbillNumber}</Badge>
                    ) : viewOrder.invoice.status === "deleted" ? (
                      <div className="space-y-2">
                        <Badge variant="neutral">🗑️ Ștearsă</Badge>
                        <p className="text-sm text-muted-foreground">{viewOrder.invoice.errorMessage}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate([viewOrder.id]);
                          }}
                          disabled={invoiceMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Emite din nou
                        </Button>
                      </div>
                    ) : viewOrder.invoice.status === "cancelled" ? (
                      <div className="space-y-2">
                        <Badge variant="warning">❌ Anulată</Badge>
                        <p className="text-sm text-muted-foreground">{viewOrder.invoice.errorMessage}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate([viewOrder.id]);
                          }}
                          disabled={invoiceMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Emite din nou
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Badge variant="destructive">Eroare</Badge>
                        <p className="text-sm text-red-500 mt-1 max-h-20 overflow-y-auto">{viewOrder.invoice.errorMessage}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate([viewOrder.id]);
                          }}
                          disabled={invoiceMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Încearcă din nou
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">Nu a fost emisă</span>
                      <RequirePermission permission="invoices.create">
                        <div>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              invoiceMutation.mutate([viewOrder.id]);
                            }}
                            disabled={invoiceMutation.isPending}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Emite factură
                          </Button>
                        </div>
                      </RequirePermission>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">AWB</h4>
                  {viewOrder.awb?.awbNumber ? (
                    (() => {
                      const awbInfo = getAWBStatusInfo(viewOrder.awb);
                      const Icon = awbInfo.icon;
                      return (
                        <div className="space-y-2">
                          <Badge 
                            variant={awbInfo.variant as any}
                            className={cn("gap-1", awbInfo.className)}
                          >
                            <Icon className="h-3 w-3" />
                            {viewOrder.awb.awbNumber}
                          </Badge>
                          
                          {viewOrder.awb.currentStatus && (
                            <div className={cn(
                              "p-2 rounded-lg text-sm",
                              awbInfo.isDeleted && "bg-gray-100 text-gray-600",
                              awbInfo.isCancelled && "bg-red-50 text-red-700",
                              awbInfo.isReturned && "bg-orange-50 text-orange-700",
                              awbInfo.isDelivered && "bg-emerald-50 text-emerald-700",
                              !awbInfo.isDeleted && !awbInfo.isCancelled && !awbInfo.isReturned && !awbInfo.isDelivered && "bg-blue-50 text-blue-700"
                            )}>
                              <p className="font-medium flex items-center gap-1">
                                <Icon className="h-4 w-4" />
                                {awbInfo.isDeleted ? "AWB ȘTERS" : 
                                 awbInfo.isCancelled ? "AWB ANULAT" : 
                                 awbInfo.isReturned ? "AWB RETURNAT" : 
                                 awbInfo.isDelivered ? "LIVRAT" : "Status:"}
                              </p>
                              <p className={awbInfo.isDeleted || awbInfo.isCancelled ? "line-through opacity-70" : ""}>
                                {viewOrder.awb.currentStatus}
                              </p>
                            </div>
                          )}
                          
                          {viewOrder.awb.currentStatusDate && (
                            <p className="text-xs text-muted-foreground">
                              Actualizat: {new Date(viewOrder.awb.currentStatusDate).toLocaleString('ro-RO')}
                            </p>
                          )}
                          
                          {/* Buton pentru a crea un nou AWB dacă e anulat/șters */}
                          {(awbInfo.isDeleted || awbInfo.isCancelled) && (
                            <RequirePermission permission="awb.create">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleOpenAwbModal(viewOrder.id)}
                                disabled={awbMutation.isPending}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                Creează AWB nou
                              </Button>
                            </RequirePermission>
                          )}
                          
                          {/* Buton pentru ștergere AWB (doar dacă nu e livrat și nu e deja șters) */}
                          {!awbInfo.isDeleted && !awbInfo.isDelivered && viewOrder.awb.id && (
                            <RequirePermission permission="awb.delete">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setAwbToDelete({
                                    id: viewOrder.awb!.id,
                                    awbNumber: viewOrder.awb?.awbNumber || "",
                                  });
                                  setDeleteAwbDialogOpen(true);
                                }}
                                disabled={deleteAwbMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {deleteAwbMutation.isPending ? "Se șterge..." : "Șterge AWB"}
                              </Button>
                            </RequirePermission>
                          )}
                        </div>
                      );
                    })()
                  ) : viewOrder.awb?.errorMessage ? (
                    <div className="space-y-2">
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Eroare
                      </Badge>
                      <div className="p-2 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700 max-h-20 overflow-y-auto whitespace-pre-wrap">{viewOrder.awb.errorMessage}</p>
                      </div>
                      <RequirePermission permission="awb.create">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenAwbModal(viewOrder.id)}
                          disabled={awbMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Încearcă din nou
                        </Button>
                      </RequirePermission>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">Nu a fost creat</span>
                      <RequirePermission permission="awb.create">
                        <div>
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenAwbModal(viewOrder.id)}
                            disabled={awbMutation.isPending}
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Creează AWB
                          </Button>
                        </div>
                      </RequirePermission>
                    </div>
                  )}
                </div>
              </div>

              {/* Produse comandă */}
              <div>
                <h4 className="font-semibold mb-2">Produse ({viewOrder.lineItems?.length || 0})</h4>
                {viewOrder.lineItems && viewOrder.lineItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Produs</th>
                          <th className="text-left px-3 py-2 font-medium">SKU</th>
                          <th className="text-center px-3 py-2 font-medium">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium">Preț</th>
                          <th className="text-right px-3 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {viewOrder.lineItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-muted/50">
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-medium line-clamp-1">{item.title}</span>
                                {item.variantTitle && (
                                  <span className="text-xs text-muted-foreground">{item.variantTitle}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {item.sku || '-'}
                              </code>
                            </td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(parseFloat(item.price), viewOrder.currency)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCurrency(parseFloat(item.price) * item.quantity, viewOrder.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted font-medium">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right">Total produse:</td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(
                              viewOrder.lineItems.reduce((sum: number, item: any) => 
                                sum + parseFloat(item.price) * item.quantity, 0
                              ), 
                              viewOrder.currency
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nu sunt produse în comandă</p>
                )}
              </div>

              {/* Data */}
              <div>
                <h4 className="font-semibold mb-2">Data comenzii</h4>
                <p className="text-sm text-muted-foreground">{formatDate(viewOrder.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {viewOrder && (viewOrder.awb?.awbNumber || viewOrder.invoice) && (
              <Button 
                variant="secondary"
                onClick={() => syncSingleOrderMutation.mutate(viewOrder.id)}
                disabled={syncSingleOrderMutation.isPending}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", syncSingleOrderMutation.isPending && "animate-spin")} />
                {syncSingleOrderMutation.isPending ? "Sincronizare..." : "Sincronizează Status"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru erorile de procesare */}
      <Dialog open={errorsDialogOpen} onOpenChange={setErrorsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Erori la Procesare ({processErrors.length} comenzi)
            </DialogTitle>
            <DialogDescription>
              Următoarele comenzi au întâmpinat erori la procesare. Poți reîncerca individual sau toate odată.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-3">
              {processErrors.map((error) => (
                <div 
                  key={error.orderId}
                  className="p-4 border rounded-lg bg-red-50 border-red-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-800">{error.orderNumber}</span>
                      <div className="flex items-center gap-2">
                        {error.invoiceSuccess === false ? (
                          <Badge variant="destructive" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Eroare Factură
                          </Badge>
                        ) : error.invoiceSuccess === true ? (
                          <Badge variant="success" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {error.invoiceNumber || "OK"}
                          </Badge>
                        ) : null}
                        {error.awbSuccess === false ? (
                          <Badge variant="destructive" className="gap-1">
                            <Truck className="h-3 w-3" />
                            Eroare AWB
                          </Badge>
                        ) : error.awbSuccess === true ? (
                          <Badge variant="success" className="gap-1">
                            <Truck className="h-3 w-3" />
                            {error.awbNumber || "OK"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processAllMutation.mutate([error.orderId])}
                      disabled={processAllMutation.isPending}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", processAllMutation.isPending && "animate-spin")} />
                      Reîncearcă
                    </Button>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {error.invoiceError && (
                      <div className="flex items-start gap-2 text-red-700">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error.invoiceError}</span>
                      </div>
                    )}
                    {error.awbError && (
                      <div className="flex items-start gap-2 text-red-700">
                        <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error.awbError}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setProcessErrors([]);
                setErrorsDialogOpen(false);
              }}
            >
              Șterge erori și închide
            </Button>
            <Button
              onClick={() => processAllMutation.mutate(processErrors.map(e => e.orderId))}
              disabled={processAllMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {processAllMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesare...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reîncearcă toate ({processErrors.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AWB Confirmation Dialog */}
      <AlertDialog open={deleteAwbDialogOpen} onOpenChange={setDeleteAwbDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi AWB-ul?</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi AWB-ul {awbToDelete?.awbNumber}?
              Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (awbToDelete) {
                  deleteAwbMutation.mutate(awbToDelete.id);
                }
                setDeleteAwbDialogOpen(false);
                setAwbToDelete(null);
              }}
            >
              Șterge AWB
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
