# API: Remaining Endpoints - Audit

**Auditat:** 2026-01-23
**Status:** Overview

## Rezumat

Acest document acopera toate endpoint-urile API ramase care nu au fost documentate detaliat in celelalte fisiere de audit. Include: activitate, admin, auth, backup, categorii, canale, companii, cron, inventar, RBAC, setari, si altele.

---

## Activity API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/activity | Lista activitati/log-uri | Da | Partial |

**Fisiere:** `src/app/api/activity/route.ts`

---

## Admin API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| POST /api/admin/migrate-warehouse | Migrare date warehouse | Da | - |
| POST /api/admin/sync-warehouse-stock | Sync stocuri warehouse | Da | - |

**Note:** Endpoint-uri administrative pentru migrari de date.

---

## Auth API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET/POST /api/auth/[...nextauth] | NextAuth handlers | - | NextAuth |
| POST /api/auth/signup | Inregistrare user nou | Nu | Manual |

**Note:** NextAuth v4.24.7 - out of support, necesita upgrade.

---

## Backup API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/backup | Export date backup JSON | Da | - |
| POST /api/backup/restore | Restore din backup | Da | - |

**PROBLEMA - Referinta CONCERNS.md:**
> "Unoptimized Database Queries for Bulk Operations" - Incarca toate datele in memorie fara paginare.

---

## Categories API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/categories | Lista categorii | Da | - |
| POST /api/categories | Creare categorie | Da | Manual |
| PUT /api/categories/[id] | Update categorie | Da | Manual |
| DELETE /api/categories/[id] | Stergere categorie | Da | Manual |

**Note:** Include suport pentru mapare Trendyol categories.

---

## Channels API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/channels | Lista canale de vanzare | Da | - |
| POST /api/channels | Creare canal | Da | Manual |

**Note:** Canale = Shopify stores, Trendyol, etc.

---

## Companies API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/companies | Lista companii | Da | - |
| POST /api/companies | Creare companie | Da | Manual |
| GET /api/companies/[id] | Detalii companie | Da | - |
| PUT /api/companies/[id] | Update companie | Da | Manual |
| DELETE /api/companies/[id] | Stergere companie | Da | - |
| GET /api/companies/lookup-cui | Cautare firma dupa CUI (ANAF) | Da | - |

**Note:** Companii = entitati juridice cu configurari Facturis separate.

---

## Cron API

| Endpoint | Scop | Auth | Frecventa |
|----------|------|------|-----------|
| /api/cron/ads-alerts | Procesare alerte ads | Cron token | - |
| /api/cron/ads-rollback | Rollback ads sync | Cron token | - |
| /api/cron/ads-sync | Sync campanii ads | Cron token | - |
| /api/cron/ai-analysis | Analiza AI comenzi | Cron token | - |
| /api/cron/backup | Backup automat | Cron token | Daily |
| + altele | Sync orders, AWB status, etc. | Cron token | - |

**Note:** Toate endpoint-urile cron ar trebui protejate cu CRON_SECRET.

---

## Goods Receipts API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/goods-receipts | Lista receptii marfa | Da | - |
| POST /api/goods-receipts | Creare receptie | Da | Manual |
| GET /api/goods-receipts/[id] | Detalii receptie | Da | - |
| PUT /api/goods-receipts/[id] | Update receptie | Da | Manual |

**Note:** Gestionare receptii de la furnizori.

---

## Handover API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/handover/not-handed | Colete nepredate | Da | - |
| POST /api/handover/finalize | Finalizare predare | Da | Manual |
| GET /api/handover/report | Raport predare | Da | - |
| POST /api/handover/reopen | Redeschide predare | Da | Manual |
| GET /api/handover/c0-alerts | Alerte C0 | Da | - |

**Note:** Gestionare predare colete catre curier.

---

## Health API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/health | Health check | Nu | - |

**Note:** Endpoint pentru monitoring, returneaza status OK.

---

## Intercompany API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/intercompany/preview | Preview facturi intercompany | Da | - |
| POST /api/intercompany/generate | Genereaza facturi intercompany | Da | Manual |
| GET /api/intercompany/invoices | Lista facturi intercompany | Da | - |

**Note:** Facturare intre companiile din grup.

---

## Inventory API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/inventory | Lista inventar | Da | - |
| POST /api/inventory/full | Full inventory sync | Da | - |

---

## Inventory Items API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/inventory-items | Lista articole inventar | Da | OK |
| POST /api/inventory-items | Creare articol | Da | Manual |
| GET /api/inventory-items/[id] | Detalii articol | Da | - |
| PUT /api/inventory-items/[id] | Update articol | Da | Manual |
| DELETE /api/inventory-items/[id] | Stergere articol | Da | - |
| POST /api/inventory-items/bulk-delete | Stergere bulk | Da | Manual |
| GET /api/inventory-items/export | Export CSV | Da | - |
| POST /api/inventory-items/import | Import CSV | Da | - |
| GET /api/inventory-items/low-stock-alerts | Alerte stoc scazut | Da | - |

---

## Notifications API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/notifications | Lista notificari user | Da | - |
| PUT /api/notifications | Marcheaza citite | Da | - |

---

## Picking API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/picking | Lista picking lists | Da | - |
| POST /api/picking | Creare picking list | Da | Manual |
| GET /api/picking/[id] | Detalii picking list | Da | - |
| PUT /api/picking/[id] | Update picking (progress) | Da | Manual |
| GET /api/picking/aggregate | Agregare produse | Da | - |
| GET /api/picking/logs | Istoric picking | Da | - |

