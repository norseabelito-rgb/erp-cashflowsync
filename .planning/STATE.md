# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 2 - Invoice Series Fix

## Current Position

Phase: 2 of 10 (Invoice Series Fix)
Plan: 4 of 5 in current phase
Status: In progress
Last activity: 2026-01-24 - Completed 02-04-PLAN.md (Edge Cases and Failed Invoice Tracking)

Progress: [██████████████████░░] 20.0%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~6 minutes
- Total execution time: ~49 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 4/5 | ~21 min | ~5.25 min |

**Recent Trend:**
- Last 5 plans: 02-01 (store-api), 02-02 (ui-mapping), 02-03 (series-integration), 02-04 (edge-cases)
- Trend: API integration changes fast (~4-8 min), UI changes very fast (~1 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Audit phase first before any fixes (understand before changing)
- Roadmap: Invoice series fix prioritized as biggest pain point (Phase 2)
- Roadmap: Task management after core fixes (Phases 7-8)
- **01-01:** User confirmed: FreshSales and BaseLinker are DEAD CODE - remove in Phase 5
- **01-01:** Ads module and Trendyol: keep until explicit user confirmation
- **01-02:** API audit uses structured tables per endpoint with CONCERNS.md cross-refs
- **01-02:** Security gaps flagged for early attention (missing permission checks)
- **01-03:** Order-to-Delivery flow verified by user - matches production behavior
- **01-03:** Internal Settlement: CONSTRUIM DESTINE S.R.L. is secondary company, 10% markup confirmed
- **01-03:** Internal Settlement: NOT in use currently but ESSENTIAL to implement (Phase 3 priority)
- **01-03:** Stock Management: Shopify sync NOT needed - no inventory tracking in Shopify
- **01-03:** Stock Management: Inter-warehouse transfers MUST exist
- **01-03:** FanCourier status codes: User requested complete documentation for future phases
- **01-04:** FreshSales/BaseLinker not in src/ - only doc cleanup needed
- **01-04:** Tech debt prioritized: 4 items marked "Blocheaza munca" (TD-01 to TD-04)
- **01-04:** Database schema documented: Order->Store->Company chain critical for invoice series
- **02-01:** Romanian error messages established as pattern for user-facing errors
- **02-01:** Validation functions return { valid: boolean; error?: string } for richer error info
- **02-02:** Series dropdown filtered by company - prevents invalid cross-company assignments
- **02-02:** Series selection auto-clears when company changes for data consistency
- **02-02:** Mapping overview shows effective series (store-specific or company default)
- **02-02:** Manual series creation required - Facturis API has no series endpoint
- **02-03:** Store-specific series takes priority over company default when active
- **02-03:** seriesSource field added to IssueInvoiceResult for debugging/transparency
- **02-03:** All invoice error messages use getInvoiceErrorMessage for consistency
- **02-04:** Edge case auto-correction targets max(1, startNumber) when currentNumber < 1
- **02-04:** FailedInvoiceAttempt stores full context (store/company/series) for debugging
- **02-04:** Correction tracking pattern: functions return correctionApplied/correctionMessage

### Pending Todos

None - Plan 02-04 complete, ready for 02-05.

### Blockers/Concerns

From codebase analysis (CONCERNS.md) and Phase 1 audit:

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks
- ~~TD-04: Invoice series edge cases - wrong numbers possible~~ (RESOLVED in 02-04)

**High Priority (Deranjaza):**
- TD-05: No Zod validation on orders/process
- TD-06: N+1 queries causing slow pages
- TD-07: NextAuth v4 out of support
- TD-08: FanCourier token no expiration check
- TD-09: No rate limiting

**Test Gaps:**
- No integration tests for RBAC
- No tests for concurrent sync operations
- No tests for webhook signature validation

### Open Questions

1. Trendyol integration - actively used or in testing?
2. Ads module (Meta/TikTok) - in production or future feature?
3. AI Insights module - actively used?

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 02-04-PLAN.md (Edge Cases and Failed Invoice Tracking)
Resume file: None

## Phase 1 Deliverables

| Artifact | Path |
|----------|------|
| Pages Audit | .planning/phases/01-system-audit/audit-output/pages/*.md |
| API Audit | .planning/phases/01-system-audit/audit-output/api/*.md |
| Flow Audit | .planning/phases/01-system-audit/audit-output/flows/*.md |
| Tech Debt | .planning/phases/01-system-audit/audit-output/tech-debt.md |
| DB Schema | .planning/phases/01-system-audit/audit-output/database-schema.md |
| Dead Code | .planning/phases/01-system-audit/audit-output/dead-code.md |
| Summaries | .planning/phases/01-system-audit/01-0X-SUMMARY.md |

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-24 (02-04 complete: Edge case auto-correction with notification, FailedInvoiceAttempt model, failed invoices API)*
