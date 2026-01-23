---
phase: 01
plan: 03
completed: 2026-01-23
subsystem: flows
tags: [flows, audit, e2e, order-processing, intercompany, stock, fancourier, facturis]

dependency_graph:
  requires: [01-01, 01-02]
  provides: [flow-documentation, e2e-traceability, integration-touchpoints, user-verified-workflows]
  affects: [02-*, 03-*, 04-*, 06-*]

tech_stack:
  added: []
  patterns: []

key_files:
  created:
    - .planning/phases/01-system-audit/audit-output/flows/order-to-delivery.md
    - .planning/phases/01-system-audit/audit-output/flows/internal-settlement.md
    - .planning/phases/01-system-audit/audit-output/flows/stock-management.md
  modified: []

decisions:
  - id: FLOW-01
    description: "Order-to-Delivery flow verified by user - matches production behavior"
  - id: FLOW-02
    description: "Internal Settlement: CONSTRUIM DESTINE S.R.L. is secondary company, 10% markup confirmed"
  - id: FLOW-03
    description: "Internal Settlement: NOT in use currently but ESSENTIAL to implement (Phase 3 priority)"
  - id: FLOW-04
    description: "Stock Management: Shopify sync NOT needed - no inventory tracking in Shopify"
  - id: FLOW-05
    description: "Stock Management: Inter-warehouse transfers MUST exist"
  - id: FLOW-06
    description: "Stock Management: Reservation nice-to-have but not priority"
  - id: FLOW-07
    description: "FanCourier status codes: User requested complete documentation for future phases"

metrics:
  duration: 15 minutes
  completed: 2026-01-23
---

# Phase 01 Plan 03: E2E Business Flows Audit Summary

**One-liner:** Complete E2E flow documentation for Order-to-Delivery, Internal Settlement, and Stock Management with user-verified production behavior and critical decisions captured

## What Was Done

### Task 1: Order-to-Delivery Flow (6f3657b)

Documented the complete critical path from Shopify order to collected payment:

**Stages documented:**
1. **Import Comanda** - Webhook/sync from Shopify
2. **Generare Factura** - Series selection, Facturis API, major pain point identified
3. **Generare AWB** - FanCourier SOAP API, picking list creation
4. **Livrare (Tracking)** - Status sync with FanCourier codes mapped
5. **Incasare (Collection)** - COD collection tracking

**Key findings:**
- Invoice series selection is MAJOR PAIN POINT (confirms Phase 2 priority)
- No transaction handling across invoice+AWB operations
- Transfer sheet blocking correctly documented
- FanCourier status codes partially documented (user requested complete list)

**Mermaid diagram:** 87 lines covering all decision points and error paths

### Task 2: Internal Settlement and Stock Management (8f94808)

**Internal Settlement (Decontare Interna):**
- Flow for secondary company order settlement
- Backend logic EXISTS in intercompany-service.ts
- UI/cron implementation status: UNCLEAR

**Stock Management (Gestiune Stoc):**
- Dual system documented: Product (legacy) + InventoryItem (advanced)
- N+1 query issues documented (partial fixes exist)
- Reservation not implemented (user confirmed: nice-to-have)
- Inter-warehouse transfers documented

### Task 3: User Verification Checkpoint (c159b8b)

User checkpoint with detailed verification steps. User provided critical business decisions:

**Order-to-Delivery:** APPROVED
- Flow matches production behavior
- Request: Document ALL FanCourier status codes (future phases)

**Internal Settlement:**
- **NOT IN USE** currently but **ESSENTIAL** to implement
- Secondary company: **CONSTRUIM DESTINE S.R.L.**
- Markup: **10%** (confirmed)
- Priority: Phase 3

**Stock Management:**
- Reservation: NOT using, nice-to-have (future)
- Inter-warehouse transfers: YES, MUST exist
- Shopify sync: NOT NEEDED - no inventory tracking in Shopify

## User Decisions Captured

| Decision | Detail | Impact |
|----------|--------|--------|
| Secondary company name | CONSTRUIM DESTINE S.R.L. | Phase 3 implementation |
| Intercompany markup | 10% | Confirmed existing logic |
| Internal settlement status | NOT in use, ESSENTIAL | Phase 3 priority |
| Shopify stock sync | NOT needed | Deprioritize sync fixes |
| Inter-warehouse transfers | MUST exist | Phase 4 reliability focus |
| Stock reservation | Nice-to-have | Low priority |
| FanCourier status codes | Complete list requested | Future phase work |

## Flow Documentation Statistics

| Flow | Stages | Mermaid Lines | Cross-refs |
|------|--------|---------------|------------|
| Order-to-Delivery | 5 | 87 | API, Pages, Services |
| Internal Settlement | 5 | 38 | API, Services |
| Stock Management | 5 | 34 | API, Services |

## Deviations from Plan

None - plan executed exactly as written. Checkpoint worked as designed to capture user decisions.

## Decisions Made

1. **FLOW-01:** Order-to-Delivery flow verified by user - matches production behavior
2. **FLOW-02:** Secondary company is CONSTRUIM DESTINE S.R.L. with 10% markup
3. **FLOW-03:** Internal Settlement NOT in use but ESSENTIAL - Phase 3 priority
4. **FLOW-04:** Shopify stock sync NOT needed - deprioritize
5. **FLOW-05:** Inter-warehouse transfers MUST exist - ensure reliability
6. **FLOW-06:** Stock reservation is nice-to-have, not priority
7. **FLOW-07:** FanCourier complete status codes requested for future phases

## Next Phase Readiness

**Dependencies satisfied:**
- E2E flows documented for Phase 2 (Invoice Series Fix) - pain point confirmed
- Internal Settlement scope clear for Phase 3 - user verified priority
- Integration touchpoints mapped for Phase 4 (Reliability)
- Stock management clarity for Phase 6 (Automation)

**User decisions that affect roadmap:**
- Phase 3 MUST include Internal Settlement implementation
- Shopify sync improvements can be deprioritized
- FanCourier status codes documentation can be added to Phase 4 or 6

**No blockers for Phase 2.**

## Commits

| Hash | Description |
|------|-------------|
| 6f3657b | docs(01-03): document Order-to-Delivery E2E flow |
| 8f94808 | docs(01-03): document Internal Settlement and Stock Management flows |
| c159b8b | docs(01-03): add user verification and decisions to flow documents |

---

*Completed: 2026-01-23*
