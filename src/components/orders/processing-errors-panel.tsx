"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  FileText,
  Truck,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Session error from process-all mutation
export interface ProcessError {
  orderId: string;
  orderNumber: string;
  success: boolean;
  invoiceSuccess?: boolean;
  invoiceNumber?: string;
  invoiceError?: string;
  awbSuccess?: boolean;
  awbNumber?: string;
  awbError?: string;
}

// Persistent error from database
export interface DBProcessingError {
  id: string;
  orderId: string;
  type: "INVOICE" | "AWB";
  status: "PENDING" | "RETRYING" | "RESOLVED" | "FAILED" | "SKIPPED";
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastRetryAt: string | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolution: string | null;
  order: {
    id: string;
    shopifyOrderNumber: string;
    source?: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    store: { name: string };
  };
}

interface ErrorsBySource {
  shopify: number;
  trendyol: number;
  unknown: number;
}

interface ProcessingErrorsPanelProps {
  errors: ProcessError[];
  dbErrors: DBProcessingError[];
  isLoading: boolean;
  errorsBySource: ErrorsBySource;
  onRetryError: (errorId: string) => void;
  onSkipError: (errorId: string) => void;
  onRetryAll: () => void;
  onClearSessionErrors: () => void;
  isRetrying?: boolean;
}

function ChannelBadge({ source }: { source?: string }) {
  if (source === "trendyol") {
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      >
        Trendyol
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="text-xs">
      Shopify
    </Badge>
  );
}

function ErrorTypeBadge({ type, hasError }: { type: "INVOICE" | "AWB"; hasError: boolean }) {
  const Icon = type === "INVOICE" ? FileText : Truck;
  return (
    <Badge
      variant={hasError ? "destructive" : "outline"}
      className={cn("gap-1 text-xs", hasError ? "" : "opacity-50")}
    >
      <Icon className="h-3 w-3" />
      {type === "INVOICE" ? "Factura" : "AWB"}
    </Badge>
  );
}

export function ProcessingErrorsPanel({
  errors,
  dbErrors,
  isLoading,
  errorsBySource,
  onRetryError,
  onSkipError,
  onRetryAll,
  onClearSessionErrors,
  isRetrying = false,
}: ProcessingErrorsPanelProps) {
  // Filter out resolved/skipped DB errors
  const activeDbErrors = dbErrors.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "SKIPPED"
  );

  const totalErrors = errors.length + activeDbErrors.length;

  // Auto-collapse when no errors, expand when errors appear
  const [isCollapsed, setIsCollapsed] = useState(totalErrors === 0);

  useEffect(() => {
    if (totalErrors > 0 && isCollapsed) {
      setIsCollapsed(false);
    } else if (totalErrors === 0 && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [totalErrors]);

  // Hide panel completely when no errors
  if (totalErrors === 0) {
    return null;
  }

  const hasSessionErrors = errors.length > 0;
  const hasPersistentErrors = activeDbErrors.length > 0;

  return (
    <div className="mb-4 rounded-lg bg-status-error/5 border border-status-error/20">
      {/* Header bar - always visible */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-error" />
            <span className="font-medium text-status-error">
              {totalErrors} {totalErrors === 1 ? "eroare" : "erori"} de procesare
            </span>
          </div>

          {/* Channel breakdown */}
          <div className="text-sm text-muted-foreground hidden sm:flex items-center gap-1">
            <span className="text-foreground/70">|</span>
            {errorsBySource.shopify > 0 && (
              <span>Shopify: {errorsBySource.shopify}</span>
            )}
            {errorsBySource.shopify > 0 && errorsBySource.trendyol > 0 && (
              <span className="mx-1">|</span>
            )}
            {errorsBySource.trendyol > 0 && (
              <span className="text-orange-600 dark:text-orange-400">
                Trendyol: {errorsBySource.trendyol}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onRetryAll}
            disabled={isRetrying || isLoading}
            variant="destructive"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
            Reincearca toate
          </Button>

          {hasSessionErrors && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearSessionErrors}
                  className="text-status-error hover:text-status-error/80"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sterge erorile din sesiune</TooltipContent>
            </Tooltip>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Session errors section */}
          {hasSessionErrors && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-status-error flex items-center gap-2">
                Erori in sesiune
                <Badge variant="outline" className="text-xs">
                  {errors.length}
                </Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {errors.map((error) => (
                  <div
                    key={error.orderId}
                    className="p-3 rounded-md border border-status-error/20 bg-background"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {error.orderNumber}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRetryError(error.orderId)}
                        disabled={isRetrying}
                        className="h-7 px-2 text-status-error hover:text-status-error/80 hover:bg-status-error/10"
                      >
                        <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      <ErrorTypeBadge type="INVOICE" hasError={error.invoiceSuccess === false} />
                      <ErrorTypeBadge type="AWB" hasError={error.awbSuccess === false} />
                    </div>

                    {(error.invoiceError || error.awbError) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground truncate cursor-help">
                            {error.invoiceError || error.awbError}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1">
                            {error.invoiceError && (
                              <p><strong>Factura:</strong> {error.invoiceError}</p>
                            )}
                            {error.awbError && (
                              <p><strong>AWB:</strong> {error.awbError}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persistent errors section */}
          {hasPersistentErrors && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-status-error flex items-center gap-2">
                Erori persistente
                <Badge variant="outline" className="text-xs">
                  {activeDbErrors.length}
                </Badge>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeDbErrors.map((error) => (
                  <div
                    key={error.id}
                    className="p-3 rounded-md border border-status-error/20 bg-background"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {error.order.shopifyOrderNumber}
                        </span>
                        <ChannelBadge source={error.order.source} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSkipError(error.id)}
                              disabled={isRetrying}
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Sari peste aceasta eroare</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRetryError(error.id)}
                              disabled={isRetrying}
                              className="h-7 px-2 text-status-error hover:text-status-error/80 hover:bg-status-error/10"
                            >
                              <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reincearca</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      <ErrorTypeBadge type={error.type} hasError={true} />
                      <Badge
                        variant={error.status === "FAILED" ? "destructive" : "warning"}
                        className="text-xs"
                      >
                        {error.status === "PENDING" ? "In asteptare" :
                         error.status === "RETRYING" ? "Se reincearca" :
                         error.status === "FAILED" ? "Esuat" : error.status}
                      </Badge>
                      {error.retryCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({error.retryCount}/{error.maxRetries} incercari)
                        </span>
                      )}
                    </div>

                    {error.errorMessage && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground truncate cursor-help">
                            {error.errorMessage}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {error.errorMessage}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
