# Research: Orders, AWB, Invoices & Returns Modules

## 1. ORDERS MODULE

### Purpose
The Orders module is the central hub for managing all sales orders from multiple channels: Shopify, Trendyol, Temu, and manual entry. It syncs orders from external platforms, validates them, and coordinates the entire fulfillment pipeline (invoicing, AWB creation, picking, shipping, and returns).

### Database Model: `Order` (prisma/schema.prisma:402)
**Key fields:**
- `shopifyOrderId` / `shopifyOrderNumber` - External order identifiers
- `source` - Channel origin: `"shopify"` | `"trendyol"` | `"manual"`
- `storeId` - Which store the order belongs to (linked to Company for billing)
- Customer data: email, phone, first/last name
- Shipping address: address1/2, city, province, country, zip
- Financial data: `totalPrice`, `subtotalPrice`, `totalShipping`, `totalTax`, `currency` (default RON)
- `status` - OrderStatus enum (see below)
- `financialStatus` - From Shopify: paid, pending, refunded, etc.
- `fulfillmentStatus` - From Shopify: fulfilled, partial, null
- Phone/address validation: `phoneValidation`, `addressValidation` (ValidationStatus enum)
- `billingCompanyId` - Which company issues the invoice (set from Store config)
- `operationalWarehouseId` - Which warehouse ships the order
- `requiredTransferId` - If stock needs inter-warehouse transfer first
- `intercompanyStatus` - For multi-company setups: null, "pending", "settled"
- `internalStatusId` - Custom workflow status (user-defined nomenclator)

**Relations:** invoice (1:1), awb (1:1), lineItems (1:N), processingErrors, trendyolOrder, temuOrder, intercompanyLink, failedInvoiceAttempts, tasks, returnAwbs, manifestItems

### OrderStatus Enum (schema.prisma:375)
| Status | Romanian Label | Meaning |
|--------|---------------|---------|
| `PENDING` | In asteptare | New order, not yet validated |
| `VALIDATED` | Validat | Phone/address validations passed |
| `VALIDATION_FAILED` | Validare esuata | Validation checks failed |
| `WAIT_TRANSFER` | Asteapta transfer | Waiting for warehouse stock transfer to complete |
| `INVOICE_PENDING` | Necesita factura | Ready for invoicing |
| `INVOICE_ERROR` | Eroare factura | Invoice issuance failed |
| `INVOICED` | Facturat | Invoice successfully issued |
| `PICKING` | In picking | Being picked in warehouse |
| `PACKED` | Impachetat | Packed, ready for shipping |
| `AWB_PENDING` | Necesita AWB | Ready for shipping label creation |
| `AWB_CREATED` | AWB creat | Shipping label generated |
| `AWB_ERROR` | Eroare AWB | Shipping label creation failed |
| `SHIPPED` | Expediat | Picked up by courier |
| `DELIVERED` | Livrat | Successfully delivered |
| `RETURNED` | Returnat | Package returned |
| `CANCELLED` | Anulat | Order cancelled |

### Key UI Features (src/app/(dashboard)/orders/page.tsx)
- **Channel Tabs**: Shopify, Trendyol, Temu tabs (URL-persisted via `?tab=` param)
- **Filters**: Status, store, AWB status, internal status, date range, product/SKU search
- **Bulk Actions** (with checkbox selection):
  - "Emite Factura" - Issue invoices for selected orders (via Oblio API)
  - "Creaza AWB" - Create shipping labels for selected orders (via FanCourier API)
  - "Proceseaza Tot" - Issue invoice + create AWB + create picking list in one action
- **Per-order Actions**:
  - View order details (modal with full order info, line items, AWB status, invoice)
  - Edit customer data (phone, email, address) - syncs back to Shopify
  - Create/delete AWB
  - Sync individual order (refresh AWB status + invoice status)
  - Set internal status (custom workflow tags)
- **Stock Tooltips**: Hovering over SKUs shows live inventory stock levels
- **Processing Errors Panel**: Shows persistent errors from DB with retry/skip actions
- **Manual Order Creation**: Dialog to create orders manually (not from Shopify)
- **Transfer Warning Modal**: Shows when trying to invoice orders with pending stock transfers
- **Export**: Excel export of orders
- **Stats**: Order counts by status displayed in summary cards

