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
- [x] **Phase 7.1: Trendyol Complete Integration** - Full Trendyol channel with real-time sync, order processing, and product push (INSERTED)
- [ ] **Phase 7.2: Trendyol Complete Fix** - Fix product push, multi-company invoice series, category mapping (INSERTED)
- [ ] **Phase 7.3: Dashboard Rework** - Global filters, correct metrics, tooltips, clickable cards, remove Ads/AI (INSERTED)
- [ ] **Phase 7.4: Orders Channel Split** - Tabs Shopify/Trendyol/Temu, manual order creation (INSERTED)
- [ ] **Phase 7.5: AWB Tracking Fix** - Correct status logic, accurate card counts (INSERTED)
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

### Phase 7.1: Trendyol Complete Integration (INSERTED)
**Goal**: Complete Trendyol sales channel with real-time order sync, full order processing workflow, and bidirectional product sync
**Depends on**: Phase 7 (uses existing UX patterns and task infrastructure)
**Requirements**: TRENDYOL-01 through TRENDYOL-06
**Plans**: 6 plans in 5 waves
**Success Criteria** (what must be TRUE):
  1. Trendyol orders sync in real-time via webhooks (not manual polling)
  2. Trendyol orders integrate into main Order table and appear in unified order list
  3. Invoices can be generated for Trendyol orders using Oblio (respecting company mapping)
  4. AWBs can be generated for Trendyol orders and tracking numbers sent back to Trendyol
  5. Products can be pushed to Trendyol with automatic stock/price sync
  6. Trendyol accounts are associated with specific companies (multi-company support)
  7. Return/cancellation flows handle Trendyol-specific statuses

**Context (existing implementation):**
- TrendyolClient API library exists (1068 lines) with full API coverage
- Database models exist: TrendyolOrder, TrendyolOrderItem, TrendyolProduct, etc.
- Product publish UI exists but orders don't integrate with main Order workflow
- Missing: webhooks, Order table integration, AWB feedback, auto stock sync

Plans:
- [x] 07.1-01-PLAN.md — Webhook receiver & company association (Wave 1)
- [x] 07.1-02-PLAN.md — Order table integration with source field (Wave 2)
- [x] 07.1-03-PLAN.md — Invoice auto-send to Trendyol after Oblio (Wave 3)
- [x] 07.1-04-PLAN.md — AWB tracking auto-send to Trendyol (Wave 3)
- [x] 07.1-05-PLAN.md — Automatic stock & price sync (Wave 4)
- [x] 07.1-06-PLAN.md — Unified dashboard & gap closure (Wave 5)

### Phase 7.2: Trendyol Complete Fix (INSERTED)
**Goal**: Fix all Trendyol integration issues: product push works reliably, proper multi-company support with invoice series per store, and Trendyol orders work seamlessly in bulk processing
**Depends on**: Phase 7.1 (base integration exists but has issues)
**Requirements**: TRND-01, TRND-02, TRND-03, TRND-04, TRND-05, TRND-06, TRND-07
**Deferred**: TRND-08 (webhook retry - enhancement), TRND-09 (stock mismatch logging - monitoring)
**Plans**: 6 plans in 3 waves
**Success Criteria** (what must be TRUE):
  1. Products pushed to Trendyol appear on seller dashboard (batch errors shown in ERP)
  2. Each TrendyolStore has its own invoice series from Oblio for correct invoicing
  3. Trendyol orders use TrendyolStore.companyId for company resolution (not global Settings)
  4. Bulk process (factură + AWB) works correctly for Trendyol orders
  5. Category attributes are properly mapped (not placeholder values)
  6. Batch status checked automatically and errors displayed to user
  7. AI-based category suggestion reduces manual mapping overhead

**Context (issues identified during audit):**
- Product push returns batch ID but products rejected by Trendyol (attribute validation)
- TrendyolStore.invoiceSeriesName exists but never used in invoice-service.ts
- Order sync uses Settings.trendyolCompanyId instead of TrendyolStore.companyId
- Category attributes use first available value as placeholder (invalid)
- No UI to check batch status and see Trendyol rejection reasons

