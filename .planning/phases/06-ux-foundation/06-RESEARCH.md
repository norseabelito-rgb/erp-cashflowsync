# Phase 6: UX Foundation - Research

**Researched:** 2026-01-25
**Domain:** UI/UX patterns, design system implementation, React component architecture
**Confidence:** HIGH

## Summary

This research covers implementing a comprehensive UX foundation for a Next.js 14 application with an existing shadcn/ui + Radix UI component library. The application already has foundational pieces in place (design tokens, status colors, empty states, toast system), but requires standardization and enhancement across 75+ pages.

The primary work involves:
1. Enhancing tooltips with action-consequence descriptions and consistent 300ms delay
2. Establishing visual consistency through a Notion-inspired minimal design system
3. Adding skeleton loading states across all data tables and forms
4. Standardizing error modals with actionable Romanian messages
5. Enhancing empty states with context-appropriate CTAs

**Primary recommendation:** Leverage existing shadcn/ui primitives and design system tokens rather than introducing new libraries. The codebase already has 90% of required infrastructure.

## Standard Stack

The project already uses the correct stack - no new libraries needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-tooltip | ^1.0.7 | Tooltip primitives | Already in use, supports delayDuration |
| @radix-ui/react-toast | ^1.1.5 | Toast notifications | Already in use with variants |
| @radix-ui/react-dialog | ^1.0.5 | Modal dialogs | Already in use for errors |
| class-variance-authority | ^0.7.0 | Component variants | Already in use for styling |
| tailwindcss | ^3.4.1 | Utility CSS | Already configured with design tokens |
| framer-motion | ^11.0.8 | Animations | Available for skeleton shimmer |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.344.0 | Icons | All button and empty state icons |
| tailwindcss-animate | ^1.0.7 | CSS animations | Skeleton pulse, fade-in effects |

### No New Dependencies Required

The existing `package.json` has everything needed. The `tailwind.config.ts` already defines:
- Status colors (`status-success`, `status-warning`, `status-error`, `status-info`, `status-neutral`)
- Surface hierarchy (`surface-0` through `surface-3`)
- Spacing scale (4px base unit)
- Shadow definitions
- Animation keyframes (shimmer, fade-in, scale-in)

## Architecture Patterns

### Existing Design System Structure
```
src/
├── lib/
│   └── design-system.ts      # Central design tokens (already exists)
├── components/
│   └── ui/
│       ├── button.tsx        # Has loading state (already exists)
│       ├── toast.tsx         # Has variants (already exists)
│       ├── tooltip.tsx       # Needs delay enhancement
│       ├── empty-state.tsx   # Good foundation (already exists)
│       ├── status-badge.tsx  # Comprehensive (already exists)
│       ├── data-table.tsx    # Has skeleton (already exists)
│       ├── skeleton.tsx      # Needs creation (base component)
│       └── error-modal.tsx   # Needs creation (centralized errors)
└── app/
    └── globals.css           # Design tokens defined (already exists)
```

### Pattern 1: TooltipProvider with Global Delay

**What:** Configure tooltip provider with 300ms delay globally
**When to use:** App-level configuration in providers.tsx
**Example:**
```typescript
// Source: Radix UI Tooltip documentation
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }) {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      {children}
    </TooltipProvider>
  );
}
```

### Pattern 2: Action-Consequence Tooltip Content

**What:** Tooltips show what happens when action is taken
**When to use:** All action buttons, especially those with side effects
**Example:**
```typescript
// Pattern for actionable tooltips in Romanian
<ActionTooltip
  action="Genereaza factura"
  consequence="Se trimite catre Oblio"
  disabled={!canInvoice}
  disabledReason="Comanda trebuie sa fie validata mai intai"
>
  <Button disabled={!canInvoice}>
    <FileText className="h-4 w-4 mr-2" />
    Factureaza
  </Button>
</ActionTooltip>
```

### Pattern 3: Skeleton Loading Components

**What:** Placeholder UI while content loads
**When to use:** All data tables, cards with async data
**Example:**
```typescript
// Skeleton composition for different content types
<Skeleton className="h-4 w-[200px]" />           // Text line
<Skeleton className="h-10 w-full" />             // Table row
<Skeleton className="h-[125px] w-full rounded-lg" /> // Card
<Skeleton className="h-12 w-12 rounded-full" /> // Avatar
```

### Pattern 4: Centralized Error Modal

**What:** Consistent error display with actionable guidance
**When to use:** Critical errors that need user attention
**Example:**
```typescript
// Error modal with Romanian messaging
<ErrorModal
  open={hasError}
  onClose={clearError}
  title="Eroare la generarea facturii"
  description="Factura nu a putut fi generata din cauza unei probleme cu datele clientului."
  details={error.technicalDetails}
  actions={[
    { label: "Incearca din nou", onClick: retry },
    { label: "Contacteaza suport", href: "/support" }
  ]}
/>
```

