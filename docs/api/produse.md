# API Produse

Endpoint-uri pentru gestionarea produselor master: CRUD, canale de vanzare (Shopify), retete, mapare inventar, import/export, sincronizare imagini si publicare bulk.

**Fisiere sursa:**
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/products/[id]/channels/route.ts`
- `src/app/api/products/recipes/route.ts`
- `src/app/api/products/inventory-mapping/route.ts`
- `src/app/api/products/import/route.ts`
- `src/app/api/products/export/route.ts`
- `src/app/api/products/sync-stock/route.ts`
- `src/app/api/products/sync-images/route.ts`
- `src/app/api/products/sync-shopify/route.ts`
- `src/app/api/products/bulk/route.ts`
- `src/app/api/products/ids/route.ts`
- `src/app/api/products/bulk-publish/route.ts`
- `src/app/api/products/bulk-publish/[jobId]/route.ts`
- `src/app/api/products/backfill-handles/route.ts`

---

## Concepte

### Produs Master (MasterProduct)

Entitatea centrala care reprezinta un produs in catalog. Contine informatiile de baza (SKU, titlu, pret, descriere) si poate fi publicat pe mai multe canale de vanzare.

### Canale de vanzare (Channels)

Fiecare produs poate fi publicat pe mai multe canale (ex: Shopify stores). Asocierea `MasterProductChannel` pastreaza:
- `externalId` - ID-ul produsului in Shopify
- `externalHandle` - handle-ul URL din Shopify
- `overrides` - suprascrieri locale (titlu, pret, descriere diferite per canal)
- `isPublished` / `isActive` - stare publicare si sincronizare

### Retete (Produse compuse)

Un produs poate fi marcat ca `isComposite: true` si poate avea componente (reteta). La picking, componentele sunt expandate individual.

### Mapare Inventar

Produsele master pot fi mapate la articole din inventar (`InventoryItem`) prin campul `inventoryItemId`, ceea ce permite urmarirea stocului din depozite.

---

## GET /api/products

Returneaza lista produselor master cu canale, categorii, stocuri si paginare.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Produse per pagina |
| `search` | string | - | Cautare in SKU, titlu sau tag-uri |
| `categoryId` | string | - | Filtru dupa categorie |
| `channelId` | string | - | Doar produse publicate pe un canal |
| `hasTrendyolCategory` | `"true"` | - | Doar produse cu categorie mapata la Trendyol |

### Raspuns (200)

```json
{
  "success": true,
  "products": [
    {
      "id": "prod-uuid",
      "sku": "PROD-001",
      "title": "Produs Exemplu",
      "description": "Descriere produs",
      "price": "125.00",
      "compareAtPrice": "150.00",
      "tags": ["nou", "popular"],
      "isActive": true,
      "isComposite": false,
      "stock": 50,
      "barcode": "5941234567890",
      "category": {
        "id": "cat-uuid",
        "name": "Categoria Principala",
        "trendyolCategoryId": "12345",
        "trendyolCategoryName": "Elektronik"
      },
      "images": [
        { "url": "/api/drive-image/abc123", "position": 0 }
      ],
      "channels": [
        {
          "channelId": "ch-uuid",
          "isPublished": true,
          "isActive": true,
          "externalId": "8901234567890",
          "channel": {
            "id": "ch-uuid",
            "name": "Magazin RO",
            "type": "SHOPIFY"
          }
        }
      ]
    }
  ],
  "channels": [
    { "id": "ch-uuid", "name": "Magazin RO", "type": "SHOPIFY" }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 200,
    "totalPages": 4
  }
}
```

**Nota:** Stocul afisat este preluat din `InventoryItem` (lookup dupa SKU, case-insensitive). Daca nu exista articol de inventar, stocul este 0.

---

## POST /api/products

Creeaza un produs master nou.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.create`

### Request Body

```typescript
{
  sku: string;               // Obligatoriu, se salveaza uppercase
  title: string;             // Obligatoriu
  description?: string;
  price: number;             // Obligatoriu, >= 0
  compareAtPrice?: number;
  tags?: string[];
  categoryId?: string;
  driveFolderUrl?: string;   // URL folder Google Drive cu imagini
  channelIds?: string[];     // Canale pe care sa fie publicat la creare
  stock?: number;            // Stoc initial
  inventoryItemId?: string;  // Mapare directa la articol inventar
}
```

### Raspuns (200)

