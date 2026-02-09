# Inventory, Warehouse, Suppliers & Purchase Orders - Research Document

## Overview

The Inventory module is a comprehensive multi-warehouse inventory management system within the ERP. It handles inventory items (individual and composite/BOM), supplier management, purchase order lifecycle, goods receipts (NIR), warehouse transfers, stock movements, supplier invoices, and stock reporting. The entire UI is in **Romanian**.

---

## 1. INVENTORY ITEMS MODULE

### Purpose
Central item catalog for tracking raw materials and composite products. Each item has a unique SKU, stock levels tracked per warehouse, cost price, and supplier association.

### Data Model (`InventoryItem`)
**File:** `prisma/schema.prisma:2798`

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `sku` | String (unique) | Item code |
| `name` | String | Display name |
| `description` | String? | Optional description |
| `currentStock` | Decimal(10,3) | **Aggregate total stock** (sum from all warehouses) |
| `minStock` | Decimal? | Low stock alert threshold |
| `unit` | String | Unit of measure (buc, kg, g, ml, L, m, etc.) |
| `unitsPerBox` | Int? | Units per box/package |
| `boxUnit` | String? | Box unit name (cutie, bax, palet) |
| `costPrice` | Decimal? | Cost price per unit |
| `isComposite` | Boolean | If true, this is a BOM/recipe item (no direct stock) |
| `trackLots` | Boolean | Lot tracking (future feature, default false) |
| `isActive` | Boolean | Soft-delete flag |
| `supplierId` | String? | FK to Supplier |

**Key relations:**
- `recipeComponents` → `InventoryRecipeComponent[]` (BOM ingredients)
- `warehouseStocks` → `WarehouseStock[]` (per-warehouse quantities)
- `mappedProducts` → `MasterProduct[]` (e-commerce product mapping)
- `stockMovements` → `InventoryStockMovement[]` (audit trail)
- `purchaseOrderItems` → `PurchaseOrderItem[]`

### Key Features (UI)
**File:** `src/app/(dashboard)/inventory/page.tsx`

1. **Stats Dashboard**: Cards showing Total items, Individual items, Composite items, Low stock count
2. **Search & Filters**: By SKU/name text, type (individual/composite), stock status (low stock/active), and **warehouse filter**
3. **Multi-warehouse columns**: Table dynamically shows a column per active warehouse with per-warehouse stock levels
4. **Mapping indicator**: Shows if item is mapped to e-commerce products (Link2/Link2Off icons)
5. **Pagination**: 25/50/100/250/All items per page
6. **Bulk operations**: Select multiple items via checkboxes, bulk delete
7. **Import/Export**:
   - **Import**: Excel (.xlsx) upload with 4 modes: `upsert`, `create`, `update`, `stock_only`
   - Optional "delete unlisted" flag to remove items not in import
   - **Export**: CSV download
8. **Item actions**: View, Edit, Delete (with confirmation showing mapped product count warning)

### User Workflow - Create New Item
**File:** `src/app/(dashboard)/inventory/new/page.tsx`

1. Navigate to `/inventory/new`
2. Fill form: SKU, Name, Description, Unit, Current Stock, Min Stock, Cost Price
3. Select Supplier (optional dropdown)
4. Toggle `isComposite` switch
5. If composite: add recipe components (select item, set quantity per unit)
6. Save → creates item via `POST /api/inventory-items`

### User Workflow - Edit Item
**File:** `src/app/(dashboard)/inventory/[id]/edit/page.tsx`
- Similar to create but pre-populated
- Can modify recipe components

### Item Detail View
**File:** `src/app/(dashboard)/inventory/[id]/page.tsx`
- Shows full item details, warehouse stock breakdown, recent movements

---

## 2. STOCK TRACKING MECHANISM

### Dual-Layer Stock System

The system uses a **dual-layer architecture**:

1. **`InventoryItem.currentStock`** - Aggregate total (sum from all warehouses). Updated automatically.
2. **`WarehouseStock.currentStock`** - Per-warehouse stock level. This is the source of truth.

**File:** `src/lib/inventory-stock.ts`

### Stock Movement Types (`InventoryMovementType` enum)
**File:** `prisma/schema.prisma:2891`

