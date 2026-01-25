"use client";

import { useState, useCallback } from "react";
import { ErrorModal } from "@/components/ui/error-modal";
import { getErrorMessage } from "@/lib/error-messages";

interface UseErrorModalReturn {
  /** Show error modal with automatic message mapping */
  showError: (error: unknown, customTitle?: string) => void;
  /** Clear the error and close modal */
  clearError: () => void;
  /** The ErrorModal component to render */
  ErrorModalComponent: React.FC;
  /** Whether there's an active error */
  hasError: boolean;
}

/**
 * useErrorModal - Reusable hook for consistent error modal state management
 *
 * Provides a simple interface for showing user-friendly error modals
 * with automatic error message mapping via getErrorMessage.
 *
 * @example
 * ```tsx
 * const { showError, ErrorModalComponent } = useErrorModal();
 *
 * // In fetch/mutation error handler:
 * try {
 *   await fetchData();
 * } catch (error) {
 *   showError(error);
 * }
 *
 * // In JSX:
 * return (
 *   <>
 *     <ErrorModalComponent />
 *     {rest of page}
 *   </>
 * );
 * ```
 */
export function useErrorModal(): UseErrorModalReturn {
  const [error, setError] = useState<{
    title: string;
    description: string;
    details?: string;
  } | null>(null);

  const showError = useCallback((rawError: unknown, customTitle?: string) => {
    const mapped = getErrorMessage(rawError);
    setError({
      title: customTitle || mapped.title,
      description: mapped.description,
      details: mapped.details,
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const ErrorModalComponent = useCallback(() => {
    if (!error) return null;
    return (
      <ErrorModal
        open={!!error}
        onClose={clearError}
        title={error.title}
        description={error.description}
        details={error.details}
      />
    );
  }, [error, clearError]);

  return {
    showError,
    clearError,
    ErrorModalComponent,
    hasError: !!error,
  };
}
