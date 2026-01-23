# Tech Debt - Inventar Consolidat

**Data:** 2026-01-23
**Sursa:** CONCERNS.md + Audit Phase 1 (01-01, 01-02, 01-03)

---

## Surse

- **CONCERNS.md** - Analiza initiala codebase (2026-01-23)
- **01-01-PLAN.md** - Audit pagini dashboard (discrepante UI)
- **01-02-PLAN.md** - Audit API endpoints (securitate, validare)
- **01-03-PLAN.md** - Audit fluxuri business

---

## Tech Debt - Categorii

### 1. Componente Monolitice

**Sursa:** CONCERNS.md "Large Monolithic Components"

| Fisier | Linii | Impact | Problema |
|--------|-------|--------|----------|
| `src/lib/meta-ads.ts` | 2536 | Mentinere dificila | Cod greu de testat, risc de bug-uri |
| `src/app/(dashboard)/orders/page.tsx` | 2301 | Development lent | Modificari afecteaza tot |
| `src/app/(dashboard)/settings/page.tsx` | 1624 | UI complex | Multe tab-uri, greu de navigat |
| `src/lib/fancourier.ts` | 1235 | Integrare fragila | Token caching problematic |

**Evaluare impact:**
- **orders/page.tsx** - Pagina cea mai folosita, modificari frecvente. **Incetineste development.**
- **meta-ads.ts** - Status utilizare neclar. Daca nu e folosit activ, poate fi ignorat.
- **settings/page.tsx** - Functional, dar UX sufera. Nu blocheaza munca.
- **fancourier.ts** - Token caching fara expiration check cauzeaza erori silente.

**Prioritate:** Deranjaza (orders/page.tsx), Cosmetic (restul)

---

### 2. Validare Lipsa

**Sursa:** CONCERNS.md "Missing Input Validation" + 01-02-SUMMARY.md

**Statistici din audit API:**
- ~5% din endpoint-uri au Zod schema
- ~70% au validare manuala (basicbasic)
- ~25% nu au validare

**Endpoint-uri critice fara validare Zod:**

| Endpoint | Risc | Prioritate |
|----------|------|------------|
| POST /api/orders/process | Procesare comenzi - input arrays | CRITICA |
| POST /api/orders/process-all | Procesare bulk - mai riscant | CRITICA |
| PUT /api/settings | Setari globale - poate corupe config | MEDIE |
| POST /api/products/bulk | Bulk import produse | MEDIE |
| POST /api/invoices/issue | Emitere facturi | MEDIE |

**Problema:** Malformed requests pot cauza crash-uri sau date gresite in DB.

**Prioritate:** Blocheaza munca (pentru orders/process), Deranjaza (restul)

---

### 3. Tranzactii Lipsa

**Sursa:** CONCERNS.md "No Transaction Handling"

**Problema critica:** Order processing creeaza factura apoi AWB secvential, fara database transaction.

**Scenarii de eroare:**
1. Factura emisa cu succes -> AWB esueaza -> Comanda ramane cu factura dar fara AWB
2. Retry pe aceeasi comanda -> Factura duplicata posibila
3. Partial failure -> Date inconsistente intre Invoice, AWB, Order status

**Fisiere afectate:**
- `src/app/api/orders/process/route.ts` (linii 64-155)

**Impact business:** Facturi emise fara AWB = erori contabile, stornari necesare manual.

**Prioritate:** Blocheaza munca

---

### 4. Securitate

**Sursa:** CONCERNS.md "Security Considerations" + 01-02-SUMMARY.md

| Issue | Fisiere | Risc | Status |
|-------|---------|------|--------|
| No permission check | /invoices/[id]/cancel, /pay | CRITICA | Any authenticated user can cancel invoices |
| No permission check | /products/bulk, /sync-images | CRITICA | Bulk operations unprotected |
| No permission check | /sync/full | MEDIE | Full sync trigger by any user |
| Timing attack | webhooks/meta token compare | JOASA | String equality vulnerable |
| Credentials in POST body | Settings, courier setup | JOASA | HTTPS mitigates, but not ideal |
| No rate limiting | All sync endpoints | MEDIE | DoS possible |

**Probleme identificate in 01-02:**
- POST /api/invoices/[id]/cancel - **CRITICA** - Oricine autentificat poate anula facturi
- POST /api/invoices/[id]/pay - **CRITICA** - Oricine poate marca facturi ca platite
- POST /api/products/bulk - **CRITICA** - Bulk import fara verificare

**Prioritate:** Blocheaza munca (permission checks), Deranjaza (rate limiting)

---

### 5. Performanta

**Sursa:** CONCERNS.md "Performance Bottlenecks"

| Problema | Fisiere | Impact |
|----------|---------|--------|
| N+1 queries | orders/page.tsx, products/page.tsx | Pagini incete pe volume mari |
| Sync operations blocante | /sync, /sync/full | Request timeout pe datasets mari |
| Backup fara paginare | /api/backup | Memory overflow posibil |
| Permission queries repetate | permissions.ts | Overhead pe fiecare request |