| Type | Direction | Triggered By |
|------|-----------|-------------|
| `RECEIPT` | + (positive) | Goods receipt finalization |
| `SALE` | - (negative) | Order fulfillment/invoicing |
| `ADJUSTMENT_PLUS` | + | Manual positive adjustment |
| `ADJUSTMENT_MINUS` | - | Manual negative adjustment |
| `RECIPE_OUT` | - | Production of composite item |
| `RETURN` | + | Customer return |
| `TRANSFER` | +/- | Warehouse transfer (pair of movements) |

### Stock Movement Model (`InventoryStockMovement`)
**File:** `prisma/schema.prisma:2902`

Each movement records:
- `itemId` - Which item
- `type` - Movement type
- `quantity` - Signed quantity (+/-)
- `previousStock` / `newStock` - Snapshot before/after
- `warehouseId` - Which warehouse (nullable for legacy entries)
- `orderId`, `invoiceId`, `receiptId`, `transferId` - Reference links
- `reason`, `notes` - Human-readable context
- `userId`, `userName` - Who performed the action

### Key Functions in `src/lib/inventory-stock.ts`

| Function | Purpose |
|----------|---------|
| `checkInventoryItemStock(itemId, qty)` | Check if item has enough stock. For composite items, checks all component availability |
| `checkOrderStock(items[])` | Batch stock check for multiple items |
| `checkOrderStockByProducts(orderId)` | Check stock using MasterProduct→InventoryItem mapping from order line items |
| `deductInventoryStock(itemId, qty, opts)` | Deduct stock (legacy, uses `currentStock` directly) |
| `deductInventoryStockFromWarehouse(itemId, whId, qty, opts)` | **Multi-warehouse**: Deduct from specific warehouse, updates both `WarehouseStock` and total `InventoryItem.currentStock` in a transaction |
| `addInventoryStockFromWarehouse(itemId, whId, qty, opts)` | Mirror of deduct for returns |
| `processInventoryStockForOrder(orderId, invoiceId)` | Legacy: process order stock using global stock |
| `processInventoryStockForOrderFromPrimary(orderId, invoiceId)` | **Multi-warehouse**: Deducts from **primary warehouse** for order fulfillment |
| `addInventoryStockForReturn(orderId, returnAwbId)` | Add stock back for returns, with idempotency check |
| `getLowStockAlerts()` | Returns items where `currentStock <= minStock` |
| `getProductionCapacity(itemId)` | For composite items, calculates max producible units based on component stock |
| `syncItemTotalStock(itemId)` | Recalculates `InventoryItem.currentStock` from warehouse stock sum |
| `getPrimaryWarehouse()` | Fetches the primary warehouse |
| `getTotalItemStock(itemId)` | Aggregates stock across all warehouses |
| `getItemStockByWarehouse(itemId)` | Returns per-warehouse breakdown |
| `checkInventoryItemStockInWarehouse(itemId, whId, qty)` | Warehouse-specific stock check |

### Stock Sync Mechanism
- Every deduction/addition in a specific warehouse triggers:
  1. `WarehouseStock` update (specific warehouse)
  2. `WarehouseStock.aggregate()` to recalculate total
  3. `InventoryItem.currentStock` update with new total
- All done within a `prisma.$transaction`

---

## 3. MULTI-WAREHOUSE SYSTEM

### Data Models

#### `Warehouse` (`prisma/schema.prisma:3410`)
| Field | Type | Description |
|-------|------|-------------|
| `code` | String (unique) | e.g., "DEP-01", "DEP-CENTRAL" |
| `name` | String | Display name |
| `description` | String? | |
| `address` | String? | Physical address |
| `isActive` | Boolean | Active/inactive toggle |
| `isPrimary` | Boolean | Only 1 can be primary (used for sales deductions) |
| `isOperational` | Boolean | Only 1 should be true (where orders are fulfilled from) |
| `sortOrder` | Int | Display ordering |

Relations: `stockLevels`, `stockMovements`, `transfersFrom`, `transfersTo`, `userAccess`, `goodsReceipts`

#### `WarehouseStock` (`prisma/schema.prisma:3446`)
- Composite unique key: `[warehouseId, itemId]`
- `currentStock` Decimal(10,3)
- `minStock` Decimal? (per-warehouse minimum)

