# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 3 - Internal Settlement (decontare interna)

## Current Position

Phase: 3 of 10 (Internal Settlement)
Plan: 2 of 4 complete
Status: **IN PROGRESS** - Plan 03-02 complete, continuing Phase 3
Last activity: 2026-01-25 - Completed 03-02-PLAN.md (Settlement preview with cost prices)

Progress: [█████░░░░░░░░░░░░░░░] 25%

## Phase 3 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 03-01 | Complete | Schema extended for Oblio, eligible orders API created |
| 03-02 | Complete | Settlement preview uses costPrice, POST for order selection |
| 03-03 | Pending | Order selection UI |
| 03-04 | Pending | Oblio invoice generation for settlements |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: ~6 minutes
- Total execution time: ~61 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 2/4 | ~12 min | ~6 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **03-02:** Settlement uses InventoryItem.costPrice (acquisition price), NOT order lineItem.price
- **03-02:** Markup calculated on total subtotal, not per-line items
- **03-02:** Products without costPrice included with 0 value + warning generated
- **03-02:** POST endpoint for order selection, GET for all eligible orders
- **03-01:** Oblio fields on IntercompanyInvoice (oblioInvoiceId, oblioSeriesName, oblioInvoiceNumber, oblioLink)
- **03-01:** intercompanySeriesName on Company for dedicated settlement invoice series
- **03-01:** Cost price lookup: masterProduct.inventoryItem first, then direct SKU match
- **03-01:** Payment type: AWB isCollected=true -> cod, else -> online
- **02-05:** Inlocuit Facturis cu Oblio - autentificare simpla OAuth 2.0 (email + token)
- **02-04:** FailedInvoiceAttempt stores full context (store/company/series) for debugging
- **02-03:** Store-specific series takes priority over company default when active

### Blockers/Concerns

**CURRENT TASK:**
- Continue Phase 3 with plan 03-03 (Order selection UI)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 03-02-PLAN.md
Resume file: None

## Phase 2 Completed

Oblio migration complete:
- SQL migration executed in Railway
- Oblio credentials configured
- Invoice generation tested successfully
- All 5 plans complete (02-01 through 02-05)

## Recent Commits

- `d1be40b` feat(03-02): extend preview API with POST for order selection
- `6926edb` feat(03-02): update intercompany service to use acquisition price
- `a638e8f` docs(03-01): complete schema and eligible orders API plan
- `a9b5ba4` feat(03-01): create eligible orders API for settlement selection
- `22d1cbe` feat(03-01): extend Prisma schema for Oblio integration

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (Plan 03-02 complete)*
