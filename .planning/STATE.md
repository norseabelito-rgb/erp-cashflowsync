# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 6 - UX Foundation - In Progress

## Current Position

Phase: 6 of 10 (UX Foundation)
Plan: 1 of 5 complete
Status: In progress
Last activity: 2026-01-25 - Completed 06-01-PLAN.md

Progress: [██████████████░░░░░░] 70%

## Phase 6 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 06-01 | Complete | TooltipProvider + ActionTooltip + Skeleton system |
| 06-02 | Pending | Error Modal System |
| 06-03 | Pending | Loading States |
| 06-04 | Pending | Button States |
| 06-05 | Pending | Form Feedback |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 22
- Average duration: ~6 minutes
- Total execution time: ~127 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 5/5 | ~27 min | ~5.4 min |
| 04-flow-integrity | 4/4 | ~30 min | ~7.5 min |
| 05-known-bug-fixes | 4/4 | ~18 min | ~4.5 min |
| 06-ux-foundation | 1/5 | ~3 min | ~3 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **06-01:** TooltipProvider as innermost wrapper for maximum availability
- **05-01:** Image sync uses check-before-create instead of delete-all-recreate
- **05-01:** Grouped API returns up to 200 items per category for performance
- **05-01:** Assigned SKUs show product link for quick navigation
- **05-02:** Stock tooltip uses inventory-items API with 30s cache for performance
- **05-04:** Gap detection queries last invoice with invoiceNumber not null (skip drafts)
- **05-04:** Corrections only update DB if value changed (idempotent)
- **05-04:** extractNumberFromInvoice helper handles prefixes and separators
- **05-03:** Use composite index not unique constraint for nullable externalEventId
- **05-03:** Silent skip for duplicates - log and continue, no error
- **05-03:** MD5 hash fallback for deterministic event ID when no explicit ID
- **04-03:** Batch endpoint limited to 100 orders per request for performance
- **04-03:** Summary object includes readyForInvoice count for UI convenience
- **04-01:** Return needsConfirmation: true instead of hard error for pending transfers
- **04-01:** Use ActionType.UPDATE with warningType in details (avoids schema migration)
- **04-01:** Dynamic import for logWarningOverride to avoid circular dependencies
- **04-02:** AWB mismatch is warning, not blocking - allows proceeding after acknowledgment
- **04-02:** Mismatch overrides logged for audit trail
- **04-02:** Amber color for missing credentials (warning), green for configured
- **03-05:** orderIds parameter is optional - empty/undefined falls back to all eligible orders
- **03-04:** 19% VAT rate for all intercompany settlement products
- **03-04:** Oblio series from issuing company (intercompanySeriesName)
- **03-03:** Orders pre-selected by default, user deselects to exclude
- **03-02:** Settlement uses InventoryItem.costPrice (acquisition price), NOT order lineItem.price
- **02-05:** Inlocuit Facturis cu Oblio - autentificare simpla OAuth 2.0 (email + token)

### Blockers/Concerns

**NEXT:**
- Continue Phase 6: UX Foundation (plans 02-05)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 06-01-PLAN.md
Resume file: None

## Phase 6 Features

UX Foundation components:

- [x] 06-01: TooltipProvider + ActionTooltip + Skeleton system
- [ ] 06-02: Error Modal System
- [ ] 06-03: Loading States
- [ ] 06-04: Button States
- [ ] 06-05: Form Feedback

## Recent Commits

- `d459bfb` feat(06-01): add TooltipProvider with 300ms delay to app providers
- `e8c53df` feat(06-01): create ActionTooltip component with action/consequence semantics
- `f7e9e2b` feat(06-01): create Skeleton component system with presets
- `7093e40` feat(05-01): update SKU dropdown with grouped Available/Assigned sections
- `37d77b4` feat(05-01): add grouped response to inventory-items API
- `685e9d3` fix(05-01): make image sync idempotent - skip existing URLs
- `4fb9938` feat(05-02): transform order line items to card layout
- `7d8b78b` feat(05-03): add deduplication to Meta webhook handler

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (06-01 complete)*