### Anti-Patterns to Avoid
- **Icon-only buttons without labels:** Always include text label with icon
- **Generic error messages:** "A aparut o eroare" without context
- **Inconsistent spacing:** Mixing px values instead of design tokens
- **Loading spinners for content:** Use skeleton screens instead
- **Empty tables with no guidance:** Always show empty state with CTA

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip delay | Custom timeout logic | Radix TooltipProvider `delayDuration` | Handles edge cases, skip delays |
| Toast positioning | CSS positioning | Existing ToastViewport in toast.tsx | Already handles stacking, mobile |
| Skeleton animation | Custom CSS | `animate-pulse` from tailwindcss-animate | Consistent, performant |
| Loading states | Custom spinner | Existing `DataTableLoading` | Already matches table structure |
| Status colors | Hardcoded values | `STATUS_STYLES` from design-system.ts | Maintains consistency |

**Key insight:** The codebase already has well-architected solutions. The work is standardization and application across pages, not building new primitives.

## Common Pitfalls

### Pitfall 1: TooltipProvider Placement
**What goes wrong:** Tooltips don't show or have inconsistent delays
**Why it happens:** Multiple TooltipProviders or missing provider
**How to avoid:** Single TooltipProvider in providers.tsx wrapping entire app
**Warning signs:** Some tooltips have delay, others don't

### Pitfall 2: Mobile Tooltip Behavior
**What goes wrong:** Tooltips don't work on touch devices
**Why it happens:** Tooltips rely on hover, which doesn't exist on mobile
**How to avoid:** For critical information, use visible labels; tooltips are desktop enhancement
**Warning signs:** Users on tablets can't access information

### Pitfall 3: Skeleton Layout Shift
**What goes wrong:** Content jumps when data loads
**Why it happens:** Skeleton dimensions don't match real content
**How to avoid:** Match skeleton dimensions to actual content dimensions
**Warning signs:** Visible jank when loading completes

### Pitfall 4: Error Message Language
**What goes wrong:** Technical errors shown to users
**Why it happens:** Passing API error messages directly to UI
**How to avoid:** Map technical errors to user-friendly Romanian messages
**Warning signs:** Users see "ECONNREFUSED" or JSON errors

### Pitfall 5: Empty State Overuse
**What goes wrong:** Empty states shown during loading
**Why it happens:** Checking `data.length === 0` before loading completes
**How to avoid:** Check `!isLoading && data.length === 0` before showing empty state
**Warning signs:** Flash of empty state before content appears

## Code Examples

Verified patterns from existing codebase and official sources:

### ActionTooltip Component (New)
```typescript
// src/components/ui/action-tooltip.tsx
"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ActionTooltipProps {
  /** Main action description */
  action: string;
  /** Consequence of the action */
  consequence?: string;
  /** Whether the trigger is disabled */
  disabled?: boolean;
  /** Reason for disabled state (shown in tooltip) */
  disabledReason?: string;
  /** Side of tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** The trigger element */
  children: React.ReactNode;
}

export function ActionTooltip({
  action,
  consequence,
  disabled,
  disabledReason,
  side = "top",
  children,
}: ActionTooltipProps) {
  const content = disabled && disabledReason
    ? disabledReason
    : consequence
      ? `${action} - ${consequence}`
      : action;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          "max-w-xs",
          disabled && "bg-muted text-muted-foreground"
        )}
      >
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Skeleton Base Component (New)
```typescript
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

// Preset compositions
export function SkeletonText({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonAvatar() {
  return <Skeleton className="h-10 w-10 rounded-full" />;
}
```

### ErrorModal Component (New)
```typescript
// src/components/ui/error-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";

export interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  details?: string;
  actions?: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: "default" | "outline" | "secondary";
  }>;
}

