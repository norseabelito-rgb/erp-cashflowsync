"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertTriangle } from "lucide-react";

interface PINDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string, reason: string) => Promise<void>;
  title: string;
  description: string;
  actionLabel?: string;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * PINDialog - Reusable PIN input dialog for manual operation approvals
 *
 * Used when an operation (stornare/incasare) is blocked due to invoice
 * not being in a manifest. User must enter 6-digit PIN to proceed.
 *
 * Features:
 * - 6-digit PIN input with numeric validation
 * - Optional reason field for audit trail
 * - Loading and error states
 * - Warning alert explaining why PIN is required
 */
export function PINDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel = "Confirma",
  isLoading = false,
  error = null
}: PINDialogProps) {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (pin.length !== 6) return;
    await onConfirm(pin, reason);
  };

  const handleClose = () => {
    setPin("");
    setReason("");
    onClose();
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 6 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Aceasta operatie necesita aprobare PIN deoarece nu exista in borderou.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN (6 cifre)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={handlePinChange}
              placeholder="******"
              className="text-center text-lg tracking-widest font-mono"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Introdu PIN-ul de 6 cifre configurat in setari
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motiv (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="De ce este necesara aceasta operatie..."
              rows={2}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Anuleaza
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pin.length !== 6 || isLoading}
          >
            {isLoading ? "Se verifica..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