```json
{
  "success": true,
  "product": {
    "id": "prod-uuid",
    "sku": "PROD-NOU",
    "title": "Produs Nou",
    "price": "125.00",
    "channels": [...],
    "category": {...},
    "inventoryItem": {
      "id": "inv-uuid",
      "sku": "PROD-NOU",
      "name": "Material Produs"
    }
  },
  "message": "Produs creat cu succes"
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `SKU-ul este obligatoriu` |
| 400 | `Titlul este obligatoriu` |
| 400 | `Prețul este obligatoriu și trebuie să fie pozitiv` |
| 409 | `Există deja un produs cu acest SKU` |

---

## PUT /api/products

Actualizeaza un produs master existent. Daca produsul are Trendyol barcode si status approved, se triggereaza sincronizare Trendyol (fire-and-forget).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Request Body

```typescript
{
  id: string;                    // Obligatoriu
  title?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  tags?: string[];
  categoryId?: string;
  driveFolderUrl?: string;
  isActive?: boolean;
  propagateToChannels?: boolean; // Reseteaza override-uri pe canale
  channelsToUpdate?: string[];   // Array de channelIds de actualizat
}
```

### Propagare la canale

Daca `propagateToChannels: true` si `channelsToUpdate` contine channel IDs, override-urile acelor canale sunt resetate (golite) si `lastSyncedAt` este setat la `null` pentru a declansa re-sincronizarea.

### Raspuns (200)

```json
{
  "success": true,
  "product": { "..." },
  "message": "Produs actualizat cu succes"
}
```

---

## DELETE /api/products

Sterge un produs master si toate asocierile (canale, imagini - cascade).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.delete`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `id` | string | UUID-ul produsului |

### Raspuns (200)

