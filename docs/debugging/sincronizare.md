# Debugging Sincronizare

Documentatie pentru debugging-ul proceselor de sincronizare (sync orders, AWB tracking, etc.).

Fisiere principale:
- `src/lib/sync-service.ts` - Serviciu de sincronizare
- `src/lib/cron-lock.ts` - Mecanismul de lock pentru cron-uri
- `src/lib/shopify.ts` - Client Shopify pentru import comenzi

## Mecanismul Cron Lock

### Cum functioneaza

Cron-urile folosesc un sistem de lock bazat pe baza de date pentru a preveni executia concurenta. Implementarea e in `src/lib/cron-lock.ts`.

**Tabela `CronLock`**:
```sql
CREATE TABLE "CronLock" (
  "jobName" VARCHAR(100) PRIMARY KEY,
  "lockId" VARCHAR(100) NOT NULL,
  "lockedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL
)
```

**Flux**:
1. `acquireCronLock(jobName, ttlMs)` - Incearca sa obtina lock-ul
   - INSERT pe `jobName` cu `expiresAt = now + TTL`
   - ON CONFLICT: update doar daca lock-ul existent e EXPIRAT
   - Returneaza `{ acquired: true, lockId }` sau `{ acquired: false }`

2. Job-ul ruleaza

3. `releaseCronLock(jobName, lockId)` - Elibereaza lock-ul
   - DELETE din `CronLock` unde `jobName` si `lockId` se potrivesc
   - Nu sterge lock-ul altui proces (race condition safe)

### TTL (Time To Live)

- Default: **10 minute** (`DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000`)
- Dupa expirarea TTL-ului, un alt proces poate obtine lock-ul
- Previne situatia in care un crash lasa lock-ul blocat permanent

### Lock blocat (stale lock)

**Simptom**: Job-ul logheaza "Job already running since [timestamp]" dar timestamp-ul e vechi.

**Cauze**:
- Procesul anterior a crash-uit fara sa elibereze lock-ul
- TTL-ul nu a expirat inca

**Solutie**:
```sql
-- Verifica lock-urile active
SELECT * FROM "CronLock";

-- Sterge un lock blocat manual
DELETE FROM "CronLock" WHERE "jobName" = 'sync-orders';

-- Sterge toate lock-urile expirate
DELETE FROM "CronLock" WHERE "expiresAt" < NOW();
```

Sau din cod cu `cleanupExpiredLocks()` (`src/lib/cron-lock.ts` linia 172-185).

### Utilizare cu `withCronLock`

Helper-ul `withCronLock` (`src/lib/cron-lock.ts` linia 124-147) gestioneaza automat acquire + release:

```typescript
const result = await withCronLock('sync-orders', async () => {
  // Codul cron-ului
  return await runFullSync('SCHEDULED');
});

if (result.skipped) {
  console.log('Job deja in curs:', result.reason);
}
```

## Sincronizare Completa (Full Sync)

### Ce face `runFullSync()`

Fisier: `src/lib/sync-service.ts` linia 127-265

1. **Creeaza sesiune de sync** - Inregistrare in tabela `SyncLog`
2. **Obtine comenzile** active din baza de date (cu AWB sau factura, excluse cele finalizate >30 zile)
3. **Initializeaza FanCourier** cu credentialele din Settings
4. **Proceseaza fiecare comanda**:
   - Sincronizeaza statusul AWB (daca exista)
   - Verifica statusul facturii (daca exista)
5. **Finalizeaza sesiunea** cu statistici

### Filtrarea comenzilor

Sunt sincronizate doar comenzile care:
- Au AWB SAU factura
- NU sunt in status final (DELIVERED/RETURNED/CANCELLED) mai vechi de 30 zile

```typescript
// src/lib/sync-service.ts linia 139-158
where: {
  OR: [
    { awb: { isNot: null } },
    { invoices: { some: {} } },
  ],
  NOT: {
    AND: [
      { status: { in: ["DELIVERED", "RETURNED", "CANCELLED"] } },
      { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    ],
  },
}
```

### Detectarea schimbarilor AWB

Functia `detectAWBChangeType` (`src/lib/sync-service.ts` linia 270-387) determina ce s-a intamplat cu un AWB:

| changeType | Cand | Severitate |
|-----------|------|------------|
| `NEW_STATUS` | Statusul s-a schimbat | info |
| `DELIVERED` | Cod S1/S2 sau text "livrat" | success |
| `RETURNED` | Cod S3-S51 sau text "retur"/"refuz" | warning |
| `CANCELLED` | Cod A0-A3 sau text "anulat" | warning |
| `DELETED` | AWB negasit dar avea status anterior | warning |
| `ERROR` | Eroare la tracking (posibil temporara) | warning |
| `PENDING` | Fara evenimente (nou/in asteptare) | info |
| `NO_CHANGE` | Nimic schimbat | info |

