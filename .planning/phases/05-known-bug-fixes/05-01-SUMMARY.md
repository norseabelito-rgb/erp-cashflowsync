---
phase: 05-known-bug-fixes
plan: 01
subsystem: api, ui
tags: [google-drive, image-sync, inventory, dropdown, ux]

# Dependency graph
requires:
  - phase: 02-invoice-series-fix
    provides: Master product and inventory models
provides:
  - Idempotent image sync that skips existing URLs
  - Grouped inventory API with available/assigned separation
  - Grouped SKU dropdown with Available/Assigned sections
affects: [products, inventory-mapping]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idempotent sync pattern (check-before-create vs delete-recreate)
    - Grouped API response pattern for UI consumption

key-files:
  created: []
  modified:
    - src/app/api/products/sync-images/route.ts
    - src/app/api/inventory-items/route.ts
    - src/app/(dashboard)/products/page.tsx

key-decisions:
  - "Image sync uses check-before-create instead of delete-all-recreate"
  - "Grouped API returns up to 200 items per category for performance"
  - "Assigned SKUs show product link for quick navigation"

patterns-established:
  - "Idempotent sync: fetch existing, check URL set, skip duplicates"
  - "Grouped API: separate available/assigned for UI consumption"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 5 Plan 1: Known Bug Fixes Summary

**Idempotent image sync with skip-existing logic, grouped SKU dropdown with Available/Already Assigned sections**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T18:13:00Z
- **Completed:** 2026-01-25T18:21:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Image sync no longer deletes all images and recreates - skips existing URLs
- Image sync tracks per-image errors instead of failing entire product
- Inventory API supports `grouped=true` for available/assigned separation
- SKU dropdown shows "Disponibile" section at top with selectable items
- SKU dropdown shows "Deja asignate" collapsed section with disabled items
- Yellow warning banner when all SKUs are already assigned

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix image sync to skip existing URLs** - `685e9d3` (fix)
2. **Task 2: Add grouped response to inventory-items API** - `37d77b4` (feat)
3. **Task 3: Update SKU dropdown with grouped sections** - `7093e40` (feat)

## Files Created/Modified

- `src/app/api/products/sync-images/route.ts` - Idempotent image sync with skip logic and error tracking
- `src/app/api/inventory-items/route.ts` - Added grouped=true parameter for available/assigned response
- `src/app/(dashboard)/products/page.tsx` - Grouped SKU dropdown with Collapsible sections

## Decisions Made

- **Image sync pattern:** Changed from delete-all-recreate to check-before-create using existingUrls Set
- **Grouped API limit:** 200 items per category (available/assigned) for performance
- **Assigned items display:** Show product link truncated to 20 chars for quick navigation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Image sync is now idempotent and safe to run multiple times
- SKU dropdown provides clear UX for selecting unmapped inventory items
- Ready for Phase 5 Plan 2: Soft-delete invoice series

---
*Phase: 05-known-bug-fixes*
*Completed: 2026-01-25*
