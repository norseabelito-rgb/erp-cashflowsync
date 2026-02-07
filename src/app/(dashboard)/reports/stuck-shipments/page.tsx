"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Phone,
  Clock,
  Package
} from "lucide-react";

interface StuckShipment {
  id: string;
  awbNumber: string;
  orderNumber: string | null;
  shopifyOrderNumber: string | null;
  invoiceSeries: string | null;
  invoiceNumber: string | null;
  customerPhone: string | null;
  customerName: string | null;
  createdAt: string;
  currentStatus: string | null;
  daysOld: number;
}

export default function StuckShipmentsPage() {
  const [shipments, setShipments] = useState<StuckShipment[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [minDays, setMinDays] = useState(3);

  useEffect(() => {
    loadShipments();
  }, [minDays]);

  async function loadShipments() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/stuck-shipments?minDays=${minDays}&limit=200`);
      const data = await res.json();
      if (data.success) {
        setShipments(data.data.shipments);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error("Eroare la incarcarea raportului");
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`/api/reports/stuck-shipments?minDays=${minDays}&format=csv`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stuck-shipments-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("CSV descarcat");
    } catch (err) {
      console.error(err);
      toast.error("Eroare la descarcare");
    }
  }

  const getDaysOldBadge = (days: number) => {
    if (days > 7) {
      return <Badge variant="destructive">{days} zile</Badge>;
    } else if (days > 5) {
      return <Badge variant="default" className="bg-orange-100 text-orange-800">{days} zile</Badge>;
    } else {
      return <Badge variant="secondary">{days} zile</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Colete Blocate"
        description="AWB-uri mai vechi de 3 zile fara rezolutie (nici livrate, nici returnate)"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Filtru Raport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Zile minime</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={minDays}
                onChange={(e) => setMinDays(parseInt(e.target.value) || 3)}
                className="w-24"
              />
            </div>
            <Button onClick={loadShipments} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizeaza
            </Button>
            <Button onClick={downloadCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Blocate</p>
                <p className="text-2xl font-bold">{shipments.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">&gt; 7 zile</p>
                <p className="text-2xl font-bold text-red-600">
                  {shipments.filter(s => s.daysOld > 7).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">5-7 zile</p>
                <p className="text-2xl font-bold text-orange-600">
                  {shipments.filter(s => s.daysOld >= 5 && s.daysOld <= 7).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Colete Blocate ({shipments.length})</CardTitle>
          <CardDescription>
            AWB-uri create acum mai mult de {minDays} zile care nu sunt nici livrate, nici returnate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Se incarca...</p>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium text-green-700">
                Nicio expeditie blocata!
              </p>
              <p className="text-muted-foreground">
                Toate coletele au fost livrate sau returnate in timp util.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vechime</TableHead>
                  <TableHead>AWB</TableHead>
                  <TableHead>Nr. Comanda</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status Curent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{getDaysOldBadge(s.daysOld)}</TableCell>
                    <TableCell className="font-mono text-sm">{s.awbNumber}</TableCell>
                    <TableCell>
                      {s.shopifyOrderNumber || s.orderNumber || "-"}
                    </TableCell>
                    <TableCell>
                      {s.invoiceSeries && s.invoiceNumber ? (
                        <span className="font-mono text-sm">
                          {s.invoiceSeries}{s.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{s.customerName || "-"}</TableCell>
                    <TableCell>
                      {s.customerPhone ? (
                        <a
                          href={`tel:${s.customerPhone}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {s.customerPhone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{s.currentStatus || "Necunoscut"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
