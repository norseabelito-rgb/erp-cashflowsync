"use client";

import { useState } from "react";
import { PINDialog } from "@/components/pin/PINDialog";
import { toast } from "@/hooks/use-toast";

interface InvoiceActionGuardProps {
  invoiceId: string;
  action: "cancel" | "collect";
  onSuccess?: () => void;
  children: (props: { execute: () => void; isLoading: boolean }) => React.ReactNode;
}

/**
 * InvoiceActionGuard - Wrapper component for guarded invoice operations
 *
 * Handles the manifest/PIN check flow:
 * 1. User triggers action via children render prop
 * 2. If operation is blocked, shows PIN dialog
 * 3. On valid PIN, retries the operation
 * 4. On success, calls onSuccess callback
 *
 * Usage:
 * ```tsx
 * <InvoiceActionGuard
 *   invoiceId={invoice.id}
 *   action="cancel"
 *   onSuccess={() => refetch()}
 * >
 *   {({ execute, isLoading }) => (
 *     <Button onClick={execute} disabled={isLoading}>
 *       Storneaza
 *     </Button>
 *   )}
 * </InvoiceActionGuard>
 * ```
 */
export function InvoiceActionGuard({
  invoiceId,
  action,
  onSuccess,
  children
}: InvoiceActionGuardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPINDialog, setShowPINDialog] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const endpoint = action === "cancel"
    ? `/api/invoices/${invoiceId}/cancel`
    : `/api/invoices/${invoiceId}/collect`;

  const actionTitle = action === "cancel" ? "Stornare" : "Incasare";

  async function executeAction() {
    setIsLoading(true);
    setPinError(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (data.blocked && data.requiresPIN) {
        // Show PIN dialog
        setShowPINDialog(true);
        return;
      }

      if (!data.success) {
        toast({ title: data.error || `Eroare la ${actionTitle.toLowerCase()}`, variant: "destructive" });
        return;
      }

      toast({ title: `${actionTitle} realizata cu succes` });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare necunoscuta";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function executeWithPIN(pin: string, reason: string) {
    setIsLoading(true);
    setPinError(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, reason })
      });

      const data = await res.json();

      if (!data.success) {
        setPinError(data.error || "PIN invalid");
        setIsLoading(false);
        return;
      }

      toast({ title: `${actionTitle} realizata cu succes (aprobare PIN)` });
      setShowPINDialog(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eroare necunoscuta";
      setPinError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {children({ execute: executeAction, isLoading })}

      <PINDialog
        open={showPINDialog}
        onClose={() => {
          setShowPINDialog(false);
          setPinError(null);
        }}
        onConfirm={executeWithPIN}
        title={`Aprobare ${actionTitle}`}
        description={
          action === "cancel"
            ? "Factura nu exista in manifestul de retururi. Introduceti PIN-ul pentru a storna manual."
            : "Factura nu exista in manifestul de livrari. Introduceti PIN-ul pentru a marca ca incasata manual."
        }
        actionLabel={actionTitle}
        isLoading={isLoading}
        error={pinError}
      />
    </>
  );
}
