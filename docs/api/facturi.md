# API Facturi

Endpoint-uri pentru gestionarea facturilor: listare, emitere, stornare, incasare, plata si reparare facturi emise gresit.

**Fisiere sursa:**
- `src/app/api/invoices/route.ts`
- `src/app/api/invoices/issue/route.ts`
- `src/app/api/invoices/[id]/cancel/route.ts`
- `src/app/api/invoices/[id]/collect/route.ts`
- `src/app/api/invoices/[id]/pay/route.ts`
- `src/app/api/invoices/failed/route.ts`
- `src/app/api/admin/repair-invoices/route.ts`
- `src/app/api/admin/repair-invoices/[id]/repair/route.ts`
- `src/app/api/admin/repair-invoices/bulk-repair/route.ts`

---

## GET /api/invoices

Returneaza lista facturilor cu filtrare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `invoices.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `status` | string | Filtru status factura: `issued`, `cancelled`, `error` |
| `paymentStatus` | string | Status plata: `unpaid`, `paid`, `partial` |
| `search` | string | Cautare in numar factura, serie, numar comanda, nume client |
| `hasAwb` | `"true"` \| `"false"` | Filtru dupa existenta AWB pe comanda asociata |
| `awbStatus` | string | Status AWB (doar cu `hasAwb=true`) |

### Raspuns (200)

```json
{
  "invoices": [
    {
      "id": "inv-uuid",
      "invoiceNumber": "1234",
      "invoiceSeriesName": "FCG",
      "oblioId": "oblio-123",
      "status": "issued",
      "errorMessage": null,
      "dueDate": "2026-03-15T00:00:00.000Z",
      "paymentStatus": "unpaid",
      "paidAmount": null,
      "paidAt": null,
      "cancelledAt": null,
      "cancelReason": null,
      "stornoNumber": null,
      "stornoSeries": null,
      "pdfUrl": "https://...",
      "issuedAt": "2026-02-15T10:30:00.000Z",
      "createdAt": "2026-02-15T10:30:00.000Z",
      "order": {
        "id": "order-uuid",
        "shopifyOrderNumber": "#58537",
        "customerFirstName": "Ion",
        "customerLastName": "Popescu",
        "totalPrice": "250.00",
        "currency": "RON",
        "financialStatus": "paid",
        "store": { "name": "Magazin Principal" }
      }
    }
  ]
}
```

---

## POST /api/invoices/issue

Emite facturi pentru una sau mai multe comenzi prin Oblio.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `invoices.create`

### Request Body

```typescript
{
  orderIds: string[];                     // Array de UUID-uri comenzi
  acknowledgeTransferWarning?: boolean;   // Confirmare avertisment transfer intercompany
}
```

### Flux de confirmare transfer

Daca o comanda face parte dintr-un transfer intercompany care nu e finalizat, API-ul returneaza `needsConfirmation: true` cu lista avertismentelor. Frontend-ul trebuie sa le afiseze si sa retrimita cu `acknowledgeTransferWarning: true`.

### Raspuns (200)

```json
{
  "success": true,
  "issued": 3,
  "errors": ["Eroare la comanda #58540: date client incomplete"]
}
```

### Raspuns cu avertismente (200)

```json
{
  "success": false,
  "needsConfirmation": true,
  "warnings": [
    {
      "orderId": "order-uuid",
      "warning": {
        "orderNumber": "#58537",
        "transferNumber": "TR-001",
        "transferStatus": "pending",
        "message": "Comanda are transfer intercompany nefinalizat"
      }
    }
  ],
  "issued": 0
}
```

---

## POST /api/invoices/[id]/cancel

Storneaza o factura (emite nota de credit inversa in Oblio). Daca factura nu este intr-un manifest de retur, necesita aprobare PIN.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `invoices.cancel`

### Parametri URL

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `id` | string | UUID-ul facturii |

### Request Body

```typescript
{
  pin?: string;      // PIN-ul de aprobare (necesar daca nu e in manifest)
  reason?: string;   // Motivul stornarii
}
```

### Flux in 2 pasi (daca nu e in manifest)

1. **Prima cerere** (fara PIN): Returneaza `blocked: true, requiresPIN: true`
2. **A doua cerere** (cu PIN): Executa stornarea

### Raspuns - Blocat (403)

```json
{
  "success": false,
  "blocked": true,
  "reason": "Factura nu este asociata unui manifest de retur",
  "requiresPIN": true
}
```

### Raspuns - Succes (200)

```json
{
  "success": true,
  "source": "MANIFEST_RETURN"
}
```

**Surse posibile:** `MANIFEST_RETURN` (din manifest retur), `PIN_APPROVAL` (aprobare cu PIN)

### Efecte laterale

- Actualizeaza statusul facturii la `cancelled` in DB
- Reseteaza statusul comenzii la `INVOICE_PENDING`
- Creeaza intrare in `auditLog`
- Logheaza activitatea

---

## POST /api/invoices/[id]/collect

Marcheaza o factura ca incasata. Inregistreaza plata in Oblio. Necesita aprobare PIN daca nu e in manifest de livrare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `invoices.edit`

### Request Body

```typescript
{
  pin?: string;            // PIN-ul de aprobare (daca nu e in manifest)
  reason?: string;         // Motivul
  collectType?: string;    // Tipul incasarii (default: "Ramburs")
}
```

### Raspuns (200)

```json
{
  "success": true,
  "source": "MANIFEST_DELIVERY"
}
```

**Surse posibile:** `MANIFEST_DELIVERY` (din manifest livrare), `PIN_APPROVAL` (aprobare cu PIN)

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Factura este deja incasata` |
| 400 | `Nu se poate incasa o factura stornata` |
| 404 | `Factura nu a fost gasita` |