#### `UserWarehouseAccess` (`prisma/schema.prisma:3544`)
- Controls which users can access which warehouses
- Used in permission checks for transfers

### Warehouse Management UI
**File:** `src/app/(dashboard)/settings/warehouses/page.tsx`

1. **Grid display** of warehouse cards showing: code, name, description, address, stock count
2. **Primary badge**: Gold star badge on primary warehouse
3. **Create/Edit dialog**: Code (immutable after creation), Name, Description, Address, Active toggle
4. **Set as Primary**: Button on non-primary warehouses
5. **Delete**: Only allowed for non-primary warehouses without stock/movements
6. **Migration tool**: "Migrare Date Existente" button for initial setup - migrates legacy stock to multi-warehouse system
7. **Sync tool**: "Sincronizeaza Articole" - associates items with primary warehouse

### Key Behaviors
- Orders always deduct stock from the **primary warehouse** (`isPrimary: true`)
- The `isOperational` flag designates which warehouse physically ships orders
- Transfers between warehouses are instant (within a transaction)
- Inactive warehouses cannot receive transfers

---

## 4. WAREHOUSE TRANSFERS

### Data Model (`WarehouseTransfer`)
**File:** `prisma/schema.prisma:3468`

| Field | Type | Description |
|-------|------|-------------|
| `transferNumber` | String (unique) | Auto-generated "TRF-YYYYMMDD-NNN" |
| `fromWarehouseId` | String | Source warehouse |
| `toWarehouseId` | String | Destination warehouse |
| `status` | TransferStatus | DRAFT → COMPLETED or CANCELLED |
| `isAutoProposed` | Boolean | True if system-generated for an order |
| `approvedById/Name` | String? | Who approved |
| `notes` | String? | |

#### `WarehouseTransferItem` (`prisma/schema.prisma:3517`)
- `quantity` Decimal(10,3)
- Stock snapshots: `fromStockBefore`, `fromStockAfter`, `toStockBefore`, `toStockAfter`

### Transfer Statuses
| Status | Description |
|--------|-------------|
| `DRAFT` | Being edited, not yet executed |
| `COMPLETED` | Executed, stock moved |
| `CANCELLED` | Cancelled |

### Transfer Execution Flow
**File:** `src/app/api/transfers/[id]/execute/route.ts`

1. Permission check: `transfers.execute`
2. Warehouse access check: User must have access to BOTH warehouses
3. Both warehouses must be active
4. Stock validation: Each item checked for sufficient stock in source warehouse
5. **Cannot transfer composite items** (explicitly blocked)
6. Transaction:
   - For each item: Update `WarehouseStock` in source (subtract) and destination (upsert/add)
   - Create paired `InventoryStockMovement` records (TRANSFER type, negative in source, positive in destination)
   - Save stock snapshots on transfer items
   - Recalculate `InventoryItem.currentStock` totals
   - Update transfer status to COMPLETED

### Transfer UI
**File:** `src/app/(dashboard)/inventory/transfers/page.tsx`

- List view with filters: search, status, warehouse
- Shows From → To warehouses with arrow icon
- Create new: `/inventory/transfers/new`
- Detail: `/inventory/transfers/[id]` - preview and execute

### API Endpoints
- `GET/POST /api/transfers` - List/Create
- `GET /api/transfers/[id]` - Detail
- `GET /api/transfers/[id]/preview` - Preview before execution
- `POST /api/transfers/[id]/execute` - Execute transfer
- `POST /api/transfers/[id]/cancel` - Cancel transfer

---

## 5. SUPPLIER MANAGEMENT

### Data Model (`Supplier`)
**File:** `prisma/schema.prisma:2949`

| Field | Type | Description |
|-------|------|-------------|
| `name` | String (unique) | Supplier name |
| `code` | String? (unique) | Internal code |
| `contactPerson` | String? | |
| `email` | String? | |
| `phone` | String? | |
| `address/city/county/postalCode/country` | String? | Full address |
| `cif` | String? | Romanian fiscal code (CUI/CIF) |
| `regCom` | String? | Trade registry number |
| `bankAccount` | String? | IBAN |
| `bankName` | String? | |
| `notes` | String? (Text) | |
| `isActive` | Boolean | |

