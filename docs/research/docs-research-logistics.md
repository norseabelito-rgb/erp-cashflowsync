# Logistics Modules Research: Picking, Handover, Tracking & Delivery

## Overview

This document covers the 4 logistics modules that handle the fulfillment pipeline from warehouse to customer delivery. The flow is:

**Orders/AWBs → Picking → Handover → Tracking → Delivery Manifest**

All UI is in Romanian. The system uses FanCourier as the sole courier provider.

---

## 1. PICKING MODULE

### Purpose
Manages warehouse product retrieval. Groups multiple AWB orders into aggregated picking lists so a warehouse worker can collect all needed products in a single pass, rather than picking per-order.

### Data Models (Prisma)

**PickingList** (`picking_lists` table):
- `id`, `code` (unique auto-generated like `PL-XXXX`), `name` (optional)
- `status`: enum `PENDING | IN_PROGRESS | COMPLETED | CANCELLED`
- `createdBy/Name`, `startedBy/Name`, `completedBy/Name` - tracks who did what
- `startedAt`, `completedAt` - timestamps
- `totalItems`, `totalQuantity`, `pickedQuantity` - aggregate stats
- `pdfData` (Bytes), `pdfGeneratedAt` - stores generated PDF as binary
- Relations: `items[]` (PickingListItem), `awbs[]` (PickingListAWB), `logs[]` (PickingLog)

**PickingListItem** (`picking_list_items` table):
- `sku`, `barcode`, `title`, `variantTitle`, `imageUrl`, `location`
- `quantityRequired`, `quantityPicked`, `isComplete`
- `isRecipeParent` - for composite/recipe products (informational only, not pickable)
- `parentItemId` - self-referencing for recipe component hierarchy
- `masterProductId` - links to inventory system
- `pickedAt`, `pickedBy`, `pickedByName`
- Unique constraint: `[pickingListId, sku, variantTitle, parentItemId]`

**PickingListAWB** (`picking_list_awbs` table):
- Links PickingList ↔ AWB (many-to-many through this join table)
- `awbId` is `@unique` - one AWB can only be in ONE picking list
- `isPrinted`, `printedAt`, `isPacked`, `packedAt` - per-AWB tracking

**PickingLog** (`picking_logs` table):
- Audit trail with actions: `ITEM_PICKED`, `ITEM_UNDO`, `SURPLUS_ATTEMPT`, `LIST_STARTED`, `LIST_COMPLETED`, `LIST_SAVED`, `QUANTITY_CHANGED`
- Records `userId`, `userName`, `itemId`, `itemSku`, `itemTitle`
- `quantityBefore`, `quantityAfter`, `quantityAttempted`

### Pages

**`/picking`** - Main listing page
- Dashboard with stats cards: Total, Pending, In Progress, Completed, Cancelled
- Search by code, name, AWB number, or order number
- Filter by status
- Each card shows: code, status badge, product count, AWB count, progress bar (for IN_PROGRESS)
- Actions: View, Cancel (PENDING only), Delete (PENDING/CANCELLED only), PDF Preview/Download (COMPLETED only)
- Permission: `picking.view`, `picking.create` for mutations

**`/picking/create`** - Create new picking list
- Fetches available AWBs (excludes delivered/cancelled) from `/api/awb`
- Search by AWB/Order/Client, filter by SKU
- Checkbox selection with "select all" toggle
- **Preview Produse** button → calls `/api/picking/aggregate` to show aggregated product list
  - Shows unique products, total quantity, barcode count
  - Products sorted by location then SKU
- **Create** button → POST `/api/picking` with selected `awbIds` and optional `name`

**`/picking/[id]`** - Detail/active picking page (the main work screen)
- Header: code, name, status badge
- **Progress card**: dark background, shows picked/total with progress bar and percentage
- **Scanner input**: barcode/SKU input field with auto-submit after 100ms (designed for barcode scanners)
  - Sends `barcode` + `sku` simultaneously so server can match either
  - Haptic feedback via `navigator.vibrate()`
  - Auto-focuses on load, auto-clears scan result after 3s
  - 5-second auto-refresh interval for real-time collaboration
