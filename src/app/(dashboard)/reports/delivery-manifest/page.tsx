"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Truck,
  Download,
  CheckCircle,
  Play,
  RefreshCw,
  AlertTriangle,
  Clock,
  XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Company {
  id: string;
  name: string;
}

interface ManifestItem {
  id: string;
  awbNumber: string;
  status: string;
  errorMessage: string | null;
  invoice: {
    invoiceNumber: string | null;
    invoiceSeriesName: string | null;
    status: string;
    paymentStatus: string;
    paidAt: string | null;
  } | null;
  order: {
    orderNumber: string | null;
    totalPrice: number | null;
  } | null;
}

interface Manifest {
  id: string;
  status: string;
  documentDate: string;
  createdAt: string;
  confirmedAt: string | null;
  processedAt: string | null;
  confirmedBy: { name: string } | null;
  items: ManifestItem[];
}

interface ManifestListItem {
  id: string;
  status: string;
  documentDate: string;
  createdAt: string;
  itemCount: number;
  processedCount: number;
  errorCount: number;
}

function DeliveryManifestContent() {
  const searchParams = useSearchParams();
  const manifestId = searchParams.get("id");

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifests, setManifests] = useState<ManifestListItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch form state
  const [fetchDate, setFetchDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  useEffect(() => {
    loadCompanies();
    if (manifestId) {
      loadManifest(manifestId);
    } else {
      loadManifestList();
    }
  }, [manifestId]);

  async function loadCompanies() {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (data.companies) {
        setCompanies(data.companies);
        if (data.companies.length > 0 && !selectedCompany) {
          setSelectedCompany(data.companies[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadManifest(id: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manifests/deliveries/${id}`);
      const data = await res.json();
      if (data.success) {
        setManifest(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadManifestList() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/manifests/deliveries");
      const data = await res.json();
      if (data.success) {
        setManifests(data.data.manifests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchFromFanCourier() {
    if (!selectedCompany || !fetchDate) {
      toast({ title: "Selecteaza firma si data", variant: "destructive" });
      return;
    }

    setIsFetching(true);
    try {
      const res = await fetch("/api/manifests/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: fetchDate,
          companyId: selectedCompany
        })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: `Manifest creat cu ${data.itemCount} AWB-uri livrate` });
        window.location.href = `/reports/delivery-manifest?id=${data.manifestId}`;
      } else {
        toast({ title: data.error || "Eroare la incarcarea manifestului", variant: "destructive" });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({ title: errorMessage, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  }

  async function confirmManifest() {
    if (!manifest) return;

    try {
      const res = await fetch(`/api/manifests/deliveries/${manifest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: "Manifest confirmat" });
        loadManifest(manifest.id);
      } else {
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({ title: errorMessage, variant: "destructive" });
    }
  }

  async function processManifest() {
    if (!manifest) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/manifests/deliveries/${manifest.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectType: "Ramburs" })
      });
      const data = await res.json();

      if (data.success || data.successCount > 0) {
        toast({
          title: `Procesare completa: ${data.successCount} incasate, ${data.errorCount} erori, ${data.skippedCount} omise`
        });
        loadManifest(manifest.id);
      } else {
        toast({ title: data.error || "Eroare la procesare", variant: "destructive" });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({ title: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "ERROR":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "PENDING_VERIFICATION":
        return <Badge variant="outline">In verificare</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-blue-100 text-blue-800">Confirmat</Badge>;
      case "PROCESSED":
        return <Badge className="bg-green-100 text-green-800">Procesat</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Detail view
  if (manifestId && manifest) {
    const pendingCount = manifest.items.filter(i => i.status === "PENDING").length;
    const processedCount = manifest.items.filter(i => i.status === "PROCESSED").length;
    const errorCount = manifest.items.filter(i => i.status === "ERROR").length;

    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Borderou Livrari"
          description={`${manifest.items.length} AWB-uri din ${new Date(manifest.documentDate).toLocaleDateString("ro-RO")}`}
          backHref="/reports/delivery-manifest"
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Manifest Livrari {getStatusBadge(manifest.status)}
                </CardTitle>
                <CardDescription>
                  Creat: {new Date(manifest.createdAt).toLocaleString("ro-RO")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {manifest.status === "DRAFT" && (
                  <Button onClick={confirmManifest}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirma
                  </Button>
                )}
                {manifest.status === "CONFIRMED" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default" disabled={isProcessing}>
                        <Play className="h-4 w-4 mr-2" />
                        {isProcessing ? "Se proceseaza..." : "Marcheaza Incasate"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmare Incasare</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vei marca {pendingCount} facturi ca incasate in Oblio.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                        <AlertDialogAction onClick={processManifest}>
                          Continua
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="outline" onClick={() => loadManifest(manifest.id)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="flex gap-4 mb-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">{manifest.items.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Procesate:</span>{" "}
                <span className="font-medium text-green-600">{processedCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Erori:</span>{" "}
                <span className="font-medium text-red-600">{errorCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">In asteptare:</span>{" "}
                <span className="font-medium">{pendingCount}</span>
              </div>
            </div>

            {errorCount > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errorCount} facturi au esuat. Verificati erorile si reincercati.
                </AlertDescription>
              </Alert>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>AWB</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Valoare</TableHead>
                  <TableHead>Status Plata</TableHead>
                  <TableHead>Eroare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manifest.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{item.awbNumber}</TableCell>
                    <TableCell>{item.order?.orderNumber || "-"}</TableCell>
                    <TableCell>
                      {item.invoice ? (
                        <span className="font-mono text-sm">
                          {item.invoice.invoiceSeriesName}{item.invoice.invoiceNumber}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.order?.totalPrice ? `${item.order.totalPrice} RON` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.invoice ? (
                        <Badge variant={item.invoice.paymentStatus === "paid" ? "default" : "secondary"}>
                          {item.invoice.paymentStatus === "paid" ? "Incasata" : "Neincasata"}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.errorMessage ? (
                        <span className="text-xs text-red-600">{item.errorMessage}</span>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state for detail view
  if (manifestId && isLoading) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Borderou Livrari"
          description="Se incarca..."
          backHref="/reports/delivery-manifest"
        />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Se incarca manifestul...
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view with fetch form
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Borderou Livrari"
        description="Incarca si proceseaza borderou FanCourier pentru marcarea facturilor ca incasate"
      />

      {/* Fetch form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Incarca Borderou
          </CardTitle>
          <CardDescription>
            Preia AWB-urile livrate de la FanCourier pentru o anumita data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={fetchDate}
                onChange={(e) => setFetchDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label>Firma</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteaza firma" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchFromFanCourier} disabled={isFetching}>
              <Download className="h-4 w-4 mr-2" />
              {isFetching ? "Se incarca..." : "Preia de la FanCourier"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manifests list */}
      <Card>
        <CardHeader>
          <CardTitle>Manifeste Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Se incarca...</p>
          ) : manifests.length === 0 ? (
            <p className="text-muted-foreground">Nu exista manifeste. Incarca unul nou de la FanCourier.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AWB-uri</TableHead>
                  <TableHead>Procesate</TableHead>
                  <TableHead>Erori</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manifests.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {new Date(m.documentDate).toLocaleDateString("ro-RO")}
                    </TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell>{m.itemCount}</TableCell>
                    <TableCell>{m.processedCount}</TableCell>
                    <TableCell>
                      {m.errorCount > 0 ? (
                        <Badge variant="destructive">{m.errorCount}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/reports/delivery-manifest?id=${m.id}`;
                        }}
                      >
                        Deschide
                      </Button>
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

export default function DeliveryManifestPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Borderou Livrari"
          description="Se incarca..."
        />
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <DeliveryManifestContent />
    </Suspense>
  );
}
