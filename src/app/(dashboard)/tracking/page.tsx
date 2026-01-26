"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
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
} from "lucide-react";
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

// Funcție pentru a determina categoria de status
type StatusCategory = 'pending' | 'in_transit' | 'delivered' | 'returned' | 'cancelled' | 'deleted' | 'error' | 'unknown';

function getStatusCategory(status: string | null): StatusCategory {
  if (!status) return 'pending';
  
  const s = status.toLowerCase();
  
  // Șters
  if (s.includes('șters') || s.includes('sters') || s.includes('deleted')) {
    return 'deleted';
  }
  
  // Anulat
  if (s.includes('anulat') || s.includes('cancelled') || s.includes('canceled')) {
    return 'cancelled';
  }
  
  // Returnat/Refuzat
  if (s.includes('retur') || s.includes('refuz') || s.includes('return')) {
    return 'returned';
  }
  
  // Livrat
  if (s.includes('livrat') || s.includes('delivered')) {
    return 'delivered';
  }
  
  // În tranzit/livrare
  if (s.includes('tranzit') || s.includes('transit') || s.includes('livrare') || 
      s.includes('preluat') || s.includes('ridicat') || s.includes('sortare') ||
      s.includes('depozit') || s.includes('expedit')) {
    return 'in_transit';
  }
  
  // În așteptare
  if (s.includes('așteptare') || s.includes('asteptare') || s.includes('pending') ||
      s.includes('avizat') || s.includes('contact') || s.includes('reprogramat')) {
    return 'pending';
  }
  
  // Eroare
  if (s.includes('eroare') || s.includes('error') || s.includes('greșit') ||
      s.includes('incomplet') || s.includes('nu raspunde')) {
    return 'error';
  }
  
  return 'unknown';
}

// Configurație vizuală pentru categorii
const categoryConfig: Record<StatusCategory, {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeVariant: "default" | "success" | "warning" | "destructive" | "outline";
  icon: React.ElementType;
}> = {
  pending: {
    label: "În așteptare",
    bgColor: "bg-status-warning/10",
    borderColor: "border-status-warning/20",
    textColor: "text-status-warning",
    badgeVariant: "warning",
    icon: Clock,
  },
  in_transit: {
    label: "În tranzit",
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
    label: "Șters",
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

export default function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedAWBs, setExpandedAWBs] = useState<Set<string>>(new Set());

  // Fetch AWBs
  const { data: awbsData, isLoading } = useQuery({
    queryKey: ["awbs", categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("showAll", "true"); // Arată toate AWB-urile
      params.set("noPagination", "true"); // Dezactivează paginarea pentru tracking
      if (searchQuery) params.set("search", searchQuery);
      
      const res = await fetch(`/api/awb?${params}`);
      return res.json();
    },
  });

  const allAWBs: AWBWithOrder[] = awbsData?.awbs || [];
  
  // Filtrare după categorie
  const awbs = categoryFilter === "all" 
    ? allAWBs 
    : allAWBs.filter(awb => getStatusCategory(awb.currentStatus) === categoryFilter);

  // Statistici
  const stats = {
    total: allAWBs.length,
    inTransit: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'in_transit').length,
    delivered: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'delivered').length,
    pending: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'pending').length,
    returned: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'returned').length,
    cancelled: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'cancelled').length,
    deleted: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'deleted').length,
    error: allAWBs.filter(a => getStatusCategory(a.currentStatus) === 'error' || a.errorMessage).length,
  };

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
    
    // Dacă are eroare, override cu stil de eroare
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

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tracking AWB</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Urmărește toate expedierile și istoricul lor complet
          </p>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          💡 Folosește butonul <strong>Sincronizare</strong> din sidebar pentru a actualiza statusurile
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            categoryFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setCategoryFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-info/10 border-status-info/20",
            categoryFilter === "in_transit" && "ring-2 ring-status-info"
          )}
          onClick={() => setCategoryFilter("in_transit")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-info">{stats.inTransit}</p>
            <p className="text-xs text-status-info">În tranzit</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-success/10 border-status-success/20",
            categoryFilter === "delivered" && "ring-2 ring-status-success"
          )}
          onClick={() => setCategoryFilter("delivered")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-success">{stats.delivered}</p>
            <p className="text-xs text-status-success">Livrate</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-warning/10 border-status-warning/20",
            categoryFilter === "pending" && "ring-2 ring-status-warning"
          )}
          onClick={() => setCategoryFilter("pending")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-warning">{stats.pending}</p>
            <p className="text-xs text-status-warning">În așteptare</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-warning/10 border-status-warning/20",
            categoryFilter === "returned" && "ring-2 ring-status-warning"
          )}
          onClick={() => setCategoryFilter("returned")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-warning">{stats.returned}</p>
            <p className="text-xs text-status-warning">Returnate</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-error/10 border-status-error/20",
            categoryFilter === "cancelled" && "ring-2 ring-status-error"
          )}
          onClick={() => setCategoryFilter("cancelled")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-error">{stats.cancelled}</p>
            <p className="text-xs text-status-error">Anulate</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-muted border-border",
            categoryFilter === "deleted" && "ring-2 ring-muted-foreground"
          )}
          onClick={() => setCategoryFilter("deleted")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.deleted}</p>
            <p className="text-xs text-muted-foreground">Șterse</p>
          </CardContent>
        </Card>
        
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md bg-status-error/10 border-status-error/30",
            categoryFilter === "error" && "ring-2 ring-status-error"
          )}
          onClick={() => setCategoryFilter("error")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-status-error">{stats.error}</p>
            <p className="text-xs text-status-error">Cu erori</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după AWB, comandă, nume client, adresă..."
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
        ) : awbs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nu există AWB-uri de afișat.</p>
              {categoryFilter !== "all" && (
                <Button 
                  variant="link" 
                  onClick={() => setCategoryFilter("all")}
                  className="mt-2"
                >
                  Vezi toate AWB-urile
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          awbs.map((awb) => {
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
                              {awb.awbNumber || "FĂRĂ NUMĂR"}
                            </span>
                            
                            <Badge variant={config.badgeVariant} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {awb.currentStatus || config.label}
                            </Badge>
                            
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
                        
                        {/* Data și expand */}
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
                              <strong className="text-foreground">Adresă:</strong> {awb.order.shippingAddress1}
                            </p>
                            <p>
                              <strong className="text-foreground">Localitate:</strong> {awb.order.shippingCity}, {awb.order.shippingProvince}
                            </p>
                            <p>
                              <strong className="text-foreground">Serviciu:</strong> {awb.serviceType}
                            </p>
                            <p>
                              <strong className="text-foreground">Plată:</strong> {awb.paymentType}
                            </p>
                            {awb.cashOnDelivery && parseFloat(awb.cashOnDelivery) > 0 && (
                              <p>
                                <strong className="text-foreground">Ramburs:</strong> {formatCurrency(parseFloat(awb.cashOnDelivery), "RON")}
                              </p>
                            )}
                            <p>
                              <strong className="text-foreground">Valoare comandă:</strong> {formatCurrency(parseFloat(awb.order.totalPrice), awb.order.currency)}
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
                              Nu există evenimente înregistrate.
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
                                        {event.location && `${event.location} • `}
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
      
      {/* Info despre numărul de rezultate */}
      {!isLoading && awbs.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-6">
          Se afișează {awbs.length} din {allAWBs.length} AWB-uri
          {categoryFilter !== "all" && ` (filtru: ${categoryConfig[categoryFilter as StatusCategory]?.label})`}
        </p>
      )}
    </div>
  );
}
