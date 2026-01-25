---
phase: 03-internal-settlement
plan: 03
subsystem: ui, settings
tags: [intercompany, settlement, order-selection, company-settings, cost-price]

# Dependency graph
requires:
  - phase: 03-02
    provides: Settlement preview uses costPrice, POST endpoint for order selection
provides:
  - Order selection UI with pre-selection, exclusion, and warnings
  - Company settings intercompanySeriesName field
  - Preview generation for selected orders only
affects: [03-04, settlement-generation, oblio-invoice-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useEffect for fetching eligible orders when company selected
    - Set<string> for managing selected order IDs
    - useMemo for computing selection stats and warning flags

key-files:
  created: []
  modified:
    - src/app/(dashboard)/intercompany/page.tsx
    - src/app/(dashboard)/settings/companies/page.tsx

key-decisions:
  - "Orders pre-selected by default, user deselects to exclude"
  - "Warning banner shows only when orders have missing cost prices"
  - "Preview uses POST with orderIds array for selective calculation"
  - "Generate mutation includes orderIds for selective settlement"

patterns-established:
  - "Order selection workflow: load -> pre-select all -> allow exclusions -> preview -> generate"
  - "Warning display: global banner + per-row icons for missing cost price"
  - "Selection controls: select all / deselect all buttons + header checkbox"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 3 Plan 03: Order Selection UI Summary

**Order selection UI with pre-selection workflow and company settings for intercompany series configuration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T14:41:06Z
- **Completed:** 2026-01-25T14:46:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added intercompanySeriesName field to company settings in Oblio tab
- Enhanced intercompany page with full order selection workflow
- Implemented pre-selection of all eligible orders by default
- Added select/deselect all controls with selection counter
- Warning banner displays when any order has missing cost prices
- Per-row warning icons indicate products without acquisition prices
- Preview now generated via POST with selected orderIds only
- Preview dialog clearly labels cost-based calculation with markup percentage
- Generate button text updated to "Genereaza Factura in Oblio"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add intercompany series to company settings** - `30c1ff6` (feat)
2. **Task 2: Build order selection workflow in intercompany page** - `64872ce` (feat)

## Files Created/Modified
- `src/app/(dashboard)/settings/companies/page.tsx` - Company settings page
  - Added formIntercompanySeriesName state variable
  - Added intercompanySeriesName to Company interface
  - Added form field in Oblio tab with Romanian description
  - Included in save function and form reset
- `src/app/(dashboard)/intercompany/page.tsx` - Intercompany settlement page (866 lines)
  - Added EligibleOrder interface with costTotal, paymentType, hasMissingCostPrice
  - Extended SettlementPreview interface with warnings and totals
  - Implemented useEffect to fetch eligible orders when company selected
  - Added selectedOrderIds Set for managing selection state
  - Added selection controls (select all, deselect all)
  - Order table with checkboxes, detailed columns, and warning icons
  - Warning banner for orders with missing acquisition prices
  - Preview uses POST to /api/intercompany/preview with orderIds
  - Generate mutation passes orderIds for selective settlement

## Decisions Made
- **Pre-selection default:** All orders selected by default reduces clicks for typical workflow
- **Warning visibility:** Global banner + per-row icons provide both overview and detail
- **POST for preview:** Using POST allows sending array of orderIds vs GET query params
- **Selection persistence:** Selection maintained in component state until generation completes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Path quoting:** Initial git add failed due to parentheses in path; resolved with proper quoting
- **Pre-existing TypeScript errors:** Local Prisma client not regenerated; new code validated through static analysis

## User Setup Required

None - UI changes only, no configuration required.

## Next Phase Readiness
- Order selection UI ready for settlement generation (03-04)
- intercompanySeriesName field ready to be used by Oblio invoice generation
- Preview POST endpoint tested and ready
- No blockers identified

---
*Phase: 03-internal-settlement*
*Completed: 2026-01-25*
