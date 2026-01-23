# Database Schema - Review

**Data:** 2026-01-23
**Fisier:** prisma/schema.prisma
**Linii:** 3185
**Total modele:** 84
**Total enums:** 27

---

## Schema Overview

### Statistici

| Categorie | Numar |
|-----------|-------|
| Modele totale | 84 |
| Enums | 27 |
| Linii cod | 3185 |
| Indecsi definiti | ~150+ |

### Patternuri Folosite

- **Timestamps:** `createdAt`, `updatedAt` pe majoritatea modelelor
- **Soft Delete:** NU - se foloseste `isActive: Boolean` sau stergere directa
- **CUID IDs:** Toate modelele folosesc `@id @default(cuid())`
- **Cascade Delete:** `onDelete: Cascade` pe relatii child
- **Index-uri:** Definite explicit pe campuri frecvent filtrate
- **Mapped Names:** `@@map("table_name")` pentru toate tabelele

### Organizare Schema

Schema este organizata in sectiuni:
1. **Autentificare** - NextAuth.js models (User, Account, Session)
2. **RBAC** - Permission, Role, Group, UserRoleAssignment
3. **Business Models** - Store, Order, Invoice, AWB, Product
4. **PIM** - MasterProduct, Channel, Category
5. **Picking System** - PickingList, PickingListItem
6. **Ads Module** - AdsAccount, AdsCampaign, AdsAdSet, AdsAd
7. **Trendyol Integration** - TrendyolOrder, TrendyolProduct
8. **Inventory System** - InventoryItem, WarehouseStock, GoodsReceipt
9. **Multi-Company** - Company, IntercompanyInvoice

---

## Modele Principale

### Model: Order

**Scop:** Comenzi sincronizate din Shopify

