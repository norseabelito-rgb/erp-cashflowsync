---
task: q004
type: quick
description: "Nomenclator de statusuri pentru comenzi - definire nume si culoare, asociere cu comenzi, filtrare dupa statusuri interne"
files_modified:
  - prisma/schema.prisma
  - src/app/api/order-statuses/route.ts
  - src/app/api/orders/[id]/status/route.ts
  - src/app/api/orders/route.ts
  - src/app/(dashboard)/settings/order-statuses/page.tsx
  - src/components/orders/OrderStatusBadge.tsx
autonomous: true
---

<objective>
Create an order status nomenclator system that allows users to define custom internal statuses with names and colors, assign them to orders, and filter orders by these statuses.

Purpose: Enable internal workflow tracking separate from system OrderStatus enum (PENDING, VALIDATED, etc.). Users can create statuses like "Apel client", "Returnat la depozit", "Verificare stoc" with custom colors for visual identification.

Output:
- InternalOrderStatus Prisma model with name, color, sortOrder
- CRUD API for status nomenclator management
- API to assign status to an order
- Filter by internalStatusId in orders list
- Settings page to manage statuses
- Badge component for display
</objective>

<context>
@prisma/schema.prisma (Order model lines 397-481, OrderStatus enum lines 369-387)
@src/app/api/orders/route.ts (existing filter patterns)
@src/app/(dashboard)/settings/ (settings pages pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database model and API endpoints</name>
  <files>
    prisma/schema.prisma
    src/app/api/order-statuses/route.ts
    src/app/api/orders/[id]/status/route.ts
    src/app/api/orders/route.ts
  </files>
  <action>
1. Add InternalOrderStatus model to schema.prisma:
   ```prisma
   model InternalOrderStatus {
     id        String   @id @default(cuid())
     name      String   @unique // "Apel client", "Verificare stoc"
     color     String   @default("#6b7280") // Hex color for badge
     sortOrder Int      @default(0)
     isActive  Boolean  @default(true)

     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     orders    Order[]

     @@map("internal_order_statuses")
   }
   ```

2. Add to Order model:
   ```prisma
   internalStatusId String?
   internalStatus   InternalOrderStatus? @relation(fields: [internalStatusId], references: [id])
   ```
   Add index: `@@index([internalStatusId])`

3. Create /api/order-statuses/route.ts:
   - GET: List all statuses (sorted by sortOrder), requires orders.view permission
   - POST: Create status (name, color, sortOrder), requires settings.edit permission
   - Response format: { statuses: InternalOrderStatus[] }

4. Create /api/orders/[id]/status/route.ts:
   - PATCH: Update order's internalStatusId, requires orders.edit permission
   - Body: { internalStatusId: string | null }
   - Returns updated order

5. Update /api/orders/route.ts:
   - Add internalStatusId filter parameter
   - Include internalStatus in order response (select: { id, name, color })
   - Add to sourceCounts query if needed

Run `npx prisma db push` after schema changes.
  </action>
  <verify>
    - `npx prisma db push` succeeds
    - GET /api/order-statuses returns empty array
    - POST /api/order-statuses with { name: "Test", color: "#ff0000" } creates status
    - GET /api/orders includes internalStatus field
  </verify>
  <done>
    - InternalOrderStatus model exists in database
    - CRUD API functional for statuses
    - Orders can have internalStatusId assigned
    - Orders API filters by internalStatusId
  </done>
</task>

<task type="auto">
  <name>Task 2: Settings page and order status badge</name>
  <files>
    src/app/(dashboard)/settings/order-statuses/page.tsx
    src/components/orders/OrderStatusBadge.tsx
    src/app/(dashboard)/settings/page.tsx
  </files>
  <action>
1. Create settings page at src/app/(dashboard)/settings/order-statuses/page.tsx:
   - List all statuses in a table (name, color preview, sortOrder, actions)
   - Add button opens dialog with form: name (required), color (color picker or hex input), sortOrder
   - Edit/delete buttons per row
   - Use existing UI patterns from settings pages (PageHeader, Card, Table)
   - Permission check: settings.view for page, settings.edit for mutations

2. Create OrderStatusBadge component:
   ```tsx
   // Props: status: { name: string; color: string } | null
   // Returns Badge with background color from status.color, text white/black based on contrast
   // If null, returns null (no badge)
   ```
   Use hexToRgba pattern from existing codebase for color handling.

3. Add link to settings page:
   - Check if settings/page.tsx has navigation links
   - If yes, add "Statusuri comenzi" link pointing to /settings/order-statuses
   - If settings uses sidebar or tabs, add to appropriate location

4. Update orders page to show status badge:
   - In orders table, add column or inline badge showing internalStatus
   - Use OrderStatusBadge component
   - Add dropdown/select to filter by internalStatusId in filters section
  </action>
  <verify>
    - /settings/order-statuses loads without error
    - Can create status with name and color
    - Status appears in list with color preview
    - Badge component renders with correct color
  </verify>
  <done>
    - Settings page allows CRUD for internal order statuses
    - OrderStatusBadge displays status with custom color
    - Orders page shows and filters by internal status
  </done>
</task>

<task type="auto">
  <name>Task 3: Order status assignment UI</name>
  <files>
    src/app/(dashboard)/orders/page.tsx
  </files>
  <action>
1. Add status assignment dropdown in orders table:
   - In the order row actions or as a clickable badge
   - Dropdown shows all active InternalOrderStatuses
   - Option to clear status (set to null)
   - On select, PATCH /api/orders/[id]/status with new internalStatusId
   - Optimistic update or refetch after change

2. Add internalStatusId filter to orders page:
   - In filters section (near store/status/search filters)
   - Select dropdown with all statuses + "Toate" option
   - Filter persists in URL params like other filters

3. Ensure status column visible in table:
   - Add "Status intern" column header
   - Show OrderStatusBadge for each order
   - Handle null case (show "-" or nothing)
  </action>
  <verify>
    - Click on status badge/dropdown in order row
    - Select a status from dropdown
    - Order refreshes with new status badge
    - Filter by status shows only matching orders
  </verify>
  <done>
    - Users can assign internal status to orders from the orders page
    - Users can filter orders by internal status
    - Status changes persist immediately
  </done>
</task>

</tasks>

<verification>
1. Create test status via settings: POST /api/order-statuses { name: "Apel necesar", color: "#f59e0b" }
2. Assign to order: PATCH /api/orders/{orderId}/status { internalStatusId: "{statusId}" }
3. Filter orders: GET /api/orders?internalStatusId={statusId} returns only assigned orders
4. Visual: Order table shows orange badge "Apel necesar"
</verification>

<success_criteria>
- InternalOrderStatus nomenclator with CRUD operations
- Orders can be tagged with internal status
- Orders filterable by internal status
- Visual badge with custom color in orders table
- Settings page to manage status definitions
</success_criteria>

<output>
After completion, create `.planning/quick/004-order-status-nomenclator/004-SUMMARY.md`
</output>