---

## POST /api/invoices/[id]/pay

Inregistreaza o plata partiala sau totala pentru o factura.

**Autentificare:** Fara verificare explicita de permisiune
**Nota:** Endpoint-ul nu verifica autentificarea - posibil endpoint intern.

### Request Body

```typescript
{
  amount: number;     // Suma platita (trebuie > 0)
  method: string;     // Metoda de plata (ex: "Transfer bancar", "Card")
}
```

### Logica de calcul

- `paidAmount` = plata anterioara + plata noua
- Daca `paidAmount >= totalPrice` => `paymentStatus = "paid"`
- Daca `paidAmount > 0` dar `< totalPrice` => `paymentStatus = "partial"`

### Raspuns (200)

```json
{
  "success": true,
  "message": "Plata de 150 RON a fost inregistrata.",
  "invoice": { "..." }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Suma trebuie sa fie mai mare decat 0` |
| 400 | `Doar facturile emise pot fi marcate ca platite` |
| 400 | `Factura nu are numar valid` |
| 404 | `Factura nu a fost gasita` |

---

## GET /api/invoices/failed

Listeaza incercarile esuate de emitere factura, cu paginare.

**Autentificare:** Fara verificare explicita

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `status` | string | `"pending"` | Filtru status: `pending`, `resolved`, `all` |
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Rezultate per pagina |

### Raspuns (200)

```json
{
  "attempts": [
    {
      "id": "attempt-uuid",
      "orderId": "order-uuid",
      "errorCode": "INVALID_CLIENT",
      "errorMessage": "Date client incomplete",
      "status": "pending",
      "attemptNumber": 2,
      "createdAt": "2026-02-15T10:30:00.000Z",
      "order": {
        "id": "order-uuid",
        "shopifyOrderNumber": "#58537",
        "customerEmail": "ion@example.com",
        "totalPrice": "250.00",
        "status": "INVOICE_ERROR"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "pages": 1
  }
}
```

---

## POST /api/invoices/failed

Reincearca emiterea unei facturi esuate.

### Request Body

```json
{
  "attemptId": "attempt-uuid"
}
```

### Raspuns - Succes (200)

