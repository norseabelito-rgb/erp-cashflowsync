"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  AlertCircle,
  RotateCcw,
  Ban,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  History,
  Info,
} from "lucide-react";
import { getStatusCategory, type StatusCategory } from "@/lib/awb-status";
import { FANCOURIER_STATUSES, formatStatusForDisplay } from "@/lib/fancourier-statuses";
import { StatusExplanationModal } from "./status-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

interface AWBWithOrder {
  id: string;
  awbNumber: string | null;
  orderId: string;
  serviceType: string;
  paymentType: string;
  currentStatus: string;
  currentStatusDate: string | null;
  cashOnDelivery: string | null;
  errorMessage: string | null;
  createdAt: string;
  fanCourierStatusCode: string | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    customerPhone: string | null;
    shippingCity: string | null;
    shippingProvince: string | null;
    shippingAddress1: string | null;
    totalPrice: string;
    currency: string;
    status: string;
    store: {
      name: string;
    };
  };
  statusHistory: Array<{
    id: string;
    status: string;
    statusDate: string;
    location: string | null;
    description: string | null;
  }>;
}

interface StatusStat {
  code: string;
  name: string;
  description: string;
  color: string;
  count: number;
  isFinal: boolean;
}

interface StatsResponse {
  total: number;
  statusStats: StatusStat[];
  sumVerified: boolean;
}

// Configuratie vizuala pentru categorii (used for AWB card styling)
const categoryConfig: Record<StatusCategory, {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeVariant: "default" | "success" | "warning" | "destructive" | "outline";
  icon: React.ElementType;
}> = {
  pending: {
    label: "In asteptare",
    bgColor: "bg-status-warning/10",
    borderColor: "border-status-warning/20",
    textColor: "text-status-warning",
    badgeVariant: "warning",
    icon: Clock,
  },
  in_transit: {
    label: "In tranzit",
    bgColor: "bg-status-info/10",
    borderColor: "border-status-info/20",
    textColor: "text-status-info",
    badgeVariant: "default",
    icon: Truck,
  },
  delivered: {
    label: "Livrat",
    bgColor: "bg-status-success/10",
    borderColor: "border-status-success/20",
    textColor: "text-status-success",
    badgeVariant: "success",
    icon: CheckCircle2,
  },
  returned: {
    label: "Returnat",
    bgColor: "bg-status-warning/10",
    borderColor: "border-status-warning/20",
    textColor: "text-status-warning",
    badgeVariant: "warning",
    icon: RotateCcw,
  },
  cancelled: {
    label: "Anulat",
    bgColor: "bg-status-error/10",
    borderColor: "border-status-error/20",
    textColor: "text-status-error",
    badgeVariant: "destructive",
    icon: Ban,
  },
  deleted: {
    label: "Sters",
    bgColor: "bg-muted",
    borderColor: "border-border",
    textColor: "text-muted-foreground",
    badgeVariant: "outline",
    icon: Trash2,
  },
  error: {
    label: "Eroare",
    bgColor: "bg-status-error/10",
    borderColor: "border-status-error/30",
    textColor: "text-status-error",
    badgeVariant: "destructive",
    icon: AlertCircle,
  },
  unknown: {
    label: "Necunoscut",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    textColor: "text-muted-foreground",
    badgeVariant: "outline",
    icon: Package,
  },
};