export function ErrorModal({
  open,
  onClose,
  title,
  description,
  details,
  actions,
}: ErrorModalProps) {
  const [copied, setCopied] = useState(false);

  const copyDetails = () => {
    if (details) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-status-error/10 p-2">
              <AlertTriangle className="h-5 w-5 text-status-error" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className="rounded-lg bg-muted/50 p-3 mt-2">
            <div className="flex items-start justify-between gap-2">
              <code className="text-xs text-muted-foreground break-all">
                {details}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={copyDetails}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {actions?.map((action, i) => (
            <Button
              key={i}
              variant={action.variant || (i === 0 ? "default" : "outline")}
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? (
                <a href={action.href}>{action.label}</a>
              ) : (
                action.label
              )}
            </Button>
          ))}
          {!actions?.length && (
            <Button onClick={onClose}>Am inteles</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Enhanced Empty State Pattern
```typescript
// Usage pattern for context-specific empty states
// In Romanian with actionable CTAs

// First-time state (onboarding)
<EmptyState
  icon={Package}
  title="Nicio comanda inca"
  description="Comenzile vor aparea aici dupa ce magazinul va primi prima comanda."
  action={{
    label: "Conecteaza magazin",
    href: "/settings/stores"
  }}
/>

// Filtered state (no results)
<EmptyState
  icon={Search}
  title="Niciun rezultat gasit"
  description="Incearca sa modifici filtrele sau termenul de cautare."
  action={{
    label: "Reseteaza filtre",
    onClick: clearFilters
  }}
/>

// Success state (empty inbox)
<EmptyState
  icon={CheckCircle}
  title="Totul este rezolvat"
  description="Nu ai erori de procesat. Buna treaba!"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spinner for loading | Skeleton screens | 2023 | Better perceived performance |
| Global error toast | Contextual error modals | 2024 | Higher error resolution rate |
| Icon-only buttons | Icon + label buttons | 2024 | Accessibility & clarity |
| Generic empty states | Context-specific with CTA | 2024 | Higher engagement |
| Hardcoded colors | CSS variable tokens | Already done | Maintainability |

**Current (already in codebase):**
- Design tokens via CSS variables
- Status colors with opacity support
- Toast system with variants
- Basic skeleton in DataTableLoading

**Needs standardization:**
- Tooltip delay (currently inconsistent)
- Error modal pattern (ad-hoc implementations)
- Skeleton components (only in data-table)
- Empty state CTAs (some missing)

## Open Questions

Things that couldn't be fully resolved:

1. **Toast Duration Configuration**
   - What we know: Current TOAST_REMOVE_DELAY is 5000ms (5 seconds)
   - What's unclear: Whether different toast types need different durations
   - Recommendation: Keep 5s for success, consider 8s for errors/warnings

2. **Mobile Bottom Bar Trigger**
   - What we know: Design calls for fixed bottom bar on mobile
   - What's unclear: Exact breakpoint to trigger (md? sm?)
   - Recommendation: Use `md:` breakpoint (768px) - tablets get normal layout

3. **Illustration Style for Empty States**
   - What we know: Should have illustrations (per CONTEXT.md)
   - What's unclear: Whether to use Lucide icons or custom SVGs
   - Recommendation: Start with Lucide icons (already in use), can add custom later

## Sources

### Primary (HIGH confidence)
- [Radix UI Tooltip Documentation](https://www.radix-ui.com/primitives/docs/components/tooltip) - Delay configuration, provider setup
- [shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton) - Component patterns
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first patterns

### Secondary (MEDIUM confidence)
- [LogRocket: React-Toastify Guide 2025](https://blog.logrocket.com/react-toastify-guide/) - Toast best practices
- [Eleken: Empty State UX](https://www.eleken.co/blog-posts/empty-state-ux) - Empty state patterns
- [UXPin: Empty States Best Practices](https://www.uxpin.com/studio/blog/ux-best-practices-designing-the-overlooked-empty-states/) - CTA patterns

### Tertiary (LOW confidence)
- Medium articles on Notion design patterns - Visual inspiration only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, verified existing setup
- Architecture: HIGH - Based on existing codebase patterns
- Pitfalls: HIGH - Common React/Radix issues documented
- Code examples: HIGH - Follows existing codebase conventions

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain)

---

## Implementation Summary

### Phase 6 Scope

Based on research, Phase 6 should focus on these areas:

1. **Tooltip Enhancement** (UX-01)
   - Add TooltipProvider to providers.tsx with 300ms delay
   - Create ActionTooltip component for buttons
   - Audit all buttons across 75 pages for text labels

2. **Visual Consistency** (UX-02)
   - Define spacing constants (8px grid)
   - Audit and standardize shadows, borders, colors
   - Add alternating row colors to tables
   - Ensure all pages use design-system.ts tokens

3. **Responsive Improvements** (UX-03)
   - Implement collapsible sidebar for tablet/mobile
   - Add horizontal scroll to tables on mobile
   - Create mobile bottom bar for primary actions

4. **Loading States** (UX-04)
   - Create base Skeleton component
   - Add skeleton compositions (SkeletonText, SkeletonCard, etc.)
   - Apply to all async data fetching pages

5. **Error States** (UX-05)
   - Create ErrorModal component
   - Define error message mapping (technical -> user-friendly Romanian)
   - Apply to all API error handlers

6. **Empty States** (UX-06)
   - Audit existing empty states for CTAs
   - Create context-specific variants
   - Ensure all tables/lists have empty states

### Estimated Effort

- New components: ~4 (ActionTooltip, Skeleton, ErrorModal, MobileBottomBar)
- Pages to audit: 75
- Design system additions: ~10 tokens/utilities
- Tests: Component unit tests + visual regression

### Dependencies

None external. Uses:
- Existing shadcn/ui components
- Existing Radix UI primitives
- Existing Tailwind configuration
- Existing design tokens
