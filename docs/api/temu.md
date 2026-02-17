# API Temu

Documentatie pentru endpoint-urile de integrare cu marketplace-ul Temu: magazine, comenzi, sincronizare si statistici.

**Surse**: `src/app/api/temu/`

---

## Cuprins

- [Magazine Temu](#magazine-temu)
- [Comenzi Temu](#comenzi-temu)
- [Sincronizare](#sincronizare)
- [Statistici](#statistici)

---

## Magazine Temu

**Sursa**: `src/app/api/temu/stores/route.ts`, `src/app/api/temu/stores/[id]/route.ts`

### GET /api/temu/stores

Lista tuturor magazinelor Temu (fara secrete expuse).

**Permisiuni**: `settings.view`

**Raspuns** (200):
```json
{
  "stores": [
    {
      "id": "temu1",
      "name": "Magazin Temu EU",
      "appKey": "app_123...",
      "accessToken": "token_abc...",
      "accessTokenExpiry": "2025-05-18T10:00:00.000Z",
      "region": "EU",
      "currencyRate": 5.0,
      "invoiceSeriesName": "TMU",
      "isActive": true,
      "hasApiCredentials": true,
      "hasWebhookSecret": false,
      "company": { "id": "c1", "name": "SC Firma SRL" },
      "_count": { "orders": 100 }
    }
  ]
}
```

### POST /api/temu/stores

Creeaza un magazin Temu nou. Calculeaza automat expirarea token-ului (3 luni de la creare).

**Permisiuni**: `settings.edit`

**Body**:
```typescript
{
  name: string;              // Obligatoriu
  appKey: string;            // Obligatoriu, unic
  appSecret: string;         // Obligatoriu
  accessToken: string;       // Obligatoriu
  companyId: string;         // Obligatoriu
  region?: string;           // Default: "EU"
  currencyRate?: number;     // Curs conversie
  invoiceSeriesName?: string;
  webhookSecret?: string;
}
```

**Raspuns** (201):
```json
{
  "store": { "id": "temu1", "name": "...", "..." },
  "message": "Magazin Temu adaugat cu succes",
  "success": true
}
```

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Campuri obligatorii: name, appKey, appSecret, accessToken, companyId` |
| 400 | `Firma selectata nu exista` |
| 409 | `Acest App Key este deja configurat` |

### GET /api/temu/stores/{id}

Detalii magazin Temu.

**Permisiuni**: `settings.view`

### PATCH /api/temu/stores/{id}

Actualizeaza un magazin Temu.

**Permisiuni**: `settings.edit`

**Body** (toate campurile optionale):
```typescript
{
  name?: string;
  appKey?: string;
  appSecret?: string;           // Doar daca este furnizat (nu gol)
  accessToken?: string;         // Doar daca este furnizat (nu gol)
  accessTokenExpiry?: string;   // ISO date
  webhookSecret?: string;
  region?: string;
  currencyRate?: number;
  invoiceSeriesName?: string;
  isActive?: boolean;
  companyId?: string;
}
```

### DELETE /api/temu/stores/{id}

Sterge un magazin Temu. Nu se poate sterge daca are comenzi asociate.

**Permisiuni**: `settings.edit`

**Erori**:
| Status | Mesaj |
|--------|-------|
| 400 | `Magazinul are X comenzi asociate. Stergerea nu este permisa.` |
| 404 | `Magazinul Temu nu a fost gasit` |

---

## Comenzi Temu

**Sursa**: `src/app/api/temu/orders/route.ts`

### GET /api/temu/orders

Lista comenzilor Temu cu paginare, filtre si date relationate (line items, facturi, AWB, magazin).

**Permisiuni**: `orders.view`

**Query params**:
| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | 1 | Pagina curenta |
| `limit` | number | 50 | Rezultate per pagina |
| `status` | string | - | Filtru status (sau "all") |
| `storeId` | string | - | Filtru magazin Temu (sau "all") |
| `startDate` | ISO string | - | Data start |
| `endDate` | ISO string | - | Data sfarsit |
| `search` | string | - | Cautare in numar comanda, nume/telefon/email client |

**Raspuns** (200):
```json
{
  "success": true,
  "orders": [
    {
      "id": "ord1",
      "shopifyOrderNumber": "TEMU-12345",
      "customerFirstName": "Client",
      "customerLastName": "Temu",
      "customerEmail": "client@email.com",
      "customerPhone": "+40712345678",
      "status": "VALIDATED",
      "totalPrice": 149.99,
      "source": "temu",
      "createdAt": "2025-02-18T10:00:00.000Z",
      "lineItems": [
        {
          "title": "Produs Temu",
          "quantity": 2,
          "price": 74.99,
          "masterProduct": { "id": "mp1", "sku": "SKU-001", "title": "Produs Local" }
        }
      ],
      "invoice": {
        "id": "inv1",
        "invoiceNumber": "TMU-0001",
        "invoiceSeriesName": "TMU",
        "status": "issued",
        "oblioId": "12345"
      },
      "awb": {
        "id": "awb1",
        "awbNumber": "2900123456",
        "currentStatus": "IN_TRANSIT"
      },
      "temuOrder": {
        "temuStore": { "id": "temu1", "name": "Magazin EU", "region": "EU" }
      },
      "store": { "id": "s1", "name": "Virtual Store Temu" },
      "internalStatus": { "id": "is1", "name": "In procesare", "color": "#FFA500" }
    }
  ],
  "temuStores": [
    { "id": "temu1", "name": "Magazin EU", "region": "EU" }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 100,
    "totalPages": 2
  }
}
```

### POST /api/temu/orders

Sincronizeaza comenzile din API-ul Temu.

**Permisiuni**: `orders.edit`

**Body**:
```typescript
{
  action: "sync";              // Obligatoriu
  storeId?: string;            // Optional - un singur magazin
  startDate?: string;          // ISO date (default: ultimele 7 zile)
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "synced": 15,
  "created": 10,
  "updated": 5,
  "errors": []
}
```

---

## Sincronizare

**Sursa**: `src/app/api/temu/sync/route.ts`

### POST /api/temu/sync

Sincronizare avansata a comenzilor Temu cu mai multe optiuni.

**Permisiuni**: `orders.create` sau `orders.edit`

**Body**:
```typescript
{
  storeId?: string;            // Optional - magazin specific
  startDate?: string;          // ISO date (default: -7 zile)
  endDate?: string;            // ISO date (default: acum)
  syncUnlinked?: boolean;      // true = doar sincronizeaza TemuOrders existente fara Order
}
```

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Sincronizare completata: 25 comenzi din 2 magazine",
  "summary": {
    "stores": 2,
    "synced": 25,
    "created": 20,
    "updated": 5,
    "errors": 0
  },
  "results": [
    {
      "storeId": "temu1",
      "storeName": "Magazin EU",
      "synced": 15,
      "created": 12,
      "updated": 3,
      "errors": []
    },
    {
      "storeId": "temu2",
      "storeName": "Magazin US",
      "synced": 10,
      "created": 8,
      "updated": 2,
      "errors": []
    }
  ]
}
```

---

## Statistici

**Sursa**: `src/app/api/temu/stats/route.ts`

### GET /api/temu/stats

Statistici dashboard pentru Temu.

**Raspuns** (200):
```json
{
  "totalOrders": 500,
  "pendingInvoice": 12,
  "pendingAwb": 8,
  "syncedToday": 5,
  "storesCount": 2,
  "configured": true
}
```

**Nota**: Daca nu exista magazine Temu configurate, returneaza `configured: false` si toate contoarele 0.
