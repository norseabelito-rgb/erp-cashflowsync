# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Cleanup old Trendyol integration, then Phase 8

## Current Position

Phase: 7.2 of 10 (Trendyol Complete Fix - Wave 2 in progress)
Plan: 6 of 6 (Wave 2)
Status: Plan 06 complete - AI category suggestion
Last activity: 2026-02-01 - Completed 07.2-06-PLAN.md (AI category suggestion)

Progress: [████████████████████] ~89% (7/10 integer phases + 6/6 of 7.1 + 6/6 of 7.2)

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
- Total plans completed: 39
- Average duration: ~5.3 minutes
- Total execution time: ~218 minutes

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

## Accumulated Context

### Decisions

Recent decisions affecting current work:

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
| 07.2-05 | 2 | Complete | AWB tracking sync uses awb-service |
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

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 07.2-06-PLAN.md (AI category suggestion)
Resume context:
- **STAGING BRANCH** - Phase 7.2 Wave 2 complete
- AI category suggestion using Claude for Trendyol product mapping
- "Sugereaza Categorie" button in mapping page with confidence display
- Wave 1 (plans 01-04) and Wave 2 (plans 05-06) complete

**NEXT STEPS:**
1. Continue with remaining 7.2 plans (if any)
2. Or move to Phase 8: Notifications and Automation

Resume file: None

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
- [x] 07.2-05: AWB tracking sync uses awb-service
- [x] 07.2-06: AI category suggestion with Claude

## Recent Commits

- `49f6db7` feat(07.2-06): add AI category suggestion UI to mapping page
- `b949da8` feat(07.2-06): add category suggestion API endpoint
- `91d28ea` feat(07.2-06): create AI category suggestion library
- `7061889` feat(07.2-05): use awb-service for Trendyol tracking sync
- `702bf97` feat(07.2-04): update webhook to pass TrendyolStore to sync
- `dfbeef7` feat(07.2-04): refactor order sync to use TrendyolStore for company
- `7c908ca` feat(07.2-03): ensure TrendyolStore is linked during order sync
- `e42f7ff` feat(07.2-03): add TrendyolStore invoice series resolution

---
*State initialized: 2026-01-23*
*Last updated: 2026-02-01 (Phase 7.2 Wave 2 complete - AI category suggestion)*
