"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ActionTooltipProps {
  /** Main action description (e.g., "Genereaza factura") */
  action: string;
  /** Consequence of the action (e.g., "Se trimite catre Oblio") */
  consequence?: string;
  /** Whether the trigger is disabled */
  disabled?: boolean;
  /** Reason for disabled state - shown instead of action/consequence when disabled */
  disabledReason?: string;
  /** Tooltip position */
  side?: "top" | "right" | "bottom" | "left";
  /** The trigger element */
  children: React.ReactNode;
}

export function ActionTooltip({
  action,
  consequence,
  disabled = false,
  disabledReason,
  side = "top",
  children,
}: ActionTooltipProps) {
  // Determine tooltip content based on state
  const getTooltipContent = () => {
    // If disabled and reason provided, show the reason
    if (disabled && disabledReason) {
      return disabledReason;
    }
    // If consequence provided, show action - consequence
    if (consequence) {
      return `${action} - ${consequence}`;
    }
    // Otherwise just show action
    return action;
  };

  const isDisabledState = disabled && disabledReason;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          "max-w-xs text-xs",
          isDisabledState && "bg-muted text-muted-foreground"
        )}
      >
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
}
