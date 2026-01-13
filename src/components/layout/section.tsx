"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CARD_SPACING } from "@/lib/design-system";

export interface SectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Wrap content in a Card */
  card?: boolean;
  /** Additional className for the section */
  className?: string;
  /** Content padding (when using card) */
  contentClassName?: string;
}

/**
 * Section - Content section wrapper
 *
 * Use this to organize page content into logical sections with consistent styling.
 *
 * @example
 * ```tsx
 * <Section
 *   title="Recent Orders"
 *   description="View and manage recent customer orders"
 *   action={<Button variant="outline" size="sm">View All</Button>}
 *   card
 * >
 *   <OrdersTable />
 * </Section>
 * ```
 */
export function Section({
  title,
  description,
  action,
  children,
  card = false,
  className,
  contentClassName,
}: SectionProps) {
  const hasHeader = title || description || action;

  if (card) {
    return (
      <Card className={className}>
        {hasHeader && (
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1">
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {action}
          </CardHeader>
        )}
        <CardContent className={cn(!hasHeader && "pt-6", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className={cn(CARD_SPACING, className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

/**
 * SectionGrid - Grid layout for section content
 */
export function SectionGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridClasses = {
    2: "grid gap-4 md:grid-cols-2",
    3: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
    4: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={cn(gridClasses[columns], className)}>{children}</div>;
}

/**
 * SectionDivider - Visual divider between sections
 */
export function SectionDivider({ className }: { className?: string }) {
  return <hr className={cn("border-border my-6", className)} />;
}