// Helper to convert hex to Tailwind-safe style
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedAWBs, setExpandedAWBs] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<{
    code: string;
    name: string;
    description: string;
    action?: string;
    color: string;
    isFinal: boolean;
    category?: string;
  } | null>(null);

  // Open modal with status info
  const openStatusModal = (code: string) => {
    // Get status info from FANCOURIER_STATUSES
    const statusInfo = FANCOURIER_STATUSES[code];
    if (statusInfo) {
      const display = formatStatusForDisplay(code);
      setSelectedStatus({
        code,
        name: statusInfo.name,
        description: statusInfo.description,
        // KEY WIRING: action comes directly from FANCOURIER_STATUSES[code].action
        // This field was added in 07.5-01 Task 3 to fancourier-statuses.ts
        action: statusInfo.action,
        color: display.color,
        isFinal: statusInfo.isFinal,
        category: statusInfo.category,
      });
    } else {
      // Unknown status - no action available
      setSelectedStatus({
        code,
        name: "Status necunoscut",
        description: `Codul "${code}" nu este recunoscut in sistemul nostru. Aceasta poate fi un status nou de la FanCourier.`,
        action: undefined,
        color: "#9ca3af",
        isFinal: false,
      });
    }
  };

  // Fetch status stats from new API
  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["awb-stats"],
    queryFn: async () => {
      const res = await fetch("/api/awb/stats");
      return res.json();
    },
  });

  // Fetch AWBs
  const { data: awbsData, isLoading: awbsLoading } = useQuery({
    queryKey: ["awbs", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("showAll", "true"); // Arata toate AWB-urile
      params.set("noPagination", "true"); // Dezactiveaza paginarea pentru tracking
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/awb?${params}`);
      return res.json();
    },
  });

  const allAWBs: AWBWithOrder[] = awbsData?.awbs || [];

  // Filter AWBs by status code
  const filteredAwbs = useMemo(() => {
    if (!allAWBs.length) return [];
    if (statusFilter === "all") return allAWBs;

    if (statusFilter === "UNKNOWN") {
      // Match AWBs where code is null or not in FANCOURIER_STATUSES
      return allAWBs.filter(awb =>
        !awb.fanCourierStatusCode || !FANCOURIER_STATUSES[awb.fanCourierStatusCode]
      );
    }

    return allAWBs.filter(awb => awb.fanCourierStatusCode === statusFilter);
  }, [allAWBs, statusFilter]);

  const isLoading = statsLoading || awbsLoading;

  const toggleExpanded = (awbId: string) => {
    setExpandedAWBs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(awbId)) {
        newSet.delete(awbId);
      } else {
        newSet.add(awbId);
      }
      return newSet;
    });
  };

  const getAWBCardStyles = (awb: AWBWithOrder) => {
    const category = getStatusCategory(awb.currentStatus);
    const config = categoryConfig[category];

    // Daca are eroare, override cu stil de eroare
    if (awb.errorMessage && category !== 'error') {
      return {
        cardClass: cn(config.bgColor, config.borderColor, "border-2"),
        hasError: true,
      };
    }

    return {
      cardClass: cn(config.bgColor, config.borderColor, "border-2"),
      hasError: false,
    };
  };

  // Get status name for display in filter info
  const getSelectedStatusName = (): string => {
    if (statusFilter === "all") return "";
    if (statusFilter === "UNKNOWN") return "Necunoscut";
    const stat = statsData?.statusStats.find(s => s.code === statusFilter);
    return stat?.name || statusFilter;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tracking AWB</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Urmareste toate expedierile si istoricul lor complet
          </p>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          Foloseste butonul <strong>Sincronizare</strong> din sidebar pentru a actualiza statusurile
        </p>
      </div>

      {/* Stats Grid - Dynamic from API */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Total card - always first */}
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md min-w-[100px]",
            statusFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{statsData?.total ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        {/* Dynamic status cards from API */}
        {statsData?.statusStats.map((stat) => (
          <Card
            key={stat.code}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md min-w-[100px]",
              statusFilter === stat.code && "ring-2"
            )}
            style={{
              backgroundColor: hexToRgba(stat.color, 0.1),
              borderColor: hexToRgba(stat.color, 0.2),
              ...(statusFilter === stat.code ? {
                boxShadow: `0 0 0 2px ${stat.color}`
              } : {}),
            }}
            onClick={() => setStatusFilter(stat.code)}
          >
            <CardContent className="p-4 text-center relative">
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  openStatusModal(stat.code);
                }}
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
              <p
                className="text-2xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.count}
              </p>
              <p
                className="text-xs truncate max-w-[80px]"
                style={{ color: stat.color }}
                title={stat.description}
              >
                {stat.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sum verification notice */}
      {statsData && !statsData.sumVerified && (
        <div className="mb-4 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
          <p className="text-sm text-status-warning flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Atentie: Suma cardurilor nu corespunde cu totalul. Unele AWB-uri pot avea statusuri necunoscute.
          </p>
        </div>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cauta dupa AWB, comanda, nume client, adresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* AWB List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredAwbs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu exista AWB-uri de afisat.</p>
              {statusFilter !== "all" && (
                <Button
                  variant="link"
                  onClick={() => setStatusFilter("all")}
                  className="mt-2"
                >
                  Vezi toate AWB-urile
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredAwbs.map((awb) => {
            const category = getStatusCategory(awb.currentStatus);
            const config = categoryConfig[category];
            const { cardClass, hasError } = getAWBCardStyles(awb);
            const isExpanded = expandedAWBs.has(awb.id);
            const Icon = config.icon;

            return (
              <Collapsible
                key={awb.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(awb.id)}
              >
                <Card className={cn(cardClass, "transition-all duration-200")}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-6 cursor-pointer">
                      <div className="flex items-start justify-between">
                        {/* Info AWB */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn(
                              "font-mono text-xl font-bold",
                              category === 'cancelled' || category === 'deleted' ? "line-through opacity-60" : "",
                              config.textColor
                            )}>
                              {awb.awbNumber || "FARA NUMAR"}
                            </span>

                            <Badge variant={config.badgeVariant} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {awb.currentStatus || config.label}
                            </Badge>

                            {awb.fanCourierStatusCode && (
                              <Badge
                                variant="outline"
                                className="text-xs font-mono cursor-pointer hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStatusModal(awb.fanCourierStatusCode!);
                                }}
                              >
                                {awb.fanCourierStatusCode}
                              </Badge>
                            )}

                            {hasError && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Eroare
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <a
                              href={`/orders/${awb.order.id}`}
                              className="hover:text-primary hover:underline flex items-center gap-1 text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Package className="h-3 w-3" />
                              {awb.order.shopifyOrderNumber}
                            </a>

                            <span className="flex items-center gap-1 text-foreground">
                              <MapPin className="h-3 w-3" />
                              {awb.order.customerFirstName} {awb.order.customerLastName}
                            </span>

                            <span className="text-muted-foreground">
                              {awb.order.shippingCity}, {awb.order.shippingProvince}
                            </span>

                            <Badge variant="outline" className="text-xs bg-card">
                              {awb.order.store.name}
                            </Badge>
                          </div>

                          {awb.cashOnDelivery && parseFloat(awb.cashOnDelivery) > 0 && (
                            <Badge variant="warning" className="mt-2 text-xs">
                              Ramburs: {formatCurrency(parseFloat(awb.cashOnDelivery), "RON")}
                            </Badge>
                          )}
                        </div>

                        {/* Data si expand */}
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            {awb.currentStatusDate && (
                              <p className="text-muted-foreground">
                                {formatDate(awb.currentStatusDate)}
                              </p>
                            )}
                            {awb.statusHistory.length > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                <History className="h-3 w-3" />
                                {awb.statusHistory.length} evenimente
                              </p>
                            )}
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Mesaj eroare vizibil direct */}
                      {awb.errorMessage && (
                        <div className="mt-3 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                          <p className="text-sm text-status-error flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {awb.errorMessage}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-6 pb-6 border-t border-dashed">
                      <div className="grid md:grid-cols-2 gap-6 pt-4">
                        {/* Detalii livrare */}
                        <div className="bg-card/70 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                            <MapPin className="h-4 w-4" />
                            Detalii Livrare
                          </h4>
                          <div className="space-y-2 text-sm text-foreground/80">
                            <p>
                              <strong className="text-foreground">Destinatar:</strong> {awb.order.customerFirstName} {awb.order.customerLastName}
                            </p>
                            {awb.order.customerPhone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {awb.order.customerPhone}
                              </p>
                            )}
                            <p>
                              <strong className="text-foreground">Adresa:</strong> {awb.order.shippingAddress1}
                            </p>
                            <p>
                              <strong className="text-foreground">Localitate:</strong> {awb.order.shippingCity}, {awb.order.shippingProvince}
                            </p>
                            <p>
                              <strong className="text-foreground">Serviciu:</strong> {awb.serviceType}
                            </p>
                            <p>
                              <strong className="text-foreground">Plata:</strong> {awb.paymentType}
                            </p>
                            {awb.cashOnDelivery && parseFloat(awb.cashOnDelivery) > 0 && (
                              <p>
                                <strong className="text-foreground">Ramburs:</strong> {formatCurrency(parseFloat(awb.cashOnDelivery), "RON")}
                              </p>
                            )}
                            <p>
                              <strong className="text-foreground">Valoare comanda:</strong> {formatCurrency(parseFloat(awb.order.totalPrice), awb.order.currency)}
                            </p>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="outline" asChild className="bg-card">
                              <a href={`/orders/${awb.order.id}`}>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Vezi comanda
                              </a>
                            </Button>
                          </div>
                        </div>

                        {/* Istoric status */}
                        <div className="bg-card/70 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                            <History className="h-4 w-4" />
                            Istoric Status ({awb.statusHistory.length})
                          </h4>

                          {awb.statusHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nu exista evenimente inregistrate.
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                              {awb.statusHistory.map((event, index) => {
                                const eventCategory = getStatusCategory(event.status);
                                const eventConfig = categoryConfig[eventCategory];

                                return (
                                  <div key={event.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div
                                        className={cn(
                                          "h-3 w-3 rounded-full border-2",
                                          index === 0
                                            ? cn(eventConfig.borderColor, eventConfig.bgColor)
                                            : "border-muted-foreground/30 bg-muted"
                                        )}
                                      />
                                      {index < awb.statusHistory.length - 1 && (
                                        <div className="w-px h-full bg-border flex-1 min-h-[20px]" />
                                      )}
                                    </div>
                                    <div className="flex-1 pb-2">
                                      <p className={cn(
                                        "text-sm font-medium text-foreground",
                                        index === 0 && eventConfig.textColor
                                      )}>
                                        {event.status}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {event.location && `${event.location} - `}
                                        {formatDate(event.statusDate)}
                                      </p>
                                      {event.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {event.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Info despre numarul de rezultate */}
      {!isLoading && filteredAwbs.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-6">
          Se afiseaza {filteredAwbs.length} din {allAWBs.length} AWB-uri
          {statusFilter !== "all" && ` (filtru: ${getSelectedStatusName()})`}
        </p>
      )}

      {/* Status explanation modal */}
      <StatusExplanationModal
        isOpen={selectedStatus !== null}
        onClose={() => setSelectedStatus(null)}
        status={selectedStatus}
      />
    </div>
  );
}