### Sesiuni de Sincronizare (SyncLog)

Fiecare sincronizare creaza o inregistrare in `SyncLog` cu:
- `type`: MANUAL sau SCHEDULED
- `status`: RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED
- `ordersProcessed`, `awbsUpdated`, `invoicesChecked`, `errorsCount`
- `summary`: Rezumat text
- `durationMs`: Durata in milisecunde

Intrari detaliate in `SyncLogEntry`:
- `level`: INFO, WARNING, ERROR, SUCCESS
- `action`: SYNC_STARTED, ORDERS_FETCHED, AWB_SYNC_ERROR, etc.
- `orderId`, `orderNumber`, `awbNumber`, `invoiceNumber`
- `details`: JSON cu informatii suplimentare

## Import Comenzi Shopify

### Client Shopify

Fisier: `src/lib/shopify.ts`

Clientul Shopify foloseste API-ul REST (versiunea 2024-01):
```typescript
// src/lib/shopify.ts linia 134
baseURL: `https://${domain}/admin/api/2024-01`
```

### Obtinerea comenzilor

```typescript
// src/lib/shopify.ts linia 146-161
async getOrders(params?: {
  limit?: number;      // Default: 50
  status?: string;     // Default: "any"
  created_at_min?: string;
  since_id?: string;
})
```

### Erori frecvente Shopify

| Eroare | Cauza | Solutie |
|--------|-------|---------|
| 401 Unauthorized | Access token invalid | Regenereaza token-ul in Shopify Admin |
| 402 Payment Required | Plan Shopify expirat | Verifica abonamentul Shopify |
| 429 Too Many Requests | Rate limit (2 calls/sec) | Asteapta si incearca din nou |
| Timeout | Prea multe comenzi in request | Reduce `limit` sau filtreaza cu `created_at_min` |

### Duplicarea comenzilor

La importul comenzilor, se foloseste `shopifyId` ca identificator unic. Daca o comanda exista deja:
- Se actualizeaza datele existente
- Nu se creeaza un duplicat

## Webhook Delivery

### Cum functioneaza

Shopify trimite webhook-uri la endpoint-urile configurate cand apar schimbari (comanda noua, update, etc.).

### Probleme frecvente

**Webhook nu ajunge**:
- Verifica in Shopify Admin > Settings > Notifications > Webhooks
- Verifica ca URL-ul webhook-ului e corect si accesibil
- Shopify reincearca webhook-urile esuate de pana la 19 ori in 48 ore

**Webhook ajunge dar comanda nu apare**:
- Verifica Railway logs pentru erori la procesarea webhook-ului
- Posibil eroare de parsare sau validare a datelor

**Webhook duplicat**:
- Shopify poate trimite acelasi webhook de mai multe ori (at-least-once delivery)
- Aplicatia trebuie sa fie idempotenta (trateaza comenzi existente ca update)

## Re-sincronizare Manuala

### Din interfata

1. Mergi la pagina principala (Dashboard)
2. Click pe butonul "Sincronizeaza" sau "Sync"
3. Asteapta finalizarea (vezi progress in UI)

### Din API

```
POST /api/sync
```

Sau pentru sincronizare specifica:
```
POST /api/orders/process-all
```

### Din baza de date (urgenta)

Daca sync-ul e blocat:

```sql
-- 1. Sterge lock-ul cron
DELETE FROM "CronLock" WHERE "jobName" LIKE '%sync%';

-- 2. Verifica ultima sincronizare
SELECT * FROM "SyncLog" ORDER BY "startedAt" DESC LIMIT 5;

-- 3. Verifica erorile ultimei sincronizari
SELECT sle.* FROM "SyncLogEntry" sle
JOIN "SyncLog" sl ON sl.id = sle."syncLogId"
WHERE sl.id = (SELECT id FROM "SyncLog" ORDER BY "startedAt" DESC LIMIT 1)
AND sle.level = 'ERROR'
ORDER BY sle."createdAt";
```

## Tips de Debugging Sincronizare

1. **Verifica SyncLog** - Tabela `SyncLog` contine istoricul complet al sincronizarilor
2. **Verifica CronLock** - Lock-uri blocate previn rularea cron-urilor
3. **Loguri detaliate** - Fiecare comanda procesata e logata in `SyncLogEntry`
4. **Erori non-fatale** - O eroare la o comanda nu opreste sincronizarea celorlalte
5. **TTL lock** - Lock-urile expira automat dupa 10 minute
6. **Shopify rate limits** - Max 2 calls/secunda; webhook-urile nu au rate limit