Plans:
- [ ] 07.2-01-PLAN.md — Batch status verification & error display UI (Wave 1)
- [ ] 07.2-02-PLAN.md — Category attribute mapping UI with required field handling (Wave 1)
- [ ] 07.2-03-PLAN.md — TrendyolStore invoice series integration (Wave 1)
- [ ] 07.2-04-PLAN.md — Order sync multi-company fix (Wave 1)
- [ ] 07.2-05-PLAN.md — Bulk process Trendyol orders verification (Wave 2)
- [ ] 07.2-06-PLAN.md — AI category suggestion (Wave 2)

### Phase 7.3: Dashboard Rework (INSERTED)
**Goal**: Complete dashboard overhaul with global filters, accurate metrics, clear explanations, and actionable cards
**Depends on**: Phase 7.2 (all integrations stable before dashboard rework)
**Requirements**: DASH-01 through DASH-08
**Plans**: 6 plans in 3 waves
**Success Criteria** (what must be TRUE):
  1. Global date picker (single day or range) filters ALL metrics consistently
  2. Store filter applies to ALL cards and metrics (not just charts)
  3. Each card has info icon with clear Romanian explanation of the metric
  4. Clicking any card navigates to relevant page with filters pre-applied
  5. Ads section completely removed from dashboard
  6. AI Insights section completely removed
  7. New "Retururi" card showing return count with navigation to tracking page
  8. "De Procesat" shows ONLY orders needing immediate action (PENDING + VALIDATED, not invoiced)
  9. "Expediate" count matches "In tranzit" from AWB tracking page exactly
  10. All metrics show data for selected date range, not hardcoded "today"

**Context (issues identified):**
- Cards show global metrics but chart is store-filtered (confusing)
- "De Procesat" meaning unclear - no explanation
- "Expediate" doesn't match AWB tracking "in tranzit" count
- No returns card
- Ads and AI Insights sections not useful for daily operations
- Cards not clickable - no navigation to detail pages

Plans:
- [ ] 07.3-01-PLAN.md — Global filter state (date range + store) with URL persistence (Wave 1)
- [ ] 07.3-02-PLAN.md — Metric calculation fix (all cards respect filters) (Wave 1)
- [ ] 07.3-03-PLAN.md — Card tooltips with metric explanations (Wave 2)
- [ ] 07.3-04-PLAN.md — Clickable cards with filter navigation (Wave 2)
- [ ] 07.3-05-PLAN.md — Remove Ads/AI sections, add Returns card (Wave 3)
- [ ] 07.3-06-PLAN.md — Verify Expediate vs In Tranzit consistency (Wave 3)

### Phase 7.4: Orders Channel Split (INSERTED)
**Goal**: Orders page split by sales channel (Shopify/Trendyol/Temu) with channel-specific actions
**Depends on**: Phase 7.3 (dashboard filters established)
**Requirements**: ORD-01 through ORD-05
**Plans**: TBD (estimate 4-5 plans in 2 waves)
**Success Criteria** (what must be TRUE):
  1. Three tabs at top: Shopify (default), Trendyol, Temu
  2. Each tab shows only orders from that source
  3. Global filters (date, store, status) apply to all tabs
  4. Processing errors separated by channel
  5. Shopify tab has "Creare comanda" button for manual order creation
  6. Manual order creation: select store > add products > set quantities > creates in Shopify + local DB
  7. Temu tab shows "Urmeaza sa fie implementat" placeholder

**Context:**
- Currently all orders mixed in single table
- Source field exists (shopify/trendyol/manual) but not used for separation
- Mixing channels increases error risk
- No manual order creation capability

Plans:
- [ ] 07.4-01-PLAN.md — Tab navigation component with source filtering (Wave 1)
- [ ] 07.4-02-PLAN.md — Channel-specific error display (Wave 1)
- [ ] 07.4-03-PLAN.md — Manual order creation dialog (Wave 2)
- [ ] 07.4-04-PLAN.md — Shopify order push API integration (Wave 2)
- [ ] 07.4-05-PLAN.md — Temu placeholder tab (Wave 1)

### Phase 7.5: AWB Tracking Fix (INSERTED)
**Goal**: AWB tracking page shows accurate counts with correct status categorization
**Depends on**: Phase 7.3 (dashboard must match tracking page)
**Requirements**: AWB-01 through AWB-04
**Plans**: TBD (estimate 3-4 plans in 2 waves)
**Success Criteria** (what must be TRUE):
  1. Sum of all status cards equals Total card exactly
  2. Status categorization uses robust logic (not fragile string matching)
  3. Deleted/Cancelled AWBs correctly categorized and counted
  4. All possible AWB statuses are mapped to a category (no "unknown" status)
  5. Status categories match dashboard "Expediate" calculation exactly

