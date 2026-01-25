---
phase: 03-internal-settlement
plan: 05
subsystem: api
tags: [intercompany, settlement, order-selection, gap-closure]

# Dependency graph
requires:
  - phase: 03-internal-settlement (03-02, 03-03)
    provides: calculateSettlementFromOrders function and UI order selection
provides:
  - generateIntercompanyInvoice respects user order selection (orderIds parameter)
  - API passes orderIds from request body to service
  - Backward compatible - undefined/empty orderIds uses all eligible orders
affects: [intercompany-settlements, weekly-settlement-cron]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional parameter for subset selection with fallback to all

key-files:
  created: []
  modified:
    - src/lib/intercompany-service.ts
    - src/app/api/intercompany/generate/route.ts

key-decisions:
  - "orderIds parameter is optional - empty/undefined falls back to all eligible orders"
  - "runWeeklySettlement explicitly passes undefined for orderIds (uses all eligible)"

patterns-established:
  - "Order selection flow: UI -> API orderIds -> service calculateSettlementFromOrders"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 3 Plan 05: Order Selection Wiring Summary

**Wire orderIds from UI through API to generateIntercompanyInvoice - closes gap where UI sends orderIds but backend ignored them**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T15:12:00Z
- **Completed:** 2026-01-25T15:15:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- generateIntercompanyInvoice now accepts optional orderIds parameter
- When orderIds provided, uses calculateSettlementFromOrders for selective settlement
- When orderIds empty/undefined, falls back to generateSettlementPreview (all eligible orders)
- API route passes orderIds from request body to service function
- Verification gap closed: User can now select/exclude specific orders before generating settlement

## Task Commits

Each task was committed atomically:

1. **Task 1: Update generateIntercompanyInvoice to accept and use orderIds** - `6bedd1b` (feat)
2. **Task 2: Update generate API to pass orderIds to service** - `2ef9679` (feat)

## Files Created/Modified
- `src/lib/intercompany-service.ts` - Added orderIds parameter, conditional call to calculateSettlementFromOrders
- `src/app/api/intercompany/generate/route.ts` - Passes orderIds from request body to service

## Decisions Made
- orderIds parameter placed before periodStart/periodEnd for natural grouping (required vs optional params)
- runWeeklySettlement updated to explicitly pass undefined for orderIds to maintain backward compatibility
- No validation added for orderIds array - if invalid IDs passed, calculateSettlementFromOrders validates against DB

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated runWeeklySettlement call signature**
- **Found during:** Task 1 (TypeScript compile verification)
- **Issue:** runWeeklySettlement (line 731) called generateIntercompanyInvoice with old signature, causing TS error
- **Fix:** Updated call to pass `undefined` for orderIds: `generateIntercompanyInvoice(company.id, undefined, periodStart, periodEnd)`
- **Files modified:** src/lib/intercompany-service.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 6bedd1b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor fix for existing caller - necessary for backward compatibility. No scope creep.

## Issues Encountered
None - plan executed as expected with one minor fix for existing caller.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Order selection flow is now complete end-to-end
- UI sends orderIds -> API extracts and passes -> Service filters orders
- Verification gap "User can select/exclude specific orders before generating settlement" is closed
- Phase 3 gap closure complete

---
*Phase: 03-internal-settlement*
*Completed: 2026-01-25*
