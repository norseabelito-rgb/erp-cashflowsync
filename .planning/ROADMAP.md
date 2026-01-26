# Roadmap: CashFlowSync ERP Stabilization

## Overview

This roadmap guides the stabilization and enhancement of an existing ERP system that has grown organically through iterative development. The journey begins with understanding what currently exists (Audit), proceeds through fixing the most critical pain point (Facturare), addresses data integrity flows, eliminates known bugs, improves user experience, adds task management capabilities, documents the stabilized system, and concludes with comprehensive quality verification. This is brownfield work: we fix and enhance existing functionality, not build from scratch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: System Audit** - Complete understanding of current state before making changes
- [x] **Phase 2: Invoice Series Fix** - Oblio integration with automatic series selection (migrated from Facturis)
- [x] **Phase 3: Internal Settlement** - Implement decontare interna flow for secondary company orders
- [x] **Phase 4: Flow Integrity** - Ensure data consistency with transfer blocking and AWB routing
- [x] **Phase 5: Known Bug Fixes** - Address documented bugs from codebase analysis
- [x] **Phase 6: UX Foundation** - Consistent design, tooltips, and feedback across all pages
- [x] **Phase 7: Task Management Core** - Data model and basic UI for task tracking
- [ ] **Phase 8: Task Management Advanced** - Automation, notifications, and reporting
- [ ] **Phase 9: Documentation** - In-app documentation for all modules
- [ ] **Phase 10: Quality Assurance** - Final verification and test coverage for critical flows

## Phase Details

### Phase 1: System Audit
**Goal**: Complete understanding of every page, API, and business flow before making changes
**Depends on**: Nothing (first phase)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Plans**: 4 plans
**Success Criteria** (what must be TRUE):
  1. Every dashboard page has been visited and documented with its current functionality
  2. Every API endpoint has been cataloged with its purpose, inputs, outputs, and validation status
  3. The complete order-to-delivery flow (order > factura > AWB > livrare > incasare) has been traced E2E
  4. Tech debt and refactoring needs have been identified and prioritized
  5. Discrepancies between expected behavior and actual behavior are documented with severity

Plans:
- [x] 01-01-PLAN.md — Dashboard pages audit (Orders priority, all UI elements documented)
- [x] 01-02-PLAN.md — API endpoints audit (auth, validation, known issues cataloged)
- [x] 01-03-PLAN.md — E2E business flows audit (order-to-delivery, internal settlement, stock)
- [x] 01-04-PLAN.md — Architecture and tech debt audit (extends CONCERNS.md, dead code)

### Phase 2: Invoice Series Fix
**Goal**: Invoices automatically use the correct series based on store/company mapping
**Depends on**: Phase 1 (need audit understanding of current state)
**Requirements**: INV-01, INV-02, INV-08
**Success Criteria** (what must be TRUE):
  1. Invoice series are fetched from Facturis and displayed correctly in settings
  2. Each store is mapped to exactly one company and one invoice series
  3. When generating an invoice, the system automatically selects the correct series based on the order's store
  4. Edge cases (zero/negative currentNumber, missing series) are handled gracefully with clear error messages
  5. No manual series selection required during normal invoice generation

**Plans**: 5 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — API validation and Romanian error messages (Wave 1)
- [x] 02-02-PLAN.md — Store-series mapping UI and overview table (Wave 1)
- [x] 02-03-PLAN.md — Automatic series selection in invoice generation (Wave 2)
- [x] 02-04-PLAN.md — Edge case handling and FailedInvoiceAttempt model (Wave 3)
- [x] 02-05-PLAN.md — Failed invoices page and Oblio migration (Wave 4)

### Phase 3: Internal Settlement
**Goal**: Secondary company orders are tracked and settled weekly via internal invoicing from Aquaterra
**Depends on**: Phase 2 (Oblio integration must work correctly first)
**Requirements**: INV-03, INV-04, INV-05, INV-06
**Success Criteria** (what must be TRUE):
  1. Orders from secondary company stores are flagged automatically for internal settlement tracking
  2. User can view list of secondary company orders with "incasat" (collected) status
  3. System calculates cumulative value at acquisition price (costPrice) + configurable markup
  4. User can select/exclude specific orders before generating settlement
  5. User can generate internal invoice from Aquaterra to secondary company in Oblio
  6. Settlement history is maintained with Oblio invoice reference for audit trail

