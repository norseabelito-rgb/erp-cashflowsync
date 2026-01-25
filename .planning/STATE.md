# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 6 - UX Foundation - In Progress

## Current Position

Phase: 6 of 10 (UX Foundation)
Plan: 3 of 5 complete
Status: In progress
Last activity: 2026-01-25 - Completed 06-03-PLAN.md

Progress: [████████████████░░░░] 76%

## Phase 6 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 06-01 | Complete | TooltipProvider + ActionTooltip + Skeleton system |
| 06-02 | Complete | ErrorModal + getErrorMessage with 30+ Romanian mappings |
| 06-03 | Complete | Design tokens + CSS variables + Table zebra striping |
| 06-04 | Pending | Button States |
| 06-05 | Pending | Form Feedback |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: ~6 minutes
- Total execution time: ~135 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 5/5 | ~27 min | ~5.4 min |
| 04-flow-integrity | 4/4 | ~30 min | ~7.5 min |
| 05-known-bug-fixes | 4/4 | ~18 min | ~4.5 min |
| 06-ux-foundation | 3/5 | ~11 min | ~3.7 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **06-03:** 4px base unit for spacing (Notion-like minimal design)
- **06-03:** Table striped prop defaults to false for backward compatibility
- **06-03:** Dark mode row stripe uses 0.2 opacity vs 0.3 in light mode
- **06-03:** VISUAL_PATTERNS provides ready-to-use combinations for cards and sections
- **06-02:** 30+ error codes covering network, auth, invoice, AWB, stock, order, validation, and HTTP status scenarios
- **06-02:** getErrorMessage uses resolution order: code property, HTTP status, message pattern detection, UNKNOWN_ERROR fallback
- **06-02:** Copy button shows Check icon for 2 seconds after successful copy
- **06-02:** Default action button text is 'Am inteles' (Romanian)
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
- Continue Phase 6: UX Foundation (plans 04-05)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 06-03-PLAN.md
Resume file: None

## Phase 6 Features

UX Foundation components:

- [x] 06-01: TooltipProvider + ActionTooltip + Skeleton system
- [x] 06-02: ErrorModal + getErrorMessage with 30+ Romanian mappings
- [x] 06-03: Design tokens + CSS variables + Table zebra striping
- [ ] 06-04: Button States
- [ ] 06-05: Form Feedback

## Recent Commits

- `8e81838` feat(06-03): add striped prop to Table component
- `6065aeb` feat(06-03): add CSS variables for visual consistency
- `e135e0b` feat(06-03): extend design system with spacing and visual standards
- `12b3d98` feat(06-02): create ErrorModal component
- `2c286b7` feat(06-02): create error message mapping utility
- `d459bfb` feat(06-01): add TooltipProvider with 300ms delay to app providers
- `e8c53df` feat(06-01): create ActionTooltip component with action/consequence semantics
- `f7e9e2b` feat(06-01): create Skeleton component system with presets

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-25 (06-03 complete)*
