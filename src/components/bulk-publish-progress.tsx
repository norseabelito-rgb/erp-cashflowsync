"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bulk-publish-job-id";

interface ChannelProgress {
  name: string;
  total: number;
  done: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface JobStatus {
  id: string;
  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "COMPLETED_WITH_ERRORS"
    | "FAILED"
    | "CANCELLED";
  progress: {
    total: number;
    done: number;
    percent: number;
    created: number;
    updated: number;
    failed: number;
  };
  channelProgress: Record<string, ChannelProgress>;
  currentChannel: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedTimeRemaining: string | null;
  errorMessage: string | null;
}

interface BulkPublishProgressProps {
  jobId?: string;
  onClose?: () => void;
  onComplete?: () => void;
}

export function BulkPublishProgress({
  jobId: propJobId,
  onClose,
  onComplete,
}: BulkPublishProgressProps) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(propJobId || null);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  // La mount, verifică localStorage pentru job activ
  useEffect(() => {
    if (!propJobId) {
      const storedJobId = localStorage.getItem(STORAGE_KEY);
      if (storedJobId) {
        setJobId(storedJobId);
      }
    }
  }, [propJobId]);

  // Polling pentru status
  const { data: jobStatus, isLoading } = useQuery<JobStatus>({
    queryKey: ["bulk-publish-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetch(`/api/products/bulk-publish/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Oprește polling când job-ul e terminat
      if (
        status === "COMPLETED" ||
        status === "COMPLETED_WITH_ERRORS" ||
        status === "FAILED" ||
        status === "CANCELLED"
      ) {
        return false;
      }
      return 2000; // Polling la 2 secunde
    },
  });

  // Vizibilitate overlay
  useEffect(() => {
    if (jobId && jobStatus) {
      setIsVisible(true);
    }
  }, [jobId, jobStatus]);

  // Curăță localStorage și notifică completarea
  useEffect(() => {
    if (jobStatus) {
      const isTerminal = ["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED", "CANCELLED"].includes(
        jobStatus.status
      );
      if (isTerminal) {
        localStorage.removeItem(STORAGE_KEY);
        onComplete?.();
      }
    }
  }, [jobStatus?.status, onComplete]);

