"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  TrendingUp,
  StickyNote,
  Save,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerDetailModalProps {
  customer: {
    customerKey: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: string;
  embedToken?: string;
}

// Status badge mapping (from Orders page)
const statusConfig: Record<
  string,
  {
    label: string;
    variant:
      | "default"
      | "success"
      | "warning"
      | "destructive"
      | "info"
      | "neutral";
  }
> = {
  PENDING: { label: "In asteptare", variant: "warning" },
  VALIDATED: { label: "Validat", variant: "info" },
  VALIDATION_FAILED: { label: "Validare esuata", variant: "destructive" },
  INVOICED: { label: "Facturat", variant: "success" },
  SHIPPED: { label: "Expediat", variant: "info" },
  DELIVERED: { label: "Livrat", variant: "success" },
  RETURNED: { label: "Returnat", variant: "destructive" },
  CANCELLED: { label: "Anulat", variant: "neutral" },
};

export function CustomerDetailModal({
  customer,
  open,
  onOpenChange,
  storeId,
  embedToken,
}: CustomerDetailModalProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch full details only when modal is open
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-detail", customer?.customerKey, storeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeId && storeId !== "all") params.set("storeId", storeId);
      const res = await fetch(
        `/api/customers/${encodeURIComponent(customer!.customerKey)}?${params}`,
        {
          headers: embedToken ? { Authorization: `Bearer ${embedToken}` } : {},
        }
      );
      if (!res.ok) throw new Error("Failed to fetch customer details");
      return res.json();
    },
    enabled: open && !!customer?.customerKey,
  });

  // Update note text when data loads
  useEffect(() => {
    if (data?.note !== undefined) {
      setNoteText(data.note);
      setHasChanges(false);
    }
  }, [data?.note]);

  // Save note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (embedToken) headers["Authorization"] = `Bearer ${embedToken}`;
      const res = await fetch(
        `/api/customers/${encodeURIComponent(customer!.customerKey)}/note`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ note }),
        }
      );
      if (!res.ok) throw new Error("Failed to save note");
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({
        queryKey: ["customer-detail", customer?.customerKey],
      });
    },
  });

  const handleNoteChange = (value: string) => {
    setNoteText(value);
    setHasChanges(value !== (data?.note || ""));
  };

  const handleSaveNote = () => {
    saveNoteMutation.mutate(noteText);
  };

  const customerName = customer
    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
      customer.email ||
      customer.customerKey
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {customerName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <CustomerDetailSkeleton />
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground">
            Eroare la incarcarea datelor clientului.
          </div>
        ) : !data?.customer ? (
          <div className="text-center py-8 text-muted-foreground">
            Nu s-au gasit date pentru acest client.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Info + Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Informatii contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{data.customer.email}</span>
                  </div>
                  {data.customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{data.customer.phone}</span>
                    </div>
                  )}
                  {data.customer.address?.city && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {data.customer.address.address1 && (
                          <div>{data.customer.address.address1}</div>
                        )}
                        {data.customer.address.address2 && (
                          <div>{data.customer.address.address2}</div>
                        )}
                        <div>
                          {data.customer.address.city}
                          {data.customer.address.province &&
                            `, ${data.customer.address.province}`}
                          {data.customer.address.zip &&
                            ` ${data.customer.address.zip}`}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analytics Cards */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Statistici cumparaturi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        Total cheltuit
                      </div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(data.analytics.totalSpent)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ShoppingCart className="h-3 w-3" />
                        Nr. comenzi
                      </div>
                      <div className="text-lg font-semibold">
                        {data.analytics.orderCount}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        Medie comanda
                      </div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(data.analytics.averageOrderValue)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Client din
                      </div>
                      <div className="text-lg font-semibold">
                        {data.analytics.firstOrderDate
                          ? formatDate(data.analytics.firstOrderDate)
                          : "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Products */}
            {data.topProducts && data.topProducts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produse cele mai comandate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.topProducts.map(
                      (
                        product: { sku: string; title: string; quantity: number },
                        index: number
                      ) => (
                        <div
                          key={product.sku || product.title}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {product.title}
                              </div>
                              {product.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU: {product.sku}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">{product.quantity} buc</Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Istoric comenzi ({data.orders?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!data.orders || data.orders.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nu exista comenzi pentru acest client.
                  </div>
                ) : (
                  <div className="divide-y max-h-[300px] overflow-y-auto">
                    {data.orders.map(
                      (order: {
                        id: string;
                        shopifyOrderNumber: string;
                        status: string;
                        createdAt: string;
                        totalPrice: number;
                        store?: { name: string };
                        invoice?: { invoiceNumber: string };
                        awb?: { awbNumber: string };
                      }) => (
                        <div
                          key={order.id}
                          className="p-4 hover:bg-muted/50 flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                #{order.shopifyOrderNumber}
                              </span>
                              <Badge
                                variant={
                                  statusConfig[order.status]?.variant || "neutral"
                                }
                              >
                                {statusConfig[order.status]?.label || order.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(order.createdAt)}
                              </span>
                              <span>{order.store?.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(order.totalPrice)}
                            </div>
                            <div className="text-xs text-muted-foreground space-x-2">
                              {order.invoice?.invoiceNumber && (
                                <span>F: {order.invoice.invoiceNumber}</span>
                              )}
                              {order.awb?.awbNumber && (
                                <span>AWB: {order.awb.awbNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Notite
                  </div>
                  {hasChanges && (
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={saveNoteMutation.isPending}
                    >
                      {saveNoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salveaza
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Adauga notite despre acest client..."
                  value={noteText}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                {saveNoteMutation.isError && (
                  <p className="text-sm text-destructive mt-2">
                    Eroare la salvarea notitei. Incearca din nou.
                  </p>
                )}
                {saveNoteMutation.isSuccess && !hasChanges && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Notita salvata.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Loading skeleton
function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
