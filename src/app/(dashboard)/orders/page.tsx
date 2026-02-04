"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Pencil,
  ExternalLink,
  BoxIcon,
  ShoppingBag,
  Plus,
  Tag,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getEmptyState, determineEmptyStateType } from "@/lib/empty-states";
import { FILTER_BAR } from "@/lib/design-system";
import { TransferWarningModal } from "@/components/orders/transfer-warning-modal";
import { TemuPlaceholder } from "@/components/orders/temu-placeholder";
import { ChannelTabs, type ChannelTab, type ChannelCounts } from "@/components/orders/channel-tabs";
import { ProcessingErrorsPanel, type ProcessError, type DBProcessingError } from "@/components/orders/processing-errors-panel";
import { ManualOrderDialog, type ManualOrderData } from "@/components/orders/manual-order-dialog";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { useErrorModal } from "@/hooks/use-error-modal";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

interface Order {
  id: string;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  source: string;
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
  invoice: { id: string; invoiceNumber: string | null; invoiceSeriesName: string | null; oblioId: string | null; status: string; errorMessage: string | null } | null;
  awb: { id: string; awbNumber: string; currentStatus: string; currentStatusDate: string | null; errorMessage: string | null } | null;
  trendyolOrder?: {
    id: string;
    trendyolOrderNumber: string;
    shipmentPackageId: string | null;
    invoiceSentToTrendyol: boolean;
    invoiceSentAt: string | null;
    invoiceSendError: string | null;
    oblioInvoiceLink: string | null;
    trackingSentToTrendyol: boolean;
    trackingSentAt: string | null;
    trackingSendError: string | null;
    localAwbNumber: string | null;
    localCarrier: string | null;
  } | null;
  lineItems?: Array<{
    id: string;
    title: string;
    variantTitle?: string;
    sku: string;
    quantity: number;
    price: string;
    imageUrl?: string | null;
  }>;
  internalStatus?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface Store {
  id: string;
  name: string;
}


// ProcessError and DBProcessingError types imported from processing-errors-panel.tsx

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

// Component for stock tooltip content with live fetch
function StockTooltipContent({ sku }: { sku: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-check', sku],
    queryFn: async () => {
      const res = await fetch(`/api/inventory-items?search=${encodeURIComponent(sku)}&limit=1`);
      const json = await res.json();
      return json.data?.[0] || null;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) {
    return <p className="text-xs">Se incarca...</p>;
  }

  if (!data) {
    return <p className="text-xs text-muted-foreground">Nu s-a gasit in inventar</p>;
  }

  return (
    <div className="text-xs">
      <p className="font-medium">{data.name}</p>
      <p className="mt-1">
        Stoc: <span className={data.currentStock > 0 ? "text-green-600" : "text-red-600"}>
          {data.currentStock} {data.unit || 'buc'}
        </span>
      </p>
      {data.reorderPoint && data.currentStock <= data.reorderPoint && (
        <p className="text-yellow-600 mt-1">Stoc scazut!</p>
      )}
    </div>
  );
}

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
      return { variant: "destructive", icon: AlertCircle, label: "Eroare", className: "bg-status-error/10 text-status-error border-status-error/20" };
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
      className: "bg-status-neutral/10 text-status-neutral border-status-neutral/20 line-through opacity-70",
      isDeleted: true,
    };
  }

  // Anulat
  if (status.includes("anulat") || status.includes("cancelled") || status.includes("canceled")) {
    return {
      variant: "destructive",
      icon: Ban,
      label: awb.awbNumber,
      className: "bg-status-error/10 text-status-error border-status-error/20 line-through",
      isCancelled: true,
    };
  }

  // Returnat/Refuzat
  if (status.includes("retur") || status.includes("refuz") || status.includes("return")) {
    return {
      variant: "default",
      icon: RotateCcw,
      label: awb.awbNumber,
      className: "bg-status-warning/10 text-status-warning border-status-warning/20",
      isReturned: true,
    };
  }

  // Livrat
  if (status.includes("livrat") || status.includes("delivered")) {
    return {
      variant: "success",
      icon: CheckCircle2,
      label: awb.awbNumber,
      className: "bg-status-success/10 text-status-success border-status-success/20",
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
      className: "bg-status-info/10 text-status-info border-status-info/20",
    };
  }

  // În așteptare
  if (status.includes("așteptare") || status.includes("asteptare") || status.includes("pending") ||
      status.includes("avizat") || status.includes("contact") || status.includes("reprogramat")) {
    return {
      variant: "default",
      icon: Clock,
      label: awb.awbNumber,
      className: "bg-status-warning/10 text-status-warning border-status-warning/20",
    };
  }

  // Eroare în status
  if (status.includes("eroare") || status.includes("error") || status.includes("greșit") ||
      status.includes("incomplet") || status.includes("nu raspunde") || awb.errorMessage) {
    return {
      variant: "destructive",
      icon: AlertCircle,
      label: awb.awbNumber,
      className: "bg-status-error/10 text-status-error border-status-error/20",
    };
  }

  // Default - AWB creat dar fără status special
  return {
    variant: "info",
    icon: Package,
    label: awb.awbNumber,
    className: "bg-status-info/10 text-status-info border-status-info/20",
  };
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { showError, ErrorModalComponent } = useErrorModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Channel tab from URL (persisted via URL parameter)
  const channelTab = (searchParams.get('tab') || 'shopify') as ChannelTab;

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  // sourceFilter removed - using channelTab from URL instead
  const [awbFilter, setAwbFilter] = useState<string>("all"); // "all" | "with" | "without"
  const [awbStatusFilter, setAwbStatusFilter] = useState<string>("all"); // "all" | "tranzit" | "livrat" | "retur" | "pending" | "anulat"
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all"); // "all" | "none" | status ID
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>(""); // Filtru SKU sau nume produs
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

  // State pentru editare comandă
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState<{
    orderId: string;
    customerPhone: string;
    customerEmail: string;
    customerFirstName: string;
    customerLastName: string;
    shippingAddress1: string;
    shippingAddress2: string;
    shippingCity: string;
    shippingProvince: string;
    shippingZip: string;
    hasInvoice: boolean;
    hasAwb: boolean;
    invoiceNumber: string | null;
    awbNumber: string | null;
    acknowledgeDocumentsIssued: boolean;
  } | null>(null);

  // State pentru erori de procesare (in-session)
  const [processErrors, setProcessErrors] = useState<ProcessError[]>([]);
  const [errorsDialogOpen, setErrorsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State pentru manual order dialog
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);

  // State pentru transfer warning modal
  const [transferWarningOpen, setTransferWarningOpen] = useState(false);
  const [pendingInvoiceOrderIds, setPendingInvoiceOrderIds] = useState<string[]>([]);
  const [transferWarnings, setTransferWarnings] = useState<{
    orderId: string;
    orderNumber: string;
    transferNumber: string;
    transferStatus: string;
  }[]>([]);
  const [isIssuingWithAcknowledgment, setIsIssuingWithAcknowledgment] = useState(false);

  // State pentru tab-ul activ și erori persistente
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dbErrorStatusFilter, setDbErrorStatusFilter] = useState<string>("all");
  const [dbErrorTypeFilter, setDbErrorTypeFilter] = useState<string>("all");
  const [selectedDbErrors, setSelectedDbErrors] = useState<string[]>([]);

  const { data: ordersData, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["orders", statusFilter, storeFilter, channelTab, awbFilter, awbStatusFilter, internalStatusFilter, searchQuery, startDate, endDate, productFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      // Use channelTab as source filter (temu returns nothing since no orders exist)
      if (channelTab !== "temu") params.set("source", channelTab);
      if (awbFilter === "with") params.set("hasAwb", "true");
      if (awbFilter === "without") params.set("hasAwb", "false");
      if (awbFilter === "with" && awbStatusFilter !== "all") params.set("awbStatus", awbStatusFilter);
      if (internalStatusFilter !== "all") params.set("internalStatusId", internalStatusFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (productFilter) params.set("containsProduct", productFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('[Orders] API Error:', data);
        throw new Error(data.error || data.details || 'Eroare la incarcarea comenzilor');
      }
      return data;
    },
    enabled: channelTab !== "temu", // Disable query for Temu tab (placeholder)
  });

  // Shopify stores query (for Shopify tab)
  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });

  // Trendyol stores query (for Trendyol tab)
  const { data: trendyolStoresData } = useQuery({
    queryKey: ["trendyol-stores"],
    queryFn: async () => {
      const res = await fetch("/api/trendyol/stores");
      return res.json();
    },
    enabled: channelTab === "trendyol",
  });

  // Internal order statuses query (for filter dropdown)
  const { data: internalStatusesData } = useQuery({
    queryKey: ["order-statuses-active"],
    queryFn: async () => {
      const res = await fetch("/api/order-statuses?activeOnly=true");
      return res.json();
    },
  });
  const internalStatuses: { id: string; name: string; color: string }[] = internalStatusesData?.statuses || [];

  // Query pentru erori persistente din DB
  const { data: dbErrorsData, isLoading: dbErrorsLoading, refetch: refetchDbErrors } = useQuery({
    queryKey: ["processing-errors", dbErrorStatusFilter, dbErrorTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dbErrorStatusFilter !== "all") params.set("status", dbErrorStatusFilter);
      if (dbErrorTypeFilter !== "all") params.set("type", dbErrorTypeFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/processing-errors?${params}`);
      return res.json();
    },
    // Always enabled - error panel shows regardless of active tab
  });

  const invoiceMutation = useMutation({
    mutationFn: async ({ orderIds, acknowledgeTransferWarning }: { orderIds: string[]; acknowledgeTransferWarning?: boolean }) => {
      const res = await fetch("/api/invoices/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, acknowledgeTransferWarning }),
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Check if we need user confirmation for transfer warnings
      if (data.needsConfirmation && data.warnings?.length > 0) {
        // Store the order IDs and show warning modal
        setPendingInvoiceOrderIds(variables.orderIds);
        setTransferWarnings(
          data.warnings.map((w: { orderId: string; warning: { orderNumber?: string; transferNumber: string; transferStatus: string } }) => ({
            orderId: w.orderId,
            orderNumber: w.warning?.orderNumber || w.orderId,
            transferNumber: w.warning?.transferNumber || "?",
            transferStatus: w.warning?.transferStatus || "?",
          }))
        );
        setTransferWarningOpen(true);
        setIsIssuingWithAcknowledgment(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.success) {
        toast({ title: "Succes", description: `${data.issued} facturi emise` });
        // Actualizam viewOrder daca e deschis
        if (viewOrder && variables.orderIds.includes(viewOrder.id)) {
          // Reincarcam datele comenzii
          fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
            if (orderData.order) {
              setViewOrder(orderData.order);
            }
          });
        }
      } else {
        toast({ title: "Eroare facturare", description: data.error || "Verifica setarile Oblio", variant: "destructive" });
        // Actualizam si la eroare pentru a vedea mesajul
        if (viewOrder && variables.orderIds.includes(viewOrder.id)) {
          fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
            if (orderData.order) {
              setViewOrder(orderData.order);
            }
          });
        }
      }
      setSelectedOrders([]);
      setIsIssuingWithAcknowledgment(false);
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message || "Eroare la emiterea facturii", variant: "destructive" });
      setIsIssuingWithAcknowledgment(false);
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

  // Mutatie pentru actualizare status intern
  const updateInternalStatusMutation = useMutation({
    mutationFn: async ({ orderId, internalStatusId }: { orderId: string; internalStatusId: string | null }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalStatusId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
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
            messages.push(`🧾 ${inv.deleted} facturi șterse/anulate în Facturis`);
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

  // Trendyol sync mutation
  const syncTrendyolMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trendyol/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.success) {
        toast({
          title: "Sincronizare Trendyol",
          description: `${data.synced} comenzi sincronizate (${data.created} noi, ${data.updated} actualizate)`,
        });
      } else {
        toast({
          title: "Eroare Trendyol",
          description: data.error || "Eroare la sincronizare",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare sincronizare Trendyol", description: error.message, variant: "destructive" });
    },
  });

  // Create manual order mutation
  const createManualOrderMutation = useMutation({
    mutationFn: async (data: ManualOrderData) => {
      const res = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Comanda creata", description: `Comanda #${data.orderNumber} a fost creata` });
        setManualOrderDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
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

  // Mutație pentru actualizare date comandă
  const updateOrderMutation = useMutation({
    mutationFn: async (data: {
      orderId: string;
      customerPhone?: string;
      customerEmail?: string;
      customerFirstName?: string;
      customerLastName?: string;
      shippingAddress1?: string;
      shippingAddress2?: string;
      shippingCity?: string;
      shippingProvince?: string;
      shippingZip?: string;
      acknowledgeDocumentsIssued?: boolean;
    }) => {
      const res = await fetch(`/api/orders/${data.orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Comandă actualizată",
          description: data.shopifySynced
            ? "Datele au fost salvate și sincronizate în Shopify"
            : "Datele au fost salvate (sincronizarea în Shopify a eșuat)",
        });
        setEditOrderDialogOpen(false);
        setEditOrderData(null);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else if (data.requiresAcknowledgement) {
        // Trebuie să confirme că înțelege că are documente emise
        setEditOrderData((prev) =>
          prev
            ? {
                ...prev,
                hasInvoice: data.hasInvoice,
                hasAwb: data.hasAwb,
                invoiceNumber: data.invoiceNumber,
                awbNumber: data.awbNumber,
              }
            : null
        );
        toast({
          title: "Atenție",
          description: "Comanda are documente emise. Confirmă pentru a continua.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-au putut actualiza datele",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Mutații pentru retry și skip erori persistente
  const retryDbErrorMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const res = await fetch("/api/processing-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, action: "retry" }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: data.message || "Procesarea a reușit" });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Procesarea a eșuat",
          variant: "destructive"
        });
      }
      refetchDbErrors();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  const skipDbErrorMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const res = await fetch("/api/processing-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId, action: "skip" }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Succes", description: "Eroarea a fost sărită" });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
      refetchDbErrors();
    },
    onError: (error: any) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });

  // Bulk retry pentru erori selectate
  const handleBulkRetryDbErrors = async () => {
    if (selectedDbErrors.length === 0) {
      toast({ title: "Selectează erori", description: "Selectează cel puțin o eroare", variant: "destructive" });
      return;
    }

    for (const errorId of selectedDbErrors) {
      await retryDbErrorMutation.mutateAsync(errorId).catch(() => {});
    }
    setSelectedDbErrors([]);
  };

  // Bulk skip pentru erori selectate
  const handleBulkSkipDbErrors = async () => {
    if (selectedDbErrors.length === 0) {
      toast({ title: "Selectează erori", description: "Selectează cel puțin o eroare", variant: "destructive" });
      return;
    }

    for (const errorId of selectedDbErrors) {
      await skipDbErrorMutation.mutateAsync(errorId).catch(() => {});
    }
    setSelectedDbErrors([]);
  };

  const orders: Order[] = ordersData?.orders || [];

  // Source counts from API for channel tab badges
  const sourceCounts: ChannelCounts = ordersData?.sourceCounts || { shopify: 0, trendyol: 0, temu: 0 };

  // Channel-specific stores: Shopify stores for Shopify tab, TrendyolStores for Trendyol tab
  const shopifyStores: Store[] = storesData?.stores || [];
  const trendyolStores: Store[] = (trendyolStoresData?.stores || []).map((s: { id: string; name: string }) => ({
    id: s.id,
    name: s.name,
  }));
  const stores: Store[] = channelTab === "trendyol" ? trendyolStores : shopifyStores;

  const dbErrors: DBProcessingError[] = dbErrorsData?.errors || [];
  const dbErrorStats = dbErrorsData?.stats || { pending: 0, retrying: 0, failed: 0, resolved: 0, skipped: 0, total: 0 };
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const allDbErrorsSelected = dbErrors.length > 0 && selectedDbErrors.length === dbErrors.filter(e => e.status !== "RESOLVED" && e.status !== "SKIPPED").length;

  // Calculate errors by source for the error panel
  const errorsBySource = {
    shopify: [...processErrors, ...dbErrors].filter(e => {
      const orderId = 'orderId' in e ? e.orderId : null;
      const order = orders.find(o => o.id === orderId);
      // For db errors, check order.source from included relation
      if ('order' in e && (e as DBProcessingError).order?.source) return (e as DBProcessingError).order.source === 'shopify';
      return order?.source === 'shopify' || !order?.source; // Default to shopify
    }).length,
    trendyol: [...processErrors, ...dbErrors].filter(e => {
      const orderId = 'orderId' in e ? e.orderId : null;
      const order = orders.find(o => o.id === orderId);
      if ('order' in e && (e as DBProcessingError).order?.source) return (e as DBProcessingError).order.source === 'trendyol';
      return order?.source === 'trendyol';
    }).length,
    unknown: 0,
  };

  // Helper to check if an order has an error (for inline badge)
  const hasOrderError = (orderId: string) => {
    return processErrors.some(e => e.orderId === orderId) ||
           dbErrors.some(e => e.orderId === orderId && e.status !== 'RESOLVED' && e.status !== 'SKIPPED');
  };

  // Handle channel tab change with URL persistence and store filter reset
  const handleChannelTabChange = useCallback((newTab: ChannelTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.delete('page'); // Reset to page 1 when switching tabs

    // Check if current store filter is valid for new channel, reset if not
    const newChannelStores = newTab === "trendyol" ? trendyolStores : shopifyStores;
    const currentStoreValid = storeFilter === "all" || newChannelStores.some(s => s.id === storeFilter);
    if (!currentStoreValid) {
      setStoreFilter("all");
    }

    router.push(`/orders?${params.toString()}`);
  }, [searchParams, router, storeFilter, trendyolStores, shopifyStores]);

  const handleSelectAll = () => {
    setSelectedOrders(allSelected ? [] : orders.map((o) => o.id));
  };

  const handleViewOrder = (order: Order) => {
    setViewOrder(order);
    setViewModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditOrderData({
      orderId: order.id,
      customerPhone: order.customerPhone || "",
      customerEmail: order.customerEmail || "",
      customerFirstName: order.customerFirstName || "",
      customerLastName: order.customerLastName || "",
      shippingAddress1: order.shippingAddress1 || "",
      shippingAddress2: order.shippingAddress2 || "",
      shippingCity: order.shippingCity || "",
      shippingProvince: order.shippingProvince || "",
      shippingZip: order.shippingZip || "",
      hasInvoice: !!(order.invoice && order.invoice.status === "issued"),
      hasAwb: !!(order.awb && order.awb.awbNumber),
      invoiceNumber: order.invoice ? `${order.invoice.invoiceSeriesName || ''}${order.invoice.invoiceNumber || ''}` : null,
      awbNumber: order.awb?.awbNumber || null,
      acknowledgeDocumentsIssued: false,
    });
    setEditOrderDialogOpen(true);
  };

  const handleSaveOrderEdit = () => {
    if (!editOrderData) return;

    updateOrderMutation.mutate({
      orderId: editOrderData.orderId,
      customerPhone: editOrderData.customerPhone,
      customerEmail: editOrderData.customerEmail,
      customerFirstName: editOrderData.customerFirstName,
      customerLastName: editOrderData.customerLastName,
      shippingAddress1: editOrderData.shippingAddress1,
      shippingAddress2: editOrderData.shippingAddress2,
      shippingCity: editOrderData.shippingCity,
      shippingProvince: editOrderData.shippingProvince,
      shippingZip: editOrderData.shippingZip,
      acknowledgeDocumentsIssued: editOrderData.acknowledgeDocumentsIssued,
    });
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleIssueInvoices = () => {
    if (selectedOrders.length === 0) {
      toast({ title: "Selecteaza comenzi", description: "Selecteaza cel putin o comanda", variant: "destructive" });
      return;
    }
    invoiceMutation.mutate({ orderIds: selectedOrders });
  };

  // Handler for transfer warning modal confirmation
  const handleTransferWarningConfirm = () => {
    setTransferWarningOpen(false);
    setIsIssuingWithAcknowledgment(true);
    // Retry with acknowledgment flag
    invoiceMutation.mutate({ orderIds: pendingInvoiceOrderIds, acknowledgeTransferWarning: true });
  };

  // Handler for transfer warning modal cancel
  const handleTransferWarningCancel = () => {
    setTransferWarningOpen(false);
    setPendingInvoiceOrderIds([]);
    setTransferWarnings([]);
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
    if (status === "PASSED") return <CheckCircle2 className="h-4 w-4 text-status-success" />;
    if (status === "FAILED") return <XCircle className="h-4 w-4 text-status-error" />;
    return <AlertTriangle className="h-4 w-4 text-status-warning" />;
  };

  return (
    <TooltipProvider>
    <ErrorModalComponent />
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Comenzi"
        description="Gestionează comenzile din toate magazinele"
        actions={
          <>
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
            <ActionTooltip
              action="Sincronizeaza comenzi Shopify"
              consequence="Se importa comenzile noi din Shopify"
              disabled={syncMutation.isPending}
              disabledReason="Sincronizare in curs..."
            >
              <Button onClick={() => syncMutation.mutate()} loading={syncMutation.isPending} size="sm" className="md:size-default">
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sync Shopify</span>
              </Button>
            </ActionTooltip>
            <ActionTooltip
              action="Sincronizeaza comenzi Trendyol"
              consequence="Se importa comenzile din ultimele 7 zile din Trendyol"
              disabled={syncTrendyolMutation.isPending}
              disabledReason="Sincronizare Trendyol in curs..."
            >
              <Button onClick={() => syncTrendyolMutation.mutate()} loading={syncTrendyolMutation.isPending} variant="outline" size="sm" className="md:size-default">
                <ShoppingBag className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sync Trendyol</span>
              </Button>
            </ActionTooltip>
          </>
        }
      />


      {/* Channel Tabs - Shopify / Trendyol / Temu */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <ChannelTabs
          activeTab={channelTab}
          counts={sourceCounts}
          onTabChange={handleChannelTabChange}
        />
        {channelTab === 'shopify' && (
          <RequirePermission permission="orders.create">
            <ActionTooltip
              action="Creeaza comanda manuala"
              consequence="Pentru comenzi telefonice sau offline"
            >
              <Button onClick={() => setManualOrderDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Creare comanda
              </Button>
            </ActionTooltip>
          </RequirePermission>
        )}
      </div>

      {/* Show TemuPlaceholder when Temu tab is active, full orders UI for other channels */}
      {channelTab === "temu" ? (
        <TemuPlaceholder />
      ) : (
      <>
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
            {/* Source filter removed - using ChannelTabs above instead */}
            <Select value={awbFilter} onValueChange={(v) => { setAwbFilter(v); if (v !== "with") setAwbStatusFilter("all"); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="AWB" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate AWB</SelectItem>
                <SelectItem value="with">Cu AWB emis</SelectItem>
                <SelectItem value="without">Fara AWB</SelectItem>
              </SelectContent>
            </Select>
            {awbFilter === "with" && (
              <Select value={awbStatusFilter} onValueChange={(v) => { setAwbStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status AWB" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate statusurile</SelectItem>
                  <SelectItem value="tranzit">In tranzit</SelectItem>
                  <SelectItem value="livrat">Livrate</SelectItem>
                  <SelectItem value="retur">Retururi</SelectItem>
                  <SelectItem value="pending">In asteptare</SelectItem>
                  <SelectItem value="anulat">Anulate</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Internal status filter */}
            <Select value={internalStatusFilter} onValueChange={(v) => { setInternalStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <SelectValue placeholder="Status intern" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate statusurile</SelectItem>
                <SelectItem value="none">Fara status intern</SelectItem>
                {internalStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtre pe date și produs */}
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

            {/* Filtru produs (SKU sau nume) */}
            <div className="flex items-center gap-2 ml-4 border-l pl-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtru SKU sau nume produs..."
                value={productFilter}
                onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
                className="w-[220px]"
              />
              {productFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setProductFilter(""); setPage(1); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
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
              <ActionTooltip
                action="Emite facturi pentru comenzile selectate"
                consequence="Se trimit catre Oblio"
                disabled={invoiceMutation.isPending}
                disabledReason="Se proceseaza..."
              >
                <Button size="sm" variant="outline" onClick={handleIssueInvoices} disabled={invoiceMutation.isPending}>
                  <FileText className="h-4 w-4 mr-2" />
                  {invoiceMutation.isPending ? "Se emit..." : "Emite Facturi"}
                </Button>
              </ActionTooltip>
            </RequirePermission>
            <RequirePermission permission="awb.create">
              <ActionTooltip
                action="Creeaza AWB-uri pentru comenzile selectate"
                consequence="Se genereaza in SelfAWB"
                disabled={awbMutation.isPending}
                disabledReason="Se proceseaza..."
              >
                <Button size="sm" variant="outline" onClick={() => handleOpenAwbModal()} disabled={awbMutation.isPending}>
                  <Truck className="h-4 w-4 mr-2" />
                  {awbMutation.isPending ? "Se creează..." : "Creează AWB"}
                </Button>
              </ActionTooltip>
            </RequirePermission>
            <RequirePermission permission="orders.process">
              <ActionTooltip
                action="Proceseaza complet comenzile selectate"
                consequence="Factura + AWB pentru fiecare"
                disabled={processAllMutation.isPending}
                disabledReason="Se proceseaza..."
              >
                <Button
                  size="sm"
                  onClick={() => processAllMutation.mutate(selectedOrders)}
                  disabled={processAllMutation.isPending}
                  variant="success"
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
              </ActionTooltip>
            </RequirePermission>
          </div>
        </div>
      )}

      {/* Collapsible error panel - shows ALL errors regardless of tab */}
      <ProcessingErrorsPanel
        errors={processErrors}
        dbErrors={dbErrors}
        isLoading={dbErrorsLoading}
        errorsBySource={errorsBySource}
        onRetryError={(errorId) => {
          // Check if this is a session error (has orderId directly) or db error (has id)
          const sessionError = processErrors.find(e => e.orderId === errorId);
          if (sessionError) {
            processAllMutation.mutate([sessionError.orderId]);
          } else {
            retryDbErrorMutation.mutate(errorId);
          }
        }}
        onSkipError={(errorId) => {
          skipDbErrorMutation.mutate(errorId);
        }}
        onRetryAll={() => {
          // Retry all session errors first
          if (processErrors.length > 0) {
            processAllMutation.mutate(processErrors.map(e => e.orderId));
          }
          // Then retry all db errors
          const activeDbErrors = dbErrors.filter(e => e.status !== 'RESOLVED' && e.status !== 'SKIPPED');
          activeDbErrors.forEach(e => retryDbErrorMutation.mutate(e.id));
        }}
        onClearSessionErrors={() => setProcessErrors([])}
        isRetrying={processAllMutation.isPending || retryDbErrorMutation.isPending}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Toate comenzile</TabsTrigger>
          <TabsTrigger value="errors" className="relative">
            Erori de procesare
            {(dbErrorStats.pending + dbErrorStats.retrying + dbErrorStats.failed) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {dbErrorStats.pending + dbErrorStats.retrying + dbErrorStats.failed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
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
                  <th className="p-4 text-left text-sm font-medium">Status Intern</th>
                  <th className="p-4 text-left text-sm font-medium">Factură</th>
                  <th className="p-4 text-left text-sm font-medium">AWB</th>
                  <th className="p-4 text-left text-sm font-medium">Sync Status</th>
                  <th className="p-4 text-left text-sm font-medium">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={10} className="p-0">
                          <SkeletonTableRow cols={9} />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : orders.length === 0 ? (
                  (() => {
                    const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || storeFilter !== "all" || awbFilter !== "all" || awbStatusFilter !== "all" || internalStatusFilter !== "all" || startDate !== "" || endDate !== "";
                    const emptyStateType = determineEmptyStateType(hasActiveFilters, ordersError);
                    const emptyConfig = getEmptyState("orders", emptyStateType);
                    const clearFilters = () => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setStoreFilter("all");
                      setAwbFilter("all");
                      setAwbStatusFilter("all");
                      setInternalStatusFilter("all");
                      setStartDate("");
                      setEndDate("");
                    };
                    return (
                      <tr>
                        <td colSpan={10}>
                          <EmptyState
                            icon={emptyConfig.icon}
                            title={emptyConfig.title}
                            description={emptyConfig.description}
                            action={emptyConfig.action?.href ? {
                              label: emptyConfig.action.label,
                              href: emptyConfig.action.href
                            } : emptyConfig.action?.onClick === "clearFilters" ? {
                              label: emptyConfig.action.label,
                              onClick: clearFilters
                            } : emptyConfig.action?.onClick === "refresh" ? {
                              label: emptyConfig.action.label,
                              onClick: () => refetchOrders()
                            } : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })()
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
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{order.store.name}</Badge>
                          <Badge
                            variant={order.source === "trendyol" ? "secondary" : "default"}
                            className={cn("text-xs", order.source === "trendyol" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "")}
                          >
                            {order.source === "trendyol" ? "Trendyol" : "Shopify"}
                          </Badge>
                        </div>
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
                      <td className="p-4">
                        <div className="relative inline-flex items-center">
                          <Badge variant={statusConfig[order.status]?.variant || "default"}>{statusConfig[order.status]?.label || order.status}</Badge>
                          {hasOrderError(order.id) && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-status-error rounded-full border-2 border-background" title="Eroare de procesare" />
                          )}
                        </div>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={order.internalStatus?.id || "none"}
                          onValueChange={(v) => updateInternalStatusMutation.mutate({
                            orderId: order.id,
                            internalStatusId: v === "none" ? null : v,
                          })}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            {order.internalStatus ? (
                              <OrderStatusBadge status={order.internalStatus} />
                            ) : (
                              <span className="text-muted-foreground">Selecteaza...</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">Fara status</span>
                            </SelectItem>
                            {internalStatuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                                  {status.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        {order.invoice ? (
                          order.invoice.status === "issued" ? (
                            <Badge variant="success">{order.invoice.invoiceSeriesName}{order.invoice.invoiceNumber}</Badge>
                          ) : order.invoice.status === "deleted" ? (
                            <Badge variant="neutral" title={order.invoice.errorMessage || "Factură ștearsă în Facturis"}>🗑️ Ștearsă</Badge>
                          ) : order.invoice.status === "cancelled" ? (
                            <Badge variant="warning" title={order.invoice.errorMessage || "Factură anulată în Facturis"}>❌ Anulată</Badge>
                          ) : order.invoice.status === "error" ? (
                            <Badge variant="destructive" title={order.invoice.errorMessage || ""}>Eroare</Badge>
                          ) : (
                            <Badge variant="neutral" title={order.invoice.errorMessage || ""}>În așteptare</Badge>
                          )
                        ) : (
                          <ActionTooltip
                            action="Genereaza factura"
                            consequence="Se trimite catre Oblio"
                            disabled={invoiceMutation.isPending}
                            disabledReason="Se proceseaza..."
                          >
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); invoiceMutation.mutate({ orderIds: [order.id] }); }} disabled={invoiceMutation.isPending}><FileText className="h-4 w-4" /></Button>
                          </ActionTooltip>
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
                                    awbInfo.isCancelled && "text-status-error",
                                    awbInfo.isReturned && "text-status-warning",
                                    awbInfo.isDelivered && "text-status-success",
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
                          <ActionTooltip
                            action="Creeaza AWB"
                            consequence="Se genereaza AWB in SelfAWB"
                            disabled={awbMutation.isPending}
                            disabledReason="Se proceseaza..."
                          >
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenAwbModal(order.id); }} disabled={awbMutation.isPending}><Truck className="h-4 w-4" /></Button>
                          </ActionTooltip>
                        )}
                      </td>
                      <td className="p-4">
                        {order.source === "trendyol" && order.trendyolOrder ? (
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger>
                                <FileText className={cn("h-4 w-4", order.trendyolOrder.invoiceSentToTrendyol ? "text-status-success" : order.trendyolOrder.invoiceSendError ? "text-status-error" : "text-muted-foreground")} />
                              </TooltipTrigger>
                              <TooltipContent>
                                {order.trendyolOrder.invoiceSentToTrendyol ? "Factura trimisa la Trendyol" : order.trendyolOrder.invoiceSendError ? `Eroare: ${order.trendyolOrder.invoiceSendError}` : "Factura netrimisa"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <Truck className={cn("h-4 w-4", order.trendyolOrder.trackingSentToTrendyol ? "text-status-success" : order.trendyolOrder.trackingSendError ? "text-status-error" : "text-muted-foreground")} />
                              </TooltipTrigger>
                              <TooltipContent>
                                {order.trendyolOrder.trackingSentToTrendyol ? `AWB trimis: ${order.trendyolOrder.localAwbNumber || "Da"}` : order.trendyolOrder.trackingSendError ? `Eroare: ${order.trendyolOrder.trackingSendError}` : "AWB netrimis"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : order.source === "shopify" ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <ActionTooltip action="Vezi detalii comanda">
                            <Button size="sm" variant="ghost" onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4" /></Button>
                          </ActionTooltip>
                          <RequirePermission permission="orders.edit">
                            <ActionTooltip action="Editeaza comanda" consequence="Modificarile se salveaza">
                              <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)}><Pencil className="h-4 w-4" /></Button>
                            </ActionTooltip>
                          </RequirePermission>
                        </div>
                      </td>
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
        </TabsContent>

        {/* Tab Erori de Procesare */}
        <TabsContent value="errors" className="space-y-4">
          {/* Statistici erori */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-status-warning">{dbErrorStats.pending}</div>
              <div className="text-sm text-muted-foreground">În așteptare</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-status-info">{dbErrorStats.retrying}</div>
              <div className="text-sm text-muted-foreground">Se reîncearcă</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-status-error">{dbErrorStats.failed}</div>
              <div className="text-sm text-muted-foreground">Eșuate</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-status-success">{dbErrorStats.resolved}</div>
              <div className="text-sm text-muted-foreground">Rezolvate</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-gray-600">{dbErrorStats.skipped}</div>
              <div className="text-sm text-muted-foreground">Sărite</div>
            </Card>
          </div>

          {/* Filtre și acțiuni bulk */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={dbErrorStatusFilter} onValueChange={setDbErrorStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status eroare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate statusurile</SelectItem>
                  <SelectItem value="PENDING">În așteptare</SelectItem>
                  <SelectItem value="RETRYING">Se reîncearcă</SelectItem>
                  <SelectItem value="FAILED">Eșuate</SelectItem>
                  <SelectItem value="RESOLVED">Rezolvate</SelectItem>
                  <SelectItem value="SKIPPED">Sărite</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dbErrorTypeFilter} onValueChange={setDbErrorTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tip eroare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate tipurile</SelectItem>
                  <SelectItem value="INVOICE">Factură</SelectItem>
                  <SelectItem value="AWB">AWB</SelectItem>
                </SelectContent>
              </Select>

              {selectedDbErrors.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">{selectedDbErrors.length} selectate</span>
                  <Button
                    size="sm"
                    onClick={handleBulkRetryDbErrors}
                    disabled={retryDbErrorMutation.isPending}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", retryDbErrorMutation.isPending && "animate-spin")} />
                    Reîncearcă
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkSkipDbErrors}
                    disabled={skipDbErrorMutation.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Sari peste
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Tabel erori */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left">
                        <Checkbox
                          checked={allDbErrorsSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDbErrors(dbErrors.filter(e => e.status !== "RESOLVED" && e.status !== "SKIPPED").map(e => e.id));
                            } else {
                              setSelectedDbErrors([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-4 text-left text-sm font-medium">Comandă</th>
                      <th className="p-4 text-left text-sm font-medium">Tip</th>
                      <th className="p-4 text-left text-sm font-medium">Eroare</th>
                      <th className="p-4 text-left text-sm font-medium">Status</th>
                      <th className="p-4 text-left text-sm font-medium">Încercări</th>
                      <th className="p-4 text-left text-sm font-medium">Data</th>
                      <th className="p-4 text-left text-sm font-medium">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbErrorsLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Se încarcă...</p>
                        </td>
                      </tr>
                    ) : dbErrors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                          <p className="text-muted-foreground">Nu există erori de procesare</p>
                        </td>
                      </tr>
                    ) : (
                      dbErrors.map((error) => (
                        <tr
                          key={error.id}
                          className={cn(
                            "border-b hover:bg-muted/50 transition-colors",
                            selectedDbErrors.includes(error.id) && "bg-primary/5"
                          )}
                        >
                          <td className="p-4">
                            {error.status !== "RESOLVED" && error.status !== "SKIPPED" && (
                              <Checkbox
                                checked={selectedDbErrors.includes(error.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDbErrors([...selectedDbErrors, error.id]);
                                  } else {
                                    setSelectedDbErrors(selectedDbErrors.filter(id => id !== error.id));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{error.order.shopifyOrderNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {error.order.customerFirstName} {error.order.customerLastName}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">{error.order.store.name}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={error.type === "INVOICE" ? "default" : "info"} className="gap-1">
                              {error.type === "INVOICE" ? <FileText className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                              {error.type === "INVOICE" ? "Factură" : "AWB"}
                            </Badge>
                          </td>
                          <td className="p-4 max-w-xs">
                            <p className="text-sm text-status-error line-clamp-2" title={error.errorMessage || ""}>
                              {error.errorMessage || "Eroare necunoscută"}
                            </p>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                error.status === "PENDING" ? "warning" :
                                error.status === "RETRYING" ? "info" :
                                error.status === "FAILED" ? "destructive" :
                                error.status === "RESOLVED" ? "success" :
                                "neutral"
                              }
                            >
                              {error.status === "PENDING" && "În așteptare"}
                              {error.status === "RETRYING" && "Se reîncearcă"}
                              {error.status === "FAILED" && "Eșuat"}
                              {error.status === "RESOLVED" && "Rezolvat"}
                              {error.status === "SKIPPED" && "Sărit"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{error.retryCount} / {error.maxRetries}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">{formatDate(error.createdAt)}</div>
                            {error.lastRetryAt && (
                              <div className="text-xs text-muted-foreground">
                                Ultima încercare: {formatDate(error.lastRetryAt)}
                              </div>
                            )}
                            {error.resolvedAt && (
                              <div className="text-xs text-status-success">
                                Rezolvat: {formatDate(error.resolvedAt)}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {error.status !== "RESOLVED" && error.status !== "SKIPPED" && (
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => retryDbErrorMutation.mutate(error.id)}
                                      disabled={retryDbErrorMutation.isPending}
                                    >
                                      <RefreshCw className={cn("h-4 w-4", retryDbErrorMutation.isPending && "animate-spin")} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reîncearcă</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => skipDbErrorMutation.mutate(error.id)}
                                      disabled={skipDbErrorMutation.isPending}
                                    >
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Sari peste</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                            {error.status === "RESOLVED" && error.resolvedByName && (
                              <span className="text-xs text-muted-foreground">
                                de {error.resolvedByName}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
      )}

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
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-status-error" />
                    )}
                    <span className="text-sm">{viewOrder.phoneValidationMsg || "Telefon"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {viewOrder.addressValidation === "PASSED" ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-status-error" />
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
                      <Badge variant="success">{viewOrder.invoice.invoiceSeriesName}{viewOrder.invoice.invoiceNumber}</Badge>
                    ) : viewOrder.invoice.status === "deleted" ? (
                      <div className="space-y-2">
                        <Badge variant="neutral">🗑️ Ștearsă</Badge>
                        <p className="text-sm text-muted-foreground">{viewOrder.invoice.errorMessage}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate({ orderIds: [viewOrder.id] });
                          }}
                          disabled={invoiceMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Emite din nou
                        </Button>
                      </div>
                    ) : viewOrder.invoice.status === "cancelled" ? (
                      <div className="space-y-2">
                        <Badge variant="warning">Anulata</Badge>
                        <p className="text-sm text-muted-foreground">{viewOrder.invoice.errorMessage}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate({ orderIds: [viewOrder.id] });
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
                        <p className="text-sm text-status-error mt-1 max-h-20 overflow-y-auto">{viewOrder.invoice.errorMessage}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            invoiceMutation.mutate({ orderIds: [viewOrder.id] });
                          }}
                          disabled={invoiceMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Incearca din nou
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">Nu a fost emisa</span>
                      <RequirePermission permission="invoices.create">
                        <div>
                          <Button
                            size="sm"
                            onClick={() => {
                              invoiceMutation.mutate({ orderIds: [viewOrder.id] });
                            }}
                            disabled={invoiceMutation.isPending}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Emite factura
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
                              awbInfo.isCancelled && "bg-status-error/10 text-status-error",
                              awbInfo.isReturned && "bg-status-warning/10 text-status-warning",
                              awbInfo.isDelivered && "bg-status-success/10 text-status-success",
                              !awbInfo.isDeleted && !awbInfo.isCancelled && !awbInfo.isReturned && !awbInfo.isDelivered && "bg-status-info/10 text-status-info"
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
                                className="text-status-error hover:text-status-error/80 hover:bg-status-error/10"
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
                      <div className="p-2 bg-status-error/10 rounded-lg">
                        <p className="text-sm text-status-error max-h-20 overflow-y-auto whitespace-pre-wrap">{viewOrder.awb.errorMessage}</p>
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

              {/* Trendyol Status - only show for Trendyol orders when invoice is issued or AWB exists */}
              {viewOrder.source === "trendyol" && (viewOrder.invoice?.status === "issued" || viewOrder.awb?.awbNumber) && (
                <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <ExternalLink className="h-4 w-4" />
                    Status Trendyol
                  </h4>
                  <div className="space-y-3">
                    {/* Invoice status */}
                    {viewOrder.invoice?.status === "issued" && (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-orange-900 dark:text-orange-200">Factura trimisa:</span>
                          {viewOrder.trendyolOrder?.invoiceSentToTrendyol ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Da
                            </Badge>
                          ) : viewOrder.trendyolOrder?.invoiceSendError ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="gap-1 cursor-help">
                                    <XCircle className="h-3 w-3" />
                                    Eroare
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">{viewOrder.trendyolOrder.invoiceSendError}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              In asteptare
                            </Badge>
                          )}
                        </div>
                        {viewOrder.trendyolOrder?.invoiceSentAt && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Trimisa la: {new Date(viewOrder.trendyolOrder.invoiceSentAt).toLocaleString('ro-RO')}
                          </p>
                        )}
                        {viewOrder.trendyolOrder?.oblioInvoiceLink && (
                          <a
                            href={viewOrder.trendyolOrder.oblioInvoiceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 dark:text-orange-400 mt-1 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Vezi factura
                          </a>
                        )}
                      </div>
                    )}

                    {/* AWB tracking status */}
                    {viewOrder.awb?.awbNumber && (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-orange-900 dark:text-orange-200">AWB trimis:</span>
                          {viewOrder.trendyolOrder?.trackingSentToTrendyol ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Da ({viewOrder.trendyolOrder.localAwbNumber})
                            </Badge>
                          ) : viewOrder.trendyolOrder?.trackingSendError ? (
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="gap-1 cursor-help">
                                      <XCircle className="h-3 w-3" />
                                      Eroare
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{viewOrder.trendyolOrder.trackingSendError}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  fetch("/api/trendyol", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "retrySendTracking", orderId: viewOrder.id }),
                                  })
                                    .then(res => res.json())
                                    .then(data => {
                                      if (data.success) {
                                        toast({ title: "Succes", description: "AWB trimis catre Trendyol" });
                                        // Refresh order data
                                        fetch(`/api/orders/${viewOrder.id}`).then(res => res.json()).then(orderData => {
                                          if (orderData.order) setViewOrder(orderData.order);
                                        });
                                      } else {
                                        toast({ title: "Eroare", description: data.error || "Nu s-a putut trimite AWB", variant: "destructive" });
                                      }
                                    })
                                    .catch(() => {
                                      toast({ title: "Eroare", description: "Eroare de retea", variant: "destructive" });
                                    });
                                }}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reincearca
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              In asteptare
                            </Badge>
                          )}
                        </div>
                        {viewOrder.trendyolOrder?.trackingSentAt && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Trimis la: {new Date(viewOrder.trendyolOrder.trackingSentAt).toLocaleString('ro-RO')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Produse comandă */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produse ({viewOrder.lineItems?.length || 0})
                </h4>

                {/* Empty state warning */}
                {viewOrder.lineItems && viewOrder.lineItems.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Comanda nu are produse. Aceasta poate indica o problema de sincronizare.</span>
                  </div>
                )}

                {/* Line items as cards */}
                {viewOrder.lineItems && viewOrder.lineItems.length > 0 && (
                  <div className="space-y-3">
                    {viewOrder.lineItems.map((item: any) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Product image */}
                            <div className="flex-shrink-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-16 h-16 object-cover rounded-md border"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-muted rounded-md border flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm line-clamp-2">{item.title}</h5>
                              {item.variantTitle && item.variantTitle !== "Default Title" && (
                                <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                              )}
                              <p className="font-mono text-xs text-muted-foreground mt-1">
                                SKU: {item.sku || '-'}
                              </p>
                            </div>

                            {/* Quantity and price */}
                            <div className="text-right flex-shrink-0">
                              <p className="font-medium">{item.quantity}x</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(parseFloat(item.price), viewOrder.currency)}
                              </p>
                              <p className="text-sm font-medium mt-1">
                                {formatCurrency(parseFloat(item.price) * item.quantity, viewOrder.currency)}
                              </p>
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="flex gap-2 mt-3 pt-3 border-t">
                            {item.sku && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    window.location.href = `/products?search=${encodeURIComponent(item.sku)}`;
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Vezi Produs
                                </Button>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                      >
                                        <BoxIcon className="h-3 w-3 mr-1" />
                                        Stoc
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <StockTooltipContent sku={item.sku} />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Total row */}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-2">Total produse:</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            viewOrder.lineItems.reduce((sum: number, item: any) =>
                              sum + parseFloat(item.price) * item.quantity, 0
                            ),
                            viewOrder.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
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
            <DialogTitle className="flex items-center gap-2 text-status-error">
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
                  className="p-4 border rounded-lg bg-status-error/10 border-status-error/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-status-error">{error.orderNumber}</span>
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
                      className="border-status-error/30 text-status-error hover:bg-status-error/10"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", processAllMutation.isPending && "animate-spin")} />
                      Reîncearcă
                    </Button>
                  </div>

                  <div className="space-y-1 text-sm">
                    {error.invoiceError && (
                      <div className="flex items-start gap-2 text-status-error">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error.invoiceError}</span>
                      </div>
                    )}
                    {error.awbError && (
                      <div className="flex items-start gap-2 text-status-error">
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
              className="bg-status-error hover:bg-status-error/90"
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
            <AlertDialogTitle>Stergi AWB-ul?</AlertDialogTitle>
            <AlertDialogDescription>
              Esti sigur ca vrei sa stergi AWB-ul {awbToDelete?.awbNumber}?
              Aceasta actiune este ireversibila.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuleaza</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-error hover:bg-status-error/90"
              onClick={() => {
                if (awbToDelete) {
                  deleteAwbMutation.mutate(awbToDelete.id);
                }
                setDeleteAwbDialogOpen(false);
                setAwbToDelete(null);
              }}
            >
              Sterge AWB
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Warning Modal */}
      <TransferWarningModal
        open={transferWarningOpen}
        onOpenChange={setTransferWarningOpen}
        transfers={transferWarnings}
        onConfirm={handleTransferWarningConfirm}
        onCancel={handleTransferWarningCancel}
        isLoading={isIssuingWithAcknowledgment || invoiceMutation.isPending}
      />

      {/* Dialog pentru editare comanda */}
      <Dialog open={editOrderDialogOpen} onOpenChange={(open) => {
        setEditOrderDialogOpen(open);
        if (!open) setEditOrderData(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editare date comandă</DialogTitle>
            <DialogDescription>
              Modificările vor fi sincronizate automat în Shopify cu un comentariu audit.
            </DialogDescription>
          </DialogHeader>

          {editOrderData && (
            <div className="space-y-4 py-4">
              {/* Warning pentru documente emise */}
              {(editOrderData.hasInvoice || editOrderData.hasAwb) && (
                <div className="p-4 rounded-lg bg-status-warning/10 border border-status-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-status-warning">Atenție: Comanda are documente emise</p>
                      <ul className="text-sm text-status-warning/80 mt-1 space-y-1">
                        {editOrderData.hasInvoice && (
                          <li>Factură: {editOrderData.invoiceNumber}</li>
                        )}
                        {editOrderData.hasAwb && (
                          <li>AWB: {editOrderData.awbNumber}</li>
                        )}
                      </ul>
                      <p className="text-sm text-status-warning/80 mt-2">
                        Modificarea datelor poate necesita re-emiterea documentelor.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <Checkbox
                          id="acknowledgeDocuments"
                          checked={editOrderData.acknowledgeDocumentsIssued}
                          onCheckedChange={(checked) =>
                            setEditOrderData((prev) =>
                              prev ? { ...prev, acknowledgeDocumentsIssued: !!checked } : null
                            )
                          }
                        />
                        <Label htmlFor="acknowledgeDocuments" className="text-sm text-status-warning cursor-pointer">
                          Înțeleg și doresc să continui cu modificarea
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Câmpuri de editare */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prenume</Label>
                  <Input
                    value={editOrderData.customerFirstName}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, customerFirstName: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nume</Label>
                  <Input
                    value={editOrderData.customerLastName}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, customerLastName: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={editOrderData.customerPhone}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, customerPhone: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editOrderData.customerEmail}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, customerEmail: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresă 1</Label>
                <Input
                  value={editOrderData.shippingAddress1}
                  onChange={(e) =>
                    setEditOrderData((prev) =>
                      prev ? { ...prev, shippingAddress1: e.target.value } : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Adresă 2 (opțional)</Label>
                <Input
                  value={editOrderData.shippingAddress2}
                  onChange={(e) =>
                    setEditOrderData((prev) =>
                      prev ? { ...prev, shippingAddress2: e.target.value } : null
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Oraș</Label>
                  <Input
                    value={editOrderData.shippingCity}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, shippingCity: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Județ</Label>
                  <Input
                    value={editOrderData.shippingProvince}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, shippingProvince: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cod poștal</Label>
                  <Input
                    value={editOrderData.shippingZip}
                    onChange={(e) =>
                      setEditOrderData((prev) =>
                        prev ? { ...prev, shippingZip: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrderDialogOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleSaveOrderEdit}
              disabled={
                updateOrderMutation.isPending ||
                ((editOrderData?.hasInvoice || editOrderData?.hasAwb) &&
                  !editOrderData?.acknowledgeDocumentsIssued)
              }
            >
              {updateOrderMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Se salvează...
                </>
              ) : (
                "Salvează modificările"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Order Dialog */}
      <ManualOrderDialog
        open={manualOrderDialogOpen}
        onOpenChange={setManualOrderDialogOpen}
        stores={shopifyStores}
        onCreateOrder={(data) => createManualOrderMutation.mutate(data)}
        isCreating={createManualOrderMutation.isPending}
      />
    </div>
    </TooltipProvider>
  );
}
