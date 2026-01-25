---
phase: 03-internal-settlement
plan: 02
subsystem: api, business-logic
tags: [intercompany, settlement, costPrice, inventoryItem, acquisition-price]

# Dependency graph
requires:
  - phase: 03-01
    provides: Extended schema with Oblio fields and eligible orders API
provides:
  - Settlement calculation using InventoryItem.costPrice (acquisition price)
  - calculateSettlementFromOrders function for selected order settlement
  - POST /api/intercompany/preview endpoint for order selection
  - Warnings for products without costPrice
affects: [03-03, 03-04, settlement-ui, intercompany-invoice-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch SKU lookup from InventoryItem via getCostPricesForSkus helper
    - Markup applied to total subtotal, not per-line items
    - SettlementPreviewExtended with warnings array for UI feedback

key-files:
  created: []
  modified:
    - src/lib/intercompany-service.ts
    - src/app/api/intercompany/preview/route.ts

key-decisions:
  - "Settlement uses InventoryItem.costPrice, NOT order lineItem.price"
  - "Markup calculated on total acquisition cost, not per-line"
  - "Products without costPrice included with 0 value and warning generated"
  - "POST endpoint for order selection, GET for all eligible orders"

patterns-established:
  - "Cost price calculation: batch SKU lookup -> calculate per order -> aggregate to totals"
  - "Extended preview includes warnings array for UI display"
  - "Order info includes costTotal and paymentType for transparency"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 3 Plan 02: Settlement Preview with Cost Prices Summary

**Settlement preview now uses acquisition prices (InventoryItem.costPrice) with markup on total, warnings for missing prices, and POST endpoint for order selection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T14:34:01Z
- **Completed:** 2026-01-25T14:38:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Settlement calculation refactored to use InventoryItem.costPrice (acquisition price) instead of order lineItem.price
- Markup now applied to total subtotal rather than per-line items
- Added warnings array for products without costPrice - included in preview for user awareness
- New POST /api/intercompany/preview endpoint allows generating preview for selected orders only
- Extended preview includes per-order costTotal and paymentType for transparency

## Task Commits

Each task was committed atomically:

1. **Task 1: Update intercompany-service price calculation** - `6926edb` (feat)
2. **Task 2: Extend preview API for order selection** - `d1be40b` (feat)

## Files Created/Modified
- `src/lib/intercompany-service.ts` - Core settlement service with cost price calculation
  - Added getCostPricesForSkus helper for batch InventoryItem lookup
  - Added calculateSettlementFromOrders for selected order settlement
  - Updated generateSettlementPreview to use costPrice
  - Added SettlementPreviewExtended interface with warnings and totals
- `src/app/api/intercompany/preview/route.ts` - Extended preview endpoint
  - Added POST method for selected order settlement
  - GET endpoint now returns extended preview with warnings

## Decisions Made
- **Cost price source:** Using InventoryItem.costPrice (acquisition price) ensures settlement reflects actual cost to Aquaterra
- **Markup on total:** Applying markup to total subtotal simplifies calculation and matches business expectation
- **Missing cost prices:** Products without costPrice are included with 0 value to allow user review rather than blocking settlement
- **API design:** POST for selected orders allows UI to recalculate when user changes selection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Prisma client regeneration:** Local npm permission issues prevent `prisma generate` - code validated through static schema review. Production deployment will regenerate client.
- **TypeScript validation:** Could not fully verify against generated Prisma types locally, but schema fields confirmed present in schema.prisma

## User Setup Required

None - no additional configuration required.

**Note:** If schema was updated but not yet pushed to database, run:
```bash
npx prisma db push
```

## Next Phase Readiness
- Settlement preview with correct cost calculations ready for UI integration (03-03)
- POST endpoint ready for order selection workflow
- No blockers identified
- Oblio invoice generation (03-04) can use preview data directly

---
*Phase: 03-internal-settlement*
*Completed: 2026-01-25*