Relations: `items` (inventory items), `receipts`, `purchaseOrders`, `supplierInvoices`

### Supplier UI
**File:** `src/app/(dashboard)/inventory/suppliers/page.tsx`

1. **Stats**: Total suppliers, Active, Inactive
2. **Search**: By name, CIF, or email
3. **Table columns**: Name/Code/CIF, Contact (person/phone/email), Location (city/county), Item count, Receipt count, Active status
4. **CRUD via dialog**: Inline create/edit dialog with sections:
   - Basic: Name, Code, Contact Person, Phone, Email
   - Address: Street, City, County
   - Fiscal: CIF, Reg. Com., IBAN, Bank
   - Notes
5. **Delete**: Soft-deletes (deactivates) if supplier has items/receipts; hard-deletes if no relations

### API Endpoints
- `GET /api/suppliers` - List (supports search, isActive filters)
- `POST /api/suppliers` - Create
- `PUT /api/suppliers` - Update
- `DELETE /api/suppliers?id=` - Delete/Deactivate

---

## 6. PURCHASE ORDER LIFECYCLE

### Data Model (`PurchaseOrder`)
**File:** `prisma/schema.prisma:3152`

| Field | Type | Description |
|-------|------|-------------|
| `documentNumber` | String (unique) | Auto: "PC-DD/MM/YYYY-NNNN" |
| `supplierId` | String | FK to Supplier |
| `status` | PurchaseOrderStatus | Lifecycle state |
| `expectedDate` | DateTime? | Expected delivery date |
| `notes` | String? | |
| `totalItems/totalQuantity/totalValue` | Calculated totals | |
| `approvedBy/approvedByName/approvedAt` | Approval tracking | |
| `createdBy/createdByName` | Creator tracking | |

Relations: `items` (PurchaseOrderItem[]), `labels` (PurchaseOrderLabel[]), `receptionReports`, `supplierInvoices`

### PO Status Lifecycle
```
DRAFT → APROBATA → IN_RECEPTIE → RECEPTIONATA
                                   ↓
                                ANULATA (from any state)
```

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| `DRAFT` | Being edited | Edit, Approve, Cancel |
| `APROBATA` | Approved, awaiting goods | Generate Labels, Start Reception |
| `IN_RECEPTIE` | Reception in progress | Continue Reception, Labels |
| `RECEPTIONATA` | Fully received | View only |
| `ANULATA` | Cancelled | View only |

### PO Items (`PurchaseOrderItem`)
**File:** `prisma/schema.prisma:3192`
- Links PO → InventoryItem
- `quantityOrdered`, `unitPrice`, `totalPrice`
- Unique constraint: `[purchaseOrderId, inventoryItemId]`

### PO Labels (`PurchaseOrderLabel`)
**File:** `prisma/schema.prisma:3216`
- Scannable labels for warehouse reception
- `labelCode` (unique) - barcode/QR value
- `printed` flag + `printedAt`/`printedBy` tracking

### PO UI - List
**File:** `src/app/(dashboard)/inventory/purchase-orders/page.tsx`

1. **Stats**: Total, Draft, Approved, In Reception, Received
2. **Filters**: Search, Status, Supplier
3. **Table**: Document Number (clickable link), Supplier, Expected Date, Products count, Value, Status badge
4. **Actions per row**: View, Edit (draft only), Approve (draft only), Labels (approved/in-reception)

### PO UI - Create
**File:** `src/app/(dashboard)/inventory/purchase-orders/new/page.tsx`
- Uses `PurchaseOrderForm` component
- Select supplier, expected date, add items from inventory, set quantities/prices

### PO UI - Labels
**File:** `src/app/(dashboard)/inventory/purchase-orders/[id]/labels/page.tsx`
- Generate labels for a PO
- Mark as printed
- Used for physical scanning in warehouse

### API Endpoints
- `GET/POST /api/purchase-orders` - List/Create
- `GET/PUT /api/purchase-orders/[id]` - Detail/Update
- `POST /api/purchase-orders/[id]/approve` - Approve PO
- `GET /api/purchase-orders/[id]/labels` - Get/generate labels

---

## 7. RECEPTION WORKFLOW (Full Lifecycle)

The reception workflow is a multi-step process involving warehouse staff and office verification.

