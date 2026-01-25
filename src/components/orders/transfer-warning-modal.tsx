"use client";

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
import { AlertTriangle } from "lucide-react";

interface TransferInfo {
  orderId: string;
  orderNumber: string;
  transferNumber: string;
  transferStatus: string;
}

interface TransferWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfers: TransferInfo[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransferWarningModal({
  open,
  onOpenChange,
  transfers,
  onConfirm,
  onCancel,
  isLoading,
}: TransferWarningModalProps) {
  const isSingle = transfers.length === 1;
  const transfer = transfers[0];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Atentie!</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-left" asChild>
            <div>
              {isSingle ? (
                <>
                  <p className="font-medium text-amber-600">
                    Transferul #{transfer.transferNumber} nu e finalizat.
                  </p>
                  <p>
                    Comanda #{transfer.orderNumber} are un transfer cu status{" "}
                    <span className="font-mono bg-muted px-1 rounded">
                      {transfer.transferStatus}
                    </span>.
                  </p>
                  <p className="text-sm">
                    Continuarea poate duce la diferente in stoc sau facturare incorecta.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-600">
                    {transfers.length} comenzi au transferuri nefinalizate.
                  </p>
                  <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                    {transfers.map((t) => (
                      <div key={t.orderId} className="flex justify-between">
                        <span>#{t.orderNumber}</span>
                        <span className="text-muted-foreground">
                          Transfer #{t.transferNumber} ({t.transferStatus})
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm">
                    Continuarea poate duce la diferente in stoc sau facturare incorecta.
                  </p>
                </>
              )}
              <p className="text-sm text-muted-foreground italic">
                Recomandare: Finalizeaza transferurile inainte de a emite facturile.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Anuleaza
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
          >
            {isLoading ? "Se proceseaza..." : "Continua oricum"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
