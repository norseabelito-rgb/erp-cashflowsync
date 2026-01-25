# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 4 - Flow Integrity (previne mismatch-uri intre facturi si AWB-uri)

## Current Position

Phase: 4 of 10 (Flow Integrity)
Plan: 2 of 4 complete
Status: In progress
Last activity: 2026-01-25 - Completed 04-01-PLAN.md (invoice transfer warning flow)

Progress: [█████████░░░░░░░░░░░] 45%

## Phase 4 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 04-01 | Complete | Soft warning flow for pending transfers with user acknowledgment |
| 04-02 | Complete | AWB mismatch detection with warning/confirmation flow |
| 04-03 | Pending | Unified warning confirmation modal |
| 04-04 | Pending | End-to-end flow integrity tests |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: ~6 minutes
- Total execution time: ~92 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 5/5 | ~27 min | ~5.4 min |
| 04-flow-integrity | 2/4 | ~16 min | ~8 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

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
- Continue Phase 4 (04-03 unified modal, or 04-04 tests)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 04-01-PLAN.md (invoice transfer warning flow)
Resume file: None

## Phase 4 In Progress

Flow Integrity features:
- [x] Invoice transfer warning (04-01)
- [x] AWB mismatch detection (04-02)
- [ ] Unified warning modal (04-03)
- [ ] E2E flow tests (04-04)

## Recent Commits

- `a45970f` fix(04-01): use ActionType.UPDATE for warning override logging
- `58fcd88` feat(04-02): improve credential status badges with clearer text
- `0dd4dfe` feat(04-02): add FanCourier credential help text
- `9cda88d` feat(04-02): add AWB company mismatch detection
- `a60c776` docs(04): create phase plan for flow integrity

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (04-01 complete)*
