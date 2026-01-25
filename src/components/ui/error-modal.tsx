"use client";

import * as React from "react";
import { AlertTriangle, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorModalAction {
  /** Button label */
  label: string;
  /** Click handler (optional if href provided) */
  onClick?: () => void;
  /** Link href for navigation actions */
  href?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "destructive";
}

export interface ErrorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Error title (required) */
  title: string;
  /** User-friendly error description (required) */
  description: string;
  /** Technical details (optional, shown in collapsible/code block) */
  details?: string;
  /** Action buttons (optional, defaults to "Am inteles" dismiss button) */
  actions?: ErrorModalAction[];
}

/**
 * ErrorModal - Centralized error display component
 *
 * Displays errors in a consistent, user-friendly format with:
 * - Error icon in red container
 * - User-friendly title and description in Romanian
 * - Optional technical details with copy functionality
 * - Configurable action buttons (defaults to dismiss)
 *
 * @example
 * ```tsx
 * <ErrorModal
 *   open={showError}
 *   onClose={() => setShowError(false)}
 *   title="Eroare la generarea facturii"
 *   description="Factura nu a putut fi generata. Verifica datele comenzii."
 *   details={error.stack}
 * />
 * ```
 */
export function ErrorModal({
  open,
  onClose,
  title,
  description,
  details,
  actions,
}: ErrorModalProps) {
  const [copied, setCopied] = React.useState(false);

  // Reset copied state when modal closes
  React.useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const handleCopy = React.useCallback(async () => {
    if (!details) return;

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      console.error("Failed to copy to clipboard:", err);
    }
  }, [details]);

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      }
    },
    [onClose]
  );

  // Default action if none provided
  const displayActions = actions && actions.length > 0
    ? actions
    : [{ label: "Am inteles", onClick: onClose, variant: "default" as const }];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          {/* Error icon container */}
          <div className="flex justify-center sm:justify-start">
            <div className="rounded-full bg-status-error/10 p-3">
              <AlertTriangle className="h-6 w-6 text-status-error" />
            </div>
          </div>

          {/* Title and description */}
          <div className="space-y-2">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Technical details section */}
        {details && (
          <div className="mt-2">
            <div className="relative rounded-lg bg-muted/50 p-3">
              <pre className={cn(
                "max-h-32 overflow-y-auto text-xs text-muted-foreground",
                "whitespace-pre-wrap break-words font-mono"
              )}>
                {details}
              </pre>

              {/* Copy button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={handleCopy}
                title={copied ? "Copiat!" : "Copiaza detalii"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-status-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <DialogFooter className="mt-4 sm:justify-end">
          {displayActions.map((action, index) => {
            if (action.href) {
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  asChild
                >
                  <a href={action.href}>{action.label}</a>
                </Button>
              );
            }

            return (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.onClick || onClose}
              >
                {action.label}
              </Button>
            );
          })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