**Campuri cheie:**
- `id` - CUID primary key
- `shopifyOrderId` - ID extern din Shopify
- `shopifyOrderNumber` - Numar vizibil (#1001, etc.)
- `storeId` - FK catre Store
- `status` - OrderStatus enum (17 valori)
- `totalPrice`, `subtotalPrice`, `totalShipping`, `totalTax` - Decimal(10,2)
- `financialStatus`, `fulfillmentStatus` - Shopify statuses
- `phoneValidation`, `addressValidation` - ValidationStatus enum

**Relatii:**
- `store` - belongsTo Store
- `invoice` - hasOne Invoice (optional)
- `awb` - hasOne AWB (optional)
- `lineItems` - hasMany LineItem
- `billingCompany` - belongsTo Company
- `operationalWarehouse` - belongsTo Warehouse
- `requiredTransfer` - hasOne WarehouseTransfer

**Indecsi:**
- `@@unique([shopifyOrderId, storeId])` - Unicitate per store
- `@@index([status])`, `@@index([storeId])`, `@@index([createdAt])`
- `@@index([storeId, status, createdAt])` - Index compus pentru filtrare

**Observatii:**
- Order are relatii cu 10+ modele (complex hub model)
- `rawData Json?` stocheaza datele complete Shopify pentru referinta
- `intercompanyStatus` pentru decontare multi-firma

---

### Model: Invoice

**Scop:** Facturi emise prin Facturis

**Campuri cheie:**
- `orderId` - FK unic catre Order (one-to-one)
- `companyId` - FK catre Company (firma care emite)
- `invoiceSeriesId` - FK catre InvoiceSeries
- `invoiceNumber`, `invoiceSeriesName` - Identificatori factura
- `facturisId` - ID extern in Facturis
- `status` - "pending", "issued", "cancelled", "error"
- `paymentStatus` - "unpaid", "partial", "paid"

**Relatii:**
- `order` - belongsTo Order (1:1)
- `company` - belongsTo Company
- `invoiceSeries` - belongsTo InvoiceSeries

**Indecsi:**
- `@@index([companyId])`, `@@index([invoiceSeriesId])`
- `@@index([facturisId])` - Pentru sync cu Facturis

**Observatii:**
- `pdfData Bytes?` stocheaza PDF-ul local
- `stornoNumber`, `stornoSeries` pentru facturi anulate

---

### Model: AWB

**Scop:** AWB-uri create prin FanCourier

**Campuri cheie:**
- `orderId` - FK unic catre Order (one-to-one)
- `companyId` - FK catre Company (firma care emite)
- `awbNumber` - Numar AWB (de la FanCourier)
- `currentStatus` - "pending", "created", "in_transit", "delivered", "returned"
- `cashOnDelivery` - Suma ramburs (Decimal)
- `isCollected` - Flag pentru ramburs incasat

**Relatii:**
- `order` - belongsTo Order (1:1)
- `company` - belongsTo Company
- `statusHistory` - hasMany AWBStatusHistory
- `handoverSession` - belongsTo HandoverSession
- `comments` - hasMany AWBComment

**Indecsi:**
- `@@index([awbNumber])` - Cautare dupa AWB
- `@@index([currentStatus])`, `@@index([handedOverAt])`
- `@@index([isCollected])` - Pentru rapoarte ramburs

**Observatii:**
- Tracking detaliat: FanCourier status codes, handover sessions
- `hasC0WithoutScan` - Flag alert pentru AWB preluate fara scanare interna

---

### Model: MasterProduct / InventoryItem

**Scop:** Doua sisteme de produse paralele

**MasterProduct (PIM - Product Information Management):**
- Catalog produse pentru canale de vanzare (Shopify, Trendyol)
- `sku`, `barcode`, `title`, `description`, `price`
- Imagini din Google Drive (`images` hasMany MasterProductImage)
- Canale de distributie (`channels` hasMany MasterProductChannel)
- Suport produse compuse (`isComposite`, recipes)
- Integrare Trendyol (`trendyolProductId`, `trendyolStatus`)

**InventoryItem (Gestiune Stoc):**
- Articole inventar pentru gestiune interna
- `sku`, `name`, `currentStock`
- Multi-warehouse (`warehouseStocks`)
- Receptii marfa (`receiptItems`)
- Retete/compunere (`recipeComponents`, `usedInRecipes`)

**Relatia MasterProduct <-> InventoryItem:**
- `MasterProduct.inventoryItemId` -> `InventoryItem` (optional mapping)
- Un MasterProduct poate fi mapat la un InventoryItem pentru sync stoc

**Observatii:**
- Exista duplicare potentiala intre cele 2 sisteme
- Pattern-ul e: MasterProduct = ce vinzi, InventoryItem = ce ai in stoc

---

### Model: User / Role / Permission

**Scop:** RBAC (Role-Based Access Control)

**User:**
- NextAuth.js compatible (accounts, sessions)
- `isSuperAdmin` - Bypass all permissions
- `isActive` - Soft disable without delete
- `roles` - hasMany UserRoleAssignment
- `storeAccess` - hasMany UserStoreAccess (per-store permissions)
- `warehouseAccess` - hasMany UserWarehouseAccess

**Role:**
- `name` - Unique name ("Manager Depozit", "Operator Comenzi")
- `isSystem` - System roles nu pot fi sterse
- `permissions` - hasMany RolePermission

**Permission:**
- `code` - Unique ("orders.view", "products.edit")
- `category` - Grupare ("orders", "products", "settings")

**Pattern RBAC:**
```
User -> UserRoleAssignment -> Role -> RolePermission -> Permission
User -> UserGroupMembership -> Group -> GroupRoleAssignment -> Role
User -> UserStoreAccess -> Store (scope permissions la store)
```

**Observatii:**
- RBAC complex cu grupuri, roluri, si store-level scoping
- CONCERNS.md mentioneaza: "No Integration Tests for Multi-Store RBAC"

---

### Model: Store / Company

**Scop:** Multi-store si multi-company support

**Store:**
- `shopifyDomain` - Unique Shopify domain
- `accessToken` - Shopify API access
- `companyId` - FK catre Company (firma care factureaza)
- `invoiceSeriesId` - Serie de facturare asociata

**Company:**
- Entitate juridica cu date fiscale (CIF, RegCom, IBAN)
- Credentiale Facturis (`facturisApiKey`, `facturisUsername`)
- Credentiale FanCourier (`fancourierClientId`, etc.)
- Sender info pentru AWB
- `isPrimary` - Firma principala (doar 1)
- `intercompanyMarkup` - Adaos pentru decontare intercompany

**Relatia Store -> Company:**
- Un Store apartine unei Company
- Company defineste credentialele pentru facturare si AWB
- Invoice Series sunt per Company

**Observatii:**
- Pattern multi-company implementat complet
- Intercompany invoicing pentru decontare intre firme

---

## Relatii Critice

### Order -> Invoice (1:1)

```prisma
model Order {
  invoice Invoice?  // Optional, nu toate comenzile au factura
}

model Invoice {
  orderId String @unique  // One-to-one prin unicitate
  order   Order  @relation(fields: [orderId], references: [id])
}
```

**Impact business:** Orice comanda poate avea maxim o factura.

### Order -> AWB (1:1)

```prisma
model Order {
  awb AWB?  // Optional
}

model AWB {
  orderId String @unique
  order   Order  @relation(fields: [orderId], references: [id])
}
```

**Impact business:** Orice comanda poate avea maxim un AWB.

### Order -> Store -> Company (Chain)

```
Order.storeId -> Store.companyId -> Company
```

**Impact business:**
- Store determina ce firma factureaza (Company)
- Company defineste seria de facturare si credentialele
- **CRITICA pentru invoice series selection** (Phase 2 focus)

### User -> Store Access (RBAC)

```
User -> UserStoreAccess -> Store
```

**Impact business:**
- Utilizatorii vad doar comenzile din store-urile lor
- Permission checks trebuie sa verifice store access

---

## Potentiale Probleme

### 1. Indexuri Lipsa Potentiale

| Tabel | Camp | Scenariu |
|-------|------|----------|
| LineItem | `orderId` | JOIN pe order details - ARE INDEX |
| AWBStatusHistory | `awbId` | Istoric status - ARE INDEX |
| PickingListItem | `pickingListId` | Items per list - ARE INDEX |

**Concluzie:** Indexurile par complete pentru use cases comune.

### 2. Campuri Nullable Discutabile

| Model | Camp | Observatie |
|-------|------|------------|
| Order | `customerEmail` | Nullable, dar comenzile au nevoie de email pentru facturare |
| Invoice | `invoiceNumber` | Nullable, dar factura emisa trebuie sa aiba numar |
| AWB | `awbNumber` | Nullable, dar AWB creat trebuie sa aiba numar |

**Nota:** Aceste campuri sunt nullable pentru a permite starea "pending" inainte de emitere.

### 3. Relatii Posibil Nefolosite

| Relatie | Status |
|---------|--------|
| TrendyolOrder -> Order | Optional link, status utilizare neclar |
| MasterProduct -> InventoryItem | Optional mapping, poate cauza confuzie |

### 4. Campuri Aparent Nefolosite (Dead Columns)

Nu am identificat campuri clar nefolosite. Schema pare activ utilizata.

---

## Enums

### OrderStatus (17 valori)

```prisma
enum OrderStatus {
  PENDING           // Comandă nouă, nevalidată
  VALIDATED         // Validări trecute
  VALIDATION_FAILED // Validări eșuate
  WAIT_TRANSFER     // Așteaptă finalizarea transferului de stoc
  INVOICE_PENDING   // Așteaptă factură
  INVOICE_ERROR     // Eroare la emiterea facturii
  INVOICED          // Factură emisă
  PICKING           // În proces de picking
  PACKED            // Împachetat, gata de expediere
  AWB_PENDING       // Așteaptă AWB
  AWB_CREATED       // AWB generat cu succes
  AWB_ERROR         // Eroare la emiterea AWB
  SHIPPED           // În curs de livrare (preluat de curier)
  DELIVERED         // Livrat
  RETURNED          // Returnat
  CANCELLED         // Anulat
}
```

### ValidationStatus

```prisma
enum ValidationStatus {
  PENDING
  PASSED
  FAILED
}
```

### InvoiceStatus (in Invoice model, not enum)

Foloseste string: "pending", "issued", "cancelled", "error"

### AWBStatus (in AWB model, not enum)

`currentStatus`: "pending", "created", "in_transit", "delivered", "returned"

### AdsPlatform

```prisma
enum AdsPlatform {
  META
  TIKTOK
  GOOGLE
}
```

### ChannelType

```prisma
enum ChannelType {
  SHOPIFY
  EMAG
  TEMU
  TRENDYOL
}
```

### HandoverSessionStatus

```prisma
enum HandoverSessionStatus {
  OPEN      // Predare în curs
  CLOSED    // Finalizat
}
```

### InventoryMovementType

```prisma
enum InventoryMovementType {
  RECEIPT         // Intrare din recepție marfă
  SALE            // Ieșire din vânzare/factură
  ADJUSTMENT_PLUS // Ajustare pozitivă (inventar)
  ADJUSTMENT_MINUS// Ajustare negativă (pierderi)
  RECIPE_OUT      // Ieșire pentru producție compus
  RETURN          // Retur de la client
  TRANSFER        // Transfer între locații
}
```

### Alte Enums

- `StockMovementType` - IN, OUT, ADJUSTMENT, RETURN, TRANSFER
- `SyncType`, `SyncStatus`, `LogLevel` - Pentru logging
- `PrintJobStatus` - PENDING, PRINTING, COMPLETED, FAILED, CANCELLED
- `PickingListStatus` - PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `ProcessingErrorType`, `ProcessingErrorStatus` - Pentru error handling
- `AdsAccountStatus`, `AdsCampaignStatus`, `AdsAlertScope`, etc. - Ads module
- `AIInsightType`, `AIInsightStatus` - AI module
- `GoodsReceiptStatus`, `TransferStatus` - Inventory

---

## Rezumat

### Puncte Forte

1. **Schema bine structurata** - Sectiuni clare, comentarii in romana
2. **Indexuri complete** - Toate query-urile frecvente au index
3. **RBAC complet** - Store-level permissions, grupuri, roluri
4. **Multi-company support** - Entitati juridice separate cu credentiale proprii
5. **Audit trail** - AuditLog, ActivityLog, SyncLog pentru tracking

### Puncte Atentie

1. **Complexitate ridicata** - 84 modele, curba de invatare mare
2. **Doua sisteme produse** - MasterProduct vs InventoryItem (potentiala confuzie)
3. **Status-uri ca string** - Invoice/AWB status nu sunt enum (less type-safe)
4. **Relatii optionale extinse** - Multi-nullable FKs pot cauza inconsistente

### Recomandari

1. **Invoice Series Chain** - Documentatie clara pentru Order->Store->Company->InvoiceSeries
2. **Type Safety** - Consider converting status strings to enums
3. **Test Data** - RBAC integration tests pentru multi-store scenarios

---

*Generat: 2026-01-23*
*Schema version: prisma/schema.prisma (3185 lines, 84 models)*
