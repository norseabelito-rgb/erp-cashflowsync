# API Comenzi

Endpoint-uri pentru gestionarea comenzilor din toate sursele (Shopify, Trendyol, manual).

**Fisiere sursa:**
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`
- `src/app/api/orders/process/route.ts`
- `src/app/api/orders/process-all/route.ts`
- `src/app/api/orders/export/route.ts`
- `src/app/api/orders/[id]/notes/route.ts`

---

## GET /api/orders

Returneaza lista comenzilor cu paginare, filtrare si statistici per sursa.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Comenzi per pagina |
| `status` | string | - | Filtru status: `PENDING`, `VALIDATED`, `INVOICED`, `SHIPPED`, `DELIVERED`, `RETURNED`, `CANCELLED` etc. |
| `storeId` | string | - | Filtru dupa magazin (UUID) |
| `source` | string | - | Sursa comenzii: `shopify`, `trendyol`, `manual` |
| `search` | string | - | Cautare in numar comanda, nume, telefon, email, oras, SKU, titlu produs, barcode |
| `startDate` | string | - | Data inceput (ISO format: `2026-01-01`) |
| `endDate` | string | - | Data sfarsit (inclusiv) |
| `containsSku` | string | - | Filtru dupa SKU produs (case-insensitive) |
| `containsBarcode` | string | - | Filtru dupa barcode produs |
| `containsProduct` | string | - | Cautare in SKU si titlu produs simultan |
| `hasAwb` | `"true"` \| `"false"` | - | Filtru dupa existenta AWB |
| `awbStatus` | string | - | Status AWB: `tranzit`, `livrat`, `retur`, `pending`, `anulat` (doar cu `hasAwb=true`) |
| `internalStatusId` | string | - | Filtru dupa status intern (UUID sau `"none"` pentru comenzi fara status) |

### Raspuns (200)

```json
{
  "orders": [
    {
      "id": "clx1abc...",
      "shopifyOrderNumber": "#58537",
      "status": "INVOICED",
      "customerFirstName": "Ion",
      "customerLastName": "Popescu",
      "customerEmail": "ion@example.com",
      "customerPhone": "0712345678",
      "shippingCity": "Bucuresti",
      "shippingProvince": "Bucuresti",
      "totalPrice": "250.00",
      "currency": "RON",
      "source": "shopify",
      "createdAt": "2026-02-15T10:30:00.000Z",
      "store": {
        "id": "store-uuid",
        "name": "Magazin Principal",
        "shopifyDomain": "magazin.myshopify.com"
      },
      "invoice": {
        "id": "inv-uuid",
        "invoiceNumber": "1234",
        "invoiceSeriesName": "FCG",
        "oblioId": "oblio-123",
        "status": "issued",
        "errorMessage": null
      },
      "awb": {
        "id": "awb-uuid",
        "awbNumber": "2024123456789",
        "currentStatus": "In tranzit",
        "currentStatusDate": "2026-02-16T08:00:00.000Z",
        "errorMessage": null
      },
      "trendyolOrder": null,
      "internalStatus": {
        "id": "status-uuid",
        "name": "De procesat",
        "color": "#3b82f6"
      },
      "lineItems": [
        {
          "id": "li-uuid",
          "sku": "PROD-001",
          "title": "Produs Test",
          "quantity": 2,
          "price": "125.00"
        }
      ],
      "customerOrderCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1523,
    "totalPages": 31
  },
  "sourceCounts": {
    "shopify": 1400,
    "trendyol": 123,
    "temu": 0
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 401 | `Trebuie sa fii autentificat` |
| 403 | `Nu ai permisiunea de a vizualiza comenzi` |
| 500 | `Eroare la incarcarea comenzilor` |

---

## GET /api/orders/[id]

Returneaza detaliile unei comenzi specifice.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.view`

### Parametri URL

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `id` | string | UUID-ul comenzii |

### Raspuns (200)

```json
{
  "order": {
    "id": "clx1abc...",
    "shopifyOrderNumber": "#58537",
    "status": "INVOICED",
    "store": { "id": "...", "name": "Magazin" },
    "invoice": { "invoiceNumber": "1234", "status": "issued" },
    "awb": { "awbNumber": "2024123456789", "currentStatus": "In tranzit" },
    "lineItems": [...]
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 404 | `Comanda nu a fost gasita` |

---

## PUT /api/orders/[id]

Actualizeaza datele unei comenzi (telefon, adresa, nume, email). Sincronizeaza modificarile in Shopify si adauga comentariu de audit.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.edit`

### Request Body

```typescript
{
  customerPhone?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingZip?: string;
  syncToShopify?: boolean;          // default: true
  acknowledgeDocumentsIssued?: boolean; // default: false
}
```

**Nota:** Daca comanda are factura emisa sau AWB generat si `acknowledgeDocumentsIssued` nu este `true`, API-ul returneaza eroare 400 cu `requiresAcknowledgement: true`. Frontend-ul trebuie sa afiseze un dialog de confirmare.

### Raspuns (200)

```json
{
  "success": true,
  "order": { "..." },
  "changes": [
    { "field": "Telefon", "oldValue": "0712345678", "newValue": "0798765432" }
  ],
  "shopifySynced": true,
  "shopifyError": null,
  "hasDocuments": false,
  "validation": {
    "phone": { "isValid": true, "message": null },
    "address": { "isValid": true, "message": null }
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Comanda are documente emise` (cu `requiresAcknowledgement: true`) |
| 400 | `Nu exista modificari de salvat` |
| 404 | `Comanda nu a fost gasita` |

---

## POST /api/orders/process

Proceseaza un set de comenzi: emite facturi, genereaza AWB-uri, creeaza picking list, trimite la printare si sincronizeaza contacte la Daktela.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.process`

### Request Body

```typescript
{
  orderIds: string[];      // Array de UUID-uri comenzi
  awbOptions?: {           // Optiuni FanCourier
    serviceType?: string;
    paymentType?: string;
    weight?: number;
    packages?: number;
  };
}
```

### Flux de procesare

1. **Emite factura** (daca nu exista deja una activa)
2. **Genereaza AWB** (doar daca factura a reusit si nu exista AWB)
3. **Creeaza Picking List** din AWB-urile procesate cu succes
4. **Notifica pickerii** (utilizatori cu rol "Picker")
5. **Trimite AWB-urile la printare** (daca exista imprimanta cu autoPrint)
6. **Sync contact Daktela** (fire-and-forget, doar pentru comenzi procesate cu succes)

### Raspuns (200)

```json
{
  "success": true,
  "stats": {
    "total": 5,
    "invoicesCreated": 4,
    "awbsCreated": 4,
    "errors": 1
  },
  "results": [
    {
      "orderId": "order-uuid",
      "orderNumber": "#58537",
      "invoiceSuccess": true,
      "invoiceNumber": "FCG1234",
      "awbSuccess": true,
      "awbNumber": "2024123456789",
      "awbId": "awb-uuid"
    }
  ],
  "pickingList": {
    "id": "pl-uuid",
    "code": "PL-M1ABCDE",
    "totalItems": 8,
    "totalQuantity": 15
  },
  "batchId": "batch-uuid"
}
```

---

## POST /api/orders/process-all

Procesare completa cu optiuni extinse (picking list automat, auto-print, rezolvare AWB-uri vechi). Similar cu `/process` dar cu functionalitati aditionale.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.process`

### Request Body

```typescript
{
  orderIds: string[];
  awbOptions?: { ... };
  createPickingList?: boolean;      // default: true
  autoPrintPickingList?: boolean;   // default: true
}
```

### Diferente fata de /process

- Sterge AWB-uri vechi cu status "sters"/"anulat" inainte de a crea altele noi
- Re-emite facturi cu status "error" sau "deleted"
- Expande retete locale (produse compuse) in picking list
- Include `trendyolOrder` in raspuns pentru sincronizare tracking

### Raspuns (200)

```json
{
  "success": true,
  "message": "Toate cele 5 comenzi au fost procesate cu succes!",
  "stats": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "invoicesIssued": 3,
    "awbsCreated": 4
  },
  "results": [...],
  "errors": [],
  "batchId": "batch-uuid",
  "pickingList": {
    "id": "pl-uuid",
    "code": "PL-M1ABCDE",
    "totalItems": 10,
    "totalQuantity": 25,
    "printJobId": null
  }
}
```

---

## GET /api/orders/export

Exporta comenzile in format Excel (XLSX) sau CSV.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `format` | `"xlsx"` \| `"csv"` \| `"json"` | `"xlsx"` | Formatul exportului |
| `storeId` | string | - | Filtru dupa magazin |
| `status` | string | - | Filtru dupa status comanda |
| `startDate` | string | - | Data inceput (YYYY-MM-DD) |
| `endDate` | string | - | Data sfarsit |
| `hasInvoice` | `"true"` \| `"false"` | - | Filtru dupa existenta facturii |
| `hasAwb` | `"true"` \| `"false"` | - | Filtru dupa existenta AWB |

### Raspuns

- **XLSX**: Fisier Excel cu header colorat, auto-filter si freeze pane
- **CSV**: Fisier CSV cu BOM UTF-8 pentru compatibilitate Excel
- **JSON**: `{ "orders": [...] }`

Numele fisierului: `comenzi_2026-02-18.xlsx`

### Coloane export

`Nr_Comanda`, `Data`, `Magazin`, `Status`, `Client_Email`, `Client_Telefon`, `Client_Nume`, `Client_Prenume`, `Adresa`, `Oras`, `Judet`, `Tara`, `Cod_Postal`, `Total`, `Subtotal`, `Transport`, `TVA`, `Moneda`, `Status_Plata`, `Status_Livrare`, `Nr_Factura`, `Status_Factura`, `AWB`, `Curier`, `Status_AWB`, `Produse`

---

## GET /api/orders/[id]/notes

Returneaza notitele unei comenzi.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.view`

### Raspuns (200)

```json
{
  "notes": "Client solicita livrare dupa ora 18:00"
}
```

---

## PUT /api/orders/[id]/notes

Salveaza sau actualizeaza notitele unei comenzi.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `orders.edit`

### Request Body

```json
{
  "notes": "Client solicita livrare dupa ora 18:00"
}
```

### Raspuns (200)

```json
{
  "notes": "Client solicita livrare dupa ora 18:00"
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Campul notes trebuie sa fie un string` |
| 404 | `Comanda nu a fost gasita` |