  // Mutation pentru anulare
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) return;
      const res = await fetch(`/api/products/bulk-publish/${jobId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-publish-job", jobId] });
    },
  });

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setJobId(null);
      localStorage.removeItem(STORAGE_KEY);
      onClose?.();
    }, 300);
  }, [onClose]);

  const toggleChannel = (channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  if (!jobId || (!jobStatus && !isLoading)) {
    return null;
  }

  const status = jobStatus?.status || "PENDING";
  const isRunning = status === "PENDING" || status === "RUNNING";
  const isSuccess = status === "COMPLETED";
  const isPartialSuccess = status === "COMPLETED_WITH_ERRORS";
  const isError = status === "FAILED";
  const isCancelled = status === "CANCELLED";
  const isTerminal = !isRunning;

  const progress = jobStatus?.progress || { total: 0, done: 0, percent: 0, created: 0, updated: 0, failed: 0 };
  const channelProgress = jobStatus?.channelProgress || {};
  const channelIds = Object.keys(channelProgress);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop cu blur */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={isTerminal ? handleClose : undefined}
      />

      {/* Card central */}
      <div
        className={cn(
          "relative bg-card border rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 transition-all duration-300 max-h-[90vh] overflow-y-auto",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        {/* Close button */}
        {isTerminal && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {isRunning && (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
          )}
          {isSuccess && (
            <div className="w-14 h-14 rounded-full bg-status-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-status-success" />
            </div>
          )}
          {isPartialSuccess && (
            <div className="w-14 h-14 rounded-full bg-status-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-status-warning" />
            </div>
          )}
          {(isError || isCancelled) && (
            <div className="w-14 h-14 rounded-full bg-status-error/10 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-status-error" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center mb-1">
          {isRunning && "Publicare în curs..."}
          {isSuccess && "Publicare finalizată"}
          {isPartialSuccess && "Publicare finalizată cu erori"}
          {isError && "Publicare eșuată"}
          {isCancelled && "Publicare anulată"}
        </h3>

        {/* Subtitle cu timp estimat */}
        {isRunning && jobStatus?.estimatedTimeRemaining && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            Timp estimat rămas: {jobStatus.estimatedTimeRemaining}
          </p>
        )}

        {/* Progress bar global */}
        <div className="mb-4 space-y-2">
          <Progress value={progress.percent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress.percent}%</span>
            <span>
              {progress.done} / {progress.total} operații
            </span>
          </div>
        </div>

        {/* Statistici globale */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-status-success/10 rounded-lg p-2 text-center">
            <div className="text-lg font-semibold text-status-success">{progress.created}</div>
            <div className="text-xs text-muted-foreground">Create</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-2 text-center">
            <div className="text-lg font-semibold text-primary">{progress.updated}</div>
            <div className="text-xs text-muted-foreground">Actualizate</div>
          </div>
          <div className="bg-status-error/10 rounded-lg p-2 text-center">
            <div className="text-lg font-semibold text-status-error">{progress.failed}</div>
            <div className="text-xs text-muted-foreground">Erori</div>
          </div>
        </div>

        {/* Progress per canal */}
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium">Progress per canal:</h4>
          {channelIds.map((channelId) => {
            const cp = channelProgress[channelId];
            const isExpanded = expandedChannels.has(channelId);
            const channelPercent = cp.total > 0 ? Math.round((cp.done / cp.total) * 100) : 0;
            const isCurrentChannel = jobStatus?.currentChannel === cp.name;
            const hasErrors = cp.errors.length > 0;

            return (
              <div
                key={channelId}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  isCurrentChannel && isRunning && "border-primary/50 bg-primary/5"
                )}
              >
                <button
                  className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleChannel(channelId)}
                >
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{cp.name}</span>
                    {isCurrentChannel && isRunning && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        În curs
                      </span>
                    )}
                    {hasErrors && (
                      <span className="text-xs bg-status-error/20 text-status-error px-1.5 py-0.5 rounded">
                        {cp.errors.length} erori
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {cp.done}/{cp.total}
                    </span>
                    <Progress value={channelPercent} className="w-16 h-1.5" />
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-2 space-y-2 border-t bg-muted/30">
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Create:</span>{" "}
                        <span className="font-medium text-status-success">{cp.created}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actualizate:</span>{" "}
                        <span className="font-medium text-primary">{cp.updated}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Erori:</span>{" "}
                        <span className="font-medium text-status-error">{cp.failed}</span>
                      </div>
                    </div>

                    {cp.errors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-status-error">Erori:</p>
                        {cp.errors.slice(0, 5).map((error, i) => (
                          <p
                            key={i}
                            className="text-xs text-status-error bg-status-error/10 px-2 py-1 rounded truncate"
                            title={error}
                          >
                            {error}
                          </p>
                        ))}
                        {cp.errors.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            ...și încă {cp.errors.length - 5} erori
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {jobStatus?.errorMessage && (
          <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-status-error">{jobStatus.errorMessage}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-2">
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se anulează...
                </>
              ) : (
                "Anulează"
              )}
            </Button>
          )}
          {isTerminal && (
            <Button onClick={handleClose} variant={isSuccess ? "default" : "outline"} size="sm">
              Închide
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pentru a gestiona starea de bulk publish
 */
export function useBulkPublish() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);

  // La mount, verifică localStorage pentru job activ
  useEffect(() => {
    const storedJobId = localStorage.getItem(STORAGE_KEY);
    if (storedJobId) {
      setJobId(storedJobId);
    }
  }, []);

  const startJob = async (productIds: string[], channelIds: string[]) => {
    const res = await fetch("/api/products/bulk-publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds, channelIds }),
    });

    const data = await res.json();

    if (data.success && data.jobId) {
      setJobId(data.jobId);
      localStorage.setItem(STORAGE_KEY, data.jobId);
      return { success: true, jobId: data.jobId, message: data.message };
    }

    return { success: false, error: data.error };
  };

  const clearJob = () => {
    setJobId(null);
    localStorage.removeItem(STORAGE_KEY);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return {
    jobId,
    startJob,
    clearJob,
    hasActiveJob: !!jobId,
  };
}
