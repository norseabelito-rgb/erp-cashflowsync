"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReturnManifestTable } from "@/components/manifest/ReturnManifestTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  FileText,
  CheckCircle,
  Play,
  RefreshCw,
  Plus,
  AlertTriangle
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

interface Manifest {
  id: string;
  status: string;
  documentDate: string;
  createdAt: string;
  confirmedAt: string | null;
  processedAt: string | null;
  confirmedBy: { name: string } | null;
  items: Array<{
    id: string;
    awbNumber: string;
    originalAwb: string | null;
    status: string;
    errorMessage: string | null;
    invoice: {
      invoiceNumber: string | null;
      invoiceSeriesName: string | null;
      status: string;
      paymentStatus: string;
    } | null;
    order: {
      orderNumber: string | null;
      shopifyOrderNumber: string | null;
    } | null;
  }>;
}

interface ManifestListItem {
  id: string;
  status: string;
  documentDate: string;
  itemCount: number;
  processedCount: number;
  errorCount: number;
}

function ReturnManifestContent() {
  const searchParams = useSearchParams();
  const manifestId = searchParams.get("id");

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifests, setManifests] = useState<ManifestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (manifestId) {
      loadManifest(manifestId);
    } else {
      loadManifestList();
    }
  }, [manifestId]);

  async function loadManifest(id: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manifests/returns/${id}`, { cache: "no-store" });
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
      const res = await fetch("/api/manifests/returns", { cache: "no-store" });
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

  async function generateNewManifest() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/manifests/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: `Manifest generat cu ${data.itemCount} AWB-uri` });
        window.location.href = `/returns/manifest?id=${data.manifestId}`;
      } else {
        toast({ title: data.error || "Eroare la generarea manifestului", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  async function confirmManifest() {
    if (!manifest) return;

    try {
      const res = await fetch(`/api/manifests/returns/${manifest.id}`, {
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
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  }

  async function processManifest() {
    if (!manifest) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/manifests/returns/${manifest.id}/process`, {
        method: "POST"
      });
      const data = await res.json();

      if (data.success || data.successCount > 0) {
        toast({
          title: `Procesare completa: ${data.successCount} stornate, ${data.errorCount} erori, ${data.skippedCount} omise`
        });
        loadManifest(manifest.id);
      } else {
        toast({ title: data.error || "Eroare la procesare", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

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

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Manifest Retururi"
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
    );
  }

  // Detail view
  if (manifestId && manifest) {
    const pendingCount = manifest.items.filter(i => i.status === "PENDING").length;
    const processedCount = manifest.items.filter(i => i.status === "PROCESSED").length;
    const errorCount = manifest.items.filter(i => i.status === "ERROR").length;

    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Manifest Retururi"
          description={`${manifest.items.length} AWB-uri din ${new Date(manifest.documentDate).toLocaleDateString("ro-RO")}`}
          backHref="/returns/manifest"
          backLabel="Inapoi la lista"
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manifest {getStatusBadge(manifest.status)}
                </CardTitle>
                <CardDescription>
                  Creat: {new Date(manifest.createdAt).toLocaleString("ro-RO")}
                  {manifest.confirmedAt && (
                    <> | Confirmat: {new Date(manifest.confirmedAt).toLocaleString("ro-RO")} de {manifest.confirmedBy?.name}</>
                  )}
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
                      <Button variant="destructive" disabled={isProcessing}>
                        <Play className="h-4 w-4 mr-2" />
                        {isProcessing ? "Se proceseaza..." : "Storneaza Toate"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmare Stornare</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vei storna {pendingCount} facturi din Oblio. Aceasta actiune este ireversibila.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                        <AlertDialogAction onClick={processManifest}>
                          Continua Stornare
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
                  {errorCount} facturi au esuat la stornare. Verificati erorile si reincercati.
                </AlertDescription>
              </Alert>
            )}

            <ReturnManifestTable items={manifest.items} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Manifeste Retururi"
        description="Generare si verificare manifeste pentru stornare"
      />

      <div className="flex justify-end">
        <Button onClick={generateNewManifest} disabled={isGenerating}>
          <Plus className="h-4 w-4 mr-2" />
          {isGenerating ? "Se genereaza..." : "Genereaza Manifest Nou"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manifeste Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {manifests.length === 0 ? (
            <p className="text-muted-foreground">Nu exista manifeste. Genereaza unul nou din retururile scanate.</p>
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
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/returns/manifest?id=${m.id}`;
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

export default function ReturnManifestPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Manifest Retururi"
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
      <ReturnManifestContent />
    </Suspense>
  );
}
