---
phase: "06"
plan: "01"
subsystem: "ui-components"
tags: ["tooltip", "skeleton", "loading-states", "ux"]
depends_on:
  requires: []
  provides: ["TooltipProvider", "ActionTooltip", "Skeleton components"]
  affects: ["06-02", "06-03", "06-04", "06-05"]
tech_stack:
  added: []
  patterns: ["Global provider composition", "Compound component pattern"]
key_files:
  created:
    - "src/components/ui/action-tooltip.tsx"
    - "src/components/ui/skeleton.tsx"
  modified:
    - "src/app/providers.tsx"
decisions:
  - id: "06-01-d1"
    title: "TooltipProvider as innermost wrapper"
    choice: "Place TooltipProvider inside GlobalLoadingProvider"
    rationale: "Ensures tooltips available to all components including loading states"
metrics:
  duration: "3 min"
  completed: "2026-01-25"
---

# Phase 6 Plan 01: UX Foundation Primitives Summary

**One-liner:** TooltipProvider with 300ms delay + ActionTooltip for button descriptions + Skeleton system for loading states

## Objective Achieved

Created the foundational UX components that all Phase 6 improvements will build upon:
1. Global tooltip delay for consistent 300ms appearance
2. ActionTooltip for descriptive button hover states with action/consequence semantics
3. Skeleton component system for loading state placeholders

## What Was Done

### Task 1: TooltipProvider Integration
**Commit:** `d459bfb`

- Imported `TooltipProvider` from `@/components/ui/tooltip`
- Wrapped app with `delayDuration={300}` (300ms tooltip delay)
- Added `skipDelayDuration={100}` for quick switching between tooltips
- Placed as innermost provider for maximum availability

**Provider structure:**
```
SessionProvider
  QueryClientProvider
    ThemeProvider
      GlobalLoadingProvider
        TooltipProvider ← NEW
          {children}
```

### Task 2: ActionTooltip Component
**Commit:** `e8c53df`

Created `src/components/ui/action-tooltip.tsx` with:

**Interface:**
```typescript
interface ActionTooltipProps {
  action: string;        // Main action (e.g., "Genereaza factura")
  consequence?: string;  // Result (e.g., "Se trimite catre Oblio")
  disabled?: boolean;    // Trigger disabled state
  disabledReason?: string; // Why disabled
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}
```

**Behavior:**
- Disabled + reason: Shows disabled reason with muted styling
- Consequence provided: Shows "action - consequence"
- Default: Shows just action

**Exports:** `ActionTooltip`, `ActionTooltipProps`

### Task 3: Skeleton Component System
**Commit:** `f7e9e2b`

Created `src/components/ui/skeleton.tsx` with 5 exports:

| Component | Purpose | Configuration |
|-----------|---------|---------------|
| `Skeleton` | Base component | `className` extensible |
| `SkeletonText` | Text placeholders | `lines` (last line 3/4 width) |
| `SkeletonCard` | Card placeholders | Title + 2 text lines |
| `SkeletonAvatar` | Avatar placeholders | `size`: sm/default/lg |
| `SkeletonTableRow` | Table row placeholders | `cols` (first col wider) |

All use `animate-pulse` and `bg-muted` for consistent appearance.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TooltipProvider: Wraps app with `delayDuration={300}` (verified)
- ActionTooltip: Exports component and props interface (verified)
- Skeleton: 5 exports with animate-pulse (verified)
- TypeScript: No errors in new files (verified)

## Key Decisions

### 06-01-d1: TooltipProvider Placement
- **Decision:** Place TooltipProvider as innermost wrapper
- **Rationale:** Maximum component availability, consistent delay across entire app
- **Alternatives considered:** Outside ThemeProvider (rejected: less visibility)

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/app/providers.tsx` | Added TooltipProvider wrapper | +4 |
| `src/components/ui/action-tooltip.tsx` | Created | +64 |
| `src/components/ui/skeleton.tsx` | Created | +82 |

## Dependencies for Next Plans

These components are ready for use in:
- **06-02:** Error feedback system (may use ActionTooltip for retry buttons)
- **06-03:** Loading states will use Skeleton components
- **06-04:** Button tooltips via ActionTooltip
- **06-05:** Form feedback with tooltips

## Technical Notes

1. **TooltipProvider Configuration:**
   - `delayDuration={300}` - Standard tooltip delay
   - `skipDelayDuration={100}` - Quick switch when hovering between tooltips

2. **ActionTooltip Pattern:**
   - Wraps existing Tooltip components (composition over modification)
   - Disabled styling via `bg-muted text-muted-foreground`
   - Uses `asChild` on trigger for proper event delegation

3. **Skeleton Flexibility:**
   - Base Skeleton accepts any className for custom shapes
   - Presets handle 90% of use cases
   - SkeletonTableRow matches existing data-table.tsx pattern

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `d459bfb` | feat | TooltipProvider with 300ms delay |
| `e8c53df` | feat | ActionTooltip component |
| `f7e9e2b` | feat | Skeleton component system |

## Next Phase Readiness

**Ready for:** Plan 06-02 (Error Modal System)

No blockers identified.
