"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LoadingState {
  isLoading: boolean;
  message: string;
  canCancel: boolean;
  onCancel?: () => void;
}

interface LoadingContextType {
  startLoading: (message: string, options?: { canCancel?: boolean; onCancel?: () => void }) => void;
  stopLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useGlobalLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within a GlobalLoadingProvider");
  }
  return context;
}

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export function GlobalLoadingProvider({ children }: GlobalLoadingProviderProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: "",
    canCancel: false,
    onCancel: undefined,
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startLoading = useCallback((
    message: string, 
    options?: { canCancel?: boolean; onCancel?: () => void }
  ) => {
    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    
    setLoadingState({
      isLoading: true,
      message,
      canCancel: options?.canCancel ?? true,
      onCancel: options?.onCancel,
    });
  }, []);

  const stopLoading = useCallback(() => {
    abortControllerRef.current = null;
    setLoadingState({
      isLoading: false,
      message: "",
      canCancel: false,
      onCancel: undefined,
    });
  }, []);

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    // Abort the current operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Call custom cancel handler if provided
    if (loadingState.onCancel) {
      loadingState.onCancel();
    }
    
    setShowCancelConfirm(false);
    stopLoading();
  };

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, isLoading: loadingState.isLoading }}>
      {children}
      
      {/* Loading Overlay */}
      {loadingState.isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          
          {/* Loading Card */}
          <div className="relative z-10 bg-card border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-6">
              {/* Spinner */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              </div>
              
              {/* Message */}
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">{loadingState.message}</p>
                <p className="text-sm text-muted-foreground">
                  Vă rugăm să așteptați...
                </p>
              </div>
              
              {/* Cancel Button */}
              {loadingState.canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancelClick}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Anulează
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare operațiune</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi această operațiune? 
              Se va reveni la stadiul anterior și orice modificări în curs vor fi pierdute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuă operațiunea</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Da, anulează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LoadingContext.Provider>
  );
}

// Hook pentru a obține abort signal pentru fetch requests
export function useLoadingAbortSignal() {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const getSignal = useCallback(() => {
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);
  
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  return { getSignal, abort };
}
