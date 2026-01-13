"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  XCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Store,
  Truck,
  Calendar,
  AlertTriangle,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface HandoverAWB {
  id: string;
  awbNumber: string | null;
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeId: string;
  recipientName: string;
  recipientCity: string;
  products: string;
  fanCourierStatusCode: string | null;
  fanCourierStatusName: string | null;
  fanCourierStatusDesc: string | null;
  notHandedOverAt: string | null;
  createdAt: string;
}

export default function NotHandedPage() {
  const queryClient = useQueryClient();
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // Fetch stores
  const { data: storesData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      return res.json();
    },
  });
  const stores = storesData?.stores || [];

  // Fetch not-handed AWBs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["handover-not-handed", storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      const res = await fetch(`/api/handover/not-handed?${params}`);
      return res.json();
    },
  });

  const awbs: HandoverAWB[] = data?.data?.awbs || [];
  const total = data?.data?.total || 0;

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (awbNumber: string) => {
      const res = await fetch("/api/handover/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbNumber }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "✓ AWB scanat cu succes" });
        queryClient.invalidateQueries({ queryKey: ["handover-not-handed"] });
        queryClient.invalidateQueries({ queryKey: ["handover-today"] });
      } else {
        toast({ title: "Eroare", description: result.message, variant: "destructive" });
      }
    },
  });

  const getDaysAgo = (dateStr: string) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/handover">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <XCircle className="h-6 w-6 text-status-error" />
                AWB-uri Nepredate
              </h1>
              <p className="text-muted-foreground">Colete care nu au fost scanate la predare</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <Card className="border-status-error/20 bg-status-error/10 max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-status-error">Total nepredate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-error">{total}</div>
          </CardContent>
        </Card>

        {/* Filter */}
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-48">
            <Store className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Magazin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate magazinele</SelectItem>
            {stores.map((store: any) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : awbs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">Nu există AWB-uri nepredate</p>
              <p className="text-muted-foreground">Toate coletele au fost scanate la predare.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AWB</TableHead>
                    <TableHead>Comandă</TableHead>
                    <TableHead>Magazin</TableHead>
                    <TableHead>Data emitere</TableHead>
                    <TableHead>Zile nepredat</TableHead>
                    <TableHead>Destinatar</TableHead>
                    <TableHead>Status FanCourier</TableHead>
                    <TableHead>Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awbs.map((awb) => {
                    const daysAgo = getDaysAgo(awb.createdAt);
                    return (
                      <TableRow key={awb.id}>
                        <TableCell className="font-mono font-medium">{awb.awbNumber || "-"}</TableCell>
                        <TableCell>
                          <Link href={`/orders/${awb.orderId}`} className="text-status-info hover:underline">
                            #{awb.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{awb.storeName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(awb.createdAt).toLocaleDateString("ro-RO")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="destructive"
                            className={daysAgo >= 3 ? "bg-status-error" : daysAgo >= 2 ? "bg-status-warning" : "bg-status-warning"}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysAgo} {daysAgo === 1 ? "zi" : "zile"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>{awb.recipientName}</div>
                          <div className="text-xs text-muted-foreground">{awb.recipientCity}</div>
                        </TableCell>
                        <TableCell>
                          {awb.fanCourierStatusCode ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help">
                                  <Truck className="h-3 w-3 mr-1" />
                                  {awb.fanCourierStatusCode}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {awb.fanCourierStatusName}: {awb.fanCourierStatusDesc}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => awb.awbNumber && scanMutation.mutate(awb.awbNumber)}
                            disabled={scanMutation.isPending || !awb.awbNumber}
                          >
                            <Scan className="h-3 w-3 mr-1" />
                            Scanează acum
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
