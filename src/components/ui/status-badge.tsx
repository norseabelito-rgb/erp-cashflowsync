"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, type StatusType } from "@/lib/design-system";

const extendedStatusVariants = {
  ...STATUS_STYLES,
  // Additional status variants
  active: "bg-status-success/10 text-status-success border border-status-success/20",
  inactive: "bg-status-neutral/10 text-status-neutral border border-status-neutral/20",
  draft: "bg-status-neutral/10 text-status-neutral border border-status-neutral/20",
  published: "bg-status-success/10 text-status-success border border-status-success/20",
  archived: "bg-status-neutral/10 text-status-neutral border border-status-neutral/20",
  cancelled: "bg-status-error/10 text-status-error border border-status-error/20",
  completed: "bg-status-success/10 text-status-success border border-status-success/20",
  failed: "bg-status-error/10 text-status-error border border-status-error/20",
  warning: "bg-status-warning/10 text-status-warning border border-status-warning/20",
  info: "bg-status-info/10 text-status-info border border-status-info/20",
} as const;

export type ExtendedStatusType = keyof typeof extendedStatusVariants;

export interface StatusBadgeProps {
  /** Status type determining the color scheme */
  status: ExtendedStatusType;
  /** Badge content */
  children: React.ReactNode;
  /** Show a status dot indicator */
  dot?: boolean;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1",
  default: "px-2.5 py-0.5 text-xs gap-1.5",
  lg: "px-3 py-1 text-sm gap-2",
};

const dotSizeClasses = {
  sm: "w-1 h-1",
  default: "w-1.5 h-1.5",
  lg: "w-2 h-2",
};

/**
 * StatusBadge - Semantic status badge component
 *
 * Use this component to display status indicators with consistent styling.
 *
 * @example
 * ```tsx
 * <StatusBadge status="success">Completed</StatusBadge>
 * <StatusBadge status="pending" dot>Processing</StatusBadge>
 * <StatusBadge status="error" size="lg">Failed</StatusBadge>
 * ```
 */
export function StatusBadge({
  status,
  children,
  dot = false,
  size = "default",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        extendedStatusVariants[status],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn("rounded-full bg-current", dotSizeClasses[size])}
        />
      )}
      {children}
    </span>
  );
}

/**
 * StatusDot - Simple status dot indicator
 */
export function StatusDot({
  status,
  size = "default",
  className,
}: {
  status: ExtendedStatusType;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const dotColors = {
    pending: "bg-status-warning",
    processing: "bg-status-info",
    success: "bg-status-success",
    error: "bg-status-error",
    neutral: "bg-status-neutral",
    active: "bg-status-success",
    inactive: "bg-status-neutral",
    draft: "bg-status-neutral",
    published: "bg-status-success",
    archived: "bg-status-neutral",
    cancelled: "bg-status-error",
    completed: "bg-status-success",
    failed: "bg-status-error",
    warning: "bg-status-warning",
    info: "bg-status-info",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        dotColors[status],
        dotSizeClasses[size],
        className
      )}
    />
  );
}

/**
 * Helper function to map common status strings to StatusBadge status types
 */
export function getStatusType(status: string): ExtendedStatusType {
  const statusMap: Record<string, ExtendedStatusType> = {
    // Order statuses
    PENDING: "pending",
    VALIDATED: "info",
    INVOICED: "info",
    SHIPPED: "processing",
    DELIVERED: "success",
    CANCELLED: "cancelled",
    FAILED: "failed",
    // Generic statuses
    active: "active",
    inactive: "inactive",
    draft: "draft",
    published: "published",
    archived: "archived",
    completed: "completed",
    processing: "processing",
    error: "error",
    success: "success",
    warning: "warning",
    info: "info",
  };

  return statusMap[status] || "neutral";
}
