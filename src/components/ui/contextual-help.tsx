"use client";

import * as React from "react";
import { HelpCircle, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ContextualHelpProps {
  /** Help content title */
  title: string;
  /** Help content description */
  description: string;
  /** Optional numbered steps */
  steps?: string[];
  /** Optional video tutorial URL */
  videoUrl?: string;
  /** Optional documentation link */
  docsUrl?: string;
  /** Button size variant */
  size?: "sm" | "default";
  /** Side to show popover */
  side?: "top" | "right" | "bottom" | "left";
  /** Additional className for trigger button */
  className?: string;
}

/**
 * ContextualHelp - Help popover with steps and video
 *
 * Use this to provide detailed help for complex features.
 *
 * @example
 * ```tsx
 * <ContextualHelp
 *   title="Invoice Generation"
 *   description="Generate invoices for validated orders automatically."
 *   steps={[
 *     "Select orders to invoice",
 *     "Click 'Generate Invoices'",
 *     "Review and confirm"
 *   ]}
 *   videoUrl="https://example.com/tutorial"
 *   docsUrl="/docs/invoicing"
 * />
 * ```
 */
export function ContextualHelp({
  title,
  description,
  steps,
  videoUrl,
  docsUrl,
  size = "default",
  side = "right",
  className,
}: ContextualHelpProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, "rounded-full", className)}
        >
          <HelpCircle className={cn(iconSize, "text-muted-foreground")} />
          <span className="sr-only">Help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side={side} align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          {steps && steps.length > 0 && (
            <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground pl-1">
              {steps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          )}
          {(videoUrl || docsUrl) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {videoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Watch Tutorial
                  </a>
                </Button>
              )}
              {docsUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(!videoUrl && "flex-1")}
                  asChild
                >
                  <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Docs
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * HelpLink - Inline help link
 */
export function HelpLink({
  href,
  children,
  external = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={href}
      className={cn(
        "text-sm text-primary hover:underline inline-flex items-center gap-1",
        className
      )}
      {...linkProps}
    >
      {children}
      {external && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}
