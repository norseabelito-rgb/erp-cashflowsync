"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PAGE_PADDING, PAGE_MAX_WIDTH, SECTION_SPACING } from "@/lib/design-system";

export interface PageLayoutProps {
  /** Page content */
  children: React.ReactNode;
  /** Optional header content (rendered before main content) */
  header?: React.ReactNode;
  /** Optional sidebar content (rendered on the right on large screens) */
  sidebar?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Maximum width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
};

const paddingClasses = {
  none: "",
  sm: "px-4 py-4",
  md: "px-4 py-6 md:px-6 md:py-8",
  lg: "px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10",
};

/**
 * PageLayout - Consistent page layout wrapper
 *
 * Provides standardized padding, max-width, and optional sidebar layout.
 *
 * @example
 * ```tsx
 * <PageLayout
 *   header={<PageHeader title="Dashboard" />}
 *   maxWidth="2xl"
 * >
 *   <Section title="Overview">...</Section>
 *   <Section title="Recent Activity">...</Section>
 * </PageLayout>
 * ```
 */
export function PageLayout({
  children,
  header,
  sidebar,
  footer,
  maxWidth = "2xl",
  padding = "lg",
  className,
}: PageLayoutProps) {
  return (
    <div className={cn(paddingClasses[padding], className)}>
      <div className={cn(maxWidthClasses[maxWidth], "mx-auto")}>
        {header}
        <div
          className={cn(
            sidebar ? "lg:grid lg:grid-cols-[1fr_320px] lg:gap-8" : ""
          )}
        >
          <main className={SECTION_SPACING}>{children}</main>
          {sidebar && (
            <aside className="hidden lg:block sticky top-6 self-start">
              {sidebar}
            </aside>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
}

/**
 * PageLayoutSimple - Simple layout without sidebar support
 */
export function PageLayoutSimple({
  children,
  maxWidth = "2xl",
  padding = "lg",
  className,
}: Omit<PageLayoutProps, "header" | "sidebar" | "footer">) {
  return (
    <div className={cn(paddingClasses[padding], className)}>
      <div className={cn(maxWidthClasses[maxWidth], "mx-auto", SECTION_SPACING)}>
        {children}
      </div>
    </div>
  );
}

/**
 * PageLayoutCentered - Centered content layout (for forms, auth pages, etc.)
 */
export function PageLayoutCentered({
  children,
  maxWidth = "md",
  className,
}: Pick<PageLayoutProps, "children" | "maxWidth" | "className">) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] flex items-center justify-center p-4",
        className
      )}
    >
      <div className={cn(maxWidthClasses[maxWidth], "w-full")}>{children}</div>
    </div>
  );
}