### Models Involved
1. **PurchaseOrder** - Initiates the flow
2. **ReceptionReport** (PV) - Verification document created by warehouse staff
3. **SupplierInvoice** - Invoice from supplier, linked to PO
4. **GoodsReceipt** (NIR) - Auto-generated from PV, requires approval
5. **ReceptionPhoto** - Photos taken during reception

### Reception Report (`ReceptionReport`)
**File:** `prisma/schema.prisma:3234`

| Field | Type | Description |
|-------|------|-------------|
| `reportNumber` | String (unique) | "PV-DD/MM/YYYY-NNNN" |
| `purchaseOrderId` | FK | Links to PO |
| `supplierInvoiceId` | FK? | Links to supplier invoice |
| `status` | ReceptionReportStatus | DESCHIS → IN_COMPLETARE → FINALIZAT |
| `warehouseUserId/Name` | String | Warehouse staff member |
| `hasDifferences` | Boolean | If quantities differ from PO |
| `signatureConfirmed` | Boolean | Digital signature confirmation |

### Reception Report Items
- `quantityExpected` (from PO)
- `quantityReceived` (entered by warehouse staff)
- `verified` flag
- `hasDifference` flag
- `observations` (required if difference)

### Reception Photos
- Categories: `OVERVIEW`, `ETICHETE` (labels), `DETERIORARI` (damage), `FACTURA` (invoice scan)
- Stored locally with path: `/uploads/receptii/{poId}/{reportId}/filename`

### Goods Receipt Statuses (Extended)
```
DRAFT → GENERAT → TRIMIS_OFFICE → VERIFICAT → APROBAT → IN_STOC
                                            ↓
                                         RESPINS
```

| Status | Description |
|--------|-------------|
| `DRAFT` | Legacy manual receipt |
| `GENERAT` | Auto-created from PV (Reception Report) |
| `TRIMIS_OFFICE` | Sent to Office for verification |
| `VERIFICAT` | Verified by Office |
| `APROBAT` | Approved (direct or after difference approval) |
| `IN_STOC` | Stock has been transferred/updated |
| `RESPINS` | Rejected (differences not approved) |
| `COMPLETED` | Legacy completed status |
| `CANCELLED` | Cancelled |

### Full Reception Flow

#### Step 1: Create PO → Approve
1. User creates Purchase Order with items
2. Manager approves PO (`DRAFT → APROBATA`)
3. Labels can be generated/printed for warehouse

#### Step 2: Warehouse Reception Dashboard
**File:** `src/app/(dashboard)/inventory/reception/page.tsx`

Dashboard shows 3 sections:
- **Pending POs**: Approved POs waiting reception (with "past due" warnings)
- **Active Receptions**: In-progress reports needing completion
- **Completed Today**: Finished receptions

#### Step 3: Start Reception
1. Warehouse staff clicks "Incepe receptia" on a pending PO
2. Creates a `ReceptionReport` (PV)
3. Redirects to `/inventory/reception/[id]` to fill in quantities

#### Step 4: Fill Reception Report
- Compare expected vs received quantities per item
- Mark differences with observations
- Upload photos (overview, labels, damage, invoice scan)
- Finalize report → generates NIR (GoodsReceipt) automatically

#### Step 5: Office Verification
**File:** `src/app/(dashboard)/inventory/receipts/office/page.tsx`

Office staff see NIRs with status `TRIMIS_OFFICE`:
- Review items, quantities, photos
- Verify → changes status to `VERIFICAT`
- If differences exist, route to approval

#### Step 6: Difference Approval
**File:** `src/app/(dashboard)/inventory/receipts/pending-approval/page.tsx`

Manager reviews NIRs with differences:
- Approve differences → `APROBAT`
- Reject → `RESPINS`

#### Step 7: Stock Transfer
- Approved NIR → "Transfer to stock" action
- Adds received quantities to warehouse stock
- Creates RECEIPT movements
- Status → `IN_STOC`

### Goods Receipt Completion (Legacy Direct NIR)
**File:** `src/app/api/goods-receipts/[id]/complete/route.ts`

For legacy/manual NIR:
1. Validates DRAFT status
2. For each line item: updates `InventoryItem.currentStock += quantity`
3. Creates `InventoryStockMovement` (type: RECEIPT) per item
4. Updates NIR status to COMPLETED
5. Optionally updates item `costPrice` if unit cost provided

