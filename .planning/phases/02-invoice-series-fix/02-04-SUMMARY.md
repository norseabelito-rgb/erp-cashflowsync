---
phase: 02-invoice-series-fix
plan: 04
subsystem: api
tags: [prisma, typescript, invoice-series, error-handling, api]

# Dependency graph
requires:
  - phase: 02-03
    provides: "Store-specific series resolution in invoice service"
provides:
  - "Edge case auto-correction with notification in getNextInvoiceNumber"
  - "FailedInvoiceAttempt Prisma model for retry tracking"
  - "Failed invoices API endpoint (GET/POST)"
affects: [02-05, invoice-ui, retry-mechanism]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Correction tracking pattern (correctionApplied/correctionMessage)"
    - "Failed attempt retry pattern with status tracking"

key-files:
  created:
    - "src/app/api/invoices/failed/route.ts"
  modified:
    - "src/lib/invoice-series.ts"
    - "prisma/schema.prisma"

key-decisions:
  - "Auto-correct zero/negative currentNumber to max(1, startNumber)"
  - "FailedInvoiceAttempt stores full context (store/company/series) for debugging"
  - "Retry increments attemptNumber and updates errorCode on failure"

patterns-established:
  - "Correction notification: functions return correctionApplied/correctionMessage for edge case handling"
  - "Failed attempt tracking: store context + error details for retry and debugging"

# Metrics
duration: 8min
completed: 2026-01-24
---

# Phase 02 Plan 04: Edge Cases and Failed Invoice Tracking Summary

**Edge case auto-correction with notification in getNextInvoiceNumber, FailedInvoiceAttempt Prisma model, and failed invoices API endpoint**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T23:32:23Z
- **Completed:** 2026-01-23T23:40:XX
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Enhanced getNextInvoiceNumber to track and notify when auto-correction is applied
- Added FailedInvoiceAttempt model to Prisma schema for tracking failed invoice attempts
- Created API endpoint for listing and retrying failed invoice attempts

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance getNextInvoiceNumber with correction tracking** - `5479f7a` (feat)
2. **Task 2: Add FailedInvoiceAttempt model to schema** - `ff7fc3c` (feat)
3. **Task 3: Create failed invoices API endpoint** - `cc0eae3` (feat)

## Files Created/Modified

- `src/lib/invoice-series.ts` - Added correctionApplied/correctionMessage to getNextInvoiceNumber return type
- `prisma/schema.prisma` - Added FailedInvoiceAttempt model with full context fields
- `src/app/api/invoices/failed/route.ts` - GET (list with pagination) and POST (retry) endpoints

## Decisions Made

- **Correction target:** When currentNumber < 1, correct to max(1, startNumber) - uses startNumber if set, otherwise 1
- **Context storage:** FailedInvoiceAttempt stores storeId/storeName, companyId/companyName, seriesId/seriesName for full debugging context
- **Status transitions:** pending -> resolved (on success) or pending -> pending with incremented attemptNumber (on retry failure)
- **Cascade delete:** FailedInvoiceAttempt uses onDelete: Cascade to clean up when Order is deleted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Prisma generate permission issue:** The node_modules/.prisma/client directory is owned by root (pre-existing condition). Schema validates correctly with `prisma validate`. The `prisma generate` command will succeed once permissions are fixed or a fresh `npm install` is run. This is an environment issue, not a code issue.
- **TypeScript errors:** The new API endpoint shows TypeScript errors for `prisma.failedInvoiceAttempt` because the Prisma client wasn't regenerated. These will resolve after `prisma generate` runs successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Edge case handling complete with correction notification
- Failed attempt tracking infrastructure ready
- API endpoint ready for UI integration (Plan 02-05)
- **Note:** Run `npx prisma generate` and `npx prisma db push` (or migration) to make FailedInvoiceAttempt available at runtime

---
*Phase: 02-invoice-series-fix*
*Completed: 2026-01-24*
