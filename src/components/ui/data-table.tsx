"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_CONTAINER, TABLE_HEADER_ROW } from "@/lib/design-system";

export interface DataTableProps {
  /** Table content (children should be a Table component) */
  children: React.ReactNode;
  /** Show loading state */
  loading?: boolean;
  /** Empty state content to show when there's no data */
  empty?: React.ReactNode;
  /** Optional header content (filters, search, etc.) */
  header?: React.ReactNode;
  /** Optional footer content (pagination, etc.) */
  footer?: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * DataTable - Consistent table wrapper component
 *
 * Provides a standardized container for tables with loading states,
 * empty states, and optional header/footer areas.
 *
 * @example
 * ```tsx
 * <DataTable
 *   loading={isLoading}
 *   empty={<EmptyState icon={Package} title="No orders" />}
 *   header={<TableFilters />}
 *   footer={<Pagination />}
 * >
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <TableBody>...</TableBody>
 *   </Table>
 * </DataTable>
 * ```
 */
export function DataTable({
  children,
  loading,
  empty,
  header,
  footer,
  className,
}: DataTableProps) {
  return (
    <div className={cn(TABLE_CONTAINER, className)}>
      {header && (
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
          {header}
        </div>
      )}
      <div className="overflow-x-auto">
        {loading ? (
          <DataTableLoading />
        ) : empty ? (
          empty
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t bg-muted/10 flex items-center justify-between gap-4 flex-wrap">
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * DataTableLoading - Loading state for DataTable
 */
export function DataTableLoading({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header skeleton */}
      <div className={cn("flex items-center gap-4 px-4 py-3", TABLE_HEADER_ROW)}>
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded hidden sm:block" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded hidden md:block" />
        <div className="flex-1" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0"
        >
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-28 bg-muted animate-pulse rounded hidden sm:block" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded hidden md:block" />
          <div className="flex-1" />
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * DataTableSpinner - Centered spinner for loading state
 */
export function DataTableSpinner({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * DataTableHeader - Standard table header row styling
 */
export function DataTableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(TABLE_HEADER_ROW, className)}>
      {children}
    </div>
  );
}
