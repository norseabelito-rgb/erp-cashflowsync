# API: Sync - Audit

**Auditat:** 2026-01-23
**Base Path:** /api/sync
**Status:** Probleme Minore

## Rezumat

Sync API gestioneaza sincronizarea datelor intre sistemul ERP si serviciile externe (Shopify, FanCourier). Include endpoint-uri pentru sincronizare manuala, sincronizare completa (full sync) si sync bilateral.

## Endpoints

### POST /api/sync

| Aspect | Detalii |
|--------|---------|
| Scop | Sincronizare completa: Shopify orders + FanCourier AWBs |
| Auth | Da - sesiune NextAuth |
| Permisiune | `sync.run` |
| Body | (empty) |
| Response | `{ ...shopifyResult, bilateral: { invoices: null, awbs } }` |
| Validare | - |
| Side Effects | Sync comenzi Shopify, sync status AWB-uri FanCourier |
| Status | **PROBLEMA: blocheaza request handler** |

**Flux sincronizare:**
1. `syncAllStoresOrders()` - comenzi din Shopify
2. Invoice sync dezactivat (credentiale per firma)
3. `syncAWBsFromFanCourier()` - status AWB-uri

**PROBLEMA CRITICA - Referinta CONCERNS.md:**
> "Synchronization Operations Block Request Handler" - Sincronizarea ruleaza inline, blocand request-ul. Pentru multe comenzi/AWB-uri poate cauza timeout.

**Fisier sursa:** `src/app/api/sync/route.ts`

---

### POST /api/sync/full

| Aspect | Detalii |
|--------|---------|
| Scop | Sincronizare completa sau pentru o comanda specifica |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Body | `{ orderId? }` |
| Response | `{ success, ... }` |
| Validare | - |
| Side Effects | Ruleaza full sync sau sync single order |
| Status | **Problema: lipsa verificare permisiune** |

**Comportament:**
- Daca `orderId` prezent: `syncSingleOrder(orderId)`
- Altfel: `runFullSync("MANUAL")`

**Fisier sursa:** `src/app/api/sync/full/route.ts`

---

### GET /api/sync/full

| Aspect | Detalii |
|--------|---------|
| Scop | Istoric sincronizari sau detalii sesiune specifica |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Parametri Query | `id?` - UUID sesiune sync, `limit` - default 20 |
| Response | `{ history[] }` sau detalii sesiune |
| Validare | - |
| Status | **Problema: lipsa verificare permisiune** |

**Fisier sursa:** `src/app/api/sync/full/route.ts`

---

### POST /api/sync/bilateral

| Aspect | Detalii |
|--------|---------|
| Scop | Sincronizare bilaterala (local -> extern si extern -> local) |
| Auth | Da - sesiune NextAuth |
| Permisiune | `sync.run` |
| Body | (empty) |
| Response | `{ success, awbs }` |
| Validare | - |
| Side Effects | Sync bidirectional AWB-uri |
| Status | OK |

**Note:**
- Facturis bilateral sync dezactivat (nu suporta API bilateral)
- Doar FanCourier AWB sync implementat

**Fisier sursa:** `src/app/api/sync/bilateral/route.ts`

---

## Servicii de Sincronizare

### Shopify Sync

| Sursa | Destinatie | Trigger | Frecventa |
|-------|-----------|---------|-----------|
| Shopify Orders | Local Orders | Manual / Cron | La cerere |
| Shopify Products | Local Products | Manual | La cerere |

**Implementare:** `src/lib/shopify.ts` -> `syncAllStoresOrders()`

### FanCourier Sync

| Sursa | Destinatie | Trigger | Frecventa |
|-------|-----------|---------|-----------|
| Local AWB | FanCourier (creare) | La procesare comanda | Imediat |
| FanCourier Status | Local AWB | Manual / Cron | La cerere |

**Implementare:** `src/lib/fancourier.ts` -> `syncAWBsFromFanCourier()`

### Facturis Sync

**Status: DEZACTIVAT**
- Motivatie: Credentiale sunt per firma, nu global
- Nu exista API bilateral pentru Facturis

---

## Observatii de Securitate

1. **Lipsa verificare permisiuni:**
   - `/sync/full` GET/POST - poate fi apelat de orice user autentificat
   - Necesita adaugare `hasPermission(session.user.id, "sync.run")`

2. **Rate limiting:**
   - Lipsa rate limiting pe endpoint-uri de sync
   - User poate triggera sync-uri multiple simultan

## Probleme de Performanta

**CRITICA - Referinta CONCERNS.md:**
> "Synchronization Operations Block Request Handler"

**Problema:**
- `/api/sync`, `/api/sync/full` ruleaza inline
- Pentru 100+ comenzi/AWB-uri, sync-ul dureaza minute
- Request-ul ramane deschis tot timpul
- Poate cauza timeout la nivel de gateway/CDN

**Recomandare:**
- Implementeaza job queue (Bull, Agenda, sau cron-based)
- Returneaza job ID imediat
- Poll pentru status sau push notifications

---

## Cron Jobs Relationati

Sync-ul poate fi triggerrat si de cron jobs:

| Cron Job | Endpoint | Frecventa |
|----------|----------|-----------|
| /api/cron/sync-orders | syncAllStoresOrders() | La interval |
| /api/cron/sync-awb-status | syncAWBsFromFanCourier() | La interval |

**Vezi:** `src/app/api/cron/` pentru implementare cron.

---

## Model de Date

```typescript
SyncLog {
  id: string
  type: string  // "MANUAL" | "CRON"
  status: string  // "running" | "completed" | "failed"
  startedAt: DateTime
  completedAt: DateTime | null
  ordersChecked: number
  ordersSynced: number
  errors: string[]
  details: JSON | null
}
```

---

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| Synchronization Operations Block Request Handler | /sync, /sync/full | CRITICA |
| No Rate Limiting on API Endpoints | Toate | MEDIE |

---

*Auditat: 2026-01-23*