- **Info cards**: Created by / Started by / Completed by with timestamps
- **Recipe products** (purple section): Informational composite products - their components are listed below
- **Products to pick**: Cards with image, title, SKU, barcode, location, quantity progress
  - Clicking opens quantity modal (increment/decrement with quick buttons: 1, 5, 10, All)
  - Manual pick via `pickItem` action
- **Completed products**: Green section with reset button
- **AWBs section**: Shows all AWB numbers linked to this picking list
- **Actions**: Start Picking (PENDING→IN_PROGRESS), Finalize (requires ALL items complete)

**`/picking/logs`** - Audit log viewer
- Stats: total logs, surplus attempts, items picked, undos
- Filter by action type, search by SKU/product/user
- Paginated (50 per page)
- Each log entry shows: picking list code, action type with icon, message, user, quantity changes, timestamp

### API Routes

**GET `/api/picking`**
- Lists picking lists with items, AWBs, counts
- Pagination, search (code, name, AWB number, order number), status filter
- Returns stats grouped by status

**POST `/api/picking`**
- Creates picking list from AWB IDs
- Aggregates line items across orders: key = `sku|variantTitle`
- Generates code: `PL-{timestamp_base36}`
- Creates in transaction: PickingList + items + AWB links
- Permission: `picking.create`

**GET `/api/picking/[id]`**
- Full detail with items (ordered by location, SKU), AWBs
- Calculates progress excluding `isRecipeParent` items

**PATCH `/api/picking/[id]`** - Multi-action endpoint:
- `action: "scan"` - Match by barcode OR SKU, increment quantity by 1
  - **Stock deduction**: NON-BLOCKING - finds MasterProduct by ID or SKU, deducts from primary warehouse via `deductInventoryStockFromWarehouse()`. Falls back to legacy stock update. Errors are logged but don't fail the pick.
  - Auto-completes list if all items done
- `action: "pickItem"` - Manual pick with specific `itemId` and `quantity`
  - Same stock deduction logic
  - Logs `SURPLUS_ATTEMPT` if already complete
  - Logs `ITEM_PICKED` for successful picks
  - Auto-completes list + logs `LIST_COMPLETED`
- `action: "start"` - Claims the picking list (PENDING→IN_PROGRESS)
  - Prevents double-claim: returns error if already started by someone else
  - Logs `LIST_STARTED`
- `action: "complete"` - Finalize (requires 0 incomplete items)
  - Generates PDF (non-blocking - continues even if PDF fails)
  - Stores PDF binary in `pdfData` field
  - Sends notifications to SuperAdmins and Administrator role users
- `action: "cancel"` - Cancel (cannot cancel COMPLETED)
- `action: "resetItem"` - Reset picked quantity to 0
  - **Stock restoration**: NON-BLOCKING - adds back stock via `addInventoryStockFromWarehouse()`
  - Resets `isComplete`, `pickedAt`, `pickedBy`
- Default: Update `name`, `assignedTo`, `notes`

**DELETE `/api/picking/[id]`**
- Cannot delete IN_PROGRESS lists
- Permission: `picking.create`

**POST `/api/picking/aggregate`**
- Preview endpoint: aggregates products across selected AWBs
- Returns products sorted by location→SKU, with `awbCount` per product
- Stats: totalAwbs, totalProducts, totalQuantity, productsWithBarcode, productsWithLocation

**GET `/api/picking/logs`**
- Paginated log query with filters: action, search, pickingListId
- Permission: `picking.logs`

**GET `/api/picking/[id]/print`**
- Generates PDF on-the-fly using `pdf-lib`
- A4 format with header, info boxes (created/started/completed), product table
- Supports `?preview=true` for inline display vs download
- Romanian character sanitization for PDF fonts (replaces ă→a, ș→s, etc.)
- Alternating row backgrounds, page break handling, AWB list footer

