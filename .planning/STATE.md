# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Facturare corecta si AWB-uri emise fara erori pentru fiecare comanda, cu trasabilitate completa
**Current focus:** Phase 2 - Invoice Series Fix - MIGRARE FACTURIS → OBLIO

## Current Position

Phase: 2 of 10 (Invoice Series Fix)
Plan: 5 of 5 in current phase (02-05 in progress)
Status: **IN PROGRESS** - Migrare Oblio în curs
Last activity: 2026-01-24 - Înlocuit Facturis cu Oblio

Progress: [██████████████████░░] 20.0%

## MIGRARE FACTURIS → OBLIO

### Ce s-a făcut:

1. ✅ **Creat `src/lib/oblio.ts`** - Client API Oblio cu OAuth 2.0
2. ✅ **Actualizat schema Prisma** - Câmpuri: oblioEmail, oblioSecretToken, oblioCif
3. ✅ **Actualizat invoice-service.ts** - Folosește Oblio în loc de Facturis
4. ✅ **Redenumit test-facturis → test-oblio** - Endpoint pentru testare conexiune
5. ✅ **Actualizat UI companiilor** - Tab "Oblio" în loc de "Facturis"
6. ✅ **Șters facturis.ts** - Cod vechi eliminat
7. ✅ **Commit și push** - `6e4b8c3`

### Ce rămâne de făcut:

1. ⏳ **RULEAZĂ MIGRAREA SQL** în Railway Database:
   ```
   prisma/migrations/manual/migrate_facturis_to_oblio.sql
   ```

2. ⏳ **Configurează Oblio** în ERP:
   - Setări → Firme → Editează → Tab Oblio
   - Email: email-ul de login Oblio
   - Token Secret: din Oblio Setări → Date Cont
   - Testează conexiunea

3. ⏳ **Testează emitere factură** - retry pe o factură eșuată

### Cum să rulezi migrarea SQL în Railway:

1. Mergi la Railway Dashboard → Proiectul tău
2. Click pe serviciul PostgreSQL
3. Click pe tab-ul "Data" sau "Query"
4. Copiază și lipește SQL-ul din:
   `prisma/migrations/manual/migrate_facturis_to_oblio.sql`
5. Execută query-ul

### Credențiale Oblio necesare:

| Câmp | De unde | Exemplu |
|------|---------|---------|
| Email | Email-ul cu care te loghezi în Oblio | admin@firma.ro |
| Token Secret | Oblio → Setări → Date Cont | abc123xyz... |
| CIF (opțional) | Dacă diferă de CIF-ul general | RO12345678 |

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

- **02-05:** Înlocuit Facturis cu Oblio - autentificare simplă OAuth 2.0 (email + token)
- **02-04:** FailedInvoiceAttempt stores full context (store/company/series) for debugging
- **02-03:** Store-specific series takes priority over company default when active
- **02-02:** Series dropdown filtered by company - prevents invalid cross-company assignments
- **02-01:** Romanian error messages established as pattern for user-facing errors

### Blockers/Concerns

**CURRENT TASK:**
- Rulează migrarea SQL în Railway
- Configurează credențiale Oblio în ERP
- Testează emitere factură

**CRITICAL (Blocheaza munca):**
- TD-01: Order processing no transaction - partial failures cause inconsistent data
- TD-02: `/invoices/[id]/cancel` and `/pay` have no permission checks
- TD-03: `/products/bulk` and `/sync-images` have no permission checks

## Session Continuity

Last session: 2026-01-24
Stopped at: Migrare Oblio - SQL migration pending
Resume command: `/gsd:debug` sau citește STATE.md

## Phase 2 Progress

| Plan | Status | Summary |
|------|--------|---------|
| 02-01 | ✓ Complete | Romanian errors, validateSeriesForStore, Store API invoiceSeriesId |
| 02-02 | ✓ Complete | Store edit dialog series dropdown, mapping overview table |
| 02-03 | ✓ Complete | Invoice service uses store-specific series, seriesSource field |
| 02-04 | ✓ Complete | Edge case auto-correction, FailedInvoiceAttempt model, API |
| 02-05 | ◆ In Progress | Failed invoices page done, Oblio migration done, testing pending |

## Recent Commits

- `6e4b8c3` feat: replace Facturis with Oblio for invoicing
- `2a65d57` debug(02): log full Facturis API response
- `39b6418` fix(02): revert CIF normalization - Facturis needs exact match
- `99ba7a8` debug(02): add detailed logging to testConnection
- Earlier commits for plans 02-01 through 02-04

---
*State initialized: 2026-01-23*
*Last updated: 2026-01-24 (Migrare Oblio - waiting for SQL migration)*
