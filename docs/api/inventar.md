# API Inventar

Endpoint-uri pentru gestionarea inventarului: articole, depozite, stocuri, retete, ajustari si export.

**Fisiere sursa:**
- `src/app/api/inventory/route.ts`
- `src/app/api/inventory-items/route.ts`
- `src/app/api/inventory-items/[id]/route.ts`
- `src/app/api/inventory-items/stock-adjustment/route.ts`
- `src/app/api/inventory-items/stock-check/route.ts`
- `src/app/api/inventory-items/stock-report/route.ts`
- `src/app/api/inventory-items/low-stock-alerts/route.ts`
- `src/app/api/inventory-items/recipes/route.ts`
- `src/app/api/inventory-items/import/route.ts`
- `src/app/api/inventory-items/export/route.ts`
- `src/app/api/inventory-items/bulk-delete/route.ts`
- `src/app/api/warehouses/route.ts`
- `src/app/api/warehouses/[id]/route.ts`
- `src/app/api/warehouses/[id]/stock/route.ts`
- `src/app/api/warehouses/[id]/set-primary/route.ts`

---

## GET /api/inventory

Returneaza lista produselor din inventarul legacy (tabelul `Product`). Folosit pentru dropdown-uri de SKU.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `inventory.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `search` | string | Cautare in SKU sau nume |
| `excludeUsed` | `"true"` | Exclude SKU-urile deja folosite in MasterProduct |

### Raspuns (200)

```json
{
  "success": true,
  "products": [
    {
      "id": "prod-uuid",
      "sku": "MAT-001",
      "name": "Material Exemplu",
      "price": "15.50",
      "stockQuantity": 100,
      "description": "Material de ambalare"
    }
  ]
}
```

**Nota:** Limitat la 100 rezultate pentru performanta.

---

## GET /api/inventory-items

Returneaza articolele din inventar (tabelul `InventoryItem`) cu paginare, filtrare si statistici.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `inventory.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Articole per pagina |
| `search` | string | - | Cautare in SKU sau nume |
| `isComposite` | `"true"` \| `"false"` | - | Filtru articole compuse/individuale |
| `isActive` | `"true"` \| `"false"` | - | Filtru articole active/inactive |
| `supplierId` | string | - | Filtru dupa furnizor |
| `lowStock` | `"true"` | - | Doar articole cu stoc sub `minStock` |
| `excludeMapped` | `"true"` | - | Exclude articolele deja mapate la produse |
| `grouped` | `"true"` | - | Returneaza articolele grupate (disponibile vs. asignate) |
| `warehouseId` | string | - | Filtru per depozit |
| `includeWarehouseStock` | `"true"` | - | Include stocuri detaliate per depozit |

### Raspuns (200) - Standard

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-uuid",
        "sku": "MAT-001",
        "name": "Material Ambalare",
        "description": "Cutie carton 30x20x15",
        "currentStock": "150",
        "minStock": "50",
        "unit": "buc",
        "unitsPerBox": 100,
        "boxUnit": "cutie",
        "costPrice": "2.50",
        "isComposite": false,
        "isActive": true,
        "supplier": {
          "id": "supplier-uuid",
          "name": "Furnizor SRL"
        },
        "recipeComponents": [],
        "_count": {
          "mappedProducts": 2,
          "stockMovements": 45
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "totalPages": 4
    },
    "stats": {
      "totalItems": 200,
      "compositeItems": 15,
      "individualItems": 185,
      "lowStockItems": 8
    }
  }
}
```

### Raspuns (200) - Grouped (`grouped=true`)

```json
{
  "success": true,
  "data": {
    "available": [
      {
        "id": "item-uuid-1",
        "sku": "MAT-003",
        "name": "Material Nemapat",
        "currentStock": "200",
        "costPrice": "1.50",
        "unit": "buc"
      }
    ],
    "assigned": [
      {
        "id": "item-uuid-2",
        "sku": "MAT-001",
        "name": "Material Ambalare",
        "currentStock": "150",
        "costPrice": "2.50",
        "unit": "buc",
        "assignedTo": {
          "productId": "prod-uuid",
          "productName": "Produs Final"
        }
      }
    ]
  }
}
```

---

## POST /api/inventory-items

Creeaza un articol nou in inventar.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `inventory.edit`

### Request Body

```typescript
{
  sku: string;                    // Obligatoriu, unic
  name: string;                   // Obligatoriu
  description?: string;
  currentStock?: number;          // Stoc initial (ignorat pt compuse)
  minStock?: number;              // Prag alertare stoc scazut
  unit?: string;                  // Default: "buc"
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  isComposite?: boolean;          // Default: false
  supplierId?: string;
  recipeComponents?: Array<{      // Doar pt articole compuse
    componentItemId: string;
    quantity: number;
    unit: string;
  }>;
}
```

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "id": "item-uuid",
    "sku": "MAT-NEW",
    "name": "Articol Nou",
    "currentStock": "100",
    "..."
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `SKU si numele sunt obligatorii` |
| 400 | `SKU-ul "MAT-001" exista deja` |

---

## PUT /api/inventory-items

Actualizeaza un articol existent. Daca e compus, permite actualizarea componentelor retetei.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `inventory.edit`

### Request Body

```typescript
{
  id: string;                     // Obligatoriu
  name?: string;
  description?: string;
  minStock?: number;
  unit?: string;
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  isActive?: boolean;
  supplierId?: string;
  recipeComponents?: Array<{      // Inlocuieste complet componentele
    componentItemId: string;
    quantity: number;
    unit: string;
  }>;
}
```

---

## DELETE /api/inventory-items

Sterge un articol din inventar.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `inventory.edit`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `id` | string | UUID-ul articolului |

### Validari

- Nu se poate sterge daca articolul este mapat la produse
- Nu se poate sterge daca articolul este folosit in retete

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Articolul este mapat la N produse. Demapeaza-le mai intai.` |
| 400 | `Articolul este folosit in N retete. Elimina-l din retete mai intai.` |
| 404 | `Articolul nu a fost gasit` |

---

## Depozite (Warehouses)

---

## GET /api/warehouses

Returneaza lista depozitelor la care utilizatorul are acces.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `warehouses.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `includeInactive` | `"true"` | Include depozitele inactive |
| `includeStock` | `"true"` | Include stocul total per depozit |

### Raspuns (200)

```json
{
  "warehouses": [
    {
      "id": "wh-uuid",
      "code": "WH-MAIN",
      "name": "Depozit Principal",
      "description": "Depozitul central",
      "address": "Str. Industriei 5, Bucuresti",
      "isPrimary": true,
      "isActive": true,
      "sortOrder": 0,
      "totalStock": 5000,
      "_count": {
        "stockLevels": 150,
        "stockMovements": 2000,
        "goodsReceipts": 45
      }
    }
  ]
}
```

---

## POST /api/warehouses

Creeaza un depozit nou.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `warehouses.create` (+ `warehouses.set_primary` daca `isPrimary=true`)

### Request Body

```typescript
{
  code: string;         // Obligatoriu, unic
  name: string;         // Obligatoriu
  description?: string;
  address?: string;
  isPrimary?: boolean;  // Daca true, dezactiveaza isPrimary pe toate celelalte
}
```

### Raspuns (201)

```json
{
  "id": "wh-uuid",
  "code": "WH-SEC",
  "name": "Depozit Secundar",
  "isPrimary": false,
  "isActive": true,
  "sortOrder": 1
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Codul si numele sunt obligatorii` |
| 400 | `Un depozit cu acest cod exista deja` |