```json
{
  "success": true,
  "message": "Produs șters cu succes"
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `ID-ul produsului este obligatoriu` |
| 404 | `Produsul nu există` |

**Nota:** Stergerea din Shopify nu este implementata inca (TODO).

---

## GET /api/products/[id]

Returneaza detaliile complete ale unui produs, inclusiv imagini, canale si stoc din inventar.

### Raspuns (200)

```json
{
  "success": true,
  "product": {
    "id": "prod-uuid",
    "sku": "PROD-001",
    "title": "Produs Exemplu",
    "stock": 50,
    "category": { "..." },
    "images": [
      {
        "url": "/api/drive-image/abc123",
        "filename": "img1.jpg",
        "position": 0,
        "driveFileId": "abc123"
      }
    ],
    "channels": [
      {
        "channelId": "ch-uuid",
        "isPublished": true,
        "externalId": "8901234567890",
        "overrides": {},
        "channel": {
          "id": "ch-uuid",
          "name": "Magazin RO",
          "type": "SHOPIFY",
          "store": {
            "id": "store-uuid",
            "name": "Magazin",
            "shopifyDomain": "shop.myshopify.com"
          }
        }
      }
    ]
  },
  "allChannels": [
    { "id": "ch-uuid", "name": "Magazin RO", "type": "SHOPIFY" }
  ]
}
```

---

## Canale Produs

---

### GET /api/products/[id]/channels

Returneaza canalele pe care este publicat un produs.

### Raspuns (200)

```json
{
  "success": true,
  "channels": [
    {
      "productId": "prod-uuid",
      "channelId": "ch-uuid",
      "isPublished": true,
      "isActive": true,
      "externalId": "8901234567890",
      "overrides": {},
      "channel": {
        "id": "ch-uuid",
        "name": "Magazin RO",
        "type": "SHOPIFY"
      }
    }
  ]
}
```

---

### POST /api/products/[id]/channels

Adauga un produs pe un canal. Daca canalul este Shopify, creeaza produsul in Shopify automat.

### Request Body

```typescript
{
  channelId: string;       // Obligatoriu
  isPublished?: boolean;   // Default: true
  isActive?: boolean;      // Default: true
  overrides?: {            // Suprascrieri per canal
    title?: string;
    description?: string;
    price?: number;
    compareAtPrice?: number;
  };
}
```

### Flux Shopify

1. Preia produsul master cu imagini
2. Converteste imaginile Google Drive in URL-uri publice (`lh3.googleusercontent.com`)
3. Creeaza produsul in Shopify cu variante, imagini si descriere HTML
4. Salveaza `externalId` (Shopify product ID) si `shopifyVariantId`

### Raspuns (200)

```json
{
  "success": true,
  "productChannel": { "..." },
  "message": "Produs adăugat pe canal și creat în Shopify (ID: 8901234567890)"
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `ID-ul canalului este obligatoriu` |
| 400 | `Produsul este deja pe acest canal` |
| 404 | `Produsul nu a fost găsit` |
| 404 | `Canalul nu a fost găsit` |
| 500 | `Eroare Shopify: ...` |

---

### PUT /api/products/[id]/channels

Actualizeaza override-urile unui produs pe un canal. Sincronizeaza la Shopify daca e cazul.

### Request Body

```typescript
{
  channelId: string;             // Obligatoriu
  isPublished?: boolean;
  isActive?: boolean;
  overrides?: Record<string, any>;   // Merge cu existente
  resetOverrides?: string[];     // Campuri de resetat
  resetAll?: boolean;            // Reseteaza toate override-urile
  syncToShopify?: boolean;       // Default: true
}
```

### Logica override-uri

- `resetAll: true` - goleste toate override-urile
- `resetOverrides: ["title", "price"]` - sterge doar acele campuri
- `overrides: { title: "Alt Titlu" }` - merge cu cele existente (null/undefined = sterge)

---

### DELETE /api/products/[id]/channels

Sterge un produs de pe un canal. Daca e Shopify si are `externalId`, incearca stergerea din Shopify (best-effort).

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `channelId` | string | UUID-ul canalului |

---

## Retete

---

### GET /api/products/recipes

Returneaza retetele produselor compuse.

**Autentificare:** Sesiune NextAuth

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `productId` | string | UUID produs (returneaza reteta specifica) |
| `sku` | string | SKU produs (alternativa la productId) |

### Raspuns - Produs specific (200)

```json
{
  "product": {
    "id": "prod-uuid",
    "sku": "KIT-001",
    "title": "Kit Complet",
    "isComposite": true
  },
  "recipe": [
    {
      "id": "recipe-uuid",
      "componentId": "comp-uuid",
      "componentSku": "COMP-001",
      "componentTitle": "Component 1",
      "componentBarcode": "5941234567890",
      "componentStock": 100,
      "componentLocation": "Raft A3",
      "componentIsComposite": false,
      "quantity": 2,
      "unit": "buc",
      "sortOrder": 0
    }
  ]
}
```

### Raspuns - Toate produsele compuse (200)

Daca nu se specifica `productId` sau `sku`, returneaza toate produsele compuse cu retetele lor.

```json
{
  "products": [
    {
      "id": "prod-uuid",
      "sku": "KIT-001",
      "title": "Kit Complet",
      "isComposite": true,
      "componentsCount": 3,
      "components": [
        {
          "sku": "COMP-001",
          "title": "Component 1",
          "quantity": 2,
          "unit": "buc"
        }
      ]
    }
  ]
}
```

---

### POST /api/products/recipes

Creeaza sau inlocuieste complet reteta unui produs.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Request Body

```typescript
{
  productId: string;         // Obligatoriu
  components: Array<{
    componentId: string;     // UUID-ul componentului
    quantity?: number;       // Default: 1
    unit?: string;           // Default: "buc"
  }>;
}
```

### Validari

- Componentul trebuie sa existe in baza de date
- Un produs nu poate fi component al lui insusi (auto-referinta)
- Daca `components` e gol, produsul este marcat ca non-compus

### Raspuns (200)

```json
{
  "success": true,
  "message": "Rețeta a fost actualizată",
  "product": {
    "id": "prod-uuid",
    "sku": "KIT-001",
    "title": "Kit Complet",
    "isComposite": true,
    "components": [...]
  }
}
```

---

### DELETE /api/products/recipes

Sterge reteta unui produs si il marcheaza ca non-compus.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `productId` | string | UUID-ul produsului |

---

## Mapare Inventar

---

### GET /api/products/inventory-mapping

Returneaza produsele cu statusul maparii la inventar.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `page` | number | `1` | Pagina curenta |
| `limit` | number | `50` | Produse per pagina |
| `search` | string | - | Cautare in SKU sau titlu |
| `mappingStatus` | string | - | `all`, `mapped` sau `unmapped` |

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod-uuid",
        "sku": "PROD-001",
        "title": "Produs Test",
        "price": "125.00",
        "stock": 50,
        "isActive": true,
        "inventoryItemId": "inv-uuid",
        "inventoryItem": {
          "id": "inv-uuid",
          "sku": "PROD-001",
          "name": "Material Produs",
          "currentStock": "150",
          "unit": "buc",
          "isComposite": false
        },
        "images": [{ "url": "/api/drive-image/abc" }]
      }
    ],
    "stats": {
      "total": 200,
      "mapped": 150,
      "unmapped": 50
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "totalPages": 4
    }
  }
}
```

**Nota:** Sortarea pune produsele nemapate primele (`inventoryItemId ASC` - null vine primul).

---

### PUT /api/products/inventory-mapping

Mapeaza un produs la un articol de inventar.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Request Body

```typescript
{
  productId: string;            // Obligatoriu
  inventoryItemId?: string;     // null = elimina maparea
}
```

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "id": "prod-uuid",
    "inventoryItemId": "inv-uuid",
    "inventoryItem": {
      "id": "inv-uuid",
      "sku": "PROD-001",
      "name": "Material Produs",
      "currentStock": "150",
      "unit": "buc"
    }
  },
  "message": "Produsul a fost mapat la \"Material Produs\""
}
```