**Detalii N+1:**
- 100 comenzi = 1 query baza + 300+ query-uri pentru relatii
- Cauza: Prisma relations incarcate individual per row in React

**Prioritate:** Deranjaza (N+1 queries afecteaza UX pe volume mari)

---

### 6. Dependente

**Sursa:** CONCERNS.md "Dependencies at Risk"

| Dependenta | Versiune | Problema |
|------------|----------|----------|
| NextAuth.js | v4.24.7 | **Out of support** - v5 e current |
| Prisma | v5.10.2 | OK, dar major upgrades necesita atentie |
| iconv-lite | v0.6.3 | Deprecated, alternative disponibile |
| Vitest | v4.0.17 | Old relative to current |

**Prioritate:** Deranjaza (NextAuth upgrade should be planned)

---

### 7. Test Coverage Gaps

**Sursa:** CONCERNS.md "Test Coverage Gaps"

| Ce lipseste | Prioritate | Risc |
|-------------|------------|------|
| OAuth state lifecycle tests | HIGH | Memory leaks, race conditions |
| Multi-store RBAC integration tests | HIGH | Permission bypass possible |
| Order processing flow tests | HIGH | Partial failures undetected |
| Concurrent sync tests | MEDIUM | Race conditions |
| Webhook signature validation tests | HIGH | Forged webhooks |

**Prioritate:** Deranjaza (afecteaza increderea in cod)

---

## Prioritizare

### Legenda

| Nivel | Descriere | Actiune |
|-------|-----------|---------|
| **Blocheaza munca** | Cauzeaza erori in productie, date gresite, securitate compromisa | Fix imediat (Phase 2-5) |
| **Deranjaza** | Incetineste development, UX rau, risc potential | Fix planificat |
| **Cosmetic** | Nice-to-have, cleanup code | Low priority |

### Tabel Prioritizat

| ID | Issue | Categorie | Impact | Prioritate |
|----|-------|-----------|--------|------------|
| TD-01 | Order processing no transaction | Integritate Date | Facturi fara AWB, date inconsistente | **Blocheaza munca** |
| TD-02 | Invoice cancel/pay no permission | Securitate | Oricine poate anula facturi | **Blocheaza munca** |
| TD-03 | Products bulk no permission | Securitate | Bulk import unprotected | **Blocheaza munca** |
| TD-04 | Invoice series edge cases | Facturare | Numar gresit pe facturi | **Blocheaza munca** |
| TD-05 | Orders/process no Zod validation | Validare | Crash pe input malformat | Deranjaza |
| TD-06 | N+1 queries in lists | Performanta | Pagini incete | Deranjaza |
| TD-07 | NextAuth v4 out of support | Dependente | Security vulnerabilities | Deranjaza |
| TD-08 | FanCourier token no expiration check | Integrare | AWB failures silente | Deranjaza |
| TD-09 | No rate limiting | Securitate | DoS possible | Deranjaza |
| TD-10 | Monolithic orders/page.tsx | Mentenanta | Development lent | Deranjaza |
| TD-11 | Missing RBAC integration tests | QA | Permission bugs | Deranjaza |
| TD-12 | Sync operations blocante | Performanta | Request timeout | Deranjaza |
| TD-13 | Timing attack webhook token | Securitate | Low probability exploit | Cosmetic |
| TD-14 | Debug OAuth always enabled | Securitate | Logs leaking state | Cosmetic |
| TD-15 | Monolithic meta-ads.ts | Mentenanta | Status neclar | Cosmetic |

---

## Recomandari pe Faze

### Phase 2 (Invoice Series Fix)
- **TD-04** - Invoice series edge cases - FIX PRIORITAR

### Phase 4 (Validation/Error Handling)
- **TD-01** - Transaction handling pentru order processing
- **TD-05** - Zod validation pe orders/process

### Phase 5 (Technical Debt)
- **TD-02, TD-03** - Permission checks lipsa
- **TD-06** - N+1 queries (Prisma include optimization)
- **TD-08** - FanCourier token refresh logic
- **TD-09** - Rate limiting implementare

### Phase 6 (Testing)
- **TD-11** - RBAC integration tests

### Backlog (dupa core phases)
- **TD-07** - NextAuth upgrade (breaking changes, planificare separata)
- **TD-10** - Orders page refactor (dupa stabilizare functionalitate)

---

## Note

### Probleme NOI din Audit (nu in CONCERNS.md initial)

1. **Permission gaps pe endpoints noi** - Descoperite in 01-02:
   - /invoices/[id]/cancel, /pay
   - /products/bulk, /sync-images
   - /sync/full

2. **Trendyol integration status** - Cod extins (1400+ linii), status utilizare neclar

3. **Ads module status** - 2536 linii meta-ads.ts, dar usage necunoscut

### Legatura cu Dead Code

- FreshSales si BaseLinker sunt CONFIRMATE pentru stergere (nu in src/)
- Ads si Trendyol - asteptam confirmare user inainte de actiune

---

*Generat: 2026-01-23*
*Sursa: CONCERNS.md + Phase 1 Audit (01-01, 01-02, 01-03)*