### User Workflow
1. Go to `/picking/create`
2. Select AWBs (filter by SKU if picking specific products)
3. Preview aggregated products (optional)
4. Create picking list → redirects to `/picking/[id]`
5. Click "Start Picking" to claim the list
6. Use barcode scanner or click products to pick
7. Use quantity modal for bulk picking
8. When all items picked, click "Finalize"
9. PDF generated, admins notified
10. Download/preview PDF from completed list

### Key Features
- **Barcode scanner support**: Auto-submit after 100ms idle, haptic feedback
- **Real-time collaboration**: 5s auto-refresh
- **Recipe/composite products**: Parent products shown as informational, components pickable
- **Stock deduction**: Automatic, non-blocking (won't fail pick if stock system errors)
- **PDF generation**: Both on-finalize (stored) and on-demand (via print endpoint)
- **Admin notifications**: With PDF attachment on completion
- **Audit trail**: Complete log of all picking actions

---

## 2. HANDOVER MODULE (Predare Curier)

### Purpose
Manages the daily handover of parcels to the courier. Workers scan each AWB barcode to confirm it was physically given to the courier driver. At end of day, unscanned AWBs are marked as "NOT HANDED OVER" for follow-up.

### Data Models (Prisma)

**HandoverSession** (`handover_sessions` table):
- `date` (unique Date) - one session per day
- `status`: enum `OPEN | CLOSED`
- `closedAt`, `closedBy`, `closedByName`, `closeType` ("auto" or "manual")
- `reopenedAt`, `reopenedBy`, `reopenedByName`
- Stats fields: `totalIssued`, `totalHandedOver`, `totalNotHandedOver`, `totalFromPrevDays`
- Relations: `awbs[]` (AWB)

**AWB fields** (on AWB model, relevant to handover):
- `handedOverAt`, `handedOverBy`, `handedOverByName`, `handedOverNote`
- `notHandedOver` (boolean), `notHandedOverAt`
- `hasC0WithoutScan` (boolean), `c0ReceivedAt` - FanCourier C0 pickup confirmation without internal scan
- `handoverSessionId` - links to the session

### Core Library: `src/lib/handover.ts`

**Key Functions:**
- `getTodayStart()/getTodayEnd()` - Day boundaries for queries
- `getTodayHandoverList(storeId?)` - AWBs created today (excludes cancelled/deleted)
- `getTodayStats(storeId?)` - Counts: totalIssued, totalHandedOver, totalNotHandedOver, totalNotHandedOverAll, totalPending, totalFromPrevDays, totalC0Alerts
- `getNotHandedOverList(storeId?)` - All AWBs with `notHandedOver=true` across all days
- `scanAWB(awbNumber, userId, userName)` - Core scan logic:
  - Validates AWB number (min 5 chars)
  - Tries exact match, then prefix match (FanCourier barcodes are 21 chars, DB stores 13-char AWB number)
  - Checks: not cancelled, not delivered, not returned, not already scanned today
  - **ATOMIC update** using `updateMany` with conditions to prevent race conditions
  - Handles: re-scanning previously scanned AWBs, scanning formerly-NEPREDAT AWBs
  - Returns typed `ScanResult` with success/warning/error
- `getOrCreateTodaySession()` - Uses `upsert` to avoid race conditions
- `finalizeHandover(userId, userName, closeType)` - Marks all unscanned AWBs as NEPREDAT, saves stats to session
- `reopenHandover(userId, userName)` - Reopens closed session
- `getC0Alerts(storeId?)` - AWBs with FanCourier pickup confirmation but no internal scan
- `resolveC0Alert(awbId, action, userId, userName)` - Mark as handed or ignore
- `resolveAllC0Alerts(action, userId, userName, storeId?)` - Bulk resolve
- `getHandoverReport(date, storeId?)` - Historical report for any date
- `checkAutoFinalize()` - CRON function: auto-finalizes at configured time (default 20:00), also runs `markOldUnscannedAsNotHandedOver()`
- `markOldUnscannedAsNotHandedOver()` - Catches AWBs from previous days that were never scanned
- `markC0WithoutScan(awbId, c0Date)` - Called from FanCourier sync when C0 received

### Pages

**`/handover`** - Main handover page (daily operations)
- Header: "Predare Curier" with today's date
- **Countdown timer** to 20:00 (auto-finalize time)
- **Large progress bar**: scanned/total with percentage
- **Scanner input**: Full-width input with visual feedback (green flash on success, red shake on error)
  - Auto-submit after 100ms idle
  - Auto-focus, auto-clear
  - Disabled when session is CLOSED
- **Store filter**: Filter by store
- **Session status alert**: Shows CLOSED state with reopen button
- **C0 Alerts banner**: Warning for AWBs picked up by courier but not internally scanned
- **Split-screen layout**:
  - Left (orange): "De scanat" - pending AWBs with C0 alert buttons
  - Right (green): "Scanate" - scanned AWBs with timestamps
- **Quick actions**: Info about unscanned AWBs, link to not-handed page
- **Finalize dialog**: Shows breakdown of total/scanned/will-be-marked-NEPREDAT
- **C0 Alert dialog**: Per-AWB resolution (mark as handed or leave for investigation)
- 30-second auto-refresh
- Permissions: `handover.scan`, `handover.finalize`, `handover.view`

**`/handover/not-handed`** - Undelivered AWBs tracker
- Shows ALL AWBs marked as `notHandedOver=true` across all days
- Stats: total count
- Filter by store
- Table with: AWB, Order (link), Store, Issue Date, Days Since (color-coded badge: red ≥3, orange ≥2)
- FanCourier status code with tooltip
- **"Scan Now" button** per AWB - calls same scan endpoint
- Permissions: uses handover scan endpoint

**`/handover/report`** - Historical handover reports
- Date picker and store filter
- Summary cards: Total AWBs, Handed Over (with %), Not Handed Over, From Previous Days, Finalization time/type
- Tabbed view:
  - **Predate (Handed Over)**: Table with AWB, Order, Store, Recipient, Scan Time, C0 Confirmation
  - **Nepredate (Not Handed)**: Table with reason badge "Nescanat"
  - **Din zile anterioare (Previous Days)**: Shows AWBs from earlier days scanned on report date
- **Export Excel** button → `/api/handover/report/export`

### API Routes

**GET `/api/handover/today`**
- Returns today's AWBs, stats, session status
- Calls `getTodayHandoverList()`, `getTodayStats()`, `getOrCreateTodaySession()`
- Permission: `handover.view`

**POST `/api/handover/scan`**
- Validates session is open, calls `scanAWB()`
- Permission: `handover.scan`

**POST `/api/handover/finalize`**
- Calls `finalizeHandover(userId, userName, "manual")`
- Permission: `handover.finalize`

**POST `/api/handover/reopen`**
- Calls `reopenHandover()`
- (Permission check inferred)

**GET `/api/handover/not-handed`**
- Returns AWBs with `notHandedOver=true` via `getNotHandedOverList()`

**GET `/api/handover/c0-alerts`**
- Returns C0 alerts via `getC0Alerts()`
- POST endpoint for resolving: `resolveC0Alert()` or `resolveAllC0Alerts()`

**GET `/api/handover/report`**
- Historical report for date via `getHandoverReport()`

**GET `/api/handover/report/export`**
- Excel export of handover report

### User Workflow
1. Open `/handover` at start of courier pickup window
2. Session auto-creates as OPEN
3. Scan each AWB barcode as courier picks up parcels
4. Monitor progress bar and C0 alerts
5. Resolve any C0 alerts (courier picked up without internal scan)
6. At end of day, click "Finalize" or wait for auto-finalize at 20:00
7. Unscanned AWBs automatically marked as NEPREDAT
8. Review not-handed AWBs at `/handover/not-handed`
9. Next day, previously-NEPREDAT AWBs can be scanned and will appear in "from previous days"

### Key Features
- **Barcode scanner optimized**: Auto-submit, visual feedback (green/red flash), auto-focus
- **Atomic scan**: Uses `updateMany` with conditions to prevent double-scan race conditions
- **FanCourier barcode format**: Handles 21-char barcodes by trying 13-char prefix match
- **Session management**: One session per day, can be reopened
- **C0 Alert system**: Detects discrepancy between FanCourier pickup confirmation and internal scan
- **Auto-finalize**: Configurable CRON job (default 20:00)
- **Old AWB cleanup**: Automatically marks forgotten AWBs from previous days as NEPREDAT
- **Multi-store support**: Filter all views by store
- **Reports with Excel export**: Historical daily reports

---

## 3. TRACKING MODULE

### Purpose
Provides a unified view of all AWB shipments with their FanCourier delivery statuses. Allows operators to monitor delivery progress, identify problems, and understand what each status code means.

### Pages

**`/tracking`** - Main tracking dashboard
- **Stats grid**: Dynamic cards from `/api/awb/stats` - one card per FanCourier status code
  - Each card shows count and status name, colored by status color
  - Click to filter AWBs by that status
  - Info button opens status explanation modal
  - "Total" card always first
  - Sum verification notice if card counts don't match total
- **Search**: By AWB number, order number, customer name, address
- **AWB List**: Collapsible cards for each AWB
  - Header: AWB number (styled by category), status badges, FanCourier code, store badge
  - Cash on delivery indicator
  - Error messages shown inline (red box)
  - Expanded view:
    - **Delivery Details**: Recipient, phone, address, city, service type, payment type, cash on delivery, order value, link to order
    - **Status History**: Timeline view with colored dots, timestamps, locations, descriptions
  - Category styling (colors, icons): pending, in_transit, delivered, returned, cancelled, deleted, error, unknown

**Status categories** (from `src/lib/awb-status.ts`):
- `pending` - Waiting (yellow)
- `in_transit` - In transit (blue)
- `delivered` - Delivered (green)
- `returned` - Returned (orange)
- `cancelled` - Cancelled (red)
- `deleted` - Deleted (gray)
- `error` - Error (red)
- `unknown` - Unknown (gray)

**`/tracking/status-modal.tsx`** - Status explanation modal
- Shows: status code badge, status name, final status indicator
- **"Ce inseamna?"** (What does it mean?) - Description
- **"Ce trebuie sa faci?"** (What should you do?) - Action items from `FANCOURIER_STATUSES[code].action`
- Icons mapped by category: pickup, transit, delivery, notice, problem, return, cancel, other

### API Routes

**GET `/api/tracking`**
- Fetches AWBs with order details, store, and full status history
- Search by AWB number or order number
- Permission: `awb.track`

**POST `/api/tracking/refresh`**
- Triggers `updateAllAWBStatuses()` from FanCourier lib
- Returns count of updated + errors
- Used by sidebar "Sincronizare" button (not on tracking page itself)

### Key Features
- **Dynamic status cards**: Counts auto-update from DB, each FanCourier status gets its own card
- **Status explanation system**: Operators can click any status code to understand what it means and what action to take
- **Category-based styling**: Visual distinction between delivery stages
- **Full status history timeline**: Every status change logged with timestamp and location
- **Cross-referencing**: Links to order details

---

## 4. DELIVERY MANIFEST MODULE

### Purpose
Manages the delivery confirmation and invoice collection process. Fetches delivered AWBs from FanCourier, creates manifests, and processes invoice payments (marks invoices as collected/paid in Oblio).

### Pages

**`/reports/delivery-manifest`** - Delivery manifest management
- **List view** (default):
  - Fetch form: Select company + date → POST to create manifest from FanCourier data
  - Recent manifests table: Date, Status, AWB count, Processed count, Error count, Open button
- **Detail view** (`?id=manifestId`):
  - Header with status badge: DRAFT → CONFIRMED → PROCESSED
  - Stats: total, processed, errors, pending
  - Error alert if any failures
  - **Actions**:
    - DRAFT → "Confirma" button
    - CONFIRMED → "Marcheaza Incasate" button (with confirmation dialog)
  - Item table: Status icon, AWB, Order, Invoice (series+number), Value, Payment Status, Error
- Manifest statuses: DRAFT, PENDING_VERIFICATION, CONFIRMED, PROCESSED
- Manifest item statuses: PENDING, PROCESSED, ERROR
- Processes via `/api/manifests/deliveries/[id]/process` with `collectType: "Ramburs"`

### Pages

**`/reports/stuck-shipments`** - Stuck shipments report
- Shows AWBs older than N days (default 3) that are neither delivered nor returned
- Filter: Minimum days (adjustable 1-30)
- Stats cards: Total blocked, >7 days (red), 5-7 days (orange)
- Table: Age (color-coded badge), AWB, Order number, Invoice, Client, Phone (clickable tel: link), Current Status
- **CSV export** button
- Data from `/api/reports/stuck-shipments`

### User Workflow (Delivery Manifest)
1. Open `/reports/delivery-manifest`
2. Select company and date
3. Click "Preia de la FanCourier" to fetch delivered AWBs
4. Review manifest items (DRAFT status)
5. Click "Confirma" to confirm manifest
6. Click "Marcheaza Incasate" to process: marks invoices as paid in Oblio
7. Review results: success count, error count, skipped count

### User Workflow (Stuck Shipments)
1. Open `/reports/stuck-shipments`
2. Adjust minimum days filter if needed
3. Review stuck AWBs, sorted by age
4. Use phone links to contact customers
5. Export CSV for further analysis

---

## Cross-Module Integration

### End-to-End Flow
```
Order Created → AWB Generated → Picking List Created → Items Picked →
Parcel Packed → Handover Scanned → Courier Picks Up →
Tracking Updates → Delivered → Delivery Manifest → Invoice Collected
```

### Shared Data
- **AWB** is the central entity linking all modules
- Picking references AWBs via `PickingListAWB` join table
- Handover writes directly to AWB fields (`handedOverAt`, `notHandedOver`, etc.)
- Tracking reads AWB `currentStatus`, `fanCourierStatusCode`, `statusHistory`
- Delivery Manifest matches AWBs to invoices for payment processing

### Permissions
- `picking.view` - View picking lists
- `picking.create` - Create/delete/cancel picking lists
- `picking.logs` - View picking audit logs
- `handover.view` - View handover data
- `handover.scan` - Scan AWBs at handover
- `handover.finalize` - Finalize/reopen handover session
- `awb.track` - View tracking information

### FanCourier Integration Points
- AWB creation (separate module)
- Status sync: `updateAllAWBStatuses()` updates `fanCourierStatusCode`, `statusHistory`
- C0 detection: `markC0WithoutScan()` called during sync
- Delivery manifest fetch: Gets delivered AWBs from FanCourier API
- Barcode format: 21-char barcode → 13-char AWB number prefix match

### Stock Integration
- Picking deducts stock on item pick via `deductInventoryStockFromWarehouse()`
- Picking restores stock on item reset via `addInventoryStockFromWarehouse()`
- Both are NON-BLOCKING: stock errors are logged but don't fail picking operations
- Uses new InventoryItem system with fallback to legacy MasterProduct.stock

---

## Technical Patterns

### Scanner Input Pattern (used in both Picking and Handover)
```
1. Auto-focus input on load
2. On input change, set 100ms timeout
3. If input ≥ 5 chars and no new input within 100ms, auto-submit
4. On success: green feedback, vibrate, clear input, refocus
5. On error: red feedback, vibrate pattern, clear input, refocus
```

### Atomic Updates (Handover)
- Uses `updateMany` with WHERE conditions instead of `update` to prevent race conditions
- If `count === 0`, another process already scanned the AWB

### PDF Generation (Picking)
- Uses `pdf-lib` (not puppeteer/chrome)
- Romanian character sanitization (ă→a, ș→s, etc.) for font compatibility
- Dual generation: stored on finalize + on-demand via print endpoint
- A4 format with table headers repeated on page breaks

### CRON Functions (Handover)
- `checkAutoFinalize()` - Auto-close at configured time
- `markOldUnscannedAsNotHandedOver()` - Clean up forgotten AWBs
- Both designed to be called from external CRON scheduler
