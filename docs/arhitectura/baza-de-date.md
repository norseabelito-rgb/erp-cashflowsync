# Baza de Date

## Tehnologie

- **ORM:** Prisma ^5.10.2
- **Baza de date:** PostgreSQL
- **Schema:** `prisma/schema.prisma`

## Diagrama Relatiilor Principale

```
Company ──< Store ──< Order ──< LineItem
   │           │        │──< Invoice
   │           │        │──< AWB ──< AWBStatusHistory
   │           │        │──< ProcessingError
   │           │        │──< Task
   │           │        │──< TrendyolOrder ──< TrendyolOrderItem
   │           │        │──< TemuOrder ──< TemuOrderItem
   │           │        └──< ReturnAWB
   │           └── Channel ──< MasterProductChannel
   │──< InvoiceSeries
   │──< IntercompanyInvoice
   │──< TrendyolStore
   └──< TemuStore

User ──< UserRoleAssignment ──> Role ──< RolePermission ──> Permission
  │──< UserGroupMembership ──> Group ──< GroupRoleAssignment ──> Role
  │──< UserStoreAccess ──> Store
  │──< UserWarehouseAccess ──> Warehouse
  └──< Notification

MasterProduct ──< MasterProductImage
      │──< MasterProductChannel ──> Channel
      │──< ProductRecipe (parent/component)
      └──< AdsCampaignProduct ──> AdsCampaign

Warehouse ──< WarehouseStock ──> InventoryItem
    └──< WarehouseTransfer ──< WarehouseTransferItem
```

---

## Modele de Autentificare

### User
Utilizatorii sistemului.

| Camp | Tip | Descriere |
|---|---|---|
| `id` | String (cuid) | ID unic |
| `email` | String (unique) | Email utilizator |
| `name` | String? | Nume afisat |
| `password` | String? | Hash bcrypt (null pentru Google login) |
| `isSuperAdmin` | Boolean | Acces complet, nu poate fi modificat din UI |
| `isActive` | Boolean | Pentru dezactivare fara stergere |
| `preferences` | Json? | Preferinte utilizator |

Relatii: `accounts`, `sessions`, `roles`, `groups`, `storeAccess`, `warehouseAccess`, `notifications`, `tasksAssigned/Created/Completed`

### Account, Session, VerificationToken
Modele standard NextAuth.js pentru OAuth (Google) si sesiuni.

### Notification
Notificari in-app pentru utilizatori. Suporta atasamente (PDF) si link-uri de actiune.

---

## Modele RBAC

### Permission
Permisiuni granulare (ex: `orders.view`, `invoices.create`).

| Camp | Tip | Descriere |
|---|---|---|
| `code` | String (unique) | Cod permisiune (ex: `orders.view`) |
| `name` | String | Nume afisat |
| `category` | String | Categorie (orders, products, settings, etc.) |
| `sortOrder` | Int | Ordine afisare |

### Role
Roluri de sistem (ex: Administrator, Manager, Picker).

| Camp | Tip | Descriere |
|---|---|---|
| `name` | String (unique) | Numele rolului |
| `color` | String? | Culoare badge UI |
| `isSystem` | Boolean | Roluri default care nu pot fi sterse |

### Tabele de Legatura
- **RolePermission** - Role <-> Permission (many-to-many)
- **UserRoleAssignment** - User <-> Role (many-to-many, cu `assignedBy`)
- **Group** - Grupuri de utilizatori
- **UserGroupMembership** - User <-> Group
- **GroupRoleAssignment** - Group <-> Role (grupul mosteneste roluri)
- **UserStoreAccess** - Restrictie acces per magazin
- **UserWarehouseAccess** - Restrictie acces per depozit

### Invitation
Invitatii pentru utilizatori noi, cu `roleIds`, `groupIds`, `storeIds` pre-configurate si data de expirare.

### AuditLog
Tracking modificari: `action`, `entityType`, `entityId`, `oldValue`, `newValue`.

---

## Modele Business Principale

### Store
Magazine Shopify conectate.

| Camp | Tip | Descriere |
|---|---|---|
| `shopifyDomain` | String (unique) | Domeniu Shopify (my-store.myshopify.com) |
| `accessToken` | String | Shopify Admin API token |
| `companyId` | String? | Firma de facturare asociata |
| `oblioSeriesName` | String? | Seria de facturare din Oblio |
| `invoiceSeriesId` | String? | Legatura cu InvoiceSeries (legacy) |

### Order
Comenzile sincronizate din Shopify, Trendyol sau Temu.