---

## Print API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/printers | Lista imprimante | Da | - |
| POST /api/printers | Inregistrare imprimanta | Da | Manual |
| GET /api/printers/[id] | Detalii imprimanta | Da | - |
| DELETE /api/printers/[id] | Stergere imprimanta | Da | - |
| GET /api/print-jobs | Lista joburi printare | Da | - |
| PUT /api/print-jobs | Update status job | Da | - |
| GET /api/print-client/connect | Connect print client (SSE) | Da | - |
| GET /api/print-client/job | Next job for printer | Da | - |
| GET /api/print-client/jobs | Jobs for printer | Da | - |
| GET /api/print-client/document | Download document pt. printare | Da | - |

---

## Processing Errors API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/processing-errors | Lista erori procesare comenzi | Da | - |

**Note:** Erori salvate din /orders/process si /orders/process-all.

---

## RBAC API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/rbac/roles | Lista roluri | Da | - |
| POST /api/rbac/roles | Creare rol | Da | Manual |
| GET /api/rbac/permissions | Lista permisiuni | Da | - |
| GET /api/rbac/groups | Lista grupuri utilizatori | Da | - |
| POST /api/rbac/invitations | Trimite invitatie | Da | Manual |
| GET /api/rbac/audit | Audit log RBAC | Da | - |

**PROBLEMA - Referinta CONCERNS.md:**
> "No Integration Tests for Multi-Store RBAC" - RBAC logic complex fara teste.

---

## Settings API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/settings | Citire setari globale | Da | - |
| PUT /api/settings | Update setari | Da | Manual |
| POST /api/settings/test-fancourier | Test conexiune FanCourier | Da | - |

**PROBLEMA - Referinta CONCERNS.md:**
> "Missing Input Validation in API Routes" - nu valideaza setarile cu schema Zod.

---

## Stats API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/stats | Dashboard stats (comenzi, facturi, etc.) | Da | - |

---

## Stock API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/stock/movements | Miscari stoc | Da | - |
| POST /api/stock/sync | Sync stocuri | Da | - |

---

## Stores API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/stores | Lista magazine | Da | - |
| POST /api/stores | Creare magazin | Da | Manual |
| GET /api/stores/[id] | Detalii magazin | Da | - |
| PUT /api/stores/[id] | Update magazin | Da | Manual |
| DELETE /api/stores/[id] | Stergere magazin | Da | - |

**Note:** Magazine = Shopify stores conectate.

---

## Suppliers API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/suppliers | Lista furnizori | Da | - |
| POST /api/suppliers | Creare furnizor | Da | Manual |

---

## Tracking API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/tracking | Status tracking AWB | Da | - |
| POST /api/tracking/refresh | Refresh status | Da | - |

**Note:** Tracking public pentru clienti.

---

## Transfers API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/transfers | Lista transferuri inter-warehouse | Da | - |
| POST /api/transfers | Creare transfer | Da | Manual |
| GET /api/transfers/[id] | Detalii transfer | Da | - |
| PUT /api/transfers/[id] | Update transfer | Da | Manual |

---

## Upload API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| POST /api/upload | Upload fisiere | Da | - |
| GET /api/upload/[...path] | Serve fisiere uploadate | Da | - |

---

## User API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/user/profile | Profil user curent | Da | - |
| PUT /api/user/profile | Update profil | Da | Manual |
| GET /api/user/preferences | Preferinte user | Da | - |
| PUT /api/user/preferences | Update preferinte | Da | Manual |

---

## Warehouses API

| Endpoint | Scop | Auth | Validare |
|----------|------|------|----------|
| GET /api/warehouses | Lista depozite | Da | - |
| POST /api/warehouses | Creare depozit | Da | Manual |
| GET /api/warehouses/[id] | Detalii depozit | Da | - |
| PUT /api/warehouses/[id] | Update depozit | Da | Manual |
| DELETE /api/warehouses/[id] | Stergere depozit | Da | - |

---

## Dead Code Candidates

Pe baza CONCERNS.md si CONTEXT.md, urmatoarele pot fi cod mort:

| API/Feature | Status | Motiv |
|-------------|--------|-------|
| FreshSales integration | MORT | User confirmat ca nu foloseste |
| BaseLinker integration | MORT | User confirmat ca nu foloseste |
| AI Analysis cron | NECLAR | Trebuie verificat daca e activ |
| Ads module | NECLAR | Cod extins dar folosinta necunoscuta |

---

## Observatii Generale

### Validare

**Status validare per categorie:**

| Categorie | Status |
|-----------|--------|
| Core business (orders, invoices, products) | Manual (ar trebui Zod) |
| Settings/Config | **Lipsa** |
| CRUD auxiliar (categories, suppliers, etc.) | Manual |
| Webhooks | Signature verification OK |

### Permisiuni

**Endpoint-uri fara verificare explicita permisiuni:**
- Multe GET-uri verifica doar autentificare, nu permisiune specifica
- Ar trebui adaugat permission check pentru operatii sensibile

### Rate Limiting

**Status:** Lipsa pe toate endpoint-urile

---

## Statistici

| Metrica | Valoare |
|---------|---------|
| Total directoare API | 44 |
| Endpoint-uri documentate detaliat | ~50 (in orders, invoices, products, awb, sync, integrations) |
| Endpoint-uri documentate sumar | ~100+ |
| Cu Zod validation | ~5% |
| Cu rate limiting | 0% |

---

*Auditat: 2026-01-23*