### Receipt API Endpoints
- `GET/POST /api/goods-receipts` - List/Create
- `GET /api/goods-receipts/[id]` - Detail
- `POST /api/goods-receipts/[id]/complete` - Finalize (legacy)
- `POST /api/goods-receipts/[id]/approve` - Approve
- `POST /api/goods-receipts/[id]/approve-differences` - Approve differences
- `POST /api/goods-receipts/[id]/reject` - Reject
- `POST /api/goods-receipts/[id]/send-office` - Send to office
- `POST /api/goods-receipts/[id]/verify` - Office verify
- `POST /api/goods-receipts/[id]/transfer-stock` - Transfer to stock

---

## 8. SUPPLIER INVOICES

### Data Model (`SupplierInvoice`)
**File:** `prisma/schema.prisma:3321`

| Field | Type | Description |
|-------|------|-------------|
| `supplierId` | FK | Supplier |
| `purchaseOrderId` | FK? | Optional PO link |
| `invoiceNumber` | String | Invoice number |
| `invoiceSeries` | String? | Invoice series |
| `invoiceDate` | DateTime | |
| `totalValue` | Decimal | Net value |
| `vatValue` | Decimal? | VAT amount |
| `totalWithVat` | Decimal? | Gross value |
| `paymentStatus` | PaymentStatus | NEPLATITA / PARTIAL_PLATITA / PLATITA |
| `paymentDueDate` | DateTime? | Due date |
| `paidAt` | DateTime? | |
| `documentPath` | String? | Scanned invoice path |
| `notes` | String? | |

Unique constraint: `[supplierId, invoiceNumber, invoiceSeries]`

### Supplier Invoice UI
**File:** `src/app/(dashboard)/inventory/supplier-invoices/page.tsx`

1. **Stats**: Unpaid (count + total), Partially paid (count + total), Paid this month, Total unpaid amount
2. **Filters**: Search, Supplier, Payment Status, Date range
3. **Table**: Series/Number, Supplier, Invoice Date, Value, Due Date (with overdue warning), Payment Status, Document link
4. **CRUD**: Create/Edit via `SupplierInvoiceForm` component, Delete with confirmation
5. **Overdue highlighting**: Past-due unpaid invoices shown in red

---

## 9. RECIPE/BOM SYSTEM

### Data Model (`InventoryRecipeComponent`)
**File:** `prisma/schema.prisma:2864`

| Field | Type | Description |
|-------|------|-------------|
| `compositeItemId` | FK | Parent composite item |
| `componentItemId` | FK | Child/ingredient item |
| `quantity` | Decimal(10,3) | Qty of component per 1 unit of composite |
| `unit` | String? | Can differ from component's main unit |
| `sortOrder` | Int | Display order |

Unique constraint: `[compositeItemId, componentItemId]`

### Recipe UI
**File:** `src/app/(dashboard)/inventory/recipes/page.tsx`

1. **Stats**: Total composite items, With recipe defined, Without recipe
2. **Filters**: Search by SKU/name, Recipe status (with/without)
3. **Table columns**: SKU, Name, Recipe Status badge, Component count (with tooltip showing ingredients), Recipe Cost (calculated), Production Capacity
4. **Recipe Status indicators**:
   - Green "Definita" - recipe defined with sufficient component stock
   - Yellow "Stoc insuficient" - recipe defined but components below requirement
   - Red "Fara reteta" - no recipe defined (row highlighted)
5. **Highlight**: Items without recipes get red background in table

### Recipe Detail/Edit
**File:** `src/app/(dashboard)/inventory/recipes/[id]/page.tsx`
- View/edit recipe components
- Add/remove ingredients
- Set quantities per unit

### How Recipes Work in Stock Operations

When a composite item is sold:
1. `checkInventoryItemStock()` checks ALL component availability
2. `deductInventoryStock()` deducts from EACH component (not the composite itself)
3. Each component deduction creates its own `InventoryStockMovement` with reason "Vânzare - Component pentru {composite name}"

