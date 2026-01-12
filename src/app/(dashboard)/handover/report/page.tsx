"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  Truck,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface HandoverAWB {
  id: string;
  awbNumber: string | null;
  orderId: string;
  orderNumber: string;
  storeName: string;
  recipientName: string;
  recipientCity: string;
  products: string;
  fanCourierStatusCode: string | null;
  handedOverAt: string | null;
  handedOverByName: string | null;
  createdAt: string;
}

interface HandoverReport {
  date: string;
  stats: {
    totalIssued: number;
    totalHandedOver: number;
    totalNotHandedOver: number;
    totalPending: number;
    totalFromPrevDays: number;
  };
  closedAt: string | null;
  closedBy: string | null;
  closeType: string | null;
  handedOverList: HandoverAWB[];
  notHandedOverList: HandoverAWB[];
  fromPrevDaysList: HandoverAWB[];
}

export default function ReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
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

  // Fetch report
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["handover-report", selectedDate, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      const res = await fetch(`/api/handover/report?${params}`);
      return res.json();
    },
  });

  const report: HandoverReport | null = data?.data || null;

  // Export handler
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (storeFilter !== "all") params.set("storeId", storeFilter);
      
      const res = await fetch(`/api/handover/report/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raport-predare-${selectedDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "✓ Raport exportat" });
    } catch (error) {
      toast({ title: "Eroare la export", variant: "destructive" });
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
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
              <FileText className="h-6 w-6" />
              Raport Predare Curier
            </h1>
            <p className="text-muted-foreground">
              {selectedDate && formatDate(selectedDate)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={!report}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Data</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Magazin</label>
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !report ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-muted-foreground">Nu există date pentru această zi</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total AWB-uri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalIssued}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Predate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {report.stats.totalHandedOver}
                  <span className="text-sm font-normal ml-2">
                    ({report.stats.totalIssued > 0
                      ? Math.round((report.stats.totalHandedOver / report.stats.totalIssued) * 100)
                      : 0}%)
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700">Nepredate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {report.stats.totalNotHandedOver}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Din zile anterioare
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalFromPrevDays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Finalizare
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.closedAt ? (
                  <div className="text-sm">
                    <div className="font-bold">{formatTime(report.closedAt)}</div>
                    <div className="text-muted-foreground">
                      {report.closeType === "auto" ? "Automat" : "Manual"} - {report.closedBy}
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Nefinalizat
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs with Lists */}
          <Tabs defaultValue="handed" className="space-y-4">
            <TabsList>
              <TabsTrigger value="handed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Predate ({report.handedOverList.length})
              </TabsTrigger>
              <TabsTrigger value="not-handed" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Nepredate ({report.notHandedOverList.length})
              </TabsTrigger>
              {report.fromPrevDaysList.length > 0 && (
                <TabsTrigger value="prev-days" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Din zile anterioare ({report.fromPrevDaysList.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Handed Over Tab */}
            <TabsContent value="handed">
              <Card>
                <CardContent className="p-0">
                  {report.handedOverList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-muted-foreground">Niciun AWB predat</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>AWB</TableHead>
                          <TableHead>Comandă</TableHead>
                          <TableHead>Magazin</TableHead>
                          <TableHead>Destinatar</TableHead>
                          <TableHead>Scanat la</TableHead>
                          <TableHead>Confirmat C0</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.handedOverList.map((awb, index) => (
                          <TableRow key={awb.id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-mono">{awb.awbNumber || "-"}</TableCell>
                            <TableCell>#{awb.orderNumber}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {awb.storeName}
                            </TableCell>
                            <TableCell>
                              <div>{awb.recipientName}</div>
                              <div className="text-xs text-muted-foreground">{awb.recipientCity}</div>
                            </TableCell>
                            <TableCell>{formatTime(awb.handedOverAt)}</TableCell>
                            <TableCell>
                              {awb.fanCourierStatusCode === "C0" ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ✓
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Not Handed Tab */}
            <TabsContent value="not-handed">
              <Card>
                <CardContent className="p-0">
                  {report.notHandedOverList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium">Toate AWB-urile au fost predate!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>AWB</TableHead>
                          <TableHead>Comandă</TableHead>
                          <TableHead>Magazin</TableHead>
                          <TableHead>Destinatar</TableHead>
                          <TableHead>Motiv</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.notHandedOverList.map((awb, index) => (
                          <TableRow key={awb.id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-mono">{awb.awbNumber || "-"}</TableCell>
                            <TableCell>#{awb.orderNumber}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {awb.storeName}
                            </TableCell>
                            <TableCell>
                              <div>{awb.recipientName}</div>
                              <div className="text-xs text-muted-foreground">{awb.recipientCity}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">Nescanat</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Previous Days Tab */}
            <TabsContent value="prev-days">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>AWB</TableHead>
                        <TableHead>Comandă</TableHead>
                        <TableHead>Data emitere</TableHead>
                        <TableHead>Destinatar</TableHead>
                        <TableHead>Scanat azi la</TableHead>
                        <TableHead>Observație</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.fromPrevDaysList.map((awb, index) => (
                        <TableRow key={awb.id}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono">{awb.awbNumber || "-"}</TableCell>
                          <TableCell>#{awb.orderNumber}</TableCell>
                          <TableCell>
                            {new Date(awb.createdAt).toLocaleDateString("ro-RO")}
                          </TableCell>
                          <TableCell>{awb.recipientName}</TableCell>
                          <TableCell>{formatTime(awb.handedOverAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-600">
                              Fost NEPREDAT
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
