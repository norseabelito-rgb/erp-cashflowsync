---
phase: 03-internal-settlement
plan: 01
subsystem: api, database
tags: [prisma, intercompany, oblio, settlement, orders]

# Dependency graph
requires:
  - phase: 02-invoice-series-fix
    provides: Oblio integration for invoice generation
provides:
  - Extended Company model with intercompanySeriesName field
  - Extended IntercompanyInvoice model with Oblio reference fields
  - GET /api/intercompany/eligible-orders endpoint for settlement selection
affects: [03-02, 03-03, internal-settlement-ui, settlement-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch SKU lookup to avoid N+1 queries when fetching costPrice
    - LineItem -> MasterProduct -> InventoryItem chain for cost data

key-files:
  created:
    - src/app/api/intercompany/eligible-orders/route.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Oblio fields on IntercompanyInvoice: oblioInvoiceId, oblioSeriesName, oblioInvoiceNumber, oblioLink"
  - "intercompanySeriesName on Company for dedicated settlement invoice series"
  - "markupPercent on IntercompanyInvoice to store markup used per settlement"
  - "Direct SKU lookup fallback when masterProduct mapping missing"

patterns-established:
  - "Cost price lookup: First try masterProduct.inventoryItem, then direct SKU match"
  - "Payment type detection: AWB isCollected=true -> cod, else -> online"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 3 Plan 01: Schema + Eligible Orders API Summary

**Prisma schema extended for Oblio integration + eligible orders API with cost price lookup from InventoryItem**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T14:28:00Z
- **Completed:** 2026-01-25T14:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended Company model with `intercompanySeriesName` for dedicated Oblio settlement series
- Extended IntercompanyInvoice model with Oblio reference fields (oblioInvoiceId, oblioSeriesName, oblioInvoiceNumber, oblioLink) and markupPercent
- Created GET /api/intercompany/eligible-orders endpoint returning orders with payment type classification and cost price data

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema for Oblio integration** - `22d1cbe` (feat)
2. **Task 2: Create eligible orders API endpoint** - `a9b5ba4` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added intercompanySeriesName to Company, Oblio fields + markupPercent to IntercompanyInvoice
- `src/app/api/intercompany/eligible-orders/route.ts` - New API endpoint for fetching eligible orders with cost price data

## Decisions Made
- Used direct SKU lookup as fallback when masterProduct mapping is missing, ensuring all products can get cost prices
- Payment type determined by AWB isCollected status (true = COD, false = online paid)
- Warnings generated for products without costPrice but orders still included (allows user to decide)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Local npm/prisma permission issues prevented running verification commands - code validated through static review instead
- Schema changes validated via `npx prisma format` (succeeds = valid syntax)

## User Setup Required

**Database migration required.** After deployment:
1. Run `npx prisma db push` to apply new schema fields
2. Configure `intercompanySeriesName` on secondary companies (e.g., "DEC" or "DECONT")

## Next Phase Readiness
- Schema ready for Oblio invoice generation (03-02)
- API endpoint ready for order selection UI (03-03)
- No blockers identified

---
*Phase: 03-internal-settlement*
*Completed: 2026-01-25*
