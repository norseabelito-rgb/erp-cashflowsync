# API Clienti

Endpoint-uri pentru gestionarea clientilor. Clientii sunt derivati din comenzi (nu au entitate separata in DB) si sunt grupati dupa un `customerKey` compozit.

**Fisiere sursa:**
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[email]/route.ts`
- `src/app/api/customers/[email]/note/route.ts`

---

## Identificarea Clientilor (customerKey)

Clientii sunt identificati printr-o cheie compozita cu urmatoarea prioritate:
1. **Email** (lowercase) - daca exista
2. **Telefon** - daca nu exista email
3. **Nume** - `name:Ion Popescu` - daca nu exista nici email, nici telefon
4. **Necunoscut** - `unknown:orderId` - fallback

Aceasta cheie este folosita in URL-uri si ca parametru de cautare.

---

## GET /api/customers

Returneaza lista clientilor agregati din comenzi, cu paginare si filtrare.

**Autentificare:** Sesiune NextAuth sau token embed (pentru iframe Daktela)
**Permisiune:** `orders.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Clienti per pagina |
| `search` | string | - | Cautare in email, telefon, nume, prenume, numar comanda |
| `storeId` | string | - | Filtru dupa magazin |

### Raspuns (200)

```json
{
  "customers": [
    {
      "customerKey": "ion@example.com",
      "email": "ion@example.com",
      "phone": "0712345678",
      "firstName": "Ion",
      "lastName": "Popescu",
      "orderCount": 5,
      "totalSpent": 1250.50,
      "lastOrderDate": "2026-02-15T10:30:00.000Z",
      "firstOrderDate": "2025-06-01T08:00:00.000Z"
    },
    {
      "customerKey": "0798765432",
      "email": null,
      "phone": "0798765432",
      "firstName": "Maria",
      "lastName": "Ionescu",
      "orderCount": 2,
      "totalSpent": 450.00,
      "lastOrderDate": "2026-02-10T14:00:00.000Z",
      "firstOrderDate": "2026-01-20T12:00:00.000Z"
    }
  ],
  "stores": [
    { "id": "store-uuid", "name": "Magazin Principal" }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

### Logica de agregare

Clientii sunt agregati printr-un CTE SQL care:
- Grupeza comenzile dupa `customerKey`
- Ia numele/email-ul/telefonul de pe cea mai recenta comanda (nu MAX independent, ci de pe aceeasi comanda)
- Calculeaza `totalSpent`, `orderCount`, `firstOrderDate`, `lastOrderDate`
- Sorteaza descrescator dupa `totalSpent`

---

## GET /api/customers/[email]

Returneaza detaliile unui client specific: informatii de contact, istoric comenzi, analitice si produse favorite.

**Autentificare:** Sesiune NextAuth sau token embed
**Permisiune:** `orders.view`

### Parametri URL

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `email` | string | `customerKey` URL-encoded (email, telefon, sau `name:Nume`) |

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `storeId` | string | Filtru dupa magazin |

### Raspuns (200)

```json
{
  "customer": {
    "email": "ion@example.com",
    "phone": "0712345678",
    "firstName": "Ion",
    "lastName": "Popescu",
    "address": {
      "address1": "Str. Exemplu 10",
      "address2": "Ap. 5",
      "city": "Bucuresti",
      "province": "Bucuresti",
      "zip": "010101",
      "country": "RO"
    }
  },
  "customerKey": "ion@example.com",
  "analytics": {
    "totalSpent": 1250.50,
    "orderCount": 5,
    "firstOrderDate": "2025-06-01T08:00:00.000Z",
    "lastOrderDate": "2026-02-15T10:30:00.000Z",
    "averageOrderValue": 250.10
  },
  "topProducts": [
    {
      "title": "Produs Popular",
      "sku": "PROD-001",
      "quantity": 8
    },
    {
      "title": "Alt Produs",
      "sku": "PROD-002",
      "quantity": 3
    }
  ],
  "orders": [
    {
      "id": "order-uuid",
      "shopifyOrderNumber": "#58537",
      "totalPrice": 250.00,
      "status": "DELIVERED",
      "createdAt": "2026-02-15T10:30:00.000Z",
      "store": { "id": "store-uuid", "name": "Magazin" },
      "invoice": {
        "invoiceNumber": "1234",
        "status": "issued"
      },
      "awb": {
        "awbNumber": "2024123456789",
        "currentStatus": "Livrat"
      }
    }
  ],
  "note": "Client fidel, prefera livrare in weekend"
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 404 | `Clientul nu a fost gasit` |

---

## GET /api/customers/[email]/note

Returneaza notita asociata unui client.

**Autentificare:** Sesiune NextAuth sau token embed
**Permisiune:** `orders.view`

### Raspuns (200)

```json
{
  "note": "Client fidel, prefera livrare in weekend"
}
```

---

## POST /api/customers/[email]/note

Salveaza sau actualizeaza notita unui client. Foloseste upsert pe `customerKey`.

**Autentificare:** Sesiune NextAuth sau token embed
**Permisiune:** `orders.view`

### Request Body

```json
{
  "note": "Client fidel, prefera livrare in weekend"
}
```

### Raspuns (200)

```json
{
  "success": true,
  "note": {
    "id": "note-uuid",
    "email": "ion@example.com",
    "note": "Client fidel, prefera livrare in weekend",
    "updatedBy": "user-uuid",
    "createdAt": "2026-02-15T10:30:00.000Z",
    "updatedAt": "2026-02-18T14:00:00.000Z"
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Note must be a string` |
