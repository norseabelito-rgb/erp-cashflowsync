---
phase: 02-invoice-series-fix
plan: 02
subsystem: ui
tags: [invoice-series, store-configuration, mapping-overview, tanstack-query, shadcn-ui]

# Dependency graph
requires:
  - phase: 02-invoice-series-fix
    provides: Store API with invoiceSeriesId support and Romanian error messages
provides:
  - Store edit dialog with invoice series selection dropdown
  - Mapping overview table showing all store-to-series configurations
  - User guidance for manual series creation (Facturis has no series API)
affects: [02-03-default-series-logic, 02-04-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Store edit dialog with filtered dropdowns (company-based filtering)"
    - "Mapping overview tables with status badges (OK/Configureaza)"
    - "Effective series calculation (store-specific > company default)"

key-files:
  created: []
  modified:
    - "src/app/(dashboard)/settings/page.tsx"
    - "src/app/(dashboard)/settings/invoice-series/page.tsx"
    - "src/app/api/stores/route.ts"

key-decisions:
  - "Series dropdown filtered by selected company - only shows series belonging to that company"
  - "Series selection clears automatically when company changes to prevent invalid mappings"
  - "Mapping overview shows effective series (store-specific or company default fallback)"
  - "Guidance note clarifies manual series creation requirement (Facturis API has no series endpoint)"

patterns-established:
  - "Filtered dropdowns: Company selection filters available series options"
  - "Status badges: Visual indicators (OK/Configureaza/Lipsa) for configuration state"
  - "Effective value display: Shows both store-specific and inherited default values with badges"

# Metrics
duration: 1min
completed: 2026-01-24
---

# Phase 02 Plan 02: Store-Series Mapping UI Summary

**Store edit dialog with company-filtered series dropdown and mapping overview table showing configuration status per store**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-24T01:15:04Z
- **Completed:** 2026-01-24T01:16:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Store edit dialog enhanced with invoice series selection dropdown (filtered by company)
- Mapping overview table ("Sumar mapari") displays all stores with their effective series
- Status badges indicate configuration state (OK when mapped, Configureaza when missing)
- Guidance note clarifies that series must be manually created to match Facturis (no API available)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add series selection to store edit dialog** - `f2b4d04` (feat)
2. **Task 2: Add mapping overview table to invoice-series page** - `29a5e9b` (feat)

## Files Created/Modified

- `src/app/(dashboard)/settings/page.tsx` - Added invoice series dropdown in store edit dialog
  - Added `InvoiceSeriesOption` interface and `invoiceSeriesId` to `StoreType`
  - Added series fetch query and series selection state
  - Series dropdown filtered by selected company
  - Series cleared when company changes
  - Updated mutation to include `invoiceSeriesId`

- `src/app/(dashboard)/settings/invoice-series/page.tsx` - Added mapping overview table
  - Added `StoreWithMapping` interface with company and series data
  - Added guidance Alert about manual series creation
  - Added "Sumar mapari" table showing stores with effective series
  - Status column with OK/Configureaza badges
  - "Default firma" badge when using company default series

- `src/app/api/stores/route.ts` - Added `prefix` field to invoiceSeries select
  - Enables series dropdown to show "PREFIX - Name" format

## Decisions Made

1. **Series dropdown filtering by company**
   - Rationale: Prevents invalid cross-company series assignments
   - Implementation: Filter `seriesData?.series` by `companyId === editStoreCompanyId`

2. **Auto-clear series when company changes**
   - Rationale: Ensures data consistency - can't have series from old company
   - Implementation: `setEditStoreSeriesId(null)` in company select handler

3. **Effective series display logic**
   - Rationale: Users need to see both explicit mappings and inherited defaults
   - Implementation: Show `store.invoiceSeries` first, fallback to `company.invoiceSeries.find(s => s.isDefault)`

4. **Manual series creation guidance**
   - Rationale: Critical context from 02-RESEARCH.md - Facturis API has no series endpoint
   - Implementation: Alert component above series cards explaining manual creation requirement

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly with existing API support from 02-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 02-03 (Default Series Logic):**
- Store-to-series mapping UI complete and user-verified
- Mapping overview table provides visibility into current configuration
- Users can now assign series to stores manually
- Next: Implement automatic default series selection when store has no explicit mapping

**Ready for 02-04 (Testing):**
- All UI components functional and verified by user
- Series filtering and effective series logic ready for test coverage

**Blockers:** None

**Concerns:** None - functionality approved by user ("totul functioneaza")

---
*Phase: 02-invoice-series-fix*
*Completed: 2026-01-24*