**Context (issues identified):**
- Card counts don't sum to total
- String-based status matching is fragile (typos, variations)
- Deleted/Cancelled calculation incorrect
- Some statuses may fall through without category
- Discrepancy between dashboard "Expediate" and tracking "In tranzit"

Plans:
- [ ] 07.5-01-PLAN.md — Audit all AWB statuses and create comprehensive mapping (Wave 1)
- [ ] 07.5-02-PLAN.md — Refactor status categorization to enum-based logic (Wave 1)
- [ ] 07.5-03-PLAN.md — Fix card count calculation (sum must equal total) (Wave 2)
- [ ] 07.5-04-PLAN.md — Sync dashboard Expediate with tracking In Tranzit (Wave 2)

### Phase 8: Task Management Advanced
**Goal**: Automated task creation, notifications, and activity reporting
**Depends on**: Phase 7 (core task system must exist)
**Requirements**: TASK-05, TASK-06, TASK-07, TASK-08, TASK-09
**Plans**: 5 plans in 2 waves
**Success Criteria** (what must be TRUE):
  1. Users receive notifications for approaching deadlines
  2. Activity reports show who completed what tasks and when
  3. System events (e.g., new AWB batch) automatically create related tasks
  4. Tasks are auto-assigned to responsible persons based on task type
  5. Tasks auto-complete when system detects the underlying action was performed

Plans:
- [ ] 08-01-PLAN.md — Task service foundation with auto-task config and assignment (Wave 1)
- [ ] 08-02-PLAN.md — Deadline notifications cron endpoint (Wave 1)
- [ ] 08-03-PLAN.md — Auto-task creation hooks in process-all (Wave 2)
- [ ] 08-04-PLAN.md — Auto-completion logic based on linked entity state (Wave 2)
- [ ] 08-05-PLAN.md — Activity report API and UI page (Wave 1)

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
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6 > 7 > 7.1 > 7.2 > 7.3 > 7.4 > 7.5 > 8 > 9 > 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. System Audit | 4/4 | ✓ Complete | 2026-01-24 |
| 2. Invoice Series Fix | 5/5 | ✓ Complete | 2026-01-25 |
| 3. Internal Settlement | 5/5 | ✓ Complete | 2026-01-25 |
| 4. Flow Integrity | 4/4 | ✓ Complete | 2026-01-25 |
| 5. Known Bug Fixes | 4/4 | ✓ Complete | 2026-01-25 |
| 6. UX Foundation | 6/6 | ✓ Complete | 2026-01-25 |
| 7. Task Management Core | 5/5 | ✓ Complete | 2026-01-26 |
| 7.1. Trendyol Complete Integration | 6/6 | ✓ Complete | 2026-01-30 |
| 7.2. Trendyol Complete Fix | 5/6 | In Progress | - |
| 7.3. Dashboard Rework | 0/6 | Not started | - |
| 7.4. Orders Channel Split | 0/5 | Not started | - |
| 7.5. AWB Tracking Fix | 0/4 | Not started | - |
| 8. Task Management Advanced | 0/5 | Not started | - |
| 9. Documentation | 0/4 | Not started | - |
| 10. Quality Assurance | 0/4 | Not started | - |

---
*Roadmap created: 2026-01-23*
*Phase 1 planned: 2026-01-23*
*Phase 4 planned: 2026-01-25*
*Phase 5 planned: 2026-01-25*
*Phase 7 planned: 2026-01-26*
*Phase 8 planned: 2026-01-26*
*Phase 7.1 inserted: 2026-01-30 (URGENT: Trendyol complete integration)*
*Phase 7.1 completed: 2026-01-30*
*Phase 7.2 inserted: 2026-02-01 (URGENT: Fix Trendyol product push, invoice series, multi-company)*
*Phase 7.3 inserted: 2026-02-03 (URGENT: Dashboard rework - global filters, correct metrics, tooltips)*
*Phase 7.4 inserted: 2026-02-03 (URGENT: Orders channel split - Shopify/Trendyol/Temu tabs)*
*Phase 7.5 inserted: 2026-02-03 (URGENT: AWB tracking fix - correct status counts)*
*Depth: comprehensive (15 phases including insertions)*
