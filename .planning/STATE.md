# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 2 - Invoice Series Fix

## Current Position

Phase: 2 of 10 (Invoice Series Fix)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-01-24 - Completed 02-01-PLAN.md (Store API and Error Messages)

Progress: [████████████░░░░░░░░] 12.5%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~7 minutes
- Total execution time: ~36 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-system-audit | 4/4 | ~28 min | ~7 min |
| 02-invoice-series-fix | 1/4 | ~8 min | ~8 min |

**Recent Trend:**
- Last 5 plans: 01-02 (api), 01-03 (flows), 01-04 (tech-debt), 02-01 (store-api)
- Trend: Consistent pace, code changes take slightly longer than doc-only

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

### Pending Todos

None - Plan 02-01 complete, ready for 02-02.

### Blockers/Concerns

From codebase analysis (CONCERNS.md) and Phase 1 audit:

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks
- TD-04: Invoice series edge cases - wrong numbers possible

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
Stopped at: Completed 02-01-PLAN.md (Store API and Error Messages)
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
*Last updated: 2026-01-24 (02-01 complete: Store API invoiceSeriesId + Romanian error messages)*