**Plans**: 5 plans in 4 waves (includes gap closure)

Plans:
- [x] 03-01-PLAN.md — Schema extensions and eligible orders API (Wave 1)
- [x] 03-02-PLAN.md — Price calculation using costPrice and order selection (Wave 2)
- [x] 03-03-PLAN.md — Order selection UI with pre-selection workflow (Wave 3)
- [x] 03-04-PLAN.md — Oblio invoice generation for settlements (Wave 4)
- [x] 03-05-PLAN.md — Gap closure: wire order selection to generate endpoint (Wave 1)

### Phase 4: Flow Integrity
**Goal**: Data consistency ensured through transfer warning system and correct AWB routing
**Depends on**: Phase 2 (company mapping must be correct)
**Requirements**: INV-07, FLOW-01, FLOW-02
**Success Criteria** (what must be TRUE):
  1. User sees warning when invoicing order with pending transfer (not hard block)
  2. User can proceed with explicit acknowledgment, which is logged for audit
  3. AWB is generated using the courier account of the company that will issue the invoice
  4. Each company has its dedicated SelfAWB user configured in settings
  5. Company mismatches (billingCompany vs store.company) are warned but allowed

**Plans**: 4 plans in 3 waves

Plans:
- [x] 04-01-PLAN.md — Transfer warning service and audit logging (Wave 1)
- [x] 04-02-PLAN.md — AWB mismatch detection and company credentials UI (Wave 1)
- [x] 04-03-PLAN.md — Transfer check API endpoints (Wave 2)
- [x] 04-04-PLAN.md — Transfer warning modal and orders page integration (Wave 3)

### Phase 5: Known Bug Fixes
**Goal**: Documented bugs from codebase analysis are resolved
**Depends on**: Phase 1 (bugs identified during audit)
**Requirements**: QA-02
**Success Criteria** (what must be TRUE):
  1. Product image sync no longer fails on existing images (unique constraint fix)
  2. SKU dropdown in product creation excludes already-assigned SKUs
  3. Order detail dialog displays product line items
  4. Ads webhook notifications are deduplicated (no spam)
  5. Invoice series auto-correct handles all edge cases idempotently

**Plans**: 4 plans in 1 wave (all parallel)

Plans:
- [x] 05-01-PLAN.md — Image sync idempotent upsert and SKU dropdown grouping
- [x] 05-02-PLAN.md — Order detail line items card display with quick actions
- [x] 05-03-PLAN.md — Meta webhook notification deduplication
- [x] 05-04-PLAN.md — Invoice series robust edge case handling

### Phase 6: UX Foundation
**Goal**: Consistent, intuitive user interface across all pages
**Depends on**: Phase 5 (fix functional bugs before polishing UX)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06
**Success Criteria** (what must be TRUE):
  1. Every button and action has a descriptive tooltip explaining what it does
  2. Visual consistency achieved: colors, spacing, fonts, shadows follow a defined pattern
  3. All pages work correctly on mobile and tablet viewports
  4. Every async operation shows loading state and provides visual feedback on completion
  5. Errors display clear, actionable messages (not technical jargon)
  6. Empty states show helpful guidance and relevant call-to-action

**Plans**: 6 plans in 4 waves (includes gap closure)

Plans:
- [x] 06-01-PLAN.md — TooltipProvider, ActionTooltip, and Skeleton components (Wave 1)
- [x] 06-02-PLAN.md — ErrorModal and error message mapping (Wave 1)
- [x] 06-03-PLAN.md — Visual consistency: design tokens and table striping (Wave 2)
- [x] 06-04-PLAN.md — Loading states and useErrorModal hook for key pages (Wave 2)
- [x] 06-05-PLAN.md — Empty state configurations and context-aware display (Wave 3)
- [x] 06-06-PLAN.md — Gap closure: Apply ActionTooltip to all dashboard buttons (Wave 4)

