"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FeatureTooltipProps {
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Optional "Learn more" link */
  learnMoreHref?: string;
  /** Side of the trigger to show tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Element that triggers the tooltip */
  children: React.ReactNode;
}

/**
 * FeatureTooltip - Enhanced tooltip for feature explanations
 *
 * Use this to provide contextual help for features or UI elements.
 *
 * @example
 * ```tsx
 * <FeatureTooltip
 *   title="Auto-Sync"
 *   description="Automatically syncs orders from your connected stores every 5 minutes."
 *   learnMoreHref="/docs/auto-sync"
 * >
 *   <Button variant="outline">
 *     <RefreshCw className="h-4 w-4 mr-2" />
 *     Auto-Sync
 *   </Button>
 * </FeatureTooltip>
 * ```
 */
export function FeatureTooltip({
  title,
  description,
  learnMoreHref,
  side = "top",
  children,
}: FeatureTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-4">
        <div className="space-y-2">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
          {learnMoreHref && (
            <Link
              href={learnMoreHref}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * InfoTooltip - Simple info icon tooltip
 */
export function InfoTooltip({
  content,
  side = "top",
}: {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <span className="text-xs font-medium">?</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
