"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const variants = {
  info: {
    container: "bg-status-info/10 border-status-info/20 text-status-info",
    icon: Info,
  },
  success: {
    container: "bg-status-success/10 border-status-success/20 text-status-success",
    icon: CheckCircle2,
  },
  warning: {
    container: "bg-status-warning/10 border-status-warning/20 text-status-warning",
    icon: AlertTriangle,
  },
  error: {
    container: "bg-status-error/10 border-status-error/20 text-status-error",
    icon: AlertCircle,
  },
} as const;

export type InlineNotificationVariant = keyof typeof variants;

export interface InlineNotificationProps {
  /** Notification variant */
  variant: InlineNotificationVariant;
  /** Optional title */
  title?: string;
  /** Notification content */
  children: React.ReactNode;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Whether the notification can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * InlineNotification - Contextual inline notification/alert
 *
 * Use this for inline feedback, warnings, or informational messages.
 *
 * @example
 * ```tsx
 * <InlineNotification
 *   variant="warning"
 *   title="Low Stock Alert"
 *   action={{ label: "Restock", onClick: handleRestock }}
 *   dismissible
 *   onDismiss={() => setShowAlert(false)}
 * >
 *   Some products are running low on inventory.
 * </InlineNotification>
 * ```
 */
export function InlineNotification({
  variant,
  title,
  children,
  action,
  dismissible,
  onDismiss,
  className,
}: InlineNotificationProps) {
  const { container, icon: Icon } = variants[variant];

  return (
    <div
      className={cn("rounded-lg border p-4", container, className)}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium mb-1">{title}</p>}
          <div className="text-sm opacity-90">{children}</div>
          {action && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2 h-8"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
        {dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-1 -mt-1 opacity-70 hover:opacity-100"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * InlineNotificationCompact - Compact inline notification
 */
export function InlineNotificationCompact({
  variant,
  children,
  className,
}: {
  variant: InlineNotificationVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const { container, icon: Icon } = variants[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm",
        container,
        className
      )}
      role="alert"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * InlineNotificationBanner - Full-width banner notification
 */
export function InlineNotificationBanner({
  variant,
  children,
  action,
  onDismiss,
  className,
}: Omit<InlineNotificationProps, "title" | "dismissible">) {
  const { container, icon: Icon } = variants[variant];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 border-b",
        container,
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-5 w-5 shrink-0" />
        <div className="text-sm">{children}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <Button size="sm" variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
