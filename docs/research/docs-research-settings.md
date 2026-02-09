# Settings, RBAC, Security & System Modules - Research Document

## 1. Authentication System

### Overview
The ERP uses NextAuth.js with JWT session strategy, supporting two authentication providers: Google OAuth and email/password credentials.

### Key Files
- `src/lib/auth.ts` - NextAuth configuration and provider setup
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `src/app/api/auth/signup/route.ts` - User registration endpoint
- `src/app/login/page.tsx` - Login page with Google + credentials
- `src/app/signup/page.tsx` - Signup page
- `src/app/invite/[token]/page.tsx` - Invitation acceptance page

### Authentication Providers
1. **Google OAuth** - Primary SSO provider with `allowDangerousEmailAccountLinking: true`
   - Automatic account linking: if a user exists with the same email but no Google account linked, it links automatically
   - Active user check on Google login (blocks deactivated users)
2. **Email/Password (Credentials)** - Alternative local auth
   - Passwords hashed with bcrypt (12 rounds)
   - Case-insensitive email lookup
   - Checks `isActive` flag before allowing login

### Session Configuration
- Strategy: JWT (not database sessions)
- Session timeout: configurable via `SESSION_TIMEOUT_MINUTES` env var (default: 30 minutes)
- Update age: 60 seconds (resets timeout on activity)
- Login page handles expired session messages with query params (`?expired=inactivity`)

### First User Auto-Admin
- When the first user signs up/logs in, they automatically become SuperAdmin
- The system creates a SUPER_ADMIN role with ALL permissions and assigns it
- Subsequent users are regular (no roles unless invited with specific roles)

### Email Allowlist
- Optional `ALLOWED_EMAILS` environment variable (comma-separated)
- If set, only those emails OR users with existing accounts/valid invitations can log in
- If empty, anyone can register

### User Registration (`/api/auth/signup`)
- Validates email + password (min 8 chars)
- Hashes password with bcrypt (12 rounds)
- First user auto-becomes SuperAdmin
- Notifies existing SuperAdmins when new users register via notification system

---

## 2. RBAC System (Role-Based Access Control)

### Architecture
The RBAC system uses a 4-layer model: Users -> Roles -> Permissions, with Groups as an organizational layer.

### Database Models (Prisma)
- **User** - Core user entity with `isSuperAdmin` and `isActive` flags
- **Permission** - Granular permissions with `code` (unique), `name`, `description`, `category`, `sortOrder`
- **Role** - Named roles with `isSystem` flag, `color` for UI badges
- **Group** - User groups that inherit roles
- **RolePermission** - Many-to-many Role <-> Permission
- **UserRoleAssignment** - Many-to-many User <-> Role (tracks `assignedBy`, `assignedAt`)
- **UserGroupMembership** - Many-to-many User <-> Group (tracks `addedBy`, `joinedAt`)
- **GroupRoleAssignment** - Many-to-many Group <-> Role (groups inherit roles)
- **UserStoreAccess** - Per-store access restrictions
- **UserWarehouseAccess** - Per-warehouse access restrictions

### Permission Resolution (`src/lib/permissions.ts`)
Permissions are resolved through two paths:
1. **Direct roles**: User -> UserRoleAssignment -> Role -> RolePermission -> Permission
2. **Group roles**: User -> UserGroupMembership -> Group -> GroupRoleAssignment -> Role -> RolePermission -> Permission

**SuperAdmin bypass**: SuperAdmin users (`isSuperAdmin: true`) bypass all permission checks and have access to everything.

**Store access logic**: If a user has NO store access records, they have access to ALL stores. If they have any records, they only have access to listed stores. Same pattern for warehouses.

