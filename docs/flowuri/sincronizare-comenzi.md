# Sincronizare Comenzi

Fluxul de sincronizare a comenzilor din toate sursele: Shopify, Trendyol, Temu si Daktela.

## Surse relevante

- `src/lib/sync-service.ts` - sincronizare statusuri AWB/facturi (~400 linii)
- `src/lib/shopify.ts` - client Shopify API
- `src/lib/trendyol-order-sync.ts` - sync Trendyol → Order
- `src/lib/temu-order-sync.ts` - sync Temu → Order
- `src/lib/daktela.ts` - sync contacte catre Daktela call center

## Prezentare generala

Aplicatia preia comenzi din 3 surse distincte si le unifica in tabela `Order`:

```
Shopify ──webhook──→ Order (source: "shopify")
                        ↑
Trendyol ──pull────→ TrendyolOrder → Order (source: "trendyol")
                        ↑
Temu ──────pull────→ TemuOrder → Order (source: "temu")
```

Dupa unificare, toate comenzile trec prin acelasi flux de procesare (facturare, AWB, picking, predare).

## 1. Sincronizare Shopify

### Import comenzi

`ShopifyClient.getOrders(params)` - REST API Shopify

```
GET /admin/api/2024-01/orders.json
    |
    v
Parametri: limit, status, created_at_min, since_id
    |
    v
Mapare campuri Shopify → campuri Order:
    - order_number → shopifyOrderNumber
    - email → customerEmail
    - shipping_address → shippingAddress1, shippingCity, etc.
    - line_items → LineItem[]
    - financial_status → financialStatus
    - fulfillment_status → fulfillmentStatus
```

Tipul clientului Shopify este configurat per magazin:
- `domain` - domeniul Shopify (ex: `my-store.myshopify.com`)
- `accessToken` - token de acces API
- `storeId` - ID magazin in baza de date locala

**Fiser sursa:** `src/lib/shopify.ts`, liniile ~126-161

### Operatii suportate pe Shopify

- `getOrders()` - import comenzi
- `getOrder(orderId)` - o comanda specifica
- `addOrderNote(orderId, note)` - adauga nota
- `addOrderTags(orderId, tags[])` - adauga tag-uri
- `markInvoiceIssued(orderId, invoiceNumber)` - tag "factura-emisa"
- `markAWBIssued(orderId, awbNumber)` - tag "awb-emis"
- `createFulfillment(orderId, trackingNumber)` - marcare livrata
- `updateOrderAddress(orderId, data)` - modificare adresa
- `findProductBySku(sku)` - cauta produs dupa SKU (GraphQL)
- `createDraftOrder(input)` - creare comanda manuala

**Fiser sursa:** `src/lib/shopify.ts`

## 2. Sincronizare Trendyol

### Arhitectura

```
TrendyolStore → TrendyolOrder + TrendyolOrderLineItem
                     ↓ (syncTrendyolOrderToMainOrder)
              Store (virtual) → Order + LineItem
```

### Flux sync Trendyol → Order

`syncTrendyolOrderToMainOrder(trendyolOrder, trendyolStore)`

1. **Gaseste/creeaza Store virtual** (`findOrCreateTrendyolVirtualStore`):
   - Domain: `trendyol-{supplierId}`
   - CompanyId din TrendyolStore
   - Se actualizeaza companyId daca s-a schimbat

2. **Verifica daca Order exista** (dupa `shopifyOrderId = trendyolOrderId`, `source = "trendyol"`):
   - **DA**: actualizeaza doar statusul (`mapTrendyolToInternalStatus`)
   - **NU**: creeaza Order nou

3. **Creare Order nou**:
   - `shopifyOrderId` = `trendyolOrder.trendyolOrderId`
   - `shopifyOrderNumber` = `trendyolOrder.orderNumber`
   - `source` = `"trendyol"`
   - `storeId` = Store virtual
   - Extrage `firstName`/`lastName` din `customerName` (split pe spatiu)
   - Adresa din campurile TrendyolOrder
   - Creeaza LineItems din `TrendyolOrderLineItem`

4. **Creare LineItems**:
   - `shopifyLineItemId` = `trendyol-{trendyolProductId}-{index}`
   - `sku` = `localSku || merchantSku || barcode`
   - Include `masterProductId` daca e mapat

5. **Link TrendyolOrder → Order**: actualizeaza `trendyolOrder.orderId`

**Fiser sursa:** `src/lib/trendyol-order-sync.ts`, liniile ~168-200

### Multi-company support

Fiecare `TrendyolStore` are un `companyId` care determina:
- Pe ce firma se emite factura
- Ce credentiale Oblio/FanCourier se folosesc
- Ce serie de facturare se aplica (`TrendyolStore.invoiceSeriesName`)

