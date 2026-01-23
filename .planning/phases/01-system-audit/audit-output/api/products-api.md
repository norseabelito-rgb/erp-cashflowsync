# API: Products - Audit

**Auditat:** 2026-01-23
**Base Path:** /api/products
**Status:** Probleme Minore

## Rezumat

Products API gestioneaza produsele master (MasterProduct) cu canale de vanzare multiple. Include CRUD complet, sincronizare imagini din Google Drive, sincronizare stocuri din inventar local, operatii bulk si gestionare retete.

## Endpoints

### GET /api/products

| Aspect | Detalii |
|--------|---------|
| Scop | Lista produse master cu canale, categorie si stoc |
| Auth | Da - sesiune NextAuth |
| Permisiune | `products.view` |
| Parametri Query | `search`, `categoryId`, `channelId`, `hasTrendyolCategory`, `page`, `limit` |
| Response | `{ success, products, channels, pagination }` |
| Paginare | Da - default 50/pagina |
| Validare | Manual |
| Include | category (cu Trendyol info), images (prima), channels |
| Status | OK |

**Note:**
- Face lookup case-insensitive pentru stocuri din InventoryItem
- Include toate canalele active pentru header tabel
- Cautare in: sku, title, tags

**Fisier sursa:** `src/app/api/products/route.ts`

---

### POST /api/products

| Aspect | Detalii |
|--------|---------|
| Scop | Creeaza produs master nou |
| Auth | Da - sesiune NextAuth |
| Permisiune | `products.create` |
| Body | `{ sku, title, description?, price, compareAtPrice?, tags?, categoryId?, driveFolderUrl?, channelIds?, stock?, inventoryItemId? }` |
| Response | `{ success, product, message }` |
| Validare | Manual - verifica sku, title, price obligatorii |
| Side Effects | Creeaza asocieri cu canalele selectate |
| Status | OK |

**Validari:**
- SKU obligatoriu si unic (409 Conflict daca exista)
- Title obligatoriu
- Price >= 0

**Fisier sursa:** `src/app/api/products/route.ts`

---

### PUT /api/products

| Aspect | Detalii |
|--------|---------|
| Scop | Actualizeaza produs master existent |
| Auth | Da - sesiune NextAuth |
| Permisiune | `products.edit` |
| Body | `{ id, title?, description?, price?, compareAtPrice?, tags?, categoryId?, driveFolderUrl?, isActive?, propagateToChannels?, channelsToUpdate? }` |
| Response | `{ success, product, message }` |
| Validare | Manual - verifica id obligatoriu |
| Side Effects | Daca propagateToChannels=true, reseteaza overrides si markeaza pentru re-sync |
| Status | OK |

**Fisier sursa:** `src/app/api/products/route.ts`

---

### DELETE /api/products

| Aspect | Detalii |
|--------|---------|
| Scop | Sterge produs master (cascade sterge channels si images) |
| Auth | Da - sesiune NextAuth |
| Permisiune | `products.delete` |
| Parametri Query | `id` |
| Response | `{ success, message }` |
| Validare | Manual - verifica id obligatoriu |
| Side Effects | Cascade delete pe channels si images |
| Status | **TODO: nu sterge din Shopify** |

**Nota:**
> TODO in cod: "Șterge produsele din Shopify pentru fiecare canal" - nu este implementat

**Fisier sursa:** `src/app/api/products/route.ts`

---

### GET /api/products/sync-images

| Aspect | Detalii |
|--------|---------|
| Scop | Preview sincronizare imagini din Google Drive |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Response | `{ success, configured, lastSync, folderId, stats, preview }` |
| Validare | Verifica configurare Google Drive |
| Status | OK |

**Nota:**
- Listare foldere din Drive si matching cu SKU-uri
- Returneaza preview cu primele 50 foldere

**Fisier sursa:** `src/app/api/products/sync-images/route.ts`

---

### POST /api/products/sync-images

| Aspect | Detalii |
|--------|---------|
| Scop | Ruleaza sincronizare imagini din Google Drive |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Body | `{ dryRun?, specificSku? }` |
| Response | `{ success, dryRun, stats, results }` |
| Validare | Verifica configurare Google Drive |
| Side Effects | Sterge toate imaginile existente si le recreaza din Drive |
| Status | **BUG CUNOSCUT rezolvat** |