---

### POST /api/products/inventory-mapping

Auto-mapare bulk pe baza SKU-ului (case-insensitive).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Request Body

```json
{
  "action": "auto-match"
}
```

### Raspuns (200)

```json
{
  "success": true,
  "data": {
    "matched": 45,
    "unmatched": 5
  },
  "message": "45 produse au fost mapate automat pe baza SKU-ului"
}
```

---

## Import / Export

---

### POST /api/products/import

Importa produse dintr-un fisier Excel (.xlsx / .xls).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.create`

### Request Body (multipart/form-data)

| Camp | Tip | Descriere |
|------|-----|-----------|
| `file` | File | Fisier Excel (.xlsx sau .xls) |
| `mode` | string | `create` (doar noi), `update` (doar existente), `upsert` (ambele, default) |

### Flux de procesare

1. Parseaza fisierul Excel
2. Pentru fiecare rand: valideaza SKU, titlu, pret
3. Lookup categorie dupa nume (creeaza daca nu exista)
4. In functie de mod: creeaza, actualizeaza sau ambele
5. Returneaza rezultat cu contor create/actualizate/omise/erori

### Raspuns (200)

```json
{
  "success": true,
  "message": "Import finalizat: 15 create, 8 actualizate, 2 omise",
  "results": {
    "created": 15,
    "updated": 8,
    "skipped": 2,
    "errors": [
      { "row": 5, "sku": "BAD-SKU", "error": "Prețul este obligatoriu și trebuie să fie un număr" }
    ]
  }
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 400 | `Fișierul este obligatoriu` |
| 400 | `Tip fișier invalid. Încarcă un fișier Excel (.xlsx sau .xls)` |
| 400 | `Nu există date de importat` |

---

### GET /api/products/import

Descarca template-ul Excel gol pentru import.

### Raspuns

Fisier `template_produse.xlsx` descarcabil.

---

### GET /api/products/export

Exporta produsele in format CSV, XLSX sau JSON.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.view`

### Query Parameters

| Parametru | Tip | Default | Descriere |
|-----------|-----|---------|-----------|
| `format` | string | `csv` | `csv`, `xlsx`, `excel` sau `json` |
| `categoryId` | string | - | Filtru dupa categorie |
| `channelId` | string | - | Doar produse publicate pe un canal |
| `isActive` | `"true"` \| `"false"` | - | Filtru active/inactive |

### Coloane export

Coloane de baza: SKU, Barcode, Titlu, Descriere, Pret, Pret_Comparat, Categorie, Tags, Greutate_kg, Locatie_Depozit, Stoc, Activ, Inventar_SKU, Este_Compus, Trendyol_Barcode, Trendyol_Brand.

**Coloane dinamice:** Se adauga automat o coloana `Link_{NumeMagazin}` pentru fiecare magazin activ, continand URL-ul public al produsului pe acel magazin (ex: `https://shop.myshopify.com/products/handle`).

### Raspuns

- `format=json`: JSON cu array `products`
- `format=csv`: Fisier CSV cu BOM UTF-8
- `format=xlsx`: Fisier Excel

---

## Sincronizare Stoc

---

### POST /api/products/sync-stock

Sincronizeaza stocurile din `InventoryItem` in `MasterProduct.stock`.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Flux

1. Citeste toate produsele master active
2. Calculeaza stocul total din `inventoryItems` (suma pe toate depozitele)
3. Actualizeaza doar produsele cu stoc diferit
4. Logheaza sincronizarea in activity log

### Raspuns (200)

```json
{
  "success": true,
  "message": "Sincronizare completă: 12 produse actualizate",
  "data": {
    "totalProducts": 200,
    "updatedProducts": 12,
    "productsWithoutInventory": 5,
    "updates": [
      { "sku": "PROD-001", "oldStock": 45, "newStock": 50 }
    ]
  }
}
```

**Nota:** `updates` este limitat la 100 de intrari in raspuns.

---

## Sincronizare Imagini (Google Drive)

---

### GET /api/products/sync-images

Preview sincronizare imagini: verifica configurarea Google Drive si listeaza folderele cu imagini.

### Raspuns (200)

```json
{
  "success": true,
  "configured": true,
  "lastSync": "2026-02-17T10:00:00.000Z",
  "folderId": "drive-folder-id",
  "stats": {
    "totalFolders": 150,
    "matchedProducts": 140,
    "unmatchedFolders": 10
  },
  "preview": [
    {
      "folderName": "PROD-001",
      "sku": "PROD-001",
      "imagesCount": 5,
      "imageNames": ["img1.jpg", "img2.jpg"],
      "matched": true,
      "productId": "prod-uuid",
      "productTitle": "Produs Test",
      "currentImagesCount": 3
    }
  ]
}
```

**Nota:** Preview-ul este limitat la 50 de foldere.

---

### POST /api/products/sync-images

Ruleaza sincronizarea imaginilor din Google Drive.

### Request Body

```typescript
{
  dryRun?: boolean;       // Default: false - doar preview
  specificSku?: string;   // Sincronizeaza doar un SKU
}
```

### Flux

1. Citeste folderele din Google Drive (fiecare folder = un SKU)
2. Potriveste cu produsele master dupa SKU (case-insensitive)
3. Pentru fiecare produs: adauga imaginile noi (skip duplicate pe URL)
4. Actualizeaza `googleDriveLastSync` in settings

### Raspuns (200)

```json
{
  "success": true,
  "dryRun": false,
  "stats": {
    "total": 150,
    "synced": 140,
    "notFound": 10,
    "errors": 0,
    "imagesAdded": 45,
    "imagesSkipped": 300,
    "imagesUpdated": 0,
    "imagesRemoved": 0,
    "imageErrors": []
  },
  "results": [
    {
      "sku": "PROD-001",
      "productId": "prod-uuid",
      "imagesFound": 5,
      "imagesAdded": 2,
      "imagesSkipped": 3,
      "status": "synced"
    }
  ]
}
```

---

## Sincronizare Shopify

---

### POST /api/products/sync-shopify

Sincronizeaza toate produsele cu canale Shopify active. Creeaza produse noi sau actualizeaza cele existente.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.edit`

### Flux

1. Preia toate `MasterProductChannel` active cu canal Shopify
2. Grupeaza pe store pentru a reutiliza clientul Shopify
3. Calculeaza valorile finale (master + override-uri)
4. Daca nu are `externalId` - creeaza in Shopify
5. Daca are `externalId` - actualizeaza in Shopify
6. Actualizeaza `lastSyncedAt` si `externalId` in DB

### Raspuns (200)

```json
{
  "success": true,
  "message": "Sincronizare completă: 5 create, 30 actualizate, 2 erori",
  "results": {
    "created": 5,
    "updated": 30,
    "errors": ["PROD-ERR: 404 Not Found"],
    "skipped": 0
  }
}
```

---

## Operatii Bulk

---

### POST /api/products/bulk

Executa actiuni in masa pe produse selectate.

### Request Body

```typescript
{
  action: string;          // Actiunea de executat
  productIds: string[];    // Array de UUID-uri produse
  data: Record<string, any>; // Date specifice actiunii
}
```

### Actiuni disponibile

| Actiune | Data | Descriere |
|---------|------|-----------|
| `change-category` | `{ categoryId }` | Schimba categoria |
| `add-tags` | `{ tags: string[] }` | Adauga tag-uri |
| `remove-tags` | `{ tags: string[] }` | Sterge tag-uri |
| `publish-channel` | `{ channelId }` | Publica pe canal (cu push Shopify) |
| `unpublish-channel` | `{ channelId }` | Depublica de pe canal |
| `activate-channel` | `{ channelId }` | Activeaza sync pe canal |
| `deactivate-channel` | `{ channelId }` | Dezactiveaza sync pe canal |
| `delete` | - | Sterge produsele |

### Raspuns (200)

```json
{
  "success": true,
  "action": "publish-channel",
  "result": {
    "created": 3,
    "updated": 2,
    "total": 5,
    "success": 5,
    "failed": 0
  },
  "message": "3 create, 2 actualizate"
}
```

**Nota:** La `publish-channel`, erorile Shopify sunt salvate in campul `syncError` al canalului.

---

### GET /api/products/ids

Returneaza doar ID-urile produselor filtrate (pentru selectie bulk eficienta).

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.view`

### Query Parameters

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `search` | string | Cautare in SKU, titlu, barcode |
| `categoryId` | string | Filtru categorie |
| `channelId` | string | Filtru canal |

### Raspuns (200)

```json
{
  "success": true,
  "ids": ["prod-uuid-1", "prod-uuid-2"],
  "total": 200
}
```

---

## Publicare Bulk (Job-uri background)

---

### POST /api/products/bulk-publish

Creeaza un job de publicare bulk pe canale Shopify. Procesarea se face in background.

### Request Body

```typescript
{
  productIds: string[];    // Array de UUID-uri produse
  channelIds: string[];    // Array de UUID-uri canale (trebuie sa fie SHOPIFY)
}
```

### Validari

- Cel putin un produs si un canal
- Canalele trebuie sa fie de tip `SHOPIFY`
- Nu poate exista un alt job activ

### Raspuns (200)

```json
{
  "success": true,
  "jobId": "job-uuid",
  "message": "Job creat. Se procesează 50 produse pe 2 canale."
}
```

### Erori

| Status | Mesaj |
|--------|-------|
| 409 | `Există deja un job de publicare în curs` |
| 400 | `Nu există canale Shopify valide în selecție` |

---

### GET /api/products/bulk-publish

Returneaza job-ul activ (daca exista).

### Raspuns (200)

```json
{
  "active": true,
  "job": {
    "id": "job-uuid",
    "status": "RUNNING",
    "progress": {
      "total": 100,
      "done": 45,
      "percent": 45,
      "created": 30,
      "updated": 10,
      "failed": 5
    },
    "channelProgress": {
      "ch-uuid": {
        "name": "Magazin RO",
        "total": 50,
        "done": 25,
        "created": 20,
        "updated": 3,
        "failed": 2,
        "errors": ["PROD-ERR: 422 Validation Error"]
      }
    },
    "startedAt": "2026-02-18T10:00:00.000Z",
    "completedAt": null,
    "errorMessage": null
  }
}
```

---

### GET /api/products/bulk-publish/[jobId]

Returneaza statusul detaliat al unui job, inclusiv estimare timp ramas.

### Raspuns (200)

```json
{
  "id": "job-uuid",
  "status": "RUNNING",
  "progress": {
    "total": 100,
    "done": 45,
    "percent": 45,
    "created": 30,
    "updated": 10,
    "failed": 5
  },
  "channelProgress": { "..." },
  "currentChannel": "Magazin RO",
  "startedAt": "2026-02-18T10:00:00.000Z",
  "completedAt": null,
  "estimatedTimeRemaining": "2m 30s",
  "errorMessage": null
}
```

### Statusuri job

| Status | Descriere |
|--------|-----------|
| `PENDING` | Creat, inca nu a inceput |
| `RUNNING` | In curs de procesare |
| `COMPLETED` | Finalizat cu succes |
| `COMPLETED_WITH_ERRORS` | Finalizat cu unele erori |
| `FAILED` | Esuat complet |
| `CANCELLED` | Anulat de utilizator |

---

### DELETE /api/products/bulk-publish/[jobId]

Anuleaza un job in curs.

### Validari

- Job-ul trebuie sa fie `PENDING` sau `RUNNING`

### Raspuns (200)

```json
{
  "success": true,
  "message": "Job-ul a fost anulat"
}
```

---

## Backfill Handles

---

### POST /api/products/backfill-handles

Populeaza `externalHandle` (URL handle din Shopify) pentru produsele care au `externalId` dar nu au handle. Proceseaza in batch-uri de 50 cu pauza intre ele.

**Autentificare:** Sesiune NextAuth
**Permisiune:** `products.manage`

### Raspuns (200)

```json
{
  "message": "Backfill complet",
  "updated": 45,
  "failed": 2,
  "errors": ["8901234567890: 404 Not Found"]
}
```
