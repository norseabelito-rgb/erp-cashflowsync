# API Picking

Endpoint-uri pentru gestionarea picking list-urilor: creare, vizualizare, scanare produse, finalizare si generare PDF.

**Fisiere sursa:**
- `src/app/api/picking/route.ts`
- `src/app/api/picking/[id]/route.ts`
- `src/app/api/picking/[id]/print/route.ts`
- `src/app/api/picking/aggregate/route.ts`
- `src/app/api/picking/logs/route.ts`

---

## GET /api/picking

Returneaza lista picking list-urilor cu paginare, filtrare si statistici.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `picking.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `20` | Picking lists per pagina |
| `status` | string | - | Filtru status: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `search` | string | - | Cautare in cod, nume, numar AWB, numar comanda |
| `assignedTo` | string | - | Filtru dupa picker asignat (UUID) |

### Raspuns (200)

```json
{
  "pickingLists": [
    {
      "id": "pl-uuid",
      "code": "PL-M1ABCDE",
      "name": "Picking 18.02.2026 - 5 AWB-uri",
      "status": "IN_PROGRESS",
      "totalItems": 8,
      "totalQuantity": 15,
      "pickedQuantity": 10,
      "createdBy": "user-uuid",
      "createdByName": "Admin",
      "startedAt": "2026-02-18T10:00:00.000Z",
      "startedBy": "picker-uuid",
      "startedByName": "Picker Ion",
      "createdAt": "2026-02-18T09:30:00.000Z",
      "items": [
        {
          "id": "item-uuid",
          "sku": "PROD-001",
          "title": "Produs Test",
          "quantityRequired": 5,
          "quantityPicked": 3,
          "isComplete": false
        }
      ],
      "awbs": [
        {
          "awb": {
            "id": "awb-uuid",
            "awbNumber": "2024123456789",
            "currentStatus": "In asteptare",
            "order": {
              "shopifyOrderNumber": "#58537",
              "customerFirstName": "Ion",
              "customerLastName": "Popescu"
            }
          }
        }
      ],
      "_count": {
        "items": 8,
        "awbs": 5
      }
    }
  ],
  "stats": {
    "total": 50,
    "pending": 5,
    "inProgress": 3,
    "completed": 40,
    "cancelled": 2
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

## POST /api/picking

Creeaza un picking list nou din AWB-uri selectate.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `picking.create`

### Request Body

```typescript
{
  awbIds: string[];        // Array de UUID-uri AWB
  name?: string;           // Nume personalizat
  assignedTo?: string;     // UUID picker asignat
  createdBy?: string;      // UUID creator
}
```

### Logica de agregare

Produsele din toate comenzile asociate AWB-urilor sunt agregate:
- Cheie unica: `SKU|variantTitle`
- Cantitatile se aduna daca acelasi produs apare in mai multe comenzi
- Se genereaza cod unic: `PL-{timestamp_base36}`

### Raspuns (200)

```json
{
  "success": true,
  "pickingList": {
    "id": "pl-uuid",
    "code": "PL-M1ABCDE",
    "name": "Picking 18.02.2026 - 5 AWB-uri",
    "totalItems": 8,
    "totalQuantity": 15,
    "items": [...],
    "awbs": [...]
  },
  "message": "Picking list creat cu 8 produse (15 bucati) din 5 AWB-uri"
}
```

---

## GET /api/picking/[id]

Returneaza detaliile unui picking list specific, inclusiv progresul.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `picking.view`

### Raspuns (200)

```json
{
  "pickingList": {
    "id": "pl-uuid",
    "code": "PL-M1ABCDE",
    "status": "IN_PROGRESS",
    "items": [
      {
        "id": "item-uuid",
        "sku": "PROD-001",
        "barcode": "5941234567890",
        "title": "Produs Test",
        "variantTitle": "Rosu / XL",
        "quantityRequired": 5,
        "quantityPicked": 3,
        "isComplete": false,
        "imageUrl": "https://...",
        "location": "Raft A3",
        "isRecipeParent": false
      }
    ],
    "awbs": [...]
  },
  "progress": {
    "totalItems": 8,
    "completedItems": 5,
    "totalQuantity": 15,
    "pickedQuantity": 10,
    "percentComplete": 67
  }
}
```

**Nota:** Produsele parinte (cu `isRecipeParent: true`) sunt excluse din calculul progresului.

---

## PATCH /api/picking/[id]

Actualizeaza un picking list. Suporta multiple actiuni prin campul `action`.

### Actiune: `scan` - Scanare barcode/SKU

Scaneaza un produs in picking list si deduce stocul automat.

```json
{
  "action": "scan",
  "barcode": "5941234567890",
  "sku": "PROD-001",
  "quantity": 1,
  "pickedBy": "user-uuid"
}
```

**Deducere stoc (non-blocking):**
- Cauta `MasterProduct` dupa `masterProductId` sau `sku`
- Daca are `inventoryItemId`, deduce din `WarehouseStockLevel` (depozitul primar)
- Daca nu, foloseste stocul legacy din `MasterProduct.stock`
- Erorile de stoc sunt logate dar NU opresc picking-ul

**Raspuns:**

```json
{
  "success": true,
  "message": "Produs Test: 4/5",
  "item": { "..." },
  "isComplete": false,
  "remaining": 1,
  "stockDeducted": 1
}
```

### Actiune: `pickItem` - Marcare manuala

Similar cu `scan` dar prin ID item (nu barcode).

```json
{
  "action": "pickItem",
  "itemId": "item-uuid",
  "quantity": 2,
  "userId": "user-uuid",
  "userName": "Picker Ion"
}
```

**Nota:** Daca se incearca scanarea in surplus (dupa completare), se logheaza ca `SURPLUS_ATTEMPT`.

### Actiune: `start` - Preluare picking list

```json
{
  "action": "start",
  "userId": "user-uuid",
  "userName": "Picker Ion"
}
```

Marcheaza picking list-ul ca `IN_PROGRESS`. Nu permite preluarea daca a fost deja preluat de altcineva.

### Actiune: `complete` - Finalizare

```json
{
  "action": "complete",
  "userId": "user-uuid",
  "userName": "Picker Ion"
}
```

Valideaza ca toate produsele sunt complete, genereaza PDF si notifica administratorii.

**Erori:**

| Status | Mesaj |
|--------|-------|
| 400 | `Mai sunt N produse incomplete. Nu poti finaliza pana nu sunt toate produsele ridicate.` |

### Actiune: `cancel` - Anulare

```json
{
  "action": "cancel"
}
```

Nu se poate anula un picking list deja finalizat.

### Actiune: `resetItem` - Resetare produs

```json
{
  "action": "resetItem",
  "itemId": "item-uuid"
}
```

Reseteaza cantitatea scanata la 0 si restaureaza stocul dedus (non-blocking).

### Actualizare generala

Fara `action`, actualizeaza campuri generale:

```json
{
  "name": "Picking Nou Nume",
  "assignedTo": "picker-uuid",
  "notes": "Nota interna"
}
```

---

## DELETE /api/picking/[id]

Sterge un picking list.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `picking.create`

### Validari

- Nu se poate sterge un picking list cu status `IN_PROGRESS`

### Raspuns (200)

```json
{
  "success": true,
  "message": "Picking list sters"
}
```