### User Workflow (Shopify Orders)
1. **Sync**: Orders auto-sync from Shopify via webhook (`orders/create`, `orders/updated`, `orders/cancelled`) or manual sync button
2. **Validation**: Phone and address are validated (PENDING -> VALIDATED or VALIDATION_FAILED)
3. **Invoice**: User selects orders and clicks "Emite Factura" -> Invoice created in Oblio
4. **AWB**: User selects invoiced orders and clicks "Creaza AWB" -> AWB created in FanCourier, optional picking list auto-created
5. **OR Process All**: "Proceseaza Tot" does steps 3+4 together
6. **Picking/Packing**: Order goes through warehouse picking workflow
7. **Handover**: Packages are scanned and handed over to courier
8. **Tracking**: AWB status updates via auto-sync from FanCourier
9. **Delivery/Return**: Final status

### Trendyol Orders
- Synced via `POST /api/trendyol/orders` (manual trigger, last 7 days)
- Additional fields: `trendyolOrderNumber`, `shipmentPackageId`
- Invoice sent to Trendyol after issuance
- Tracking sent to Trendyol after AWB creation
- Local AWB created via FanCourier (separate from Trendyol's own AWB)

### Manual Orders
- Created via `POST /api/orders/manual`
- Source set to `"manual"`
- Same workflow as Shopify orders after creation

### Key API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders` | GET | List orders with pagination, filters |
| `/api/orders/[id]` | GET | Single order details |
| `/api/orders/[id]` | PUT | Update order customer/shipping data |
| `/api/orders/[id]/status` | PATCH | Update internal workflow status |
| `/api/orders/[id]/activity` | GET | Activity log for order |
| `/api/orders/[id]/check-transfer` | GET | Check if order needs stock transfer |
| `/api/orders/manual` | POST | Create manual order |
| `/api/orders/process` | POST | Process orders (invoice + AWB) |
| `/api/orders/process-all` | POST | Batch process with picking list creation |
| `/api/orders/export` | GET | Export orders to Excel |
| `/api/orders/check-transfers` | GET | Check transfer status for multiple orders |
| `/api/webhooks/shopify` | POST | Shopify webhook receiver (HMAC verified) |

### Integrations
- **Shopify**: Order sync (webhook + manual), customer data sync back, fulfillment status
- **Trendyol**: Order sync, invoice upload, tracking upload
- **Temu**: Order sync (separate module)
- **Oblio**: Invoice issuance (via invoice-service.ts)
- **FanCourier**: AWB creation (via awb-service.ts)

---

## 2. AWB (SHIPPING LABELS) MODULE

### Purpose
The AWB module manages shipping labels (Air Waybill / "Scrisoare de transport") created via FanCourier. It provides tracking, status monitoring, and detailed shipment information. AWB is linked 1:1 with an Order.

### Database Model: `AWB` (prisma/schema.prisma:632)
**Key fields:**
- `orderId` (unique) - One AWB per order
- `companyId` - Which company's FanCourier credentials were used
- `awbNumber` - The FanCourier AWB tracking number
- Settings: `serviceType` (Standard/Express/Cont Colector), `paymentType` (destinatar=COD / expeditor=prepaid), `weight`, `packages`, `declaredValue`, `cashOnDelivery`, `observations`
- `currentStatus` - Human-readable status text (Romanian)
- `currentStatusDate` - When status was last updated
- `errorMessage` - Error details if AWB creation failed
- FanCourier detail codes: `fanCourierStatusCode` (C0, S2, H4, etc.), `fanCourierStatusName`, `fanCourierStatusDesc`
- Handover tracking: `handedOverAt`, `handedOverBy`, `handedOverByName`, `handedOverNote`, `notHandedOver`, `hasC0WithoutScan`
- COD collection: `isCollected`, `collectedAt`, `collectedAmount`

**Related models:**
- `AWBStatusHistory` - Chronological log of all status changes
- `AWBComment` - User comments with image attachments (AWBCommentImage)
- `HandoverSession` - Links to handover scanning sessions

### AWB Status Categories (src/lib/awb-status.ts)
Based on FanCourier status codes (src/lib/fancourier-statuses.ts):

| Category | Status Codes | Description |
|----------|-------------|-------------|
| `pending` | Initial/Avizat | Awaiting pickup or action |
| `in_transit` | C0, C1, H0-H12, S1 | Package in transit/depot |
| `delivered` | S2 | Successfully delivered |
| `returned` | S6, S7, S15, S16, S33, S43 | Returned/refused by recipient |
| `cancelled` | A0-A4 | AWB cancelled/deleted |
| `error` | Address problems | Requires intervention |

### Key FanCourier Status Codes
- **C0**: Expedition picked up (courier collected from sender)
- **C1**: Taken for delivery to recipient
- **H0-H12**: In transit between depots, sorting
- **S1**: Out for delivery
- **S2**: Delivered (FINAL)
- **S6/S7**: Return in progress / returned to sender
- **S15/S16/S33**: Refused/redirected/partial return
- **A0-A4**: Cancelled/deleted from manifest

### Key UI Features

#### AWB List Page (src/app/(dashboard)/awb/page.tsx)
- **Stats Cards**: Total, In Transit, Delivered, Returned, Cancelled, Pending, Errors
- **Table**: AWB number, order number, customer name, city, status badge, COD amount, creation date
- **Filters**: Search (AWB number, order number, customer), status category, store, date range
- **Sort**: By date (default desc), sortable columns
- **Toggle**: "Show delivered" toggle to include/exclude delivered AWBs
- **Links**: Each AWB links to detail page, order links back to orders page

#### AWB Detail Page (src/app/(dashboard)/awb/[id]/page.tsx)
- **AWB Info Card**: AWB number, order details, status badge, service type, payment type, COD amount
- **Customer Info**: Name, phone, email, shipping address
- **Status Timeline**: Chronological list of all status changes with dates and locations
- **Comments Section**: Add text comments with image attachments (drag-and-drop upload)
- **Actions**: Refresh status (manual sync from FanCourier), back to list

### AWB Service (src/lib/awb-service.ts)
Key business logic:
1. **Company Resolution**: Uses `billingCompany` first, falls back to store's company for FanCourier credentials
2. **Duplicate Prevention**: Row-level lock (`SELECT FOR UPDATE`) prevents concurrent AWB creation for same order
3. **Replacement Logic**: Can replace AWB if existing one has error, is deleted, or cancelled
4. **COD Logic**:
   - If order is paid (card/online), COD = 0 and paymentType = "expeditor"
   - If COD and service isn't "Cont Colector", auto-switches to "Cont Colector"
   - If COD=0 and service is "Cont Colector", switches to "Standard"
5. **Observations**: Auto-includes product list from line items
6. **Mismatch Warning**: Warns if billingCompany differs from store company (needs user confirmation)
7. **Trendyol/Temu**: After AWB creation, sends tracking number to Trendyol/Temu platforms

### Key API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/awb` | GET | List AWBs with stats, pagination, filters |
| `/api/awb/create` | POST | Create AWBs for orders (batch) |
| `/api/awb/[id]` | GET | AWB details with status history |
| `/api/awb/[id]` | PATCH | Refresh AWB status from FanCourier |
| `/api/awb/[id]` | DELETE | Delete/cancel AWB |
| `/api/awb/[id]/comments` | GET/POST | View/add comments with images |
| `/api/awb/stats` | GET | AWB statistics |
| `/api/awb/refresh` | POST | Bulk refresh AWB statuses |
| `/api/awb/repair/*` | Various | Repair broken AWB data |

### FanCourier Integration (src/lib/fancourier.ts)
- Uses FanCourier API v2 (https://api.fancourier.ro)
- Authentication: OAuth token (username/password per company), cached 24h with per-company keys
- Uses `json-bigint` to prevent precision loss for large AWB numbers
- **Methods**: createAWB, getAWBStatus (tracking), deleteAWB, getAWBPDF

---

## 3. INVOICES MODULE

### Purpose
The Invoices module manages invoices issued through Oblio.eu (Romanian cloud invoicing platform). Invoices are linked 1:1 with Orders and track issuance, payment, and cancellation (stornare) status.

### Database Model: `Invoice` (prisma/schema.prisma:525)
**Key fields:**
- `orderId` (unique) - One invoice per order
- `companyId` - Issuing company
- `invoiceSeriesId` - Invoice series used (for local number tracking)
- `invoiceProvider` - Always "oblio"
- `invoiceNumber`, `invoiceSeriesName` - Invoice number and series prefix
- `oblioId` - External ID in Oblio system
- `status` - "pending" | "issued" | "cancelled" | "error"
- `errorMessage` - Error details if issuance failed
- `dueDate` - Payment due date
- Payment tracking: `paymentStatus` ("unpaid"/"partial"/"paid"), `paidAmount`, `paidAt`
- Cancellation: `cancelledAt`, `cancelReason`, `stornoNumber`, `stornoSeries`
- `pdfUrl`, `pdfData` - Invoice PDF (URL or stored locally)
- `issuedAt` - When the invoice was issued
- Source tracking: `cancellationSource` (MANIFEST_RETURN / PIN_APPROVAL), `paymentSource` (MANIFEST_DELIVERY / PIN_APPROVAL)

**Related models:**
- `FailedInvoiceAttempt` - Failed issuance attempts with error codes for retry
- `InvoiceSeries` - Series configuration per company (prefix, current number)
- `ManifestItem` - Links to courier manifests for bulk operations
- `PINApprovalRequest` - PIN-secured exception operations

### Invoice Statuses
| Status | Romanian | Meaning |
|--------|----------|---------|
| `pending` | In asteptare | Not yet issued |
| `issued` | Emisa | Successfully issued in Oblio |
| `cancelled` | Anulata | Cancelled (stornata) in Oblio |
| `error` | Eroare | Failed to issue |

### Payment Statuses
| Status | Romanian | Meaning |
|--------|----------|---------|
| `unpaid` | Neplatita | Not yet paid |
| `partial` | Partial | Partially paid |
| `paid` | Platita | Fully paid |

### Key UI Features

#### Invoices List Page (src/app/(dashboard)/invoices/page.tsx)
- **Stats Cards**: Total, Paid, Unpaid, Overdue, Cancelled
- **Filters**: Search (invoice number, order number, customer), status, payment status, AWB status
- **Table**: Invoice number, order number, customer, amount, status badge, payment badge, actions
- **Per-invoice Actions** (dropdown menu):
  - View invoice in Oblio (external link)
  - Download PDF
  - Mark as paid (dialog with amount and payment method)
  - Cancel invoice (dialog with reason) - calls Oblio stornare API
- **Help Dialog**: Explains status meanings and workflow
- **AWB Status Filter**: Filter invoices by their order's AWB delivery status (delivered, in transit, returned)

#### Failed Invoices Page (src/app/(dashboard)/invoices/failed/page.tsx)
- **Purpose**: View and retry invoices that failed to issue
- **Stats**: Total, Pending, Resolved
- **Table**: Order number, error code badge, error message, store, company, series, status, actions
- **Error Codes**: NO_SERIES, FACTURIS_ERROR, VALIDATION_ERROR
- **Actions**: Retry (re-attempt issuance), search/filter

### Invoice Service (src/lib/invoice-service.ts)
Key business logic for `issueInvoiceForOrder()`:
1. **Company Resolution**: Gets billing company from order -> store -> company chain
2. **Duplicate Check**: Returns error if invoice already issued
3. **Transfer Warning**: If order has pending stock transfer, returns `needsConfirmation: true` with warning - user must acknowledge
4. **Series Selection**: Gets invoice series from store config, with fallbacks (store -> company default -> Oblio direct)
5. **Number Assignment**: Gets next number from local series tracking + creates in Oblio
6. **Oblio API Call**: Creates invoice with line items, customer data, VAT settings
7. **PDF Download**: Downloads and stores invoice PDF
8. **Inventory Stock**: Processes inventory stock deduction from primary warehouse
9. **Error Handling**: On failure, saves to FailedInvoiceAttempt for later retry, rolls back invoice number
10. **Activity Logging**: Logs invoice issuance in activity log

### Invoice Error Codes (src/lib/invoice-errors.ts)
| Code | Meaning |
|------|---------|
| `ORDER_NOT_FOUND` | Order doesn't exist |
| `ALREADY_ISSUED` | Invoice already exists |
| `TRANSFER_PENDING` | Stock transfer not complete |
| `NO_COMPANY` | Store has no billing company configured |
| `NO_CREDENTIALS` | Oblio credentials not configured |
| `NO_OBLIO_CIF` | CIF not configured for Oblio |
| `NO_LINE_ITEMS` | Order has no products |
| `NO_SERIES` | No invoice series configured for store |
| `NO_NUMBER` | Could not get next invoice number |
| `OBLIO_AUTH_ERROR` | Oblio authentication failed |
| `OBLIO_ERROR` | Oblio API communication error |

### Oblio Integration (src/lib/oblio.ts)
- Uses Oblio.eu API (https://www.oblio.eu/api)
- OAuth 2.0 authentication: email (client_id) + secret token (client_secret) per company
- **Methods**: Create invoice, cancel invoice (stornare), collect payment, get PDF
- Invoice data includes: CIF, series, client info, products with VAT, payment type, currency
- Supports e-Factura (Romanian electronic invoicing system)

### Key API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoices` | GET | List invoices with filters |
| `/api/invoices/issue` | POST | Issue invoices for orders (batch) |
| `/api/invoices/[id]/cancel` | POST | Cancel (stornare) invoice in Oblio |
| `/api/invoices/[id]/pay` | POST | Mark invoice as paid |
| `/api/invoices/[id]/collect` | POST | Collect payment via Oblio |
| `/api/invoices/failed` | GET | List failed invoice attempts |
| `/api/invoices/failed` | POST | Retry failed invoice attempt |

---

## 4. RETURNS MODULE

### Purpose
The Returns module handles the receipt and processing of returned shipments. It provides barcode scanning for incoming returns, maps return AWBs to original orders, manages stock re-addition, and coordinates invoice cancellations via return manifests.

### Database Model: `ReturnAWB` (prisma/schema.prisma:3915)
**Key fields:**
- `returnAwbNumber` (unique) - Scanned AWB number of the return shipment
- `originalAwbId` - Link to the original outbound AWB
- `orderId` - Direct link to the order
- `status` - Return processing status:
  - `"received"` - Scanned at warehouse
  - `"processed"` - Processing started
  - `"stock_returned"` - Stock added back to inventory
  - `"invoice_reversed"` - Invoice has been cancelled (stornata)
- Scan info: `scannedAt`, `scannedBy`, `scannedByName`
- Processing info: `processedAt`, `processedBy`, `processedByName`
- `notes` - Additional notes

### Key UI Features

#### Returns Scanning Page (src/app/(dashboard)/returns/page.tsx)
- **Permission**: Requires `handover.scan` permission
- **Scan Input**: Auto-focused text input for barcode scanner, auto-submits after 5+ characters with 100ms delay
- **Visual Feedback**: Background color changes on scan result (green=success, red=error, yellow=warning)
- **Stats Cards**: Scanned today, Unmapped returns, Pending returns
- **Today's Scans**: List of scanned returns today with time, AWB number, original AWB, order number
- **Pending Returns**: AWBs in return status from FanCourier that haven't been scanned yet
- **Unmapped Returns**: Returns that couldn't be automatically matched to an order
- **Actions**:
  - Generate Return Manifest
  - View Manifests
  - Export returns report (Excel, with date range)
  - Link unmapped return to order manually
- **Pagination**: 50 items per page with offset-based pagination
- **Auto-refresh**: Every 30 seconds

#### Return Manifest Page (src/app/(dashboard)/returns/manifest/page.tsx)
- **Manifest List View** (no `?id=` param): Shows all return manifests with status, date, item count, processed/error counts
- **Manifest Detail View** (with `?id=` param): Shows individual manifest with items table
- **Manifest Lifecycle**:
  1. **DRAFT**: Just generated from scanned returns
  2. **CONFIRMED**: Verified by office staff
  3. **PROCESSED**: All invoices cancelled (stornated)
- **Actions**:
  - Generate new manifest (collects unprocessed scanned returns)
  - Confirm manifest (mark as verified)
  - Process manifest (bulk cancel all linked invoices in Oblio)
- **Item Table**: AWB number, original AWB, invoice number/series, invoice status, processing status

### Returns Business Logic (src/lib/returns.ts)
`scanReturnAWB()` flow:
1. Clean AWB number (handle barcode prefixes for numbers > 13 chars)
2. Check if already scanned (prevent duplicate scans)
3. Check if AWB matches one of our outbound AWBs in return status (S6, S7, S15, S16, S33, S43)
4. If direct match found: Create ReturnAWB record + automatically re-add stock to inventory
5. If no direct match: Try to find by searching AWB status history or related AWBs
6. If still no match: Create unmapped ReturnAWB (can be linked manually later)

**Stock Re-addition**: On successful scan of a direct match, `addInventoryStockForReturn()` is called to add products back to inventory, and status is updated to `"stock_returned"`.

### Courier Manifests (src/lib/manifest/)

#### Return Manifest (return-manifest.ts)
- Generates manifest from scanned ReturnAWBs with status "received" or "processed"
- Links return AWBs to their original outbound AWBs and associated invoices
- Filters out returns already in a non-processed manifest

#### Delivery Manifest (delivery-manifest.ts)
- Queries locally-synced AWB data for delivered AWBs (status code S2) on a specific date
- Links delivered AWBs to invoices for automatic payment marking
- Uses DB data (populated by auto-sync) instead of FanCourier API directly

#### Bulk Stornare (bulk-stornare.ts)
- Processes CONFIRMED return manifests by cancelling all associated invoices in Oblio
- Each item processed independently (failures don't stop batch)
- Results tracked per item with error messages
- Sets `cancellationSource = MANIFEST_RETURN` on invoices

#### Bulk Payment (bulk-payment.ts)
- Processes CONFIRMED delivery manifests by marking invoices as paid in Oblio
- Uses Oblio collectInvoice API with "Ramburs" payment type for COD
- Sets `paymentSource = MANIFEST_DELIVERY` on invoices

### PIN Security (src/lib/pin-service.ts)
For exception operations that bypass manifest-based workflows:
- 6-digit PIN stored as bcrypt hash
- 5-minute session expiry, one-time use
- Used for manual stornare (cancel) or incasare (payment) of individual invoices
- All PIN operations are audit-logged
- PIN types: `STORNARE` (cancel invoice), `INCASARE` (mark as paid)

### Key API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/returns` | GET | List returns with pagination |
| `/api/returns/scan` | POST | Scan a return AWB number |
| `/api/returns/link` | POST | Manually link return to order |
| `/api/returns/export` | GET | Export returns report (Excel) |
| `/api/returns/reprocess-stock` | POST | Reprocess stock for a return |
| `/api/manifests/returns` | GET | List return manifests |
| `/api/manifests/returns` | POST | Generate new return manifest |
| `/api/manifests/returns/[id]` | GET | Get manifest details |
| `/api/manifests/returns/[id]` | PATCH | Update manifest status (confirm) |
| `/api/manifests/returns/[id]/process` | POST | Process manifest (bulk stornare) |

---

## 5. CROSS-MODULE WORKFLOWS

### Complete Order Lifecycle
```
Shopify Order Created (webhook)
  -> Order synced to DB (PENDING)
  -> Validation (phone, address)
  -> Invoice issued via Oblio (INVOICED)
  -> AWB created via FanCourier (AWB_CREATED)
  -> Picking list created
  -> Picked & packed (PACKED)
  -> Handed over to courier (SHIPPED)
  -> FanCourier tracking updates via auto-sync
  -> Delivered (DELIVERED) -> Delivery Manifest -> Invoice marked PAID
  OR
  -> Returned (RETURNED) -> Return Scan -> Return Manifest -> Invoice CANCELLED (stornata)
```

### Multi-Company Architecture
- Each Store belongs to a Company
- Company has its own: Oblio credentials, FanCourier credentials, invoice series, sender address
- Orders inherit their billing company from the store
- AWBs are created using the company's FanCourier account
- Invoices are issued using the company's Oblio account
- Intercompany settlements tracked for secondary companies

### Sync Mechanisms
1. **Shopify Webhook**: Real-time order create/update/cancel notifications (HMAC verified)
2. **Manual Sync**: Button triggers `POST /api/sync` - pulls recent orders from Shopify API
3. **Bilateral Sync**: Checks for changes in both directions (invoices deleted in Oblio, AWB status changes in FanCourier)
4. **Auto-Sync (Cron)**: Periodic background sync for AWB status updates
5. **Individual Sync**: Per-order sync button refreshes AWB + invoice status

### Internal Order Status (Custom Workflow)
- Separate from the OrderStatus enum (which is system-controlled)
- User-defined status nomenclator (e.g., "Apel client", "Verificare stoc")
- Each status has a name, color, and sort order
- Can be set on orders for internal tracking/workflow management
- Filterable in the orders list

### Error Handling Pattern
- Processing errors saved to `ProcessingError` model for persistent tracking
- Failed invoice attempts saved to `FailedInvoiceAttempt` with error codes
- Errors can be retried or skipped from the UI
- Batch operations continue on individual failures (partial success)
- All operations use activity logging for audit trail
