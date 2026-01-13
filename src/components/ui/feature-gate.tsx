"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FeatureGateProps {
  /** Feature name for display */
  featureName: string;
  /** Whether the feature is available */
  isAvailable: boolean;
  /** Content to render when feature is available */
  children: React.ReactNode;
  /** Optional custom fallback content */
  fallback?: React.ReactNode;
  /** Link to upgrade page */
  upgradeHref?: string;
  /** Description of what the feature does */
  description?: string;
  /** Additional className */
  className?: string;
}

/**
 * FeatureGate - Premium feature gate with upgrade prompt
 *
 * Wraps content that requires a premium plan. Shows a blurred overlay with upgrade CTA
 * when the feature is not available.
 *
 * @example
 * ```tsx
 * <FeatureGate
 *   featureName="Advanced Analytics"
 *   isAvailable={user.plan === 'pro'}
 *   upgradeHref="/upgrade"
 *   description="Get detailed insights into your business performance."
 * >
 *   <AnalyticsDashboard />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  featureName,
  isAvailable,
  children,
  fallback,
  upgradeHref = "/upgrade",
  description,
  className,
}: FeatureGateProps) {
  if (isAvailable) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content preview */}
      <div className="opacity-40 pointer-events-none blur-[2px] select-none">
        {children}
      </div>
      {/* Overlay with upgrade prompt */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{featureName}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          )}
          <Button asChild>
            <Link href={upgradeHref}>
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Access
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * FeatureGateBadge - Inline badge for premium features
 */
export function FeatureGateBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        "bg-status-warning/10 text-status-warning",
        "border border-status-warning/20",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Pro
    </span>
  );
}

/**
 * FeatureGateInline - Inline feature gate for buttons/links
 */
export function FeatureGateInline({
  isAvailable,
  upgradeHref = "/upgrade",
  children,
  className,
}: {
  isAvailable: boolean;
  upgradeHref?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (isAvailable) {
    return <>{children}</>;
  }

  return (
    <Button variant="outline" className={className} asChild>
      <Link href={upgradeHref}>
        <Lock className="h-4 w-4 mr-2" />
        Upgrade to Unlock
      </Link>
    </Button>
  );
}
