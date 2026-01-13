"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EMPTY_STATE } from "@/lib/design-system";

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Navigation href (alternative to onClick) */
  href?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface EmptyStateProps {
  /** Icon component to display */
  icon?: React.ElementType;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Additional content below the actions */
  children?: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: {
    wrapper: "py-8",
    iconWrapper: "p-3 mb-3",
    icon: "h-6 w-6",
    title: "text-base font-medium mb-0.5",
    description: "text-xs mb-4",
  },
  default: {
    wrapper: "py-16",
    iconWrapper: "p-4 mb-4",
    icon: "h-8 w-8",
    title: "text-lg font-medium mb-1",
    description: "text-sm mb-6",
  },
  lg: {
    wrapper: "py-24",
    iconWrapper: "p-5 mb-5",
    icon: "h-10 w-10",
    title: "text-xl font-semibold mb-2",
    description: "text-base mb-8",
  },
};

/**
 * EmptyState - Displays a placeholder when there's no data
 *
 * Use this component in tables, lists, or any area that can be empty.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Package}
 *   title="No orders yet"
 *   description="Orders will appear here once customers start purchasing."
 *   action={{
 *     label: "Create Order",
 *     href: "/orders/new"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = "default",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  const renderAction = (actionConfig: EmptyStateAction, isPrimary: boolean) => {
    const variant = actionConfig.variant || (isPrimary ? "default" : "outline");

    if (actionConfig.href) {
      return (
        <Button variant={variant} asChild>
          <Link href={actionConfig.href}>{actionConfig.label}</Link>
        </Button>
      );
    }

    return (
      <Button variant={variant} onClick={actionConfig.onClick}>
        {actionConfig.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        sizes.wrapper,
        className
      )}
    >
      {Icon && (
        <div className={cn("rounded-full bg-muted", sizes.iconWrapper)}>
          <Icon className={cn("text-muted-foreground", sizes.icon)} />
        </div>
      )}
      <h3 className={sizes.title}>{title}</h3>
      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-sm",
            sizes.description
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && renderAction(action, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * EmptyStateCompact - A more compact empty state for inline use
 */
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  className,
}: Pick<EmptyStateProps, "icon" | "title" | "description" | "className">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 text-left rounded-lg bg-muted/30",
        className
      )}
    >
      {Icon && (
        <div className="rounded-full bg-muted p-2 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
