# API: Orders - Audit

**Auditat:** 2026-01-23
**Base Path:** /api/orders
**Status:** Probleme Minore

## Rezumat

Orders API gestioneaza comenzile sincronizate din Shopify. Contine endpoint-uri pentru listare, detalii, editare, procesare (factura + AWB), export si procesare batch. Este API-ul central pentru fluxul de business.

## Endpoints

### GET /api/orders

| Aspect | Detalii |
|--------|---------|
| Scop | Returneaza lista de comenzi cu filtrare si paginare |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.view` |
| Parametri Query | `status`, `storeId`, `search`, `startDate`, `endDate`, `containsSku`, `containsBarcode`, `hasAwb`, `page`, `limit` |
| Response | `{ orders: Order[], pagination: { page, limit, total, totalPages } }` |
| Paginare | Da - default 50/pagina |
| Validare | Manual (parsing din searchParams) |
| Include | store, invoice, awb, lineItems |
| Status | OK |

**Note:**
- Cautare full-text in: shopifyOrderNumber, customerFirstName/LastName, customerPhone, customerEmail, shippingCity, lineItems.sku/title/barcode
- Filtre SKU/barcode folosesc `contains` case-insensitive
- Date range include ziua finala complet (adauga +1 zi la endDate)

**Fisier sursa:** `src/app/api/orders/route.ts`

---

### GET /api/orders/[id]

| Aspect | Detalii |
|--------|---------|
| Scop | Returneaza detaliile unei comenzi specifice |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.view` |
| Parametri Path | `id` - UUID comanda |
| Response | `{ order: Order }` cu include complet |
| Validare | Lipsa (nu se valideaza format UUID) |
| Include | store, invoice, awb, lineItems |
| Status | OK |

**Fisier sursa:** `src/app/api/orders/[id]/route.ts`

---

### PUT /api/orders/[id]

| Aspect | Detalii |
|--------|---------|
| Scop | Actualizeaza datele comenzii (telefon, adresa, nume, email) si sincronizeaza in Shopify |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.edit` |
| Parametri Path | `id` - UUID comanda |
| Body | `{ customerPhone?, customerEmail?, customerFirstName?, customerLastName?, shippingAddress1?, shippingAddress2?, shippingCity?, shippingProvince?, shippingZip?, syncToShopify?, acknowledgeDocumentsIssued? }` |
| Response | `{ success, order, changes, shopifySynced, shopifyError, hasDocuments, validation }` |
| Validare | Manual - foloseste `validateOrder()` pentru telefon si adresa |
| Side Effects | Sincronizare Shopify, adaugare nota audit in timeline Shopify, log activitate |
| Status | OK |

**Comportament Special:**
- Daca comanda are factura emisa sau AWB, necesita `acknowledgeDocumentsIssued: true` pentru a permite modificarea
- Returneaza warning cu `hasInvoice`, `hasAwb`, `invoiceNumber`, `awbNumber` daca exista documente
- Re-valideaza telefon si adresa dupa modificare

**Fisier sursa:** `src/app/api/orders/[id]/route.ts`

---

### POST /api/orders/process

| Aspect | Detalii |
|--------|---------|
| Scop | Proceseaza comenzi selectate: emite factura + creeaza AWB + creeaza picking list + notifica pickeri + trimite la printare |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.process` |
| Body | `{ orderIds: string[], awbOptions?: object }` |
| Response | `{ success, stats, results: ProcessingResult[], pickingList?, batchId }` |
| Validare | Manual - verifica array non-gol |
| Side Effects | Creare factura Facturis, creare AWB FanCourier, creare PickingList, notificari Picker, print jobs |
| Status | **Probleme: fara tranzactie DB** |

**PROBLEMA CRITICA - Referinta CONCERNS.md:**
> "No Transaction Handling for Multi-Step Operations" - Daca crearea AWB esueaza dupa ce factura a fost emisa, datele devin inconsistente. Nu exista rollback.

