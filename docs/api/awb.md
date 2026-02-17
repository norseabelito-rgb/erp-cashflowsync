# API AWB

Endpoint-uri pentru gestionarea AWB-urilor (scrisori de transport) prin FanCourier: creare, listare, tracking, stergere, etichete si statistici.

**Fisiere sursa:**
- `src/app/api/awb/route.ts`
- `src/app/api/awb/create/route.ts`
- `src/app/api/awb/[id]/route.ts`
- `src/app/api/awb/[id]/label/route.ts`
- `src/app/api/awb/refresh/route.ts`
- `src/app/api/awb/stats/route.ts`

---

## GET /api/awb

Returneaza lista AWB-urilor cu paginare, filtrare si statistici.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `100` | AWB-uri per pagina |
| `status` | string | - | Filtru dupa status curent (case-insensitive, `contains`) |
| `search` | string | - | Cautare in numar AWB, numar comanda, nume client, SKU, titlu produs |
| `showAll` | `"true"` \| `"false"` | `"true"` | Daca `false`, exclude AWB-urile livrate/finalizate |
| `containsSku` | string | - | Filtru dupa SKU produs din comanda |
| `containsBarcode` | string | - | Filtru dupa barcode produs din comanda |
| `noPagination` | `"true"` | - | Dezactiveaza paginarea (returneaza tot) |

### Raspuns (200)

```json
{
  "awbs": [
    {
      "id": "awb-uuid",
      "awbNumber": "2024123456789",
      "orderId": "order-uuid",
      "serviceType": "Standard",
      "paymentType": "Expeditor",
      "currentStatus": "In tranzit",
      "currentStatusDate": "2026-02-16T08:00:00.000Z",
      "cashOnDelivery": "250.00",
      "errorMessage": null,
      "createdAt": "2026-02-15T10:30:00.000Z",
      "fanCourierStatusCode": "C1",
      "order": {
        "id": "order-uuid",
        "shopifyOrderNumber": "#58537",
        "customerFirstName": "Ion",
        "customerLastName": "Popescu",
        "customerPhone": "0712345678",
        "shippingCity": "Bucuresti",
        "shippingProvince": "Bucuresti",
        "shippingAddress1": "Str. Exemplu 10",
        "totalPrice": "250.00",
        "currency": "RON",
        "status": "SHIPPED",
        "store": { "name": "Magazin Principal" },
        "lineItems": [
          {
            "id": "li-uuid",
            "sku": "PROD-001",
            "title": "Produs Test",
            "quantity": 2,
            "price": "125.00"
          }
        ]
      },
      "statusHistory": [
        {
          "id": "history-uuid",
          "status": "In tranzit",
          "statusDate": "2026-02-16T08:00:00.000Z",
          "location": "Hub Bucuresti",
          "description": "[C1] In tranzit"
        }
      ]
    }
  ],
  "stats": {
    "total": 500,
    "inTransit": 120,
    "delivered": 300,
    "returned": 15,
    "cancelled": 5,
    "pending": 50,
    "errors": 10
  },
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5
  }
}
```

---

## POST /api/awb/create

Genereaza AWB-uri pentru una sau mai multe comenzi. Creeaza automat picking list si trimite la printare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.create`

### Request Body

```typescript
{
  orderIds: string[];         // Array de UUID-uri comenzi
  options?: {                 // Optiuni FanCourier
    serviceType?: string;
    paymentType?: string;
    weight?: number;
    packages?: number;
  };
  createPickingList?: boolean;
  pickingListName?: string;
  assignedTo?: string;        // UUID utilizator picker
  createdBy?: string;         // UUID utilizator creator
}
```

### Flux

1. Genereaza AWB pentru fiecare comanda prin FanCourier
2. Creeaza picking list automat din AWB-urile create
3. Trimite AWB-urile la printare automata (daca exista imprimanta cu autoPrint)
4. Sincronizeaza contact la Daktela (fire-and-forget)

### Raspuns (200)

```json
{
  "success": true,
  "created": 3,
  "errors": ["order-uuid-4: Adresa invalida"],
  "pickingList": {
    "id": "pl-uuid",
    "code": "PL-M1ABCDE",
    "totalItems": 5,
    "totalQuantity": 10
  }
}
```

---

## GET /api/awb/[id]

Returneaza detaliile unui AWB specific, inclusiv istoricul statusurilor.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.view`

### Raspuns (200)

```json
{
  "success": true,
  "awb": {
    "id": "awb-uuid",
    "awbNumber": "2024123456789",
    "currentStatus": "In tranzit",
    "order": {
      "shopifyOrderNumber": "#58537",
      "store": { "name": "Magazin" }
    },
    "statusHistory": [
      {
        "status": "Preluat de curier",
        "statusDate": "2026-02-15T14:00:00.000Z",
        "location": "Bucuresti"
      },
      {
        "status": "In tranzit",
        "statusDate": "2026-02-16T08:00:00.000Z",
        "location": "Hub Bucuresti"
      }
    ]
  }
}
```

---

## DELETE /api/awb/[id]

Sterge un AWB din FanCourier si marcheaza ca sters local.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.delete`

### Validari

- AWB-ul nu poate fi sters daca statusul este "livrat" sau "delivered"
- AWB-ul trebuie sa aiba numar valid

### Efecte laterale

- Incearca stergerea din FanCourier (best-effort)
- Actualizeaza statusul AWB local la `STERS DIN FANCOURIER`
- Adauga intrare in istoricul statusurilor
- Reseteaza statusul comenzii la `VALIDATED`
- Logheaza activitatea

### Raspuns (200)

```json
{
  "success": true,
  "message": "AWB sters cu succes din FanCourier si din sistem",
  "fanCourierDeleted": true
}
```

---

## PATCH /api/awb/[id]

Actualizeaza statusul unui AWB individual din FanCourier (refresh tracking).

### Raspuns (200)

```json
{
  "success": true,
  "status": "Livrat",
  "eventsCount": 5
}
```

---

## GET /api/awb/[id]/label

Descarca eticheta PDF a unui AWB in format A6 (base64 encoded).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.view`

### Raspuns (200)

```json
{
  "success": true,
  "pdf": "JVBERi0xLjQK...",
  "format": "A6"
}
```

**Nota:** Campul `pdf` contine continutul PDF in format base64. Frontend-ul trebuie sa il decodeze si sa il afiseze/descarce.

---

## POST /api/awb/refresh

Sincronizeaza statusurile tuturor AWB-urilor active din FanCourier.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.track`

### Raspuns (200)

```json
{
  "success": true,
  "updated": 25,
  "checked": 150,
  "statusChanges": 25,
  "errors": 2,
  "details": [
    {
      "awbNumber": "2024123456789",
      "oldStatus": "In tranzit",
      "newStatus": "Livrat"
    }
  ]
}
```

---

## GET /api/awb/stats

Returneaza statistici agregate pe statusuri FanCourier.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `awb.view`

### Raspuns (200)

```json
{
  "total": 500,
  "statusStats": [
    {
      "code": "C1",
      "name": "Ridicat",
      "description": "Coletul a fost ridicat de curier",
      "color": "#3b82f6",
      "count": 120,
      "isFinal": false
    },
    {
      "code": "C4",
      "name": "Livrat",
      "description": "Coletul a fost livrat destinatarului",
      "color": "#22c55e",
      "count": 300,
      "isFinal": true
    },
    {
      "code": "UNKNOWN",
      "name": "Necunoscut",
      "description": "Statusuri care nu au fost inca mapate",
      "color": "#9ca3af",
      "count": 5,
      "isFinal": false
    }
  ],
  "sumVerified": true
}
```
