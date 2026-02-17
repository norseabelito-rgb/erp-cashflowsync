# API Trendyol

Documentatie pentru endpoint-urile de integrare cu marketplace-ul Trendyol: magazine, comenzi, produse, mapping, atribute, webhook-uri.

**Surse**: `src/app/api/trendyol/`

---

## Cuprins

- [Status si Configurare](#status-si-configurare)
- [Magazine Trendyol](#magazine-trendyol)
- [Comenzi Trendyol](#comenzi-trendyol)
- [Statistici](#statistici)
- [Mapping Produse](#mapping-produse)
- [Atribute Produse](#atribute-produse)
- [Sugestie Categorie AI](#sugestie-categorie-ai)
- [Batch Status](#batch-status)
- [Webhook](#webhook)
- [Operatii POST (actiuni)](#operatii-post)

---

## Status si Configurare

**Sursa**: `src/app/api/trendyol/route.ts`

### GET /api/trendyol

Returneaza statusul configurarii Trendyol si lista magazinelor.

**Permisiuni**: `trendyol.view`

**Raspuns** (200):
```json
{
  "success": true,
  "configured": true,
  "isTestMode": false,
  "stores": [
    {
      "id": "ts1",
      "name": "Magazin Trendyol RO",
      "supplierId": "123456",
      "companyId": "c1",
      "companyName": "SC Firma SRL",
      "storeFrontCode": "RO"
    }
  ],
  "selectedStoreId": "ts1",
  "hasLegacyConfig": false
}
```

### GET /api/trendyol?action=test

Testeaza conexiunea la Trendyol API. Verifica conectivitatea de baza si apoi autentificarea.

**Query params**:
| Parametru | Descriere |
|-----------|-----------|
| `storeId` | ID-ul magazinului Trendyol (optional, default: primul activ) |

### GET /api/trendyol?action=categories

Returneaza arborele de categorii Trendyol (publice, nu necesita autentificare).

**Raspuns** (200):
```json
{
  "success": true,
  "categories": [{ "id": 1234, "name": "Electronice", "subCategories": [...] }],
  "flatCategories": [{ "id": 5678, "name": "Telefoane mobile", "fullPath": "Electronice > Telefoane" }],
  "total": 3500,
  "storeFrontCode": "RO"
}
```

### GET /api/trendyol?action=attributes&categoryId={id}

Returneaza atributele unei categorii Trendyol.

### GET /api/trendyol?action=brands&search={text}

Cauta branduri pe Trendyol.

### GET /api/trendyol?action=products

Lista produselor din contul Trendyol.

**Query params**:
| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | 0 | Pagina (0-indexed) |
| `size` | number | 50 | Produse per pagina |
| `approved` | "true"/"false" | - | Filtru aprobate |
| `barcode` | string | - | Cautare dupa barcode |
| `storeFrontCode` | string | din setari | Cod tara |

### GET /api/trendyol?action=addresses

Lista adreselor de expeditie (necesita autentificare).

### GET /api/trendyol?action=cargo

Lista firmelor de curierat Trendyol.

### GET /api/trendyol?action=syncInfo

Informatii despre ultima sincronizare de produse.

---

## Magazine Trendyol

**Sursa**: `src/app/api/trendyol/stores/route.ts`, `src/app/api/trendyol/stores/[id]/route.ts`

### GET /api/trendyol/stores

Lista tuturor magazinelor Trendyol (fara secrete expuse).

**Permisiuni**: `stores.view`

**Raspuns** (200):
```json
{
  "stores": [
    {
      "id": "ts1",
      "name": "Magazin Trendyol RO",
      "supplierId": "123456",
      "apiKey": "abc...",
      "storeFrontCode": "RO",
      "isTestMode": false,
      "isActive": true,
      "defaultBrandId": 5000,
      "currencyRate": 5.0,
      "invoiceSeriesName": "TRD",
      "hasApiCredentials": true,
      "hasWebhookSecret": true,
      "company": { "id": "c1", "name": "SC Firma SRL" },
      "_count": { "orders": 250 }
    }
  ]
}
```

### POST /api/trendyol/stores

Creeaza un magazin Trendyol nou. Genereaza automat un webhook secret.

**Permisiuni**: `stores.manage`

**Body**:
```typescript
{
  name: string;              // Obligatoriu
  supplierId: string;        // Obligatoriu, unic
  apiKey: string;            // Obligatoriu
  apiSecret: string;         // Obligatoriu
  storeFrontCode: string;    // Obligatoriu, ex: "RO"
  companyId: string;         // Obligatoriu
  isTestMode?: boolean;      // Default: false
  defaultBrandId?: number;
  currencyRate?: number;     // Curs RON/EUR
  invoiceSeriesName?: string;
}
```

**Raspuns** (200):
```json
{
  "store": { "id": "ts1", "name": "...", "..." },
  "webhookUrl": "https://app.firma.ro/api/trendyol/webhook/ts1",
  "webhookSecret": "abc123...",
  "success": true
}
```

### GET /api/trendyol/stores/{id}

Detalii magazin Trendyol cu webhook URL.

### PATCH /api/trendyol/stores/{id}

Actualizeaza un magazin. Suporta `regenerateWebhookSecret: true` pentru a genera un nou secret.

### DELETE /api/trendyol/stores/{id}

Sterge un magazin. Nu se poate sterge daca are comenzi asociate.

### POST /api/trendyol/stores/{id}/test

Testeaza conexiunea unui magazin specific la Trendyol API.

**Permisiuni**: `stores.view`

**Raspuns** (200):
```json
{
  "success": true,
  "message": "Conexiune reusita",
  "responseTime": 450,
  "details": {
    "storeName": "Magazin Trendyol RO",
    "supplierId": "123456",
    "storeFrontCode": "RO",
    "isTestMode": false,
    "totalOrders": 250
  }
}
```

---

## Comenzi Trendyol

**Sursa**: `src/app/api/trendyol/orders/route.ts`

### GET /api/trendyol/orders

Lista comenzilor Trendyol cu paginare si filtre.

**Query params**:
| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | 1 | Pagina curenta |
| `limit` | number | 20 | Rezultate per pagina |
| `status` | string | - | Filtru status |
| `search` | string | - | Cautare in numar comanda, nume client, email |
| `mapped` | "true"/"false" | - | Filtru produse mapate |

**Raspuns** (200):
```json
{
  "success": true,
  "orders": [
    {
      "id": "to1",
      "trendyolOrderNumber": "123456789",
      "customerName": "Client Trendyol",
      "customerEmail": "client@email.com",
      "status": "Shipped",
      "totalPrice": 89.99,
      "currency": "EUR",
      "orderDate": "2025-02-18T10:00:00.000Z",
      "statusInfo": { "label": "Expediat", "color": "blue", "icon": "truck" },
      "lineItems": [
        {
          "barcode": "8690001234",
          "title": "Produs Test",
          "quantity": 1,
          "isMapped": true,
          "masterProduct": { "id": "mp1", "sku": "SKU-001", "title": "Produs Local" }
        }
      ]
    }
  ],
  "statusOptions": [
    { "value": "Created", "label": "Creata", "color": "yellow" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 250, "totalPages": 13 }
}
```

### POST /api/trendyol/orders

Sincronizeaza comenzile din Trendyol API.

**Body** (optional):
```typescript
{
  startDate?: string;   // ISO date
  endDate?: string;     // ISO date
  status?: string;      // Filtru status Trendyol
}
```

---

## Statistici

### GET /api/trendyol/stats

Statistici generale Trendyol (total comenzi, per status, etc.).

---

## Mapping Produse

**Sursa**: `src/app/api/trendyol/mapping/route.ts`

### GET /api/trendyol/mapping

Lista produselor nemapate cu sugestii automate si toate maparea existente.

**Raspuns** (200):
```json
{
  "success": true,
  "unmapped": [
    {
      "barcode": "8690001234",
      "title": "Produs Trendyol",
      "suggestions": [
        { "id": "mp1", "sku": "SKU-001", "title": "Produs Similar" }
      ]
    }
  ],
  "mappings": [
    {
      "barcode": "8690005678",
      "localSku": "SKU-002",
      "masterProduct": { "id": "mp2", "sku": "SKU-002", "title": "Produs Mapat" }
    }
  ],
  "stats": { "totalUnmapped": 5, "totalMapped": 120 }
}
```

### POST /api/trendyol/mapping

Mapeaza un produs Trendyol la un produs local.

**Body**:
```typescript
{
  barcode: string;    // Barcode Trendyol
  localSku: string;   // SKU-ul local din ERP
}
```

### DELETE /api/trendyol/mapping?barcode={barcode}

Sterge o mapare si reseteaza articolele din comenzi.

---

## Atribute Produse

**Sursa**: `src/app/api/trendyol/attributes/route.ts`

### GET /api/trendyol/attributes?productId={id}

Obtine atributele Trendyol pentru un produs si valorile salvate.

**Permisiuni**: `products.view`

**Raspuns** (200):
```json
{
  "success": true,
  "product": { "id": "mp1", "sku": "SKU-001", "title": "Produs" },
  "categoryId": 1234,
  "categoryName": "Telefoane mobile",
  "attributes": [
    {
      "id": 100,
      "name": "Culoare",
      "required": true,
      "allowCustom": false,
      "attributeValues": [
        { "id": 1001, "name": "Rosu" },
        { "id": 1002, "name": "Albastru" }
      ]
    }
  ],
  "savedValues": {
    "100": { "attributeValueId": 1001 }
  },
  "requiredCount": 5,
  "savedCount": 3
}
```

### POST /api/trendyol/attributes

Salveaza valorile atributelor pentru un produs.

**Permisiuni**: `products.edit`

**Body**:
```typescript
{
  productId: string;
  categoryId?: number;
  attributeValues: Record<string, {
    attributeValueId?: number;
    customValue?: string;
  }>;
}
```

### PATCH /api/trendyol/attributes

Salveaza atribute bulk pentru mai multe produse.

**Permisiuni**: `products.edit`

**Body**:
```typescript
{
  productIds: string[];
  categoryId?: number;
  attributeValues: Record<string, { attributeValueId?: number; customValue?: string }>;
}
```

---

## Sugestie Categorie AI

**Sursa**: `src/app/api/trendyol/category-suggest/route.ts`

### POST /api/trendyol/category-suggest

Foloseste AI (Claude) pentru a sugera categoria Trendyol potrivita pentru un produs.

**Permisiuni**: `trendyol.edit`

**Body**:
```typescript
{ productId: string }
```

**Raspuns** (200):
```json
{
  "success": true,
  "suggestion": {
    "categoryId": 5678,
    "categoryName": "Telefoane mobile",
    "fullPath": "Electronice > Telefoane > Telefoane mobile",
    "confidence": 0.92
  }
}
```

---

## Batch Status

**Sursa**: `src/app/api/trendyol/batch-status/route.ts`

### GET /api/trendyol/batch-status

Verifica statusul unui batch request Trendyol (publicare/actualizare produse).

**Permisiuni**: `trendyol.view`

**Query params**:
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `batchRequestId` | string | Obligatoriu |
| `storeId` | string | Optional, pentru multi-store |
| `updateProducts` | "true" | Actualizeaza produsele in DB dupa verificare |

**Raspuns** (200):
```json
{
  "success": true,
  "batchRequestId": "batch-123",
  "status": "COMPLETED",
  "totalItems": 10,
  "successCount": 8,
  "failedCount": 2,
  "items": [...],
  "errors": ["Product SKU-001: Invalid barcode format"],
  "updateResult": { "updated": 8 }
}
```

---

## Webhook

**Sursa**: `src/app/api/trendyol/webhook/[storeId]/route.ts`

### POST /api/trendyol/webhook/{storeId}

Primeste notificari real-time de la Trendyol. Fiecare magazin are URL-ul si secretul propriu.

**Autentificare**: HMAC-SHA256 signature via header `x-trendyol-signature`

**Evenimente suportate**:
| Event | Descriere |
|-------|-----------|
| `OrderCreated` | Comanda noua - sincronizata in Order principal |
| `OrderStatusChanged` | Status actualizat - propagat in TrendyolOrder si Order |
| `OrderCancelled` | Comanda anulata |
| `OrderReturned` | Comanda returnata |
| `ShipmentDelivered` | Expeditie livrata |

### GET /api/trendyol/webhook/{storeId}

Health check pentru verificarea webhook-ului.

**Nota**: Endpoint-ul vechi `POST /api/trendyol/webhook` (fara storeId) este deprecated (returneaza 410 Gone).

---

## Operatii POST

**Sursa**: `src/app/api/trendyol/route.ts` - POST

Toate operatiile sunt trimise ca POST cu `action` in body.

**Permisiuni**: `trendyol.manage`

### action: "createProduct"

Creeaza un produs pe Trendyol.

### action: "publishProducts"

Publica produse din ERP catre Trendyol (cu conversie pret RON->EUR, generare barcode, validare atribute).

**Body**: `{ action: "publishProducts", productIds: string[], brandId: number, brandName: string }`

### action: "updatePriceAndInventory"

Actualizeaza pretul si stocul produselor pe Trendyol.

### action: "deleteProducts"

Sterge produse de pe Trendyol dupa barcode.

### action: "checkBatch"

Verifica statusul unui batch request.

### action: "syncInventory"

Sincronizeaza stocul si preturile tuturor produselor cu Trendyol.

### action: "syncProduct"

Sincronizeaza un singur produs cu Trendyol.

### action: "generateWebhookSecret"

Genereaza un nou webhook secret.

### action: "registerWebhook" / "listWebhooks" / "unregisterWebhook"

Gestioneaza webhook-urile inregistrate la Trendyol.

### action: "retrySendInvoice" / "retryAllFailedInvoices" / "getPendingInvoiceSends"

Gestioneaza trimiterea facturilor catre Trendyol.

### action: "retrySendTracking"

Retrimite informatia de tracking AWB catre Trendyol.