### Permission Categories (23 total)
Organized into functional categories:
| Category | Codes | Description |
|----------|-------|-------------|
| orders | orders.view/create/edit/delete/process/export/sync | Order management |
| products | products.view/create/edit/delete/sync/stock/prices | Product management |
| categories | categories.view/manage | Category management |
| invoices | invoices.view/create/cancel/download/payment/series | Invoice management |
| awb | awb.view/create/print/delete/track | AWB/shipping management |
| printers | printers.view/create/edit/delete | Printer management |
| picking | picking.view/create/process/complete/print/logs | Picking workflow |
| handover | handover.view/scan/finalize/report | Courier handover |
| processing | processing.errors.view/retry/skip | Error processing |
| inventory | inventory.view/adjust/sync/edit | Inventory management |
| reception | reception.view/verify/approve_differences | NIR reception |
| warehouses | warehouses.view/create/edit/delete/set_primary | Warehouse management |
| transfers | transfers.view/create/execute/cancel | Stock transfers |
| marketplace | marketplace.view/manage/publish | Marketplace integrations |
| ads | ads.view/manage/create/alerts/accounts | Advertising |
| reports | reports.view/export | Reporting |
| settings | settings.view/edit/integrations/stores/handover/security | System settings |
| users | users.view/invite/edit/deactivate/roles/groups | User management |
| admin | admin.roles/groups/permissions/audit | Administration |
| logs | logs.sync/activity | Log viewing |
| tasks | tasks.view/create/edit/delete | Task management |
| companies | companies.view/manage | Company management |
| intercompany | intercompany.view/generate/mark_paid | Intercompany billing |

### Default System Roles (6 pre-defined)
1. **Administrator** (red) - All permissions except admin.* - system role
2. **Manager** (amber) - Orders, products, invoices, AWB, picking, handover, inventory, reports, tasks
3. **Operator Comenzi** (blue) - Order processing, invoices, AWB, products view, handover scan
4. **Picker** (green) - Picking workflow, handover scan, products/orders view only
5. **Operator Predare** (purple) - Handover scan/finalize/report, AWB/orders view
6. **Vizualizare** (gray) - View-only across all modules