```json
{
  "success": true,
  "message": "Factura a fost emisa cu succes",
  "invoice": {
    "number": "1234",
    "series": "FCG"
  }
}
```

### Raspuns - Esec (200)

```json
{
  "success": false,
  "error": "Date client incomplete",
  "errorCode": "INVALID_CLIENT"
}
```

---

## Endpoint-uri Admin: Reparare Facturi

Aceste endpoint-uri sunt accesibile doar utilizatorilor **Super Admin** si repara facturile emise gresit din cauza bug-ului de auto-facturare (clientul pe factura era firma emitenta in loc de clientul real).

---

## GET /api/admin/repair-invoices

Returneaza facturile afectate salvate in DB (instant, fara Oblio).

**Permisiune:** Super Admin

### Raspuns (200)

```json
{
  "success": true,
  "total": 12,
  "repairedCount": 8,
  "lastScanAt": "2026-02-15T10:30:00.000Z",
  "invoices": [
    {
      "id": "repair-uuid",
      "invoiceNumber": "1234",
      "invoiceSeriesName": "FCG",
      "orderId": "order-uuid",
      "orderNumber": "#58537",
      "oblioClient": "SC Firma Mea SRL",
      "correctCustomer": "Ion Popescu",
      "total": 250,
      "currency": "RON",
      "issuedAt": "2026-02-10T10:00:00.000Z",
      "companyName": "SC Firma Mea SRL"
    }
  ]
}
```

---

## POST /api/admin/repair-invoices

Scaneaza TOATE facturile din Oblio, gaseste auto-facturarile si le salveaza in DB (upsert). Proceseaza in batch-uri, fara acumulare in memorie.

**Permisiune:** Super Admin
**Timeout:** 5 minute (`maxDuration: 300`)

### Algoritm de detectie

1. Parcurge toate companiile cu credentiale Oblio
2. Pagineaza prin toate facturile necancelate (100/pagina)
3. Compara numele/CIF-ul clientului cu numele/CIF-ul firmei emitente
4. Daca se potrivesc, salveaza in tabelul `RepairInvoice` (upsert)
5. Cauta comanda asociata in DB sau prin mentiurea din factura (ex: `Comanda online: #58537`)

### Raspuns (200)

```json
{
  "success": true,
  "totalFound": 12,
  "totalNew": 4,
  "message": "Scan complet. 12 facturi afectate gasite, 4 noi."
}
```

---

## POST /api/admin/repair-invoices/[id]/repair

Repara o singura factura emisa gresit.

**Permisiune:** Super Admin

### Flux de reparare

1. Storneaza factura veche in Oblio (emite nota de credit)
2. Sterge factura veche din DB
3. Reseteaza `billingCompanyId` pe comanda (daca era egal cu `store.companyId`)
4. Re-emite factura cu `issueInvoiceForOrder()` (cu fix-ul aplicat)
5. Actualizeaza `RepairInvoice` cu status `repaired`
6. Creeaza intrare in `auditLog`

### Raspuns (200)

```json
{
  "success": true,
  "oldInvoice": "FCG 1234",
  "newInvoice": "FCG 1235",
  "orderNumber": "#58537"
}
```

---

## POST /api/admin/repair-invoices/bulk-repair

Repara mai multe facturi in bulk (max 50 per batch).

**Permisiune:** Super Admin
**Timeout:** 5 minute

### Request Body

```json
{
  "repairIds": ["repair-uuid-1", "repair-uuid-2", "repair-uuid-3"]
}
```

### Raspuns (200)

```json
{
  "success": true,
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    {
      "repairId": "repair-uuid-1",
      "success": true,
      "oldInvoice": "FCG 1234",
      "newInvoice": "FCG 1235",
      "orderNumber": "#58537"
    },
    {
      "repairId": "repair-uuid-3",
      "success": false,
      "error": "Stornare Oblio: Factura nu poate fi stornata"
    }
  ]
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `repairIds este obligatoriu si trebuie sa fie un array nevid` |
| 400 | `Maximum 50 de facturi per batch` |