**Flux procesare:**
1. Incarca comenzi cu store, invoice, awb, lineItems
2. Pentru fiecare comanda:
   - Emite factura (daca nu exista) via `issueInvoiceForOrder()`
   - Creeaza AWB (daca factura OK si nu exista AWB) via `createAWBForOrder()`
   - Salveaza erori in `ProcessingError` cu batchId
3. Creeaza PickingList din AWB-urile procesate
4. Notifica userii cu rol "Picker"
5. Trimite AWB-uri la printare (daca exista printer cu autoPrint)

**Fisier sursa:** `src/app/api/orders/process/route.ts`

---

### POST /api/orders/process-all

| Aspect | Detalii |
|--------|---------|
| Scop | Procesare bulk cu optiuni extinse (picking list, auto-print) |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.process` |
| Body | `{ orderIds: string[], awbOptions?, createPickingList?, autoPrintPickingList? }` |
| Response | `{ success, message, stats, results, errors, batchId, pickingList? }` |
| Validare | Manual - verifica array non-gol |
| Side Effects | Identice cu /process + suport retete locale (MasterProduct.recipeAsParent) |
| Status | **Probleme: fara tranzactie DB** |

**Diferente fata de /process:**
- Optiune `createPickingList` (default true)
- Optiune `autoPrintPickingList` (default true)
- Expandare retete locale pentru produse composite
- Logging activitate cu `logActivity()`
- Gestionare AWB-uri sterse/anulate (le sterge din DB si recreeaza)

**Retete locale:**
- Verifica daca `MasterProduct.isComposite = true`
- Incarca `recipeAsParent` cu componentele
- Expandeaza in PickingList items cu `isRecipeParent` flag

**Fisier sursa:** `src/app/api/orders/process-all/route.ts`

---

### GET /api/orders/export

| Aspect | Detalii |
|--------|---------|
| Scop | Exporta comenzi in format CSV sau JSON |
| Auth | Da - sesiune NextAuth |
| Permisiune | `orders.view` |
| Parametri Query | `format` (csv/json), `storeId`, `status`, `startDate`, `endDate`, `hasInvoice`, `hasAwb` |
| Response | CSV file download sau JSON |
| Validare | Manual |
| Limite | Max 10,000 randuri |
| Status | OK |

**Coloane CSV:**
Nr_Comanda, Data, Magazin, Status, Client_Email, Client_Telefon, Client_Nume, Client_Prenume, Adresa, Oras, Judet, Tara, Cod_Postal, Total, Subtotal, Transport, TVA, Moneda, Status_Plata, Status_Livrare, Nr_Factura, Status_Factura, AWB, Curier, Status_AWB, Produse

**Note:**
- Include BOM pentru compatibilitate Excel UTF-8
- Status-uri traduse in romana (PENDING -> "In asteptare", etc.)

**Fisier sursa:** `src/app/api/orders/export/route.ts`

---

## Observatii de Securitate

1. **Validare input:**
   - Validare manuala in loc de Zod schema
   - Nu se valideaza format UUID pentru parametri path
   - `process` si `process-all` accepta orice array de string-uri

2. **Autorizare:**
   - Toate endpoint-urile verifica autentificare si permisiuni
   - Nu exista verificare store-level (user poate vedea comenzi din orice store)

3. **Rate limiting:**
   - Lipsa - `/process` si `/process-all` pot fi apelate nelimitat

## Probleme de Performanta

1. **N+1 in process-all:**
   - Pentru fiecare produs, se face query individual pentru MasterProduct cu recipeAsParent
   - La 100 comenzi × 5 produse = 500 query-uri potential

2. **Export fara streaming:**
   - Incarca toate comenzile in memorie (max 10k)
   - Pentru dataset-uri mari poate cauza memory issues

## Referinte CONCERNS.md

| Concern | Endpoint Afectat | Severitate |
|---------|-----------------|------------|
| No Transaction Handling for Multi-Step Operations | /process, /process-all | CRITICA |
| Missing Input Validation in API Routes | Toate | MEDIE |
| No Rate Limiting on API Endpoints | /process, /process-all | MEDIE |

---

*Auditat: 2026-01-23*
