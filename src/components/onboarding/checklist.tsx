"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Whether the step is completed */
  completed: boolean;
  /** Optional action button */
  action?: {
    label: string;
    href: string;
  };
}

export interface OnboardingChecklistProps {
  /** List of onboarding steps */
  steps: OnboardingStep[];
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Title for the checklist */
  title?: string;
  /** Additional className */
  className?: string;
}

/**
 * OnboardingChecklist - SaaS onboarding progress checklist
 *
 * Displays a list of setup steps with progress tracking.
 *
 * @example
 * ```tsx
 * <OnboardingChecklist
 *   steps={[
 *     { id: "1", title: "Connect Store", description: "Link your Shopify store", completed: true },
 *     { id: "2", title: "Configure Shipping", description: "Set up FanCourier", completed: false, action: { label: "Configure", href: "/settings" } },
 *   ]}
 *   onDismiss={() => setShowOnboarding(false)}
 * />
 * ```
 */
export function OnboardingChecklist({
  steps,
  onDismiss,
  title = "Getting Started",
  className,
}: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const isComplete = completedCount === steps.length;

  return (
    <Card
      className={cn(
        "border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedCount}/{steps.length}
          </span>
        </div>
        {isComplete && (
          <p className="text-sm text-status-success mt-2">
            All set! Your workspace is ready.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <OnboardingStepItem key={step.id} step={step} />
        ))}
      </CardContent>
    </Card>
  );
}

function OnboardingStepItem({ step }: { step: OnboardingStep }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        step.completed ? "bg-muted/30" : "bg-card hover:bg-muted/50"
      )}
    >
      {step.completed ? (
        <CheckCircle2 className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm",
            step.completed && "line-through text-muted-foreground"
          )}
        >
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {step.description}
        </p>
      </div>
      {!step.completed && step.action && (
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href={step.action.href}>{step.action.label}</Link>
        </Button>
      )}
    </div>
  );
}

/**
 * OnboardingBanner - Compact banner version for dashboard
 */
export function OnboardingBanner({
  completedSteps,
  totalSteps,
  href,
  onDismiss,
  className,
}: {
  completedSteps: number;
  totalSteps: number;
  href: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const progress = (completedSteps / totalSteps) * 100;
  const isComplete = completedSteps === totalSteps;

  if (isComplete) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent",
        className
      )}
    >
      <Sparkles className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Complete your setup</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-1.5 w-24" />
          <span className="text-xs text-muted-foreground">
            {completedSteps}/{totalSteps} steps
          </span>
        </div>
      </div>
      <Button size="sm" asChild>
        <Link href={href}>Continue</Link>
      </Button>
      {onDismiss && (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
