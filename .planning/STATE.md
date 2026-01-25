# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 4 - Flow Integrity (previne mismatch-uri intre facturi si AWB-uri)

## Current Position

Phase: 4 of 10 (Flow Integrity)
Plan: 2 of 4 complete
Status: In progress
Last activity: 2026-01-25 - Completed 04-02-PLAN.md (AWB mismatch detection)

Progress: [█████████░░░░░░░░░░░] 45%

## Phase 4 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 04-01 | Pending | Invoice transfer blocking |
| 04-02 | Complete | AWB mismatch detection with warning/confirmation flow |
| 04-03 | Pending | Unified warning confirmation modal |
| 04-04 | Pending | End-to-end flow integrity tests |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: ~6 minutes
- Total execution time: ~84 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 5/5 | ~27 min | ~5.4 min |
| 04-flow-integrity | 1/4 | ~8 min | ~8 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **04-02:** AWB mismatch is warning, not blocking - allows proceeding after acknowledgment
- **04-02:** Mismatch overrides logged for audit trail
- **04-02:** Amber color for missing credentials (warning), green for configured
- **03-05:** orderIds parameter is optional - empty/undefined falls back to all eligible orders
- **03-05:** runWeeklySettlement explicitly passes undefined for orderIds (uses all eligible)
- **03-04:** 19% VAT rate for all intercompany settlement products
- **03-04:** Oblio series from issuing company (intercompanySeriesName)
- **03-04:** Oblio failure non-blocking - settlement created, allows retry later
- **03-03:** Orders pre-selected by default, user deselects to exclude
- **03-03:** Warning banner shows when any order has missing cost prices
- **03-02:** Settlement uses InventoryItem.costPrice (acquisition price), NOT order lineItem.price
- **03-01:** Oblio fields on IntercompanyInvoice (oblioInvoiceId, oblioSeriesName, oblioInvoiceNumber, oblioLink)
- **02-05:** Inlocuit Facturis cu Oblio - autentificare simpla OAuth 2.0 (email + token)

### Blockers/Concerns

**NEXT:**
- Continue Phase 4 (04-01 invoice transfer blocking, or 04-03 modal)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 04-02-PLAN.md (AWB mismatch detection)
Resume file: None

## Phase 4 In Progress

Flow Integrity features:
- [x] AWB mismatch detection (04-02)
- [ ] Invoice transfer blocking (04-01)
- [ ] Unified warning modal (04-03)
- [ ] E2E flow tests (04-04)

## Recent Commits

- `58fcd88` feat(04-02): improve credential status badges with clearer text
- `0dd4dfe` feat(04-02): add FanCourier credential help text
- `9cda88d` feat(04-02): add AWB company mismatch detection
- `a60c776` docs(04): create phase plan for flow integrity
- `8ea505d` docs(04): research flow integrity phase

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (04-02 complete)*
