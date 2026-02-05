# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 7.9 - Reception Workflow (Phase 7.8 complete, 7.6 partial)

## Current Position

Phase: 7.9 of 10 (Reception Workflow)
Plan: 5 of 12
Status: In progress
Last activity: 2026-02-06 - Completed 07.9-05-PLAN.md (NIR Workflow APIs)

Progress: [██████████████████░░] ~99% (7/10 integer phases + 6/6 of 7.1 + 6/6 of 7.2 + 6/6 of 7.3 + 5/5 of 7.4 + 4/4 of 7.5 + 2/3 of 7.6 + 6/6 of 7.7 + 5/5 of 7.8 + 5/12 of 7.9)

## Phase 7 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 07-01 | Complete | Task/TaskAttachment Prisma models + task-utils.ts helpers |
| 07-02 | Complete | Task CRUD API endpoints with filtering and completion toggle |
| 07-03 | Complete | Task list page with filtering and grouped display |
| 07-04 | Complete | TaskFormDialog + sidebar navigation |
| 07-05 | Complete | Gap closure: Delete button wired to API with confirmation |

---

## Performance Metrics

**Velocity:**
- Total plans completed: 46
- Average duration: ~5.2 minutes
- Total execution time: ~240 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 5/5 | ~21 min | ~4.2 min |
| 03-internal-settlement | 5/5 | ~27 min | ~5.4 min |
| 04-flow-integrity | 4/4 | ~30 min | ~7.5 min |
| 05-known-bug-fixes | 4/4 | ~18 min | ~4.5 min |
| 06-ux-foundation | 6/6 | ~22 min | ~3.7 min |
| 07-task-management-core | 5/5 | ~28 min | ~5.6 min |
| 07.1-trendyol-integration | 6/6 | ~46 min | ~7.7 min |
| 07.2-trendyol-fix | 6/6 | ~30 min | ~5 min |
| 07.7-temu-integration | 6/6 | ~18 min | ~3 min |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **07.7-05:** TemuOrdersList uses useQuery (consistent with existing patterns)
- **07.7-05:** Purple badge color for Temu (bg-purple-100 text-purple-700)
- **07.7-05:** Temu store filter shown only when multiple stores exist
- **07.7-05:** Self-contained component manages own state vs using global filters
- **07.7-06:** Temu section uses orders.view permission (consistent with main orders)
- **07.7-06:** Temu dashboard follows Trendyol page pattern for UI consistency
- **07.7-06:** Stats endpoint queries Order table where source='temu'
- **07.9-04:** Stats scoped to supplier when supplierId filter is provided
- **07.9-04:** Auto-calculate totalWithVat if vatValue provided but totalWithVat not
- **07.9-04:** Auto-set paidAt when payment status changes to PLATITA
- **07.9-04:** Manual findFirst check for unique constraint to provide user-friendly error messages
- **07.9-02:** Document number format PC-DD/MM/YYYY-NNNN with daily auto-increment
- **07.9-02:** Label code format PO-{id8}-{timestamp36}-{random4} for unique scanning
- **07.9-02:** Labels can only be generated for APROBATA or IN_RECEPTIE orders
- **07.9-02:** One label generated per line item (not per quantity)
- **07.9-01:** Backward-compatible enum extension - keep DRAFT and COMPLETED in GoodsReceiptStatus
- **07.9-01:** Cascade delete for child models (PurchaseOrderItem, PurchaseOrderLabel, etc.)
- **07.9-01:** Unique constraint on GoodsReceipt.receptionReportId for 1:1 relationship
- **07.8-05:** Deprecate but do not delete legacy stock functions for backward compatibility
- **07.8-05:** Use RAISE NOTICE for migration result reporting in SQL
- **07.8-05:** Initialize WarehouseStock for primary warehouse during migration
- **07.7-03:** TemuStoreForSync type follows TrendyolStoreForSync pattern for consistency
- **07.7-03:** Invoice series resolution Priority 0a for Temu (before Trendyol at 0b)
- **07.7-03:** Temu orders use shopifyOrderId field with temuOrderId value (reuse existing field)
- **07.7-03:** Local OrderStatus type in temu-status.ts handles Prisma client regeneration timing
- **07.6-02:** Store filter uses Select dropdown (simpler than ChannelTabs for customers)
- **07.6-02:** Clienti placed between Comenzi and Facturi in sidebar Vanzari section
- **07.6-02:** PageHeader component doesn't support icon prop
- **07.6-02:** Row click handler ready for detail modal integration (Plan 03)
- **07.6-01:** Use $queryRawUnsafe for efficient GROUP BY aggregation instead of Prisma ORM
- **07.6-01:** Email normalized with LOWER() for consistent customer grouping
- **07.6-01:** Permission check uses orders.view since customers derived from orders
- **07.6-01:** Top products limited to 5 items sorted by quantity
- **07.5-04:** Code-based verification query added for in_transit counts comparison
- **07.5-04:** Dynamic Prisma model access for UnknownAWBStatus (handles regeneration timing)
- **07.5-04:** Returns query unified to use getCategoryFilterConditions("returned")
- **07.5-03:** Modal triggered by selectedStatus state (null = closed)
- **07.5-03:** Info icon on status cards uses stopPropagation to avoid triggering filter
- **07.5-03:** Status code badge in AWB cards clickable with same modal behavior
- **07.5-03:** Category icons mapped from status.category (Truck, Clock, AlertCircle, etc.)
- **07.5-02:** Status cards use flexbox wrap instead of fixed grid (adapts to status count)
- **07.5-02:** Filter uses client-side useMemo instead of API parameter (all AWBs already loaded)
- **07.5-02:** Colors applied via inline styles with hexToRgba helper (dynamic from API)
- **07.5-02:** UNKNOWN card groups null codes and unmapped codes together
- **07.4-03:** 300ms debounce on product search (balance responsiveness and API load)
- **07.4-03:** Romanian phone validation: 10 digits starting with 0
- **07.4-03:** MasterProduct.price is readonly in dialog (no manual price override)
- **07.4-03:** "Creare comanda" button visible only on Shopify tab (channelTab === 'shopify')
- **07.4-03:** shopifyStores passed to dialog (Trendyol stores excluded)
- **07.4-04:** Custom line items (title/price) instead of variant_id lookup - avoids SKU resolution complexity
- **07.4-04:** Draft order created then completed - ensures Shopify success before local DB save
- **07.4-04:** Manual entry assumed validated (phoneValidation/addressValidation = PASSED)
- **07.4-04:** source='manual' distinguishes from shopify/trendyol orders
- **07.4-04:** Tags 'manual-erp', 'creat-din-erp' help identify ERP-created orders in Shopify admin
- **07.4-05:** TemuPlaceholder uses Construction icon (lucide-react) for coming-soon visual
- **07.4-05:** Romanian text without diacritics for Temu placeholder
- **07.4-05:** Keep PageHeader and ChannelTabs visible when Temu tab active (navigation)
- **07.4-05:** Conditional rendering based on channelTab URL parameter
- **07.4-02:** Error panel shows ALL errors regardless of active channel tab (users need full visibility)
- **07.4-02:** errorsBySource calculated in parent, passed to ProcessingErrorsPanel as prop
- **07.4-02:** Inline error indicator as red dot on Status column (complements existing state)
- **07.4-02:** Panel auto-hides when no errors, auto-shows when errors appear
- **07.4-01:** Tab state persists in URL via ?tab= parameter for shareability and refresh survival
- **07.4-01:** sourceCounts NOT filtered by source param (all channels' counts needed for tabs)
- **07.4-01:** TrendyolStores query only enabled when tab=trendyol (performance)
- **07.4-01:** Store filter auto-resets when switching to channel where current store doesn't exist
- **07.3-06:** Dashboard "In Tranzit" counts AWBs by currentStatus patterns, not Order.status
- **07.3-06:** Status categorization logic extracted to awb-status.ts for DRY
- **07.3-06:** getCategoryFilterConditions provides Prisma OR clauses for efficient queries
- **07.3-05:** Returns counted via AWB status patterns (retur, refuz, return) - matches tracking page logic
- **07.3-05:** Replaced Trendyol pending card with Retururi card (redundant with De procesat)
- **07.3-05:** Warning variant on Retururi card when returns > 0
- **07.3-04:** buildFilteredHref function defined inside DashboardPage (needs access to searchParams)
- **07.3-04:** All stat card navigation preserves date range and store filter context
- **07.3-04:** Extra params (status, source) combined with preserved filters via URLSearchParams
- **07.3-03:** StatCard tooltip prop optional - not all cards need explanation
- **07.3-03:** InfoTooltip positioned side='right' for visibility
- **07.3-02:** Use buildDateWhere helper for consistent date filtering across all queries
- **07.3-02:** pendingOrders/validatedOrders include invoice:null check (De Procesat = nefacturate)
- **07.3-02:** Removed Ads card and AI Insights section from dashboard
- **07.3-02:** Sales data for chart uses separate function with try/catch for raw SQL
- **07.3-01:** Use native HTML date inputs for date range picker (follows existing pattern)
- **07.3-01:** Remove store filter from DashboardCharts (now uses global DashboardFilters)
- **07.3-01:** Default date filter is today (single day) - most common use case
- **07.2-06:** Use claude-sonnet-4-20250514 for fast category suggestions
- **07.2-06:** Limit categories to 500 in prompt to prevent context overflow
- **07.2-06:** Show confidence score and reasoning with each suggestion
- **07.2-04:** TrendyolStoreForSync type exported for cross-module use
- **07.2-04:** trendyolStoreId set on TrendyolOrder during sync
- **07.2-04:** Virtual store company updated if TrendyolStore company changes
- **07.2-03:** TrendyolStore.invoiceSeriesName used as Priority 0 for invoice series resolution
- **07.2-03:** trendyolStoreId consistently set on TrendyolOrder during sync (create and update)
- **07.2-03:** New syncTrendyolOrdersForStore export for multi-store API sync
- **07.2-01:** 3-second polling interval for batch status (balance between responsiveness and API load)
- **07.2-01:** Auto-stop polling when status is COMPLETED or FAILED
- **07.2-01:** Romanian error translations for common Trendyol rejection codes
- **07.1-06:** Reusable functions in trendyol-returns.ts for webhook handlers
- **07.1-06:** Activity logging for all Trendyol status changes
- **07.1-06:** Sync button fetches last 7 days of orders
- **07.1-06:** Dashboard uses server-side data fetching for Trendyol stats
- **07.1-06:** Trendyol navigation separated into its own sidebar section
- **07.1-05:** Non-blocking sync triggers - product updates fire-and-forget to Trendyol
- **07.1-05:** Stock source: InventoryItem.currentStock first, fallback to MasterProduct.stock
- **07.1-05:** Batch size 100 for Trendyol API price/inventory updates
- **07.1-05:** Only sync approved products (trendyolStatus === 'approved')
- **07.1-04:** Non-blocking tracking sends - AWB creation succeeds even if Trendyol fails
- **07.1-04:** FanCourier as default carrier for retry logic
- **07.1-04:** TrendyolOrder.status set to 'Shipped' after successful tracking send
- **07.1-02:** Keep shopifyOrderId/shopifyOrderNumber names for backward compat (Trendyol uses same fields)
- **07.1-02:** Virtual store per Trendyol supplier ID (Store required for Order)
- **07.1-02:** Trendyol orders default to PASSED validation status (Trendyol validates)
- **07.1-02:** Source field default "shopify" - no data migration needed
- **07.1-01:** trendyolCompanyId uses @unique for one-to-one relation (one company per Trendyol account)
- **07.1-01:** Webhook validation uses timing-safe comparison to prevent timing attacks
- **07.1-01:** Process webhook events synchronously for simplicity
- **07-05:** AlertDialog confirmation before delete (prevent accidental deletion)
- **07-05:** Show task title in confirmation for user clarity
- **07-05:** Use status-error color for delete action button
- **07-04:** Native HTML date input for deadline (react-day-picker unavailable)
- **07-04:** Tasks navigation placed under Vanzari section in sidebar
- **07-04:** TaskFormDialog exports Task type for cross-component compatibility
- **07-03:** Task list grouped by date with sortable priority within groups
- **07-03:** TaskFilters component extracted for reusability
- **07-02:** Task permissions added to permissions.ts (tasks.view, tasks.create, tasks.edit, tasks.delete)
- **07-02:** Manager role gets full task CRUD, Vizualizare role gets view only
- **07-02:** Reassignment validation requires note when assigneeId changes
- **07-02:** Priority sorting done in application layer (Prisma enum sorting is alphabetical)
- **07-02:** Filter presets: today, overdue, this_week, my_tasks
- **07-01:** Optional deadline field (per CONTEXT.md - not all tasks need deadlines)
- **07-01:** SetNull onDelete for task relations (preserve tasks when linked entities deleted)
- **07-01:** Composite index on (priority, deadline) for efficient sorted queries
- **07-01:** Romanian labels without diacritics (Intarziate, Astazi, Maine)
- **07-01:** Week starts Monday (weekStartsOn: 1) for European/Romanian convention
- **06-06:** All tooltips use Romanian text without diacritics (Genereaza vs Generează)
- **06-06:** Dropdown triggers wrapped with ActionTooltip to explain menu purpose
- **06-06:** Processing states show disabledReason "Se proceseaza..."
- **06-05:** EMPTY_STATES organized by module (orders, invoices, products, inventory, failed_invoices)
- **06-05:** Four empty state types: first_time, filtered, success, error
- **06-05:** Action callbacks use string identifiers (clearFilters, refresh) for config portability
- **06-05:** determineEmptyStateType uses priority: error > filtered > success > first_time
- **06-04:** useErrorModal returns ErrorModalComponent as render function for flexibility
- **06-04:** 10 skeleton rows during table loading for visual consistency
- **06-04:** showError auto-maps errors via getErrorMessage for Romanian messages
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

**CLEANUP NEEDED (Phase 7.1 follow-up):**
- Vechea integrare Trendyol din Settings (tragea produse din Trendyol) trebuie eliminata/inlocuita
- Functionalitatea veche e redundanta acum ca avem push bidirectional si sync automat

**NEXT:**
- Cleanup: Elimina integrarea veche Trendyol din Settings (product pull)
- Apoi: Start Phase 8: Notifications and Automation
- Sau: Address critical technical debt items below

### Roadmap Evolution

- Phase 7.1 inserted after Phase 7: Trendyol Complete Integration (URGENT) - 2026-01-30
  - Reason: Complete Trendyol channel implementation needed now
  - Existing: ~60-70% foundation (API client, models, product pages)
  - Missing: webhooks, Order integration, AWB feedback, auto stock sync
  - Plans created: 6 plans in 5 waves
  - Status: COMPLETE (2026-01-30)

- Phase 7.3, 7.4, 7.5 inserted after Phase 7.2 - 2026-02-03 (URGENT)
  - Reason: Dashboard/Orders/AWB pages need comprehensive rework
  - Phase 7.3: Dashboard Rework - global filters, correct metrics, tooltips, remove Ads/AI
  - Phase 7.4: Orders Channel Split - Shopify/Trendyol/Temu tabs, manual order creation
  - Phase 7.5: AWB Tracking Fix - correct status logic, accurate card counts
  - Key issues:
    - Dashboard cards not filtered by store/date
    - "De Procesat" and "Expediate" meanings unclear
    - Expediate count doesn't match AWB tracking "In tranzit"
    - No returns card
    - Orders page mixes all channels - increases error risk
    - AWB card counts don't sum to total
  - Total new plans: ~15 plans in 7 waves

- Phase 7.6 inserted after Phase 7.5 - 2026-02-04
  - Reason: Customers page for order history and purchase analytics
  - Features: customer list, order history, most ordered products, total spent
  - Multi-store tabs and search across name/phone/order number
  - Sidebar placement: under Comenzi in Vanzari section

- Phase 7.7 inserted after Phase 7.6 - 2026-02-05 (URGENT)
  - Reason: Complete Temu sales channel integration
  - Features: TemuStore model, product push, order sync, invoicing, AWB
  - Multi-store support: multiple Temu seller stores per company
  - Invoice series: per TemuStore (like TrendyolStore)
  - Stock management: decrease on invoice, increase on return
  - API: EU endpoint with MD5 signature authentication

- Phase 7.8 inserted after Phase 7.7 - 2026-02-05 (CRITICAL)
  - Reason: Dual stock systems causing inventory desync
  - Problem: OLD (Product + StockMovement) vs NEW (InventoryItem + InventoryStockMovement)
  - Invoice/returns use OLD, NIR uses NEW - they don't sync
  - Solution: Migrate all flows to use InventoryItem.currentStock
  - Conservative: additive changes only, no deletion, backward compatible
  - Migration scripts provided separately for Railway CLI

- Phase 7.9 inserted after Phase 7.8 - 2026-02-05
  - Reason: Complete goods reception workflow as per requirements document
  - Features: PurchaseOrder, ReceptionReport, SupplierInvoice, NIR workflow
  - Workflow: Precomanda → Etichete → Recepție PV → Factură → NIR → Office → Aprobare → Stoc
  - In-app notifications for Office and George (diferențe)
  - Also includes: low stock alerts migration, stock sync verification
  - 12 plans in 4 waves

## Phase 7.1 Progress

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.1-01 | 1 | Complete | Webhook receiver with HMAC validation, company association |
| 07.1-02 | 2 | Complete | Order table integration with source field + sync service |
| 07.1-03 | 3 | Complete | Invoice auto-send to Trendyol |
| 07.1-04 | 3 | Complete | AWB tracking auto-send to Trendyol |
| 07.1-05 | 4 | Complete | Automatic stock & price sync |
| 07.1-06 | 5 | Complete | Unified dashboard & gap closure |

## Phase 7.2 Progress

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.2-01 | 1 | Complete | Batch status verification UI with error display |
| 07.2-02 | 1 | Complete | Attribute mapping UI |
| 07.2-03 | 1 | Complete | Invoice series integration for TrendyolStore |
| 07.2-04 | 1 | Complete | Order sync uses TrendyolStore.companyId for billing |
| 07.2-05 | 2 | **PENDING VERIFICATION** | Bulk process Trendyol - code done, needs manual test |
| 07.2-06 | 2 | Complete | AI category suggestion with Claude |

**DATABASE MIGRATION STATUS:**

*STAGING (APPLIED 2026-01-30):*
- [x] add_order_source_field.sql - coloana `source` pe orders
- [x] add_trendyol_stores.sql - tabelul trendyol_stores + FK pe trendyol_orders
- [x] add_trendyol_order_tracking_fields.sql - coloane invoice/AWB tracking

*PRODUCTION (PENDING - aplica dupa validare staging):*
- [ ] add_order_source_field.sql
- [ ] add_trendyol_stores.sql
- [ ] add_trendyol_order_tracking_fields.sql

*OLDER (status necunoscut):*
- Apply `prisma/migrations/manual/add_task_management.sql` to create tasks and task_attachments tables
- Apply `prisma/migrations/manual/add_bulk_push_job.sql` to create bulk_push_jobs table

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Quick Tasks

| Task | Status | Summary |
|------|--------|---------|
| q001 | Complete | Bulk product push to all Shopify stores with progress tracking |
| q002 | Complete | Return AWB scanning with auto-mapping to original orders |
| q003 | Complete | Export produse cu linkuri Shopify (Link_Shopify column in CSV) |
| q004 | Complete | Internal order status nomenclator with custom colors and inline assignment |

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 07.9-05-PLAN.md (NIR Workflow APIs)
Resume context:
- **Phase 7.9 IN PROGRESS** - 5/12 plans complete
- NIR workflow state machine: transitionNIR, approveDifferences, getAvailableTransitions
- 6 workflow endpoints: send-office, verify, approve, approve-differences, reject, transfer-stock
- Stock transfer uses InventoryItem.currentStock with RECEIPT movement type
- New permissions: reception.view, reception.verify, reception.approve_differences

**NEXT STEPS:**
1. Continue with 07.9-06: Purchase Orders UI
2. Then 07.9-07: Reception UI

Resume file: .planning/phases/07.9-reception-workflow/07.9-06-PLAN.md

## Phase 7 Features

Task Management Core components:

- [x] 07-01: Task/TaskAttachment Prisma models + task-utils.ts helpers
- [x] 07-02: Task CRUD API endpoints
- [x] 07-03: Task list page with filtering
- [x] 07-04: Task create/edit modal + sidebar navigation
- [x] 07-05: Delete button wired to API with confirmation dialog

## Phase 7.1 Features (Trendyol Complete Integration)

- [x] 07.1-01: Webhook receiver with HMAC-SHA256 validation
- [x] 07.1-02: Order table integration with source field
- [x] 07.1-03: Invoice auto-send to Trendyol
- [x] 07.1-04: AWB tracking auto-send to Trendyol
- [x] 07.1-05: Automatic stock & price sync with cron
- [x] 07.1-06: Unified dashboard, sidebar nav, complete webhook handling

## Phase 7.2 Features (Trendyol Complete Fix)

- [x] 07.2-01: Batch status verification UI with error display
- [x] 07.2-02: Attribute mapping UI
- [x] 07.2-03: Invoice series integration for TrendyolStore
- [x] 07.2-04: Order sync uses TrendyolStore.companyId for billing
- [ ] 07.2-05: Bulk process Trendyol (code done, VERIFICATION PENDING)
- [x] 07.2-06: AI category suggestion with Claude

## Phase 7.3 Progress

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.3-01 | 1 | Complete | Dashboard global filters with URL persistence |
| 07.3-02 | 1 | Complete | Apply filters to dashboard queries |
| 07.3-03 | 2 | Complete | Stat card tooltips with Romanian explanations |
| 07.3-04 | 2 | Complete | Clickable stat cards preserve filter context |
| 07.3-05 | 3 | Complete | Retururi card and dashboard cleanup |
| 07.3-06 | 4 | Complete | AWB status alignment - shared module |

## Phase 7.3 Features (Dashboard Rework)

- [x] 07.3-01: DashboardFilters component with date range and store selector
- [x] 07.3-02: getFilteredDashboardStats service with consistent filter application
- [x] 07.3-03: InfoTooltip integration with Romanian explanations for all 8 stat cards
- [x] 07.3-04: buildFilteredHref helper - clickable stat cards preserve filter context
- [x] 07.3-05: Returns count in dashboard-stats.ts, Retururi card on dashboard
- [x] 07.3-06: Shared awb-status.ts module, dashboard "In Tranzit" matches tracking page

## Phase 7.4 Progress (COMPLETE)

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.4-01 | 1 | ✓ Complete | ChannelTabs component with URL persistence and source counts |
| 07.4-02 | 1 | ✓ Complete | Collapsible ProcessingErrorsPanel with channel badges |
| 07.4-03 | 2 | ✓ Complete | ManualOrderDialog for manual order creation |
| 07.4-04 | 2 | ✓ Complete | Shopify draft order API for manual orders |
| 07.4-05 | 1 | ✓ Complete | TemuPlaceholder with conditional rendering |

## Phase 7.4 Features (Orders Channel Split)

- [x] 07.4-01: ChannelTabs with Shopify/Trendyol/Temu tabs, URL state, source counts API
- [x] 07.4-02: ProcessingErrorsPanel with collapsible UI, channel breakdown, inline error badges
- [x] 07.4-03: ManualOrderDialog with product search, customer/address forms
- [x] 07.4-04: Shopify createDraftOrder/completeDraftOrder methods, /api/orders/manual endpoint
- [x] 07.4-05: TemuPlaceholder component with Construction icon, conditional rendering when tab=temu

**Verification:** 7/7 must-haves verified (2026-02-03)

## Phase 7.5 Progress (COMPLETE)

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.5-01 | 1 | Complete | AWB status categorization refactor using fanCourierStatusCode |
| 07.5-02 | 1 | Complete | Individual status cards with /api/awb/stats API |
| 07.5-03 | 2 | Complete | Status explanation modal with Romanian content |
| 07.5-04 | 2 | Complete | Dashboard alignment and admin page for unknown statuses |

## Phase 7.5 Features (AWB Tracking Fix)

- [x] 07.5-01: awb-status.ts refactored to use fanCourierStatusCode for categorization
- [x] 07.5-02: /api/awb/stats endpoint, dynamic status cards, client-side filtering
- [x] 07.5-03: StatusExplanationModal with info buttons on cards and clickable badges
- [x] 07.5-04: Dashboard uses unified categorization, admin page at /settings/awb-statuses

**Verification:** All must-haves verified (2026-02-03)

## Phase 7.6 Progress

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.6-01 | 1 | Complete | Customer list and detail APIs with aggregation |
| 07.6-02 | 2 | Complete | Customer list page UI with search, store filter, sidebar nav |
| 07.6-03 | 2 | Pending | Customer detail page UI |

## Phase 7.6 Features (Customers Page)

- [x] 07.6-01: Customer list API with aggregation, Customer detail API with order history
- [x] 07.6-02: Customer list page with search and store filter, sidebar Clienti link
- [ ] 07.6-03: Customer detail page with order history and analytics

## Phase 7.7 Progress (COMPLETE)

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.7-01 | 1 | Complete | TemuClient with MD5 signature + database models |
| 07.7-02 | 1 | Complete | TemuStore CRUD API + TemuStoresTab Settings UI |
| 07.7-03 | 2 | Complete | Order Sync Service + Invoice Series Resolution |
| 07.7-04 | 2 | Complete | AWB tracking service |
| 07.7-05 | 3 | Complete | Orders UI - API endpoints + TemuOrdersList component |
| 07.7-06 | 4 | Complete | UI integration - dashboard, orders page, sidebar |

## Phase 7.7 Features (Temu Complete Integration)

- [x] 07.7-01: TemuClient with MD5 signature, TemuStore/TemuOrder/TemuOrderItem models
- [x] 07.7-02: TemuStore CRUD API, TemuStoresTab Settings UI, Temu tab in Settings
- [x] 07.7-03: Order Sync Service with TemuStore credential mapping, invoice series resolution
- [x] 07.7-04: AWB tracking send to Temu (sendTrackingToTemu + AWB service integration)
- [x] 07.7-05: Orders UI - GET/POST endpoints for temu/orders and temu/sync, TemuOrdersList component
- [x] 07.7-06: Temu dashboard, dedicated orders page, sidebar navigation

## Phase 7.8 Progress (Stock Unification)

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.8-01 | 1 | Complete | Create addInventoryStockForReturn() function |
| 07.8-02 | 1 | Complete | Migrate invoice-service.ts to processInventoryStockForOrderFromPrimary |
| 07.8-03 | 2 | Complete | Migrate returns/reprocess-stock to addInventoryStockForReturn |
| 07.8-04 | 2 | Complete | Migrate picking to use InventoryItem.currentStock |
| 07.8-05 | 3 | Complete | MasterProduct→InventoryItem mapping script + deprecation markers |

## Phase 7.8 Context (Stock Unification)

**Problem identified:**
- Dual stock systems: OLD (Product/MasterProduct.stock + StockMovement) vs NEW (InventoryItem.currentStock + InventoryStockMovement)
- Invoice generation uses OLD: `processStockForOrder()` in invoice-service.ts:725
- Returns use OLD: `processStockReturnForOrder()` in returns/reprocess-stock
- Picking uses OLD: decrements `MasterProduct.stock` in picking/[id]/route.ts
- NIR (GoodsReceipt) uses NEW: updates `InventoryItem.currentStock`
- Result: stock gets out of sync between systems

**Solution:**
- Use existing `processInventoryStockForOrderFromPrimary()` (inventory-stock.ts:1068-1216) - READY
- Create new `addInventoryStockForReturn()` for returns
- Migrate picking to use InventoryItem
- Map all MasterProducts to InventoryItems

**Conservative approach:**
- Additive changes only (no deletion)
- Old functions marked @deprecated but kept
- All new DB fields nullable
- Migration scripts separate (for Railway CLI)

## Phase 7.9 Progress (Reception Workflow)

| Plan | Wave | Status | Summary |
|------|------|--------|---------|
| 07.9-01 | 1 | Complete | 7 new models + 4 enums + extended GoodsReceipt for reception workflow |
| 07.9-02 | 2 | Complete | Purchase Orders CRUD API + labels generation |
| 07.9-03 | 2 | Complete | Reception Reports API + photo upload + finalization with NIR generation |
| 07.9-04 | 2 | Complete | Supplier Invoices CRUD API + document upload |
| 07.9-05 | 2 | Complete | NIR Workflow APIs: state machine + 6 endpoints + stock transfer |
| 07.9-06 | 3 | Pending | Purchase Orders UI: list, create/edit, labels page |
| 07.9-07 | 3 | Pending | Reception UI: warehouse dashboard, PV completion, photos |
| 07.9-08 | 3 | Pending | Office Dashboard + Pending Approval page |
| 07.9-09 | 3 | Pending | Supplier Invoices UI: list and detail pages |
| 07.9-10 | 4 | Pending | In-app Notifications: Notification model API + bell icon UI |
| 07.9-11 | 4 | Pending | Low stock alerts migration: dashboard-stats.ts → InventoryItem.currentStock |
| 07.9-12 | 4 | Pending | Stock sync verification: Temu + Trendyol use InventoryItem correctly |

## Phase 7.9 Context (Reception Workflow)

**Complete workflow:**
1. **Precomandă** (PurchaseOrder) - Office creează comandă către furnizor
2. **Etichete** (PurchaseOrderLabel) - Generare + printare pentru depozit
3. **Recepție** (ReceptionReport) - Gestionar verifică marfa primită vs așteptat
4. **Poze** (ReceptionPhoto) - Documentare: overview, etichete, deteriorări, factură
5. **Factură Furnizor** (SupplierInvoice) - Înregistrare factură primită
6. **NIR** (GoodsReceipt) - Generat automat la finalizare recepție
7. **Workflow NIR**: GENERAT → TRIMIS_OFFICE → VERIFICAT → APROBAT/RESPINS → IN_STOC
8. **Notificări** - Office notificat pentru verificare, George pentru diferențe

**Database models noi:**
- PurchaseOrder + PurchaseOrderItem
- ReceptionReport + ReceptionReportItem
- ReceptionPhoto
- SupplierInvoice
- PurchaseOrderLabel
- Notification
- GoodsReceipt (extins +12 câmpuri)

**Enums noi:**
- PurchaseOrderStatus, ReceptionReportStatus, GoodsReceiptStatus (extins)
- PaymentStatus, PhotoCategory

**UI pages noi:**
- /inventory/purchase-orders/*
- /inventory/reception/*
- /inventory/receipts/office, /inventory/receipts/pending-approval
- /inventory/supplier-invoices/*

**Zone neacoperite incluse:**
- dashboard-stats.ts low stock alerts → InventoryItem.currentStock
- Temu/Trendyol stock sync verification

## Recent Commits

- `bf847e6` feat(07.9-02): create Labels API for purchase orders
- `cb6b42e` feat(07.9-02): create Purchase Orders CRUD API
- `6f17b9b` feat(07.9-02): create document numbering utility
- `3a6e983` feat(07.9-04): create Invoice Upload endpoint
- `4956233` feat(07.9-04): create Supplier Invoices CRUD API
- `b3b251c` style(07.9-01): format schema.prisma with prisma format
- `90f8069` chore(07.9-01): create SQL migration for reception workflow
- `521c3fc` feat(07.9-01): add reception workflow models and enums
- `55506b7` chore(07.8-05): add MasterProduct to InventoryItem mapping migration
- `02e4bd7` chore(07.8-05): add deprecation markers to legacy stock functions
- `4526f92` feat(07.8-02): migrate invoice stock deduction to NEW inventory system
- `5bda2a3` feat(07.8-01): add addInventoryStockForReturn function
- `514d432` feat(07.8-01): add addInventoryStockFromWarehouse function
- `908fcae` feat(07.7-05): replace TemuPlaceholder with TemuOrdersList
- `3c6c9e7` feat(07.7-05): create TemuOrdersList component
- `b932d33` feat(07.7-05): create Temu orders and sync API endpoints
- `86c8537` feat(07.7-06): add Temu section to sidebar navigation
- `1e12f2f` feat(07.7-06): create Temu orders page
- `8b9feb1` feat(07.7-06): create Temu dashboard page with stats
- `739eeab` feat(07.7-04): integrate Temu tracking into AWB service
- `3c5e296` feat(07.7-04): create Temu AWB tracking service
- `ca9a8e1` feat(07.7-02): integrate TemuStoresTab into Settings page
- `2e1af75` feat(07.7-02): create TemuStoresTab settings component
- `b8ed82d` feat(07.7-02): create TemuStore CRUD API routes
- `f4da462` feat(07.7-01): create SQL migration for Temu tables
- `3d9b482` feat(07.7-01): add TemuStore, TemuOrder, TemuOrderItem models
- `63edb5b` feat(07.7-01): create TemuClient with MD5 signature authentication
- `5f4a86c` feat(07.6-02): add Clienti navigation to sidebar
- `288473e` feat(07.6-02): create Customer List Page with search and store filter
- `caf5ce2` feat(07.6-01): create Customer Detail API with order history
- `213576c` feat(07.6-01): create Customer List API with aggregation
- `06303c6` feat(07.5-04): create admin page for unknown AWB statuses
- `4a989a4` feat(07.5-04): create API for unknown AWB statuses
- `03602be` feat(07.5-04): verify and update dashboard-stats alignment
- `db64fec` feat(07.5-03): integrate StatusExplanationModal into tracking page
- `3af348d` feat(07.5-03): create StatusExplanationModal component
- `192c587` feat(07.5-02): refactor tracking page with individual status cards
- `1a6c8cf` feat(07.5-02): create AWB stats API endpoint
- `64f88bc` feat(07.5-01): refactor awb-status.ts to use code-based categorization
- `26e34cb` feat(07.4-03): integrate ManualOrderDialog into orders page
- `7011e68` feat(07.4-03): create ManualOrderDialog component
- `8055645` docs(07.4-04): complete Manual Order Shopify Push API plan
- `8ecd6b1` feat(07.4-05): integrate TemuPlaceholder into orders page
- `f054356` feat(07.4-05): create TemuPlaceholder component
- `8bc7d5b` feat(07.4-02): integrate ProcessingErrorsPanel and add inline error badges
- `5acc6d2` feat(07.4-02): create ProcessingErrorsPanel component
- `ebc26d3` docs(07.4-01): complete Channel Tabs UI plan
- `3368e95` feat(07.4-01): integrate ChannelTabs in orders page
- `cb607ea` feat(07.4-01): add sourceCounts to orders API response
- `10bb0ba` refactor(07.3-06): use shared awb-status.ts in tracking page
- `938beac` feat(07.3-06): update dashboard to use inTransit stat
- `04635bf` feat(07.3-06): update dashboard stats to count AWBs in transit
- `5081057` feat(07.3-06): create shared awb-status.ts module
- `22d2ac6` feat(07.3-05): add Retururi card to dashboard
- `f70276a` feat(07.3-05): add returns count to dashboard stats
- `e5c43d8` feat(07.3-04): add buildFilteredHref helper function
- `449ba27` feat(07.3-03): add Romanian tooltip explanations to all stat cards
- `ce92d32` feat(07.3-03): extend StatCard with tooltip support
- `be22094` feat(07.3-02): update dashboard page to use filtered stats

---
*State initialized: 2026-01-23*
*Last updated: 2026-02-06 (07.9-04 Complete - Supplier Invoices CRUD API)*
