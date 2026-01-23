---
phase: 01
plan: 02
completed: 2026-01-23
subsystem: api
tags: [api, audit, endpoints, validation, security]

dependency_graph:
  requires: [01-01]
  provides: [api-catalog, validation-gaps, security-issues]
  affects: [02-*, 03-*, 04-*, 05-*]

tech_stack:
  added: []
  patterns: []

key_files:
  created:
    - .planning/phases/01-system-audit/audit-output/api/orders-api.md
    - .planning/phases/01-system-audit/audit-output/api/invoices-api.md
    - .planning/phases/01-system-audit/audit-output/api/products-api.md
    - .planning/phases/01-system-audit/audit-output/api/awb-api.md
    - .planning/phases/01-system-audit/audit-output/api/sync-api.md
    - .planning/phases/01-system-audit/audit-output/api/integrations-api.md
    - .planning/phases/01-system-audit/audit-output/api/remaining-api.md
  modified: []

decisions:
  - id: API-01
    description: "API audit follows template from 01-RESEARCH.md with tables for each endpoint"
  - id: API-02
    description: "Security issues flagged inline with CONCERNS.md references"
  - id: API-03
    description: "Dead code candidates (FreshSales, BaseLinker) flagged for Phase 5"

metrics:
  duration: 8 minutes
  completed: 2026-01-23
---

# Phase 01 Plan 02: API Endpoints Audit Summary

**One-liner:** Complete API surface audit documenting 40+ directories with auth, validation, and CONCERNS.md cross-references

## What Was Done

### Task 1: Orders and Invoices API

Documented 10 endpoints across orders and invoices:

| Endpoint | Auth | Validation | Issues |
|----------|------|------------|--------|
| GET /api/orders | orders.view | Manual | OK |
| GET /api/orders/[id] | orders.view | Lipsa UUID | OK |
| PUT /api/orders/[id] | orders.edit | validateOrder() | OK |
| POST /api/orders/process | orders.process | Array check only | **No transaction handling** |
| POST /api/orders/process-all | orders.process | Array check only | **No transaction handling** |
| GET /api/orders/export | orders.view | Manual | OK |
| GET /api/invoices | invoices.view | Manual | **No pagination** |
| POST /api/invoices/issue | invoices.create | Array check | OK |
| POST /api/invoices/[id]/cancel | **LIPSA** | Manual | **Security gap** |
| POST /api/invoices/[id]/pay | **LIPSA** | Manual | **Security gap** |

**Critical findings:**
- `/orders/process` and `/process-all` lack database transaction - partial failures cause data inconsistency
- `/invoices/[id]/cancel` and `/pay` have no permission checks - any authenticated user can access

### Task 2: Products, AWB, and Sync API

Documented 15+ endpoints:

**Products API:**
- CRUD complet cu permisiuni OK
- `/sync-images` - BUG REZOLVAT (unique constraint) prin delete-all-then-create
- `/bulk` - **Security gap**: no permission check, minimal validation

**AWB API:**
- Full integration cu FanCourier
- Token caching fara expiration validation (CONCERNS.md)
- Sync operations blocante (CONCERNS.md)

**Sync API:**
- `/sync`, `/sync/full` ruleaza inline - blocheaza request handler
- `/sync/full` - **Security gap**: no permission check

### Task 3: Integrations and Remaining APIs

**Facturis Integration:**
- Invoice series CRUD - OK
- Auto-correct logic - potential edge cases (CONCERNS.md)

**Shopify Integration:**
- Webhook cu HMAC signature verification - OK
- `crypto.timingSafeEqual` - corect implementat

**Meta Ads Integration:**
- Webhook handler pentru campanii/conturi
- **BUG**: Notification spam - fiecare webhook creeaza notificari duplicate

**Trendyol Integration:**
- Cod extins (19KB route.ts) - status neclar (in productie sau in testare?)

**Remaining APIs (40+ directories):**
- Catalogate cu auth/validation status
- Dead code candidates: FreshSales, BaseLinker

## Security Issues Identified

| Issue | Endpoints | Severity | CONCERNS.md Ref |
|-------|-----------|----------|-----------------|
| No permission check | /invoices/[id]/cancel, /pay | CRITICA | RBAC Permission Checks Incomplete |
| No permission check | /products/bulk, /sync-images | CRITICA | RBAC Permission Checks Incomplete |
| No permission check | /sync/full GET/POST | MEDIE | RBAC Permission Checks Incomplete |
| No permission check | /fancourier/services, /test | JOASA | - |
| No transaction handling | /orders/process, /process-all | CRITICA | No Transaction Handling |
| No rate limiting | All sync/process endpoints | MEDIE | No Rate Limiting |
| Blocking operations | /sync, /sync/full | MEDIE | Synchronization Blocks Handler |
| Token timing attack | /webhooks/meta GET | JOASA | Authentication Token Verification |

## Validation Status Summary

| Category | Zod Schema | Manual | None |
|----------|------------|--------|------|
| Core business | 0% | 90% | 10% |
| Settings/Config | 0% | 50% | 50% |
| CRUD auxiliar | 0% | 80% | 20% |
| **Overall** | **~5%** | **~70%** | **~25%** |

## API Surface Statistics

| Metric | Value |
|--------|-------|
| Total API directories | 44 |
| Endpoints documented (detailed) | ~50 |
| Endpoints documented (summary) | ~100+ |
| With Zod validation | ~5% |
| With rate limiting | 0% |
| With complete permission checks | ~60% |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **API-01:** API audit follows template from 01-RESEARCH.md with structured tables for each endpoint
2. **API-02:** Security issues flagged inline with explicit CONCERNS.md references
3. **API-03:** Dead code candidates (FreshSales, BaseLinker) flagged for Phase 5 cleanup

## Next Phase Readiness

**Dependencies satisfied:**
- API surface fully cataloged for Phase 2 (Invoice Series Fix)
- Validation gaps identified for Phase 4 (Validation Fixes)
- Security issues documented for Phase 5 (Code Cleanup)

**Open questions for user:**
1. Trendyol integration - actively used or in testing?
2. Ads module (Meta/TikTok) - in production or future feature?
3. Priority for security fixes - should permission checks be addressed before feature work?

## Commits

| Hash | Description |
|------|-------------|
| bd3ffbc | docs(01-02): audit orders and invoices API endpoints |
| 58e41e1 | docs(01-02): audit products, AWB, and sync API endpoints |
| f9828c3 | docs(01-02): audit integration APIs and remaining endpoints |

---

*Completed: 2026-01-23*
