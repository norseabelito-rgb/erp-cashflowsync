# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 7 - Task Management Core - COMPLETE (with gap closure)

## Current Position

Phase: 7 of 10 (Task Management Core)
Plan: 5 of 5 complete (including gap closure)
Status: Phase complete
Last activity: 2026-01-26 - Completed 07-05-PLAN.md (gap closure)

Progress: [██████████████████░░] 90%

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
- Total plans completed: 32
- Average duration: ~5.4 minutes
- Total execution time: ~174 minutes

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

## Accumulated Context

### Decisions

Recent decisions affecting current work:

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

**NEXT:**
- Start Phase 8: Notifications and Automation

**DATABASE MIGRATION NEEDED:**
- Apply `prisma/migrations/manual/add_task_management.sql` to create tasks and task_attachments tables
- Regenerate Prisma client with `npx prisma generate` (permission issue on node_modules/.prisma)

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 07-05-PLAN.md (gap closure, Phase 7 fully complete)
Resume file: None

## Phase 7 Features

Task Management Core components:

- [x] 07-01: Task/TaskAttachment Prisma models + task-utils.ts helpers
- [x] 07-02: Task CRUD API endpoints
- [x] 07-03: Task list page with filtering
- [x] 07-04: Task create/edit modal + sidebar navigation
- [x] 07-05: Delete button wired to API with confirmation dialog

## Recent Commits

- `097d5b6` feat(07-05): wire delete button to API with confirmation dialog
- `b659081` feat(07-04): add tasks navigation entry to sidebar
- `d2db178` feat(07-04): integrate task form dialog into tasks page
- `1a0018a` feat(07-04): create task form dialog component
- `5996e5c` feat(07-02): create task completion toggle API endpoint
- `e442f38` feat(07-02): create task detail, update, delete API endpoints
- `c400663` feat(07-02): create task list and create API endpoints
- `173192a` feat(07-01): create task-utils.ts helper functions
- `b83a06b` chore(07-01): add task management database migration
- `cc6a406` feat(07-01): add Task management models to Prisma schema

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-26 (07-05 complete, Phase 7 fully complete with gap closure)*
