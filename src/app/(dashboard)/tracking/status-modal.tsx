"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Truck,
  Clock,
  AlertCircle,
  RotateCcw,
  Ban,
  Package,
  Info,
} from "lucide-react";

interface StatusExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: {
    code: string;
    name: string;
    description: string;
    action?: string;
    color: string;
    isFinal: boolean;
    category?: string;
  } | null;
}

// Map status categories to icons
const categoryIcons: Record<string, React.ElementType> = {
  pickup: Truck,
  transit: Truck,
  delivery: Truck,
  notice: Clock,
  problem: AlertCircle,
  return: RotateCcw,
  cancel: Ban,
  other: Package,
};

export function StatusExplanationModal({
  isOpen,
  onClose,
  status,
}: StatusExplanationModalProps) {
  if (!status) return null;

  const Icon = categoryIcons[status.category || "other"] || Package;

  // Determine badge variant based on category
  const getBadgeVariant = (): "default" | "success" | "destructive" | "warning" => {
    if (status.code === "S2") return "success"; // Delivered
    if (status.category === "return" || status.category === "cancel") return "destructive";
    if (status.category === "problem") return "warning";
    return "default";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${status.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: status.color }} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant()}>{status.code}</Badge>
                <span className="font-semibold">{status.name}</span>
              </div>
              {status.isFinal && (
                <span className="text-xs text-muted-foreground">
                  Status final
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description section */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Ce inseamna?
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {status.description}
            </p>
          </div>

          {/* Action section - only show if action is defined */}
          {status.action && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${status.color}10` }}
            >
              <h4 className="text-sm font-medium text-foreground mb-1">
                Ce trebuie sa faci?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {status.action}
              </p>
            </div>
          )}

          {/* No action needed indicator for final statuses */}
          {status.isFinal && !status.action && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                Nu este necesara nicio actiune.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