Production capacity calculation (`getProductionCapacity()`):
- For each component: `floor(componentStock / requiredPerUnit)`
- Result: `min(allComponents)` = max producible units
- Also identifies the **limiting component** (bottleneck)

---

## 10. STOCK MOVEMENTS & ADJUSTMENTS

### Movements List
**File:** `src/app/(dashboard)/inventory/movements/page.tsx`

1. **Stats**: Total movements, Entries (in), Exits (out), Quantity added
2. **Filters**: Item selector, Movement type, Date range
3. **Table**: Date, Item (name + SKU), Type badge, Quantity (+/-), Previous Stock, New Stock, Reason, User
4. **Color coding**: Green for entries, Red for exits
5. **Pagination**: 50 per page

### Manual Stock Adjustments
**File:** `src/app/(dashboard)/inventory/movements/adjustments/page.tsx`

1. **Warehouse-aware**: Select target warehouse (defaults to primary)
2. **Adjustment types**: ADJUSTMENT_PLUS or ADJUSTMENT_MINUS
3. **Common reasons** (predefined):
   - Plus: Inventory surplus, Return, Error correction, Initial stock, Transfer receipt
   - Minus: Inventory shortage, Damaged/expired, Error correction, Loss/Theft, Internal use, Transfer send
4. **Custom reason**: Available for non-standard adjustments
5. **Flow**: Select item → Select warehouse → Choose type → Enter quantity → Select/enter reason → Save

---

## 11. STOCK REPORTS

### Stock Report
**File:** `src/app/(dashboard)/inventory/reports/stock/page.tsx`

1. **Date-based reporting**: View stock at any historical date
2. **Stats**: Total items, Value at date, Current value, Below minimum, Out of stock
3. **Filters**: Report date, Search (SKU/name), Supplier, Item type, "Only alerts" toggle
4. **Table**: SKU, Item, Supplier, Stock at Date, Current Stock, Difference (with trend icons), Cost, Value, Status badge (OK/Minimum/Lipsă)
5. **Export**: CSV download of report data
6. **Totals footer**: Shows total value at selected date

---

## 12. NAVIGATION & PAGE STRUCTURE

All inventory pages are under `/inventory/`:

| Route | Page | Description |
|-------|------|-------------|
| `/inventory` | Inventory Items list | Main catalog |
| `/inventory/new` | Create item | Form for new inventory item |
| `/inventory/[id]` | Item detail | View item details, warehouse breakdown |
| `/inventory/[id]/edit` | Edit item | Modify item/recipe |
| `/inventory/suppliers` | Suppliers | CRUD supplier management |
| `/inventory/purchase-orders` | Purchase Orders | PO list with status filters |
| `/inventory/purchase-orders/new` | Create PO | New purchase order form |
| `/inventory/purchase-orders/[id]` | PO detail | View/edit PO |
| `/inventory/purchase-orders/[id]/labels` | PO Labels | Generate/print labels |
| `/inventory/receipts` | Goods Receipts (NIR) | Legacy receipt list |
| `/inventory/receipts/new` | Create NIR | Manual goods receipt |
| `/inventory/receipts/[id]` | NIR detail | View/finalize receipt |
| `/inventory/receipts/office` | Office Verification | NIRs pending office review |
| `/inventory/receipts/pending-approval` | Pending Approval | NIRs with differences |
| `/inventory/reception` | Reception Dashboard | Warehouse staff reception view |
| `/inventory/reception/[id]` | Reception Detail | Fill in reception report |
| `/inventory/transfers` | Transfers | Warehouse transfer list |
| `/inventory/transfers/new` | Create Transfer | New transfer between warehouses |
| `/inventory/transfers/[id]` | Transfer Detail | View/execute/cancel transfer |
| `/inventory/movements` | Stock Movements | Movement audit trail |
| `/inventory/movements/adjustments` | Adjustments | Manual stock adjustments |
| `/inventory/recipes` | Recipes/BOM | Composite item recipe management |
| `/inventory/recipes/[id]` | Recipe Detail | Edit recipe components |
| `/inventory/supplier-invoices` | Supplier Invoices | Invoice management with payment tracking |
| `/inventory/supplier-invoices/[id]` | Invoice Detail | View/edit invoice |
| `/inventory/reports/stock` | Stock Report | Historical stock reporting |
| `/settings/warehouses` | Warehouses | Warehouse CRUD in settings |

