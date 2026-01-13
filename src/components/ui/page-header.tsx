"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_HEADER } from "@/lib/design-system";

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Optional action buttons or elements */
  actions?: React.ReactNode;
  /** Optional badge to display next to title (e.g., count, status) */
  badge?: React.ReactNode;
  /** Optional back link URL */
  backHref?: string;
  /** Optional back link label */
  backLabel?: string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * PageHeader - Standardized page header component
 *
 * Use this component at the top of every dashboard page for consistent styling.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Orders"
 *   description="Manage and process customer orders"
 *   actions={
 *     <>
 *       <Button variant="outline">Export</Button>
 *       <Button>New Order</Button>
 *     </>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  backHref,
  backLabel = "Back",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(PAGE_HEADER.wrapper, className)}>
      <div className={PAGE_HEADER.content}>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 -ml-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        )}
        <div className="flex items-center gap-3">
          <h1 className={PAGE_HEADER.title}>{title}</h1>
          {badge}
        </div>
        {description && (
          <p className={PAGE_HEADER.description}>{description}</p>
        )}
      </div>
      {actions && <div className={PAGE_HEADER.actions}>{actions}</div>}
    </div>
  );
}

export interface PageHeaderSkeletonProps {
  /** Show description skeleton */
  hasDescription?: boolean;
  /** Show actions skeleton */
  hasActions?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * PageHeaderSkeleton - Loading skeleton for PageHeader
 */
export function PageHeaderSkeleton({
  hasDescription = true,
  hasActions = true,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div className={cn(PAGE_HEADER.wrapper, className)}>
      <div className={PAGE_HEADER.content}>
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        {hasDescription && (
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        )}
      </div>
      {hasActions && (
        <div className={PAGE_HEADER.actions}>
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
      )}
    </div>
  );
}
