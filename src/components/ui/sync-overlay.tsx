"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SyncOverlayProps {
  isOpen: boolean;
  title: string;
  description?: string;
  progress?: number; // 0-100
  currentItem?: string;
  totalItems?: number;
  processedItems?: number;
  status: "loading" | "success" | "error" | "idle";
  successMessage?: string;
  errorMessage?: string;
  errors?: string[];
  onClose?: () => void;
  canClose?: boolean; // Permite închiderea în timpul loading
}

export function SyncOverlay({
  isOpen,
  title,
  description,
  progress,
  currentItem,
  totalItems,
  processedItems,
  status,
  successMessage,
  errorMessage,
  errors = [],
  onClose,
  canClose = false,
}: SyncOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const showCloseButton = status === "success" || status === "error" || canClose;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop cu blur */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={showCloseButton ? onClose : undefined}
      />
      
      {/* Card central */}
      <div className={cn(
        "relative bg-card border rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transition-all duration-300",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        {/* Close button */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {status === "loading" && (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-status-success" />
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-status-error" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-2">{title}</h3>
        
        {/* Description */}
        {description && (
          <p className="text-muted-foreground text-center text-sm mb-4">{description}</p>
        )}

        {/* Progress */}
        {status === "loading" && (
          <div className="space-y-3">
            {/* Progress bar */}
            {progress !== undefined && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
              </div>
            )}
            
            {/* Current item being processed */}
            {currentItem && (
              <p className="text-sm text-center text-muted-foreground truncate">
                {currentItem}
              </p>
            )}
            
            {/* Items counter */}
            {totalItems !== undefined && processedItems !== undefined && (
              <p className="text-sm text-center font-medium">
                {processedItems} / {totalItems} procesate
              </p>
            )}
          </div>
        )}

        {/* Success message */}
        {status === "success" && successMessage && (
          <div className="bg-status-success/10 border border-status-success/20 rounded-lg p-4 mt-4">
            <p className="text-sm text-status-success text-center">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {status === "error" && errorMessage && (
          <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4 mt-4">
            <p className="text-sm text-status-error text-center">{errorMessage}</p>
          </div>
        )}

        {/* Error list */}
        {errors.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto">
            <p className="text-sm font-medium text-status-error mb-2">Erori ({errors.length}):</p>
            <ul className="space-y-1">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i} className="text-xs text-status-error bg-status-error/10 px-2 py-1 rounded">
                  {error}
                </li>
              ))}
              {errors.length > 5 && (
                <li className="text-xs text-muted-foreground">
                  ...și încă {errors.length - 5} erori
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Close button for success/error */}
        {(status === "success" || status === "error") && onClose && (
          <div className="mt-6 flex justify-center">
            <Button onClick={onClose} variant={status === "success" ? "default" : "outline"}>
              {status === "success" ? "OK" : "Închide"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook pentru a gestiona starea de sync
export function useSyncOverlay() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    progress?: number;
    currentItem?: string;
    totalItems?: number;
    processedItems?: number;
    status: "loading" | "success" | "error" | "idle";
    successMessage?: string;
    errorMessage?: string;
    errors: string[];
  }>({
    isOpen: false,
    title: "",
    status: "idle",
    errors: [],
  });

  const start = (title: string, description?: string, totalItems?: number) => {
    setState({
      isOpen: true,
      title,
      description,
      totalItems,
      processedItems: 0,
      progress: 0,
      status: "loading",
      errors: [],
    });
  };

  const updateProgress = (processedItems: number, currentItem?: string) => {
    setState(prev => ({
      ...prev,
      processedItems,
      currentItem,
      progress: prev.totalItems ? (processedItems / prev.totalItems) * 100 : undefined,
    }));
  };

  const success = (message: string) => {
    setState(prev => ({
      ...prev,
      status: "success",
      successMessage: message,
      progress: 100,
    }));
  };

  const error = (message: string, errors?: string[]) => {
    setState(prev => ({
      ...prev,
      status: "error",
      errorMessage: message,
      errors: errors || [],
    }));
  };

  const close = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    state,
    start,
    updateProgress,
    success,
    error,
    close,
  };
}