**Solutia la bug-ul Unique Constraint:**
> Bug-ul original: "Unique constraint failed on (productId, position)"
> Solutia actuala: Sterge toate imaginile existente inainte de a crea cele noi - evita conflictele de pozitie

**PROBLEMA potentiala:** Daca sync-ul esueaza dupa stergere, produsul ramane fara imagini.

**Fisier sursa:** `src/app/api/products/sync-images/route.ts`

---

### POST /api/products/sync-stock

| Aspect | Detalii |
|--------|---------|
| Scop | Sincronizeaza stocuri MasterProduct din InventoryItem |
| Auth | Da - sesiune NextAuth |
| Permisiune | `products.edit` |
| Body | (empty) |
| Response | `{ success, message, data: { totalProducts, updatedProducts, productsWithoutInventory, updates } }` |
| Validare | - |
| Side Effects | Actualizeaza stock pe MasterProduct, log activitate |
| Status | OK |

**Note:**
- Calculeaza totalStock din toate warehouseId-urile
- SmartBill sync dezactivat - foloseste doar inventar local

**Fisier sursa:** `src/app/api/products/sync-stock/route.ts`

---

### POST /api/products/bulk

| Aspect | Detalii |
|--------|---------|
| Scop | Operatii bulk pe produse (change category, tags, publish/unpublish channel, delete) |
| Auth | Nu explicit (doar NextAuth implicit) |
| Permisiune | **Lipsa verificare permisiune!** |
| Body | `{ action, productIds[], data }` |
| Response | `{ success, action, result, message }` |
| Validare | Manual - verifica productIds array non-gol |
| Status | **Problema: lipsa verificare permisiune, validare minima** |

**Actiuni suportate:**
- `change-category` - schimba categoryId
- `add-tags` - adauga tags[]
- `remove-tags` - sterge tags[]
- `publish-channel` - publica pe canal
- `unpublish-channel` - depublica de pe canal
- `activate-channel` - activeaza sync canal
- `deactivate-channel` - dezactiveaza sync canal
- `delete` - sterge produsele (TODO: nu sterge din Shopify)

**PROBLEMA SECURITATE - Referinta CONCERNS.md:**
> "Missing Input Validation in API Routes" - endpoint-ul accepta orice fara validare Zod
> Lipsa verificare permisiune! Orice user autentificat poate face bulk operations

**Fisier sursa:** `src/app/api/products/bulk/route.ts`

---

## Endpoints Aditionale (brief)

| Endpoint | Metoda | Scop | Auth | Permisiune |
|----------|--------|------|------|------------|
| /products/[id] | GET | Detalii produs cu channels, images | Da | products.view |
| /products/[id] | PUT | Update produs individual | Da | products.edit |
| /products/[id] | DELETE | Sterge produs | Da | products.delete |
| /products/export | GET | Export produse CSV | Da | products.view |
| /products/import | POST | Import produse din CSV | Da | products.create |
| /products/inventory-mapping | POST | Mapare produs la InventoryItem | Da | products.edit |
| /products/recipes | GET/POST | Gestionare retete (composite products) | Da | products.edit |
| /products/sync-shopify | POST | Sync produse cu Shopify | Da | products.edit |

---

## Observatii de Securitate

1. **Lipsa verificare permisiuni:**
   - `/sync-images` GET/POST - poate fi apelat de orice user autentificat
   - `/bulk` POST - poate fi apelat de orice user autentificat
   - Necesita adaugare `hasPermission(session.user.id, "products.edit")`

2. **Validare input:**
   - `/bulk` accepta orice action string fara whitelist strict
   - Nu se valideaza format UUID pentru productIds

3. **Stergere incompleta:**
   - DELETE nu sincronizeaza stergerea cu Shopify

## Probleme de Performanta

1. **N+1 in sync-images:**
   - Pentru fiecare folder din Drive, se face query individual pentru MasterProduct
   - La 500 foldere = 500 queries

2. **Bulk add-tags/remove-tags:**
   - Itereaza prin fiecare produs si face update individual
   - La 100 produse = 100 queries (ar trebui batch update)

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| Missing Input Validation in API Routes | /bulk | MEDIE |
| Image Sync Unique Constraint Violation | /sync-images | **REZOLVAT** (workaround: delete all then create) |

---

*Auditat: 2026-01-23*
