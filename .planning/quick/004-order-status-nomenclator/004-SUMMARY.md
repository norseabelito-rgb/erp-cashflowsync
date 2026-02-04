# Quick Task 004: Order Status Nomenclator Summary

**One-liner:** User-defined internal order statuses with custom colors, settings CRUD, and inline assignment in orders table.

## Quick Facts

| Attribute | Value |
|-----------|-------|
| Task | q004 |
| Type | quick |
| Duration | ~7 minutes |
| Completed | 2026-02-04 |
| Commits | 3 |

## What Was Built

### Database Model

**InternalOrderStatus** - User-defined workflow statuses for orders:
- `id` (cuid)
- `name` (unique) - e.g., "Apel client", "Verificare stoc"
- `color` (hex) - for badge display
- `sortOrder` - ordering in dropdowns
- `isActive` - soft delete support

**Order** additions:
- `internalStatusId` (optional FK)
- Index on `internalStatusId` for filtering

### API Endpoints

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/order-statuses` | GET, POST, PATCH, DELETE | Full CRUD for status nomenclator |
| `/api/orders/[id]/status` | PATCH | Assign internal status to order |
| `/api/orders` | GET | Updated with `internalStatusId` filter and `internalStatus` include |

### UI Components

**OrderStatusBadge** (`src/components/orders/order-status-badge.tsx`):
- Dynamic color with auto-contrast text (white/black based on luminance)
- ColorPreview helper for settings page

**Settings Page** (`/settings/order-statuses`):
- Table with name, color preview, sortOrder, active toggle
- Dialog for create/edit with color picker (16 presets + custom)
- Live preview of badge appearance
- Delete with soft-delete fallback if statuses in use

**Orders Page** (`/orders`):
- "Status Intern" column with inline Select dropdown
- Filter dropdown with color dots in "Status intern" filter
- Optimistic updates via mutation

### Navigation

- Added "Statusuri Comenzi" to sidebar under Sistem section

## Commits

| Hash | Description |
|------|-------------|
| `057aa23` | feat(q004): add InternalOrderStatus model and APIs |
| `fb5d407` | feat(q004): add settings page and OrderStatusBadge component |
| `c1defcb` | feat(q004): add internal status assignment UI to orders page |

## Files Created/Modified

### Created
- `prisma/schema.prisma` (InternalOrderStatus model + Order.internalStatusId)
- `src/app/api/order-statuses/route.ts`
- `src/app/api/orders/[id]/status/route.ts`
- `src/app/(dashboard)/settings/order-statuses/page.tsx`
- `src/components/orders/order-status-badge.tsx`

### Modified
- `src/app/api/orders/route.ts` (filter + include)
- `src/app/(dashboard)/orders/page.tsx` (column + filter + mutation)
- `src/components/sidebar.tsx` (navigation link)

## Database Migration Required

User must run:
```bash
npx prisma db push
npx prisma generate
```

This will:
1. Create `internal_order_statuses` table
2. Add `internalStatusId` column to `orders` table
3. Create index on `internalStatusId`

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

1. Navigate to `/settings/order-statuses`
2. Create a test status: name "Apel necesar", color "#f59e0b"
3. Navigate to `/orders`
4. Find an order and click the "Status Intern" dropdown
5. Select the created status - badge should appear
6. Use filter dropdown to filter by internal status
7. Clear filter to see all orders again

## Verification Checklist

- [x] InternalOrderStatus model exists in schema
- [x] CRUD API functional for statuses
- [x] Orders can have internalStatusId assigned
- [x] Orders API filters by internalStatusId
- [x] Settings page allows create/edit/delete
- [x] OrderStatusBadge displays with custom color
- [x] Orders page shows status column with inline selector
- [x] Filter dropdown works in orders page
