# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 3 - Internal Settlement (decontare interna) - **COMPLETE**

## Current Position

Phase: 3 of 10 (Internal Settlement) - **COMPLETE**
Plan: 4 of 4 complete
Status: **PHASE COMPLETE** - Ready for next phase
Last activity: 2026-01-25 - Completed 03-04-PLAN.md (Oblio invoice generation)

Progress: [████████░░░░░░░░░░░░] 40%

## Phase 3 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 03-01 | Complete | Schema extended for Oblio, eligible orders API created |
| 03-02 | Complete | Settlement preview uses costPrice, POST for order selection |
| 03-03 | Complete | Order selection UI with pre-selection and warnings |
| 03-04 | Complete | Oblio invoice generation for settlements with retry capability |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~6 minutes
- Total execution time: ~73 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 4/4 | ~24 min | ~6 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **03-04:** 19% VAT rate for all intercompany settlement products
- **03-04:** Oblio series from issuing company (intercompanySeriesName)
- **03-04:** Oblio failure non-blocking - settlement created, allows retry later
- **03-04:** Type assertions used for fields pending prisma generate
- **03-03:** Orders pre-selected by default, user deselects to exclude
- **03-03:** Warning banner shows when any order has missing cost prices
- **03-03:** Preview uses POST with orderIds array for selective calculation
- **03-02:** Settlement uses InventoryItem.costPrice (acquisition price), NOT order lineItem.price
- **03-02:** Markup calculated on total subtotal, not per-line items
- **03-02:** Products without costPrice included with 0 value + warning generated
- **03-01:** Oblio fields on IntercompanyInvoice (oblioInvoiceId, oblioSeriesName, oblioInvoiceNumber, oblioLink)
- **03-01:** intercompanySeriesName on Company for dedicated settlement invoice series
- **03-01:** Cost price lookup: masterProduct.inventoryItem first, then direct SKU match
- **02-05:** Inlocuit Facturis cu Oblio - autentificare simpla OAuth 2.0 (email + token)

### Blockers/Concerns

**NEXT:**
- Ready for Phase 4 (Warehouse/Inventory) or other priorities

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed Phase 3 (03-04-PLAN.md)
Resume file: None

## Phase 3 Completed

Internal Settlement flow complete:
- Schema extended with Oblio fields for invoice tracking
- Settlement calculated using acquisition price (costPrice) with markup
- Order selection UI with pre-selection and warning banners
- Oblio invoice generation on settlement creation
- Retry capability for failed Oblio generations

## Recent Commits

- `3e9cfee` feat(03-04): add retry Oblio generation endpoint for failed settlements
- `c92ae43` feat(03-04): integrate Oblio into generate API and update UI
- `46e01b9` feat(03-04): add Oblio invoice generation for intercompany settlements
- `64872ce` feat(03-03): build order selection workflow in intercompany page
- `30c1ff6` feat(03-03): add intercompanySeriesName field to company settings

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (Phase 3 complete)*