### Phase 7: Task Management Core
**Goal**: Basic task management available for operational and business tracking
**Depends on**: Phase 6 (UX patterns established for consistent task UI)
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04
**Plans**: 5 plans in 4 waves (includes gap closure)
**Success Criteria** (what must be TRUE):
  1. Tasks can be created with title, description, type, priority, deadline, and assignee
  2. Task list view shows all tasks with filtering by type, status, assignee
  3. Warehouse staff can see daily operational tasks (picking, verificare, expediere)
  4. Management can create and track business to-dos with deadlines and owners
  5. Tasks can be marked complete and history is preserved

Plans:
- [x] 07-01-PLAN.md — Task data model, enums, and utility helpers (Wave 1)
- [x] 07-02-PLAN.md — Task API routes with CRUD and completion toggle (Wave 2)
- [x] 07-03-PLAN.md — Task list page with filters and date grouping (Wave 3)
- [x] 07-04-PLAN.md — Task form dialog and sidebar integration (Wave 3)
- [x] 07-05-PLAN.md — Gap closure: Wire delete button to API with confirmation (Wave 4)

### Phase 8: Task Management Advanced
**Goal**: Automated task creation, notifications, and activity reporting
**Depends on**: Phase 7 (core task system must exist)
**Requirements**: TASK-05, TASK-06, TASK-07, TASK-08, TASK-09
**Success Criteria** (what must be TRUE):
  1. Users receive notifications for approaching deadlines
  2. Activity reports show who completed what tasks and when
  3. System events (e.g., new AWB batch) automatically create related tasks
  4. Tasks are auto-assigned to responsible persons based on task type
  5. Tasks auto-complete when system detects the underlying action was performed

**Plans**: TBD

Plans:
- [ ] 08-01: Notification and reminder system
- [ ] 08-02: Activity reporting
- [ ] 08-03: Event-driven task creation
- [ ] 08-04: Auto-assignment and auto-completion logic

### Phase 9: Documentation
**Goal**: In-app documentation covers all modules and workflows
**Depends on**: Phase 8 (document the complete system)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. Documentation page accessible from sidebar and updated with current content
  2. Business flows documented with clear diagrams (order flow, settlement flow, etc.)
  3. All configuration options and settings are documented
  4. Each module has a usage guide explaining its purpose and common operations

**Plans**: TBD

Plans:
- [ ] 09-01: Documentation page structure and navigation
- [ ] 09-02: Business flow documentation with diagrams
- [ ] 09-03: Settings and configuration guide
- [ ] 09-04: Module usage guides

### Phase 10: Quality Assurance
**Goal**: System verified working correctly with test coverage for critical paths
**Depends on**: Phase 9 (QA the complete system)
**Requirements**: QA-01, QA-03, QA-04
**Success Criteria** (what must be TRUE):
  1. All business flows (facturare, AWB, decontare) pass E2E verification
  2. Test coverage exists for invoice generation and AWB creation paths
  3. List views and common operations respond within acceptable time (<2s)
  4. No regressions in previously working functionality
  5. Sign-off that system is ready for daily operational use

**Plans**: TBD

Plans:
- [ ] 10-01: E2E flow verification
- [ ] 10-02: Critical path test coverage
- [ ] 10-03: Performance verification
- [ ] 10-04: Final regression check and sign-off

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6 > 7 > 8 > 9 > 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. System Audit | 4/4 | ✓ Complete | 2026-01-24 |
| 2. Invoice Series Fix | 5/5 | ✓ Complete | 2026-01-25 |
| 3. Internal Settlement | 5/5 | ✓ Complete | 2026-01-25 |
| 4. Flow Integrity | 4/4 | ✓ Complete | 2026-01-25 |
| 5. Known Bug Fixes | 4/4 | ✓ Complete | 2026-01-25 |
| 6. UX Foundation | 6/6 | ✓ Complete | 2026-01-25 |
| 7. Task Management Core | 5/5 | ✓ Complete | 2026-01-26 |
| 8. Task Management Advanced | 0/4 | Not started | - |
| 9. Documentation | 0/4 | Not started | - |
| 10. Quality Assurance | 0/4 | Not started | - |

---
*Roadmap created: 2026-01-23*
*Phase 1 planned: 2026-01-23*
*Phase 4 planned: 2026-01-25*
*Phase 5 planned: 2026-01-25*
*Phase 7 planned: 2026-01-26*
*Depth: comprehensive (10 phases, 42 planned plans)*
