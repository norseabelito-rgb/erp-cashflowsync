# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 2 - Invoice Series Fix - DEBUGGING FACTURIS CONNECTION

## Current Position

Phase: 2 of 10 (Invoice Series Fix)
Plan: 5 of 5 in current phase (02-05 in progress)
Status: **BLOCKED** - Facturis connection error 1004
Last activity: 2026-01-24 - Debugging Facturis credentials not being passed correctly

Progress: [██████████████████░░] 20.0%

## ACTIVE DEBUG SESSION

### Problem: Facturis Error 1004

**Symptoms:**
- Invoice generation fails with error 1004 (series not found)
- Log shows: `API Key: undefined...` and `CIF Firma: undefined`
- User confirmed credentials ARE saved in database
- Test connection button also fails with 1004

**Root Cause (suspected):**
- Facturis credentials (facturisApiKey, facturisUsername, facturisPassword, facturisCompanyCif) are saved in DB
- But NOT being passed correctly to Facturis API client
- Either API endpoint doesn't return credentials, or test endpoint doesn't use them correctly

**Files to investigate:**
1. `src/app/api/companies/[id]/route.ts` - Check if credentials are returned
2. `src/app/api/companies/[id]/test-facturis/route.ts` - Check how test works
3. `src/lib/facturis.ts` - createFacturisClient function (line ~862)

**Logs from failed attempt:**
```
Firma: AQUATERRA MOBILI S.R.L. (AMS)
Serie locală: ERPAMBF24H | Numar: 1
Serie Facturis: ERPAMBF24H (configurat)
[Facturis] Request payload pentru factură:
  - Serie: "ERPAMBF24H"
  - Numar: 1
  - API Key: undefined...
  - CIF Firma: undefined
```

**Next steps:**
1. Check companies API - does GET return facturisApiKey etc?
2. Check test-facturis endpoint - how does it get credentials?
3. Verify company object passed to createFacturisClient has all fields

---

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

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- **02-01:** Romanian error messages established as pattern for user-facing errors
- **02-02:** Series dropdown filtered by company - prevents invalid cross-company assignments
- **02-02:** Manual series creation required - Facturis API has no series endpoint
- **02-03:** Store-specific series takes priority over company default when active
- **02-03:** seriesSource field added to IssueInvoiceResult for debugging/transparency
- **02-04:** FailedInvoiceAttempt stores full context (store/company/series) for debugging
- **02-04:** TD-04 (Invoice series edge cases) RESOLVED

### Blockers/Concerns

**CURRENT BLOCKER:**
- Facturis credentials not being passed to API client (undefined)
- Must fix before Phase 2 verification can complete

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

### Open Questions

1. Trendyol integration - actively used or in testing?
2. Ads module (Meta/TikTok) - in production or future feature?
3. AI Insights module - actively used?

## Session Continuity

Last session: 2026-01-24
Stopped at: Debugging Facturis 1004 error - credentials undefined
Resume command: `/gsd:debug` or manual investigation of API endpoints

## Phase 2 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 02-01 | ✓ Complete | Romanian errors, validateSeriesForStore, Store API invoiceSeriesId |
| 02-02 | ✓ Complete | Store edit dialog series dropdown, mapping overview table |
| 02-03 | ✓ Complete | Invoice service uses store-specific series, seriesSource field |
| 02-04 | ✓ Complete | Edge case auto-correction, FailedInvoiceAttempt model, API |
| 02-05 | ◆ Blocked | Failed invoices page done, but verification blocked by 1004 error |

## Recent Commits (Phase 2)

- `a9aacae` debug(02): add detailed logging for Facturis 1004 error
- `21b9230` chore(02): add migration for FailedInvoiceAttempt table
- `76fbd17` fix(02): save failed invoice attempts and add sidebar link
- `1b48cc7` feat(02-05): create failed invoices page with retry capability
- Earlier commits for plans 02-01 through 02-04

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-24 (BLOCKED: Facturis credentials not passed to API - investigating)*
