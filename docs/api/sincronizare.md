# API Sincronizare

Endpoint-uri pentru sincronizarea datelor cu sisteme externe: Shopify (comenzi), FanCourier (AWB-uri) si sincronizare completa cu istoric.

**Fisiere sursa:**
- `src/app/api/sync/route.ts`
- `src/app/api/sync/full/route.ts`
- `src/app/api/sync/bilateral/route.ts`

---

## Concepte

### Tipuri de sincronizare

1. **Sincronizare rapida** (`/api/sync`) - Importa comenzi din Shopify + actualizeaza statusuri AWB din FanCourier
2. **Sincronizare completa** (`/api/sync/full`) - Sincronizare cu logging detaliat si istoric. Suporta si sincronizare per comanda
3. **Sincronizare bilaterala** (`/api/sync/bilateral`) - Doar AWB-uri (sincronizarea facturilor este dezactivata)

### Sesiune de sincronizare (SyncLog)

Fiecare sincronizare completa creeaza un `SyncLog` cu:
- **Tip:** `MANUAL` (triggerata de utilizator) sau `CRON` (automata)
- **Status:** `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`
- **Entries:** Log-uri detaliate per operatie (comenzi, AWB-uri, erori)

### Pasii sincronizarii rapide

1. **Comenzi Shopify** - Importa comenzi noi/actualizate din toate store-urile
2. **Facturi** - Dezactivat (credentiale Oblio sunt per firma)
3. **AWB-uri FanCourier** - Actualizeaza statusurile AWB-urilor active

---

## POST /api/sync

Ruleaza sincronizarea rapida: comenzi Shopify + AWB-uri FanCourier.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `sync.run`

### Raspuns (200)

```json
{
  "synced": 15,
  "stores": [
    {
      "store": "Magazin Principal",
      "synced": 10,
      "errors": 0
    },
    {
      "store": "Magazin Secundar",
      "synced": 5,
      "errors": 0
    }
  ],
  "bilateral": {
    "invoices": null,
    "awbs": {
      "checked": 150,
      "updated": 25,
      "statusChanges": 25,
      "errors": 0
    },
    "changes": [
      {
        "type": "awb",
        "awbNumber": "2024123456789",
        "oldStatus": "In tranzit",
        "newStatus": "Livrat"
      }
    ]
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 401 | `Neautorizat` |
| 403 | `Nu ai permisiunea necesară` |
| 500 | `Eroare la sincronizare: ...` |

---

## POST /api/sync/full

Ruleaza sincronizarea completa cu logging detaliat si salvare in istoric.

### Request Body

```typescript
{
  orderId?: string;   // Optional - sincronizeaza doar o comanda specifica
}
```

### Flux

**Fara `orderId`:**
1. Creeaza sesiune `SyncLog` cu tip `MANUAL`
2. Importa comenzi din Shopify
3. Actualizeaza AWB-uri din FanCourier
4. Verifica facturi
5. Logheaza fiecare operatie ca `SyncLogEntry`
6. Calculeaza rezumat (comenzi procesate, AWB-uri actualizate, erori)
7. Finalizeaza sesiunea cu status si durata

**Cu `orderId`:**
- Sincronizeaza doar comanda specificata

### Raspuns (200)

```json
{
  "success": true,
  "syncLogId": "sync-uuid",
  "ordersProcessed": 15,
  "awbsUpdated": 25,
  "invoicesChecked": 0,
  "errorsCount": 0,
  "durationMs": 5200,
  "status": "COMPLETED"
}
```

### Statusuri rezultat

| Status | Conditie |
|--------|----------|
| `COMPLETED` | Zero erori |
| `COMPLETED_WITH_ERRORS` | Au fost erori dar si operatii reussite |
| `FAILED` | Nicio operatie reussita |

---

## GET /api/sync/full

Returneaza istoricul sincronizarilor sau detaliile unei sesiuni specifice.

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `id` | string | - | UUID sesiune (returneaza detalii) |
| `limit` | number | `20` | Numar sesiuni in istoric |

### Raspuns - Istoric (200)

```json
{
  "history": [
    {
      "id": "sync-uuid",
      "type": "MANUAL",
      "status": "COMPLETED",
      "startedAt": "2026-02-18T10:00:00.000Z",
      "completedAt": "2026-02-18T10:00:05.200Z",
      "ordersProcessed": 15,
      "awbsUpdated": 25,
      "invoicesChecked": 0,
      "errorsCount": 0
    }
  ]
}
```

### Raspuns - Detalii sesiune (200)

```json
{
  "id": "sync-uuid",
  "type": "MANUAL",
  "status": "COMPLETED",
  "startedAt": "2026-02-18T10:00:00.000Z",
  "completedAt": "2026-02-18T10:00:05.200Z",
  "ordersProcessed": 15,
  "awbsUpdated": 25,
  "entries": [
    {
      "id": "entry-uuid",
      "level": "INFO",
      "action": "SYNC_STARTED",
      "message": "Sesiune de sincronizare MANUAL începută",
      "orderId": null,
      "orderNumber": null,
      "awbNumber": null,
      "invoiceNumber": null,
      "details": { "type": "MANUAL" },
      "createdAt": "2026-02-18T10:00:00.000Z"
    },
    {
      "id": "entry-uuid-2",
      "level": "INFO",
      "action": "AWB_STATUS_CHANGED",
      "message": "Status AWB schimbat: In tranzit -> Livrat",
      "awbNumber": "2024123456789",
      "details": {
        "oldStatus": "In tranzit",
        "newStatus": "Livrat"
      }
    }
  ]
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 404 | `Sesiunea de sincronizare nu a fost găsită` |

---

## POST /api/sync/bilateral

Ruleaza sincronizarea bilaterala (doar AWB-uri - sincronizarea facturilor este dezactivata).

### Request Body

```typescript
{
  type?: "awbs" | "invoices" | "all";  // Default: "all"
}
```

**Nota:** Indiferent de valoarea `type`, sincronizarea facturilor este dezactivata (credentialele Oblio sunt configurate per firma). Doar AWB-urile FanCourier sunt sincronizate.

### Raspuns (200)

```json
{
  "success": true,
  "timestamp": "2026-02-18T10:00:05.200Z",
  "results": {
    "invoices": {
      "message": "Sincronizare facturi dezactivată - folosește facturare per firmă",
      "checked": 0,
      "updated": 0
    },
    "awbs": {
      "checked": 150,
      "updated": 25,
      "statusChanges": 25,
      "errors": 0,
      "details": [
        {
          "awbNumber": "2024123456789",
          "oldStatus": "In tranzit",
          "newStatus": "Livrat"
        }
      ]
    }
  }
}
```

---

## GET /api/sync/bilateral

Returneaza informatii despre utilizarea endpoint-ului.

### Raspuns (200)

```json
{
  "message": "Folosește POST pentru a iniția sincronizarea bilaterală",
  "options": {
    "type": "'awbs' | 'all' (sincronizare facturi dezactivată)"
  }
}
```