## 3. Sincronizare Temu

### Arhitectura

```
TemuStore → TemuOrder + TemuOrderLineItem
                 ↓ (syncTemuOrderToMainOrder)
          Store (virtual) → Order + LineItem
```

### Flux sync Temu → Order

`syncTemuOrderToMainOrder(temuOrder, temuStore)` - structura identica cu Trendyol:

1. **Store virtual**: domain `temu-{appKey}`
2. **Verificare existenta**: dupa `shopifyOrderId`, `source = "temu"`
3. **Creare Order**: `source = "temu"`
4. **Parsare adresa**: `parseTemuAddress(addressText)` - adresa vine ca text unic, se parseaza pe componente

Diferenta fata de Trendyol:
- Adresa Temu vine ca un singur camp text (se face split pe virgule)
- Nu are `variantTitle` in line items
- `barcode` = `skuId` (ID-ul SKU-ului Temu)

**Fiser sursa:** `src/lib/temu-order-sync.ts`, liniile ~73-154

## 4. Sincronizare statusuri (runFullSync)

`runFullSync(type)` - sincronizeaza statusurile AWB-urilor si facturilor.

### Flux sync

```
1. Obtine toate comenzile cu AWB sau factura
   (exclude livrate/returnate/anulate > 30 zile)
    |
    v
2. Pentru fiecare comanda:
    |
    ├── 2a. Sync AWB status (daca are awbNumber si FanCourier configurat):
    |       → trackAWB() din FanCourier API
    |       → detectAWBChangeType() → clasificare schimbare
    |       → Actualizare AWB in DB
    |
    └── 2b. Sync invoice status (daca are factura):
            → syncInvoiceStatus()
    |
    v
3. Finalizare sesiune cu statistici
```

### Detectie schimbare AWB

`detectAWBChangeType(previousStatus, newStatus, eventCode, ...)` clasifica schimbarea:

| ChangeType | Conditie | Severitate |
|-----------|----------|------------|
| `DELIVERED` | Coduri S1, S2, "Livrat" | success |
| `RETURNED` | Coduri S3-S5, S50, S51, "Returnat", "Refuzat" | warning |
| `CANCELLED` | Coduri A0-A3, "Anulat" | warning |
| `DELETED` | AWB negasit in FanCourier (dar avea status anterior) | warning |
| `NEW_STATUS` | Status schimbat fata de anterior | info |
| `NO_CHANGE` | Fara modificari | info |
| `ERROR` | Eroare temporara de retea | warning |
| `PENDING` | AWB fara evenimente inca | info |

**Fiser sursa:** `src/lib/sync-service.ts`, liniile ~270-387

### Sesiune de sync

Fiecare sincronizare creeaza un `SyncLog` cu:
- `type`: MANUAL sau SCHEDULED
- `status`: RUNNING → COMPLETED / COMPLETED_WITH_ERRORS / FAILED
- Statistici: `ordersProcessed`, `awbsUpdated`, `invoicesChecked`, `errorsCount`
- `SyncLogEntry`-uri detaliate pentru fiecare operatie

**Fiser sursa:** `src/lib/sync-service.ts`, liniile ~17-122

## 5. Sincronizare Daktela

`buildDaktelaContactFromOrder(orderId)` + `syncContactToDaktela(data)`

### Cand se sincronizeaza

- La procesarea cu succes a comenzii (factura + AWB OK)
- Fire-and-forget (erori nu afecteaza procesarea)

### Date sincronizate

1. **Informatii contact**: nume, email, telefon, adresa
2. **Agregare cross-order**:
   - Numar total comenzi ale clientului
   - Total cheltuit (totalPrice sum)
   - Data primei si ultimei comenzi
   - Ultimele 5 numere de comanda
   - Toate magazinele de unde a comandat
3. **Note client**: din tabela `CustomerNote` (daca exista)

### Endpoint Daktela

```
POST https://cashflowgroup.daktela.com/api/v6/contacts.json
```

**Fiser sursa:** `src/lib/daktela.ts`, liniile ~1-100

## Diagrama flux complet sincronizare

```
SURSE COMENZI                  BAZA DE DATE              SINCRONIZARE STATUS
═══════════════                ══════════════             ════════════════════

Shopify ──webhook──→ Order     ←──────────────           runFullSync()
                      ↑                                    |
                      |                                    ├→ FanCourier tracking
Trendyol ──pull──→ TrendyolOrder                          |   → update AWB status
                   ──sync──→ Order                        |
                      ↑                                    └→ Oblio check
Temu ──────pull──→ TemuOrder                                  → update invoice
                   ──sync──→ Order

                      |
                      ↓
                Procesare unificata:
                factura → AWB → picking → predare
                      |
                      ↓
                Daktela sync (fire-and-forget)
```
