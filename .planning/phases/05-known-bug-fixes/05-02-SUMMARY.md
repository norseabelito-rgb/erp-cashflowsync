---
phase: 05-known-bug-fixes
plan: 02
subsystem: ui
tags: [react, card-layout, tooltip, line-items, order-detail, stock-check]

# Dependency graph
requires:
  - phase: 02-invoice-series-fix
    provides: Orders page foundation
provides:
  - Card-based line item display in order detail dialog
  - StockTooltipContent component for live inventory check
  - Quick actions for product navigation and stock lookup
affects: [warehouse-features, picking, order-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Card layout for line items with image/placeholder
    - Tooltip with async data fetch (useQuery)
    - Yellow warning state for sync issues

key-files:
  created: []
  modified:
    - src/app/(dashboard)/orders/page.tsx

key-decisions:
  - "Product images use existing imageUrl from LineItem model"
  - "Stock check fetches via inventory-items API with 30s cache"
  - "Empty line items show yellow warning indicating sync issue"

patterns-established:
  - "LineItemCard: Card with image, info, prices, and quick actions"
  - "StockTooltipContent: Async tooltip content with useQuery"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 05 Plan 02: Order Line Items Card Layout Summary

**Card-based order line item display with product images, quick actions, and live stock check tooltip**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T18:17:23Z
- **Completed:** 2026-01-25T18:20:31Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Transformed order detail line items from table to card layout
- Added product image display with placeholder for missing images
- Created StockTooltipContent component with live inventory fetch
- Added quick action buttons: View Product and Stock check
- Empty state warning for orders with no line items (sync issue indicator)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LineItemCard component and update order detail display** - `4fb9938` (feat)

## Files Created/Modified

- `src/app/(dashboard)/orders/page.tsx` - Added StockTooltipContent component, replaced table with card layout for line items, added ExternalLink and BoxIcon imports, extended lineItems interface with imageUrl

## Decisions Made

- Used existing imageUrl field from LineItem model (already in Prisma schema)
- Stock check uses inventory-items API with SKU search and 30s cache for performance
- "View Product" navigates to products page with SKU as search param
- Empty line items show yellow warning to alert about potential sync issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in other files (Prisma schema mismatch) - not related to this plan
- npm cache permission errors - system issue, not code issue
- TypeScript compilation confirmed no errors in orders/page.tsx

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Order detail dialog enhanced with better visual presentation
- Ready for further warehouse/picking features
- Card layout pattern can be reused in picking interface

---
*Phase: 05-known-bug-fixes*
*Completed: 2026-01-25*
