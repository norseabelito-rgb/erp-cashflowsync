"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface StoreProgress {
  storeName: string;
  total: number;
  done: number;
  created: number;
  updated: number;
  errors: number;
  errorMessages: string[];
}

interface JobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  progress: Record<string, StoreProgress>;
  error: string | null;
}

export default function BulkPushPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [hasNotified, setHasNotified] = useState(false);
  const queryClient = useQueryClient();

  // Start job mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products/bulk-push", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        setHasNotified(false);
        toast({
          title: "Sincronizare pornita",
          description: "Se trimit produsele catre Shopify...",
        });
      } else {
        toast({
          title: "Eroare",
          description: data.error || "Nu s-a putut porni sincronizarea",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Eroare",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Poll job status
  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ["bulk-push-job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/products/bulk-push/${jobId}`);
      if (!res.ok) {
        throw new Error("Nu s-a putut obtine starea job-ului");
      }
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when job is done
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Show toast when job completes
  useEffect(() => {
    if (!hasNotified && jobStatus) {
      if (jobStatus.status === "completed") {
        const totalCreated = Object.values(jobStatus.progress).reduce(
          (sum, s) => sum + s.created,
          0
        );
        const totalUpdated = Object.values(jobStatus.progress).reduce(
          (sum, s) => sum + s.updated,
          0
        );
        const totalErrors = Object.values(jobStatus.progress).reduce(
          (sum, s) => sum + s.errors,
          0
        );

        toast({
          title: "Sincronizare completa!",
          description: `${totalCreated} create, ${totalUpdated} actualizate, ${totalErrors} erori`,
        });
        setHasNotified(true);
        // Invalidate products query to refresh any product lists
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else if (jobStatus.status === "failed") {
        toast({
          title: "Eroare la sincronizare",
          description: jobStatus.error || "A aparut o eroare necunoscuta",
          variant: "destructive",
        });
        setHasNotified(true);
      }
    }
  }, [jobStatus?.status, hasNotified, queryClient, jobStatus]);

  const isRunning = jobStatus?.status === "running" || startMutation.isPending;
  const progress = jobStatus?.progress || {};
  const stores = Object.entries(progress);

  // Calculate totals
  const totalProducts = stores.reduce((sum, [, s]) => sum + s.total, 0);
  const totalDone = stores.reduce((sum, [, s]) => sum + s.done, 0);
  const totalCreated = stores.reduce((sum, [, s]) => sum + s.created, 0);
  const totalUpdated = stores.reduce((sum, [, s]) => sum + s.updated, 0);
  const totalErrors = stores.reduce((sum, [, s]) => sum + s.errors, 0);

  const getStatusBadge = () => {
    if (!jobStatus) return null;

    switch (jobStatus.status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            FINALIZAT
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            ESUAT
          </Badge>
        );
      case "running":
        return (
          <Badge variant="default">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            IN CURS
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            SE PREGATESTE
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Bulk Push Produse"
        description="Trimite toate produsele catre toate magazinele Shopify"
        actions={
          <div className="flex gap-2">
            <Link href="/products">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Inapoi
              </Button>
            </Link>
            <Button
              onClick={() => startMutation.mutate()}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se sincronizeaza...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Bulk Push
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Status indicator */}
      {jobStatus && (
        <div className="mb-6 flex items-center gap-4">
          {getStatusBadge()}
          {jobStatus.status === "running" && (
            <span className="text-sm text-muted-foreground">
              {totalDone} / {totalProducts} produse procesate
            </span>
          )}
          {jobStatus.status === "completed" && (
            <span className="text-sm text-muted-foreground">
              {totalCreated} create, {totalUpdated} actualizate
              {totalErrors > 0 && `, ${totalErrors} erori`}
            </span>
          )}
        </div>
      )}

      {/* Global progress bar */}
      {jobStatus && stores.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Progres Total</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={totalProducts > 0 ? (totalDone / totalProducts) * 100 : 0}
              className="h-3"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>
                {totalDone} / {totalProducts} produse
              </span>
              <span>
                {totalProducts > 0
                  ? Math.round((totalDone / totalProducts) * 100)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store progress cards */}
      {stores.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map(([storeId, store]) => {
            const percent =
              store.total > 0 ? Math.round((store.done / store.total) * 100) : 0;
            return (
              <Card key={storeId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{store.storeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={percent} className="mb-2" />
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>
                      {store.done} / {store.total}
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">Create: {store.created}</Badge>
                    <Badge variant="secondary">Update: {store.updated}</Badge>
                    {store.errors > 0 && (
                      <Badge variant="destructive">Erori: {store.errors}</Badge>
                    )}
                  </div>
                  {store.errorMessages.length > 0 && (
                    <div className="mt-2 text-xs text-destructive max-h-20 overflow-y-auto">
                      {store.errorMessages.slice(0, 3).map((msg, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="break-all">{msg}</span>
                        </div>
                      ))}
                      {store.errorMessages.length > 3 && (
                        <div className="text-muted-foreground mt-1">
                          +{store.errorMessages.length - 3} mai multe erori
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!jobId && !isRunning && (
        <Card className="text-center py-12">
          <CardContent>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Apasa butonul pentru a incepe sincronizarea produselor cu toate
              magazinele Shopify.
            </p>
            <p className="text-sm text-muted-foreground">
              Toate produsele cu canale Shopify active vor fi trimise catre
              magazinele corespunzatoare.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {jobStatus?.status === "failed" && (
        <Card className="mt-4 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Eroare la sincronizare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {jobStatus.error || "A aparut o eroare necunoscuta"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setJobId(null);
                setHasNotified(false);
              }}
            >
              Incearca din nou
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