| Camp | Tip | Descriere |
|---|---|---|
| `shopifyOrderId` | String | ID extern comanda |
| `shopifyOrderNumber` | String | Numar vizibil (#1001) |
| `source` | String | `shopify`, `trendyol`, `manual` |
| `storeId` | String | Magazinul sursa |
| `status` | OrderStatus | Status procesare (enum) |
| `billingCompanyId` | String? | Firma care factureaza |
| `operationalWarehouseId` | String? | Depozitul de expediere |
| `intercompanyStatus` | String? | null, `pending`, `settled` |
| `notes` | String? | Notite interne |
| `internalStatusId` | String? | Status intern custom |

Relatii: `invoices[]`, `awb`, `lineItems[]`, `processingErrors[]`, `trendyolOrder`, `temuOrder`, `tasks[]`, `returnAwbs[]`, `repairInvoices[]`

Index compus: `[storeId, status, createdAt]`
Constrangere unica: `[shopifyOrderId, storeId]`

### LineItem
Produsele dintr-o comanda.

| Camp | Tip | Descriere |
|---|---|---|
| `shopifyLineItemId` | String | ID extern linie |
| `title` | String | Numele produsului |
| `sku` | String? | SKU produs |
| `quantity` | Int | Cantitate |
| `price` | Decimal(10,2) | Pret unitar |
| `barcode` | String? | Cod de bare |
| `location` | String? | Locatie in depozit |
| `masterProductId` | String? | Legatura cu PIM |

### Invoice
Facturile emise prin Oblio.

| Camp | Tip | Descriere |
|---|---|---|
| `orderId` | String | Comanda asociata |
| `companyId` | String? | Firma emitenta |
| `invoiceProvider` | String | `oblio` |
| `invoiceNumber` | String? | Numar factura |
| `invoiceSeriesName` | String? | Serie factura |
| `oblioId` | String? | ID extern Oblio |
| `status` | String | `pending`, `issued`, `cancelled`, `error` |
| `paymentStatus` | String | `unpaid`, `partial`, `paid` |
| `stornoNumber` | String? | Numarul facturii de stornare |
| `cancellationSource` | Enum? | `MANIFEST_RETURN`, `PIN_APPROVAL` |
| `paymentSource` | Enum? | `MANIFEST_DELIVERY`, `PIN_APPROVAL` |

### AWB
AWB-uri create prin FanCourier.

| Camp | Tip | Descriere |
|---|---|---|
| `orderId` | String (unique) | 1:1 cu Order |
| `companyId` | String? | Firma care a emis AWB |
| `awbNumber` | String? | Numar AWB |
| `currentStatus` | String | `pending`, `created`, `in_transit`, `delivered`, `returned` |
| `cashOnDelivery` | Decimal? | Suma ramburs |
| `handedOverAt` | DateTime? | Cand a fost scanat la predare |
| `isCollected` | Boolean | Ramburs incasat (intercompany) |
| `hasC0WithoutScan` | Boolean | C0 primit dar nescanat intern |

Relatii: `statusHistory[]`, `comments[]`, `returnAwbs[]`, `handoverSession`

---

## Enumerari (Enums)

### OrderStatus
```
PENDING -> VALIDATED -> INVOICE_PENDING -> INVOICED -> PICKING -> PACKED ->
AWB_PENDING -> AWB_CREATED -> SHIPPED -> DELIVERED
                                                    -> RETURNED
         -> VALIDATION_FAILED
         -> WAIT_TRANSFER
         -> INVOICE_ERROR
         -> AWB_ERROR
         -> CANCELLED
```

### Alte Enumerari

| Enum | Valori | Descriere |
|---|---|---|
| `ValidationStatus` | PENDING, PASSED, FAILED | Status validare telefon/adresa |
| `HandoverSessionStatus` | OPEN, CLOSED | Sesiune predare curier |
| `PickingListStatus` | PENDING, IN_PROGRESS, COMPLETED, CANCELLED | Status picking |
| `ProcessingErrorType` | INVOICE, AWB, PICKING_LIST | Tip eroare procesare |
| `ProcessingErrorStatus` | PENDING, RETRYING, RESOLVED, FAILED, SKIPPED | Status erori |
| `SyncType` | MANUAL, AUTOMATIC, SINGLE_ORDER | Tip sincronizare |
| `SyncStatus` | RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED | Status sync |
| `TransferStatus` | DRAFT, COMPLETED, CANCELLED | Transfer inter-depozit |
| `TaskType` | PICKING, VERIFICARE, EXPEDIERE, MEETING, DEADLINE, FOLLOW_UP, BUSINESS, OTHER | Tip task |
| `TaskPriority` | LOW, MEDIUM, HIGH, URGENT | Prioritate task |
| `ChannelType` | SHOPIFY, EMAG, TEMU, TRENDYOL | Canal distributie |
| `AdsPlatform` | META, TIKTOK, GOOGLE | Platforma advertising |
| `ManifestType` | RETURN, DELIVERY | Tip borderou curier |
| `ManifestStatus` | DRAFT, PENDING_VERIFICATION, CONFIRMED, PROCESSED | Status borderou |

---

## Modele Multi-Company

### Company
Firma de facturare (entitate juridica). Fiecare firma are credentiale separate Oblio si FanCourier.

| Camp | Tip | Descriere |
|---|---|---|
| `name` | String (unique) | Numele firmei |
| `code` | String (unique) | Cod scurt (ex: `AQ`, `CD`) |
| `cif` | String? | CUI/CIF |
| `isPrimary` | Boolean | Firma principala (stocul este aici) |
| `intercompanyMarkup` | Decimal(5,2) | Adaos decontare intercompany (%) |
| `oblioEmail` | String? | Credentiale Oblio |
| `oblioSecretToken` | String? | Token Oblio |
| `fancourierClientId/Username/Password` | String? | Credentiale FanCourier |
| `senderName/Phone/Email/...` | String? | Date expeditor AWB |

### IntercompanyInvoice
Facturi intre firme (Aquaterra factureaza firmele secundare).

### IntercompanyOrderLink
Legatura comanda <-> factura intercompany, cu valori decontare.

---

## Modele PIM (Product Information Management)

### MasterProduct
Produs master cu informatii centralizate.

| Camp | Tip | Descriere |
|---|---|---|
| `sku` | String (unique) | SKU unic |
| `barcode` | String? (unique) | Cod de bare |
| `title` | String | Titlu produs |
| `price` | Decimal(10,2) | Pret vanzare |
| `stock` | Int | Stoc curent |
| `isComposite` | Boolean | Produs compus (cu reteta) |
| `categoryId` | String? | Categorie |
| `inventoryItemId` | String? | Mapare la articol inventar |
| `trendyolProductId` | String? | ID produs Trendyol |
| `trendyolStatus` | String? | pending, approved, rejected |

### MasterProductChannel
Relatia produs-canal cu override-uri per canal si detectare modificari externe.

### ProductRecipe
Retete pentru produse compuse (parent <-> component cu cantitate).

### Category
Categorii cu mapare Shopify Collections si Trendyol Categories.

---

## Modele Inventar & Depozite

### InventoryItem
Articol inventar local cu stoc, retete, si mapare la produse PIM.

### Warehouse
Depozit fizic. Poate fi `isPrimary` (principal) sau `isOperational` (de expediere).

### WarehouseStock
Stoc per depozit per articol (many-to-many Warehouse <-> InventoryItem).

### WarehouseTransfer
Transfer intre depozite cu status DRAFT -> COMPLETED.

---

## Modele Operationale

### PickingList, PickingListItem, PickingListAWB
Sistem de picking cu liste agregate, scanare barcode, si generare PDF.

### HandoverSession
Sesiune zilnica de predare colete catre curier (OPEN/CLOSED).

### ProcessingError
Erori la procesare comenzi cu sistem de retry automat.

### Task, TaskAttachment
Sistem de task management cu tipuri, prioritati, deadline, asignare, si atasamente.

### ReturnAWB
Tracking retururi cu legatura la AWB original si comanda.

---

## Modele Courier Manifest

### CourierManifest
Borderou curier (RETURN sau DELIVERY) cu lifecycle: DRAFT -> PENDING_VERIFICATION -> CONFIRMED -> PROCESSED.

### ManifestItem
Element individual din borderou cu legatura la AWB si factura.

### PINApprovalRequest
Cerere de aprobare cu PIN pentru operatii exceptionale (stornare/incasare).

---

## Modele Ads & AI

### AdsAccount, AdsCampaign, AdsAdSet, AdsAd
Ierarhie campanii publicitare (Meta/TikTok/Google) cu KPIs: spend, impressions, clicks, conversions, ROAS.

### AdsDailyStats
Statistici zilnice per campanie.

### AdsAlertRule, AdsAlert
Reguli de alerta automata cu actiuni (NOTIFY, PAUSE, REDUCE_BUDGET) si rollback.

### AIInsight, AIActionLog, AIAnalysisRun
Sugestii AI generate automat cu tracking aplicare si outcome.

---

## Modele Marketplace

### TrendyolStore, TrendyolOrder, TrendyolOrderItem
Integrare Trendyol multi-store cu tracking invoice/AWB sent.

### TemuStore, TemuOrder, TemuOrderItem
Integrare Temu multi-store cu tracking invoice/AWB sent.

### TrendyolProduct, TrendyolCampaign, TrendyolCampaignProduct
Produse si campanii sincronizate din Trendyol.

---

## Modele Diverse

### Settings
Setari globale: FanCourier defaults, AI config, backup config, PIN hash.

### InvoiceSeries
Serii de facturare cu numerotare automata si sincronizare Oblio.

### SyncLog, SyncLogEntry
Istoric sincronizari cu statistici si log detaliat.

### DailySales
Agregat zilnic vanzari pentru dashboard.

### ActivityLog
Istoric complet actiuni cu referinte la entitati.

### CustomerNote
Notite per client (identificat prin email).

### InternalOrderStatus
Status-uri interne definite de utilizator (nomenclator custom).

### RepairInvoice
Tracking reparare facturi auto-facturate gresit (client = firma emitenta).