### Client-Side Permissions (`src/hooks/use-permissions.tsx`)
- **PermissionsProvider** - React context that fetches user permissions on auth
- **usePermissions()** hook - Provides `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- **RequirePermission** component - Conditional rendering based on permissions
- **ROUTE_PERMISSIONS** - Maps routes to required permissions for navigation guards
- Routes like `/dashboard`, `/profile`, `/preferences` require no permissions

### API Routes for RBAC
- `GET /api/rbac/roles` - List all roles with permissions and user/group counts
- `POST /api/rbac/roles` - Create role (requires `admin.roles`)
- `PUT /api/rbac/roles` - Update role (system roles can't have name changed)
- `DELETE /api/rbac/roles` - Delete non-system role (must have no users/groups)
- `GET /api/rbac/users` - List users with roles, groups, store access (requires `users.view`)
- `PUT /api/rbac/users` - Update user roles/groups/store access/active/superadmin
- `POST /api/rbac/users` - Get current user's permissions (`getMyPermissions`)
- `GET /api/rbac/groups` - List groups with members and roles
- `POST/PUT/DELETE /api/rbac/groups` - CRUD groups
- `GET /api/rbac/permissions` - List all permissions with categories

### Invitation System
- `POST /api/rbac/invitations` - Create invitation with pre-assigned roles, groups, store access
- Token-based invitation links: `/invite/[token]`
- Configurable expiry (default: 7 days)
- Prevents duplicate invitations for same email
- `DELETE /api/rbac/invitations` - Cancel pending invitation
- `POST /api/rbac/invitations/accept` - Accept invitation (creates user, assigns roles/groups/stores)
- All invitation actions logged to audit

---

## 3. Settings Pages

### Main Settings Page (`/settings`)
**File**: `src/app/(dashboard)/settings/page.tsx`

A tabbed interface with 8 tabs:
1. **Magazine (Stores)** - Shopify store management
   - Add/edit Shopify stores (name, domain, access token)
   - Associate stores with companies for invoicing
   - Associate stores with invoice series
   - Configure webhook secret for real-time sync
   - Shows store status, webhook status, order count
2. **Trendyol** - Trendyol marketplace store configuration (component: TrendyolStoresTab)
3. **Temu** - Temu marketplace store configuration (component: TemuStoresTab)
4. **Produse (Products)** - Google Drive integration for product images
   - Service account credentials (JSON)
   - Folder URL for parent image directory
   - Test connection and sync buttons
5. **Contabilitate (Accounting)** - Links to company and invoice series config
   - Delegates to `/settings/companies` and `/settings/invoice-series`
   - Per-company Oblio credentials
6. **Curieri (Couriers)** - FanCourier API credentials
   - Client ID, username, password
   - Connection test button
   - Default AWB settings (weight, service type, payment type, packages)
   - Sender info (name, phone, email, address)
7. **AI** - Claude AI integration for insights
   - Anthropic API key configuration
   - Model selection (Sonnet 4, Opus 4, Haiku 4)
   - Daily analysis toggle with time configuration
   - Last analysis timestamp
8. **Backup** - Database backup to Google Drive
   - Folder URL configuration
   - Auto-backup toggle with time schedule
   - Manual backup creation
   - Links to backup list page

### Settings Sub-Pages

#### `/settings/roles` - Role Management
Full CRUD for roles with permission matrix. Expandable permission categories with checkboxes. Color picker for role badges. System roles can have permissions modified but not renamed/deleted.

#### `/settings/users` - User Management
User list with search/filter by role/group. Per-user actions: assign roles, groups, store access, activate/deactivate, promote/demote SuperAdmin. Invitation system with URL generation.

#### `/settings/groups` - Group Management
CRUD for user groups. Groups can have roles assigned (inherited by all members). Members can be added/removed. Color-coded group badges.

#### `/settings/companies` - Company Management
**File**: `src/app/(dashboard)/settings/companies/page.tsx`

Multi-company support with:
- Company details: name, code, CIF, RegCom, address, bank info, contact
- Per-company Oblio credentials (email, secret token, CIF)
- Per-company FanCourier credentials (client ID, username, password)
- Per-company sender info for AWBs
- Primary company flag
- Active/inactive status
- VAT payer flag with default VAT rate
- Intercompany markup percentage
- Intercompany series name

#### `/settings/warehouses` - Warehouse Management
CRUD for warehouses with: code, name, description, address. Primary warehouse designation (for orders). Active/inactive status. Shows stock levels and stock movements count. Migration and sync utilities.

#### `/settings/printers` - Printer Management
Token-based printer system with: name, app token, printer token (auto-generated). Paper size (A4, A6, 10x15), orientation, copies, auto-print toggle, output format (PDF/ZPL for thermal printers). Connection status tracking (last seen, errors). Print job history.

#### `/settings/backup` - Backup List
Lists backups from Google Drive. Create new backup, view in Drive, restore (with confirmation dialog). Shows file size, creation time.

#### `/settings/audit` - Audit Log
Searchable/filterable audit log viewer. Filters: entity type (User, Role, Group, Invitation, Order, Product, Invoice), date range, search. Paginated with formatted action descriptions. Shows user avatar, action, entity, old/new values.

#### `/settings/security` - Security (PIN)
6-digit PIN configuration for exception approvals. Requires current PIN to change (if already set). Used for manual stornare/incasare operations.

#### `/settings/handover` - Handover Settings
Auto-close time configuration (HH:mm format). Timezone selection (default: Europe/Bucharest). Uses RequirePermission wrapper for `settings.handover`.

#### `/settings/invoice-series` - Invoice Series
Manage invoice numbering series per company. Configurable prefix, start number, padding, type (factura/proforma/chitanta). Default series per company. Oblio sync toggle.

#### `/settings/awb-statuses` - AWB Status Mapping
Maps unknown FanCourier status codes to internal categories. Shows first/last seen, count, sample AWB. Categories: pickup, transit, delivery, notice, problem, return, cancel, other.

#### `/settings/order-statuses` - Custom Order Statuses
Custom internal order status labels with colors. CRUD with sortable order. Active/inactive toggle.

#### `/settings/awb-repair` - AWB Repair Tool
Finds potentially truncated AWB numbers and allows repair. Search, select, and batch fix.

---

## 4. Audit System

### Two-Level Logging

#### 1. RBAC Audit Log (`AuditLog` model)
**Purpose**: Tracks user/role/group/settings changes
**File**: `src/lib/permissions.ts` -> `logAuditAction()`
**Model fields**: userId, action, entityType, entityId, oldValue (JSON), newValue (JSON), metadata (JSON), createdAt

**Tracked actions**:
- `role.create`, `role.update`, `role.delete`
- `group.create`, `group.update`, `group.delete`
- `user.roles.update`, `user.groups.update`, `user.storeAccess.update`
- `user.activate`, `user.deactivate`
- `user.promote.superadmin`, `user.demote.superadmin`
- `invitation.create`, `invitation.accept`, `invitation.cancel`
- `pin.changed`, `pin.verified`, `pin.failed_attempt`

**API**: `GET /api/rbac/audit` - Paginated with filters

#### 2. Activity Log (`ActivityLog` model)
**Purpose**: Tracks business operations (orders, invoices, AWBs, stock)
**File**: `src/lib/activity-log.ts`
**Model fields**: entityType (enum), entityId, action (enum), description (text), details (JSON), orderId, orderNumber, invoiceNumber, invoiceSeries, awbNumber, productSku, success, errorMessage, source

**Entity types**: ORDER, INVOICE, AWB, STOCK, PRODUCT, SETTINGS, SYNC
**Action types**: CREATE, UPDATE, DELETE, CANCEL, ISSUE_INVOICE, CANCEL_INVOICE, CREATE_AWB, UPDATE_AWB_STATUS, STOCK_IN, STOCK_OUT, STOCK_ADJUST, STOCK_SYNC, PAYMENT_RECEIVED, ERROR

**Helper functions**:
- `logInvoiceIssued()`, `logInvoiceCancelled()`
- `logAWBCreated()`, `logAWBStatusUpdate()`
- `logStockMovement()`, `logStockSync()`
- `logPaymentReceived()`, `logOrderDataUpdate()`
- `logWarningOverride()`

**UI**: `/activity` page with filterable table (entity type, search, pagination)

---

## 5. Security Features

### PIN Service (`src/lib/pin-service.ts`)
**Purpose**: 6-digit PIN for exception approval workflows (manual stornare/incasare that bypass manifest-based workflows)

**Features**:
- PIN stored as bcrypt hash (10 rounds) in Settings model
- Session-based verification: returns a UUID session token valid for 5 minutes
- Failed attempts logged to audit with `pin.failed_attempt`
- Successful verifications logged with `pin.verified`
- PIN changes logged with `pin.changed`
- PIN change requires current PIN verification

**API endpoints**:
- `GET /api/settings/pin` - Check if PIN is configured
- `POST /api/settings/pin` - Set/change PIN (requires `settings.security` permission)

### PIN Approval Requests (`PINApprovalRequest` model)
- Types: STORNARE, INCASARE
- Status: PENDING, APPROVED, REJECTED, EXPIRED
- 5-minute expiry window
- Tracks requestedBy and resolvedBy users
- Linked to invoices

### Session Security
- JWT-based sessions with configurable timeout
- Inactive session detection with redirect to login
- Active user check on each login (deactivated users blocked)
- Self-protection: users can't deactivate themselves or demote themselves from SuperAdmin

### API Security Pattern
All API routes follow this pattern:
1. Get session via `getServerSession(authOptions)`
2. Check `session?.user?.id` exists (401 if not)
3. Check specific permission via `hasPermission(userId, code)` (403 if denied)
4. SuperAdmin check as fallback
5. Log action to audit/activity log

---

## 6. Notification System

### Database Model (`Notification`)
- userId (linked to User), type, title, message, data (JSON)
- read (boolean), createdAt
- Optional attachments: attachmentData (Bytes), attachmentName, attachmentMimeType
- Optional actionUrl for direct navigation

### Notification Types
- `new_user` - New user registered (sent to SuperAdmins)
- `invitation_accepted` - Invitation was accepted
- `nir_ready_verification` - NIR ready for office verification
- `nir_differences_approval` - NIR with differences needs manager approval
- `nir_stock_transferred` - Stock from NIR added to inventory
- `role_changed`, `group_changed` - User role/group changes

### Permission-Based Notification Targeting (`src/lib/notification-service.ts`)
Notifications are sent to users who have specific permissions. For example:
- `reception.verify` permission holders get NIR verification notifications
- `reception.approve_differences` permission holders get difference approval notifications
- SuperAdmins always receive all permission-targeted notifications

### API Routes
- `GET /api/notifications?limit=50` - Get user's notifications
- `PUT /api/notifications` - Mark as read (single or all)
- `DELETE /api/notifications` - Delete all notifications

### UI (`/notifications`)
List of notifications with type icons and colors. Mark as read (single/all), delete all with confirmation dialog.

---

## 7. Dashboard

### File: `src/app/(dashboard)/dashboard/page.tsx`
Server-side rendered with `force-dynamic`. Uses `getFilteredDashboardStats()` from `src/lib/dashboard-stats.ts`.

### Dashboard Stats Service (`src/lib/dashboard-stats.ts`)
**Filters**: Store ID, date range (start/end dates), defaults to today in Romania timezone.

**Romania Timezone Handling**: Custom timezone conversion using `Intl.DateTimeFormat` to handle DST correctly. All date boundaries use `Europe/Bucharest`.

**Metrics computed (all in parallel with Promise.all)**:
- **Order counts**: total, pending (no invoice), validated (no invoice), validation failed, invoiced, in-transit (AWB-based), delivered
- **Sales metrics**: total revenue, order count
- **Channel breakdown**: Shopify orders/revenue, Trendyol orders/revenue/pending
- **Invoice count**: today's issued invoices
- **Store list**: all active stores with order counts (for filter dropdown)
- **Recent orders**: last 5 orders (no date filter)
- **Low stock**: top 5 products with currentStock <= minStock
- **Product counts**: total products, low stock count
- **Returns**: AWB count with return status
- **Sales chart data**: daily totals grouped by Romania date
- **Orders by hour**: distribution of orders across 24 hours

### Dashboard Charts
- Sales data chart (daily revenue + order count)
- Orders by hour distribution chart
- Stat cards with trend indicators

---

## 8. Print System

### Architecture
Token-based printer management with job queue.

### Database Models
- **Printer**: name, appToken (unique), printerToken (unique), paperSize, orientation, copies, autoPrint, outputFormat (PDF/ZPL), isConnected, lastSeenAt, lastError
- **PrintJob**: printerId, documentType (awb/invoice/label), documentId, documentNumber, orderId, orderNumber, status (PENDING/PRINTING/COMPLETED/FAILED/CANCELLED), attempts, maxAttempts (3)

### API Routes
- `GET /api/printers` - List printers (requires `printers.view`)
- `POST /api/printers` - Create printer with auto-generated tokens (requires `printers.create`)
- `GET /api/print-client/[token]/jobs` - Desktop app polls for pending jobs using app token
- `POST /api/print-client/[token]/heartbeat` - Desktop app sends heartbeat

### Desktop Print Client
The system supports a desktop print client application that:
1. Registers with an app token
2. Polls for pending print jobs
3. Sends heartbeat to update `lastSeenAt` and `isConnected` status
4. Supports PDF and ZPL (Zebra thermal printer) output formats

### Printer Settings Page
Manages printers with token display (copy to clipboard), connection status monitoring, print job history, auto-print toggle.

---

## 9. Backup & Restore System

### Backup API (`/api/backup`)
- **POST** - Create backup (requires `settings.edit`)
  - Exports ALL database tables as JSON
  - Excludes sensitive fields: passwords, API keys, secrets
  - Uploads to Google Drive via Service Account
  - Updates `backupLastAt` in settings
  - File naming: `backup-YYYY-MM-DDTHH-MM-SS-MMMZ.json`
- **GET** - List backups from Google Drive folder (requires `settings.view`)

### Auto-Backup Configuration
- Toggle: `backupAutoEnabled`
- Schedule: `backupAutoTime` (HH:mm format, Europe/Bucharest timezone)
- Folder: `backupFolderUrl` (Google Drive folder)

### Exported Data
All major tables: users (without passwords), roles, permissions, rolePermissions, userRoleAssignments, invitations, settings (non-sensitive), stores, masterProducts, masterProductImages, masterProductChannels, orders, lineItems, invoices, AWBs, inventoryItems, inventoryRecipeComponents, inventoryStockMovements, suppliers, goodsReceipts, goodsReceiptItems.

Includes metadata: exportedAt timestamp, version, table counts.

### Backup List Page (`/settings/backup`)
UI for listing, creating, and restoring backups. Shows file size, creation time, Google Drive links.

---

## 10. Multi-Company Support

### Company Model
- Fiscal data: name, code, CIF, RegCom, address
- Banking: bank name, IBAN
- Contact: email, phone
- Flags: isPrimary, isActive, vatPayer
- Rates: defaultVatRate, intercompanyMarkup
- Per-company Oblio credentials (email, secretToken, CIF)
- Per-company FanCourier credentials (clientId, username, password)
- Per-company sender info (name, phone, email, address)

### Multi-Company Flow
1. Companies are created in `/settings/companies`
2. Stores are associated with companies in `/settings` (Stores tab)
3. Invoice series are created per company in `/settings/invoice-series`
4. When invoicing an order, the system uses the company associated with the order's store
5. AWBs use the company's FanCourier credentials and sender info

### Intercompany Billing
- Permissions: `intercompany.view`, `intercompany.generate`, `intercompany.mark_paid`
- Companies can have intercompany markup percentage
- Intercompany series name for billing between companies

---

## 11. Store & Sync Management

### Store Model
- Shopify domain (unique), access token, webhook secret
- Associated company for invoicing
- Associated invoice series (or falls back to company default)
- Active/inactive status

### Store Sync
- Manual sync triggers available
- Webhook-based real-time sync (Shopify order creation/update/cancellation)
- Sync history page at `/sync-history`

### Settings Model (Global)
Singleton model (id: "default") containing:
- FanCourier API credentials
- Default AWB settings
- Sender info
- Google Drive config
- Handover auto-close settings
- AI insights config
- Backup settings
- Trendyol legacy settings
- PIN security hash

---

## 12. Task System

### Task Model
- Title, description, type (enum: BUSINESS, TECHNICAL, etc.), priority (enum), status (enum)
- Optional deadline
- Assignee (User relation)
- Creator (User relation)
- Optional links to: Order, MasterProduct, Invoice
- Completion tracking: completedAt, completedBy
- Reassignment notes
- File attachments (TaskAttachment model)

### Task Permissions
- `tasks.view` - View tasks
- `tasks.create` - Create tasks
- `tasks.edit` - Edit tasks
- `tasks.delete` - Delete tasks

### Task Page (`/tasks`)
Groupable by date, sortable by priority. Filters by type, priority, status. Bulk actions. Task form dialog for create/edit.

---

## 13. Processing Errors

### Page: `/processing-errors`
- View processing errors (requires `processing.errors.view`)
- Retry failed processing (requires `processing.errors.retry`)
- Skip/acknowledge errors (requires `processing.errors.skip`)

---

## 14. Key Integration Points

### Settings -> Other Modules
- **FanCourier credentials** -> AWB generation
- **Company Oblio credentials** -> Invoice generation
- **Company FanCourier credentials** -> Per-company AWB generation
- **Google Drive credentials** -> Product image sync + backup
- **AI API key** -> AI insights dashboard
- **Handover settings** -> Auto-close time for courier handover
- **PIN hash** -> Exception approval for manual stornare/incasare

### RBAC -> All Modules
Every API endpoint checks permissions. The client-side uses `usePermissions()` hook and `RequirePermission` component to conditionally render UI elements. Route-level permissions defined in `ROUTE_PERMISSIONS` map.

### Notifications -> Multiple Modules
Permission-aware notification targeting ensures only relevant users receive notifications (e.g., only users with `reception.verify` get NIR notifications).

---

## 15. Database Diagram Summary

```
User (1) --(*) UserRoleAssignment (*)--(1) Role (1)--(*) RolePermission (*)--( 1) Permission
User (1) --(*) UserGroupMembership (*)--(1) Group (1)--(*) GroupRoleAssignment (*)-- (1) Role
User (1) --(*) UserStoreAccess (*)-- (1) Store
User (1) --(*) UserWarehouseAccess (*)-- (1) Warehouse
User (1) --(*) AuditLog
User (1) --(*) Notification
User (1) --(*) Task (assignee/creator/completer)
Store (*)--( 1) Company (1)--(*) InvoiceSeries
Settings (singleton) - global config
Printer (1)--(*) PrintJob
PINApprovalRequest -> User (requestedBy, resolvedBy), Invoice
```