---

## 13. API ROUTE STRUCTURE

### Inventory Items
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/inventory-items` | GET, POST, PUT, DELETE | CRUD for inventory items |
| `/api/inventory-items/[id]` | GET, PUT, DELETE | Single item operations |
| `/api/inventory-items/[id]/warehouse-stock` | GET | Per-warehouse stock for item |
| `/api/inventory-items/bulk-delete` | POST | Bulk delete items |
| `/api/inventory-items/export` | GET | CSV export |
| `/api/inventory-items/import` | GET, POST | Template download / Excel import |
| `/api/inventory-items/low-stock-alerts` | GET | Items below minimum stock |
| `/api/inventory-items/recipes` | GET | List composite items with recipes |
| `/api/inventory-items/stock-check` | GET/POST | Check stock availability |
| `/api/inventory-items/stock-report` | GET | Historical stock report |
| `/api/inventory-items/stock-adjustment` | GET, POST | List movements / Create adjustment |
| `/api/inventory` | GET | Legacy inventory endpoint |
| `/api/inventory/full` | GET | Full inventory data |

### Other Routes
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/suppliers` | GET, POST, PUT, DELETE | Supplier CRUD |
| `/api/warehouses` | GET, POST | List/Create warehouses |
| `/api/warehouses/[id]` | GET, PUT, DELETE | Warehouse CRUD |
| `/api/warehouses/[id]/set-primary` | POST | Set as primary warehouse |
| `/api/warehouses/[id]/stock` | GET | Stock levels in warehouse |
| `/api/purchase-orders` | GET, POST | PO CRUD |
| `/api/purchase-orders/[id]` | GET, PUT | PO detail/update |
| `/api/purchase-orders/[id]/approve` | POST | Approve PO |
| `/api/purchase-orders/[id]/labels` | GET, POST | Label management |
| `/api/goods-receipts` | GET, POST | NIR CRUD |
| `/api/goods-receipts/[id]` | GET, PUT | NIR detail/update |
| `/api/goods-receipts/[id]/complete` | POST | Finalize NIR |
| `/api/goods-receipts/[id]/approve` | POST | Approve NIR |
| `/api/goods-receipts/[id]/approve-differences` | POST | Approve with differences |
| `/api/goods-receipts/[id]/reject` | POST | Reject NIR |
| `/api/goods-receipts/[id]/send-office` | POST | Send to office |
| `/api/goods-receipts/[id]/verify` | POST | Office verify |
| `/api/goods-receipts/[id]/transfer-stock` | POST | Transfer to stock |
| `/api/transfers` | GET, POST | Transfer CRUD |
| `/api/transfers/[id]` | GET, PUT | Transfer detail/update |
| `/api/transfers/[id]/execute` | POST | Execute transfer |
| `/api/transfers/[id]/cancel` | POST | Cancel transfer |
| `/api/transfers/[id]/preview` | GET | Preview transfer effects |
| `/api/stock/movements` | GET | Legacy stock movements |
| `/api/stock/sync` | POST | Stock sync utility |

---

## 14. PERMISSION INTEGRATION

Permissions used across inventory:
- `inventory.edit` - Edit inventory items, complete receipts
- `transfers.execute` - Execute warehouse transfers
- `hasWarehouseAccess(userId, warehouseId)` - Per-warehouse access control

---

## 15. KEY TECHNICAL PATTERNS

1. **Romanian UI**: All labels, messages, and dialogs are in Romanian
2. **Decimal precision**: Stock uses `Decimal(10,3)` for fractional units (kg, ml, etc.)
3. **Transactional stock updates**: All multi-step stock operations use `prisma.$transaction`
4. **Idempotency**: Return processing checks for existing movements to prevent double-counting
5. **Dual stock tracking**: Both per-warehouse and aggregate totals maintained
6. **shadcn/ui components**: Cards, Tables, Badges, Dialogs, Dropdowns, Select, Form (zod validation)
7. **TanStack Query**: All data fetching uses `useQuery`/`useMutation` with query invalidation
8. **Composite item logic**: Stock operations always decompose to individual components
9. **Legacy compatibility**: Old statuses (DRAFT, COMPLETED) maintained alongside new workflow statuses
