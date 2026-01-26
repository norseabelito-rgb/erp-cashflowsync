---
phase: quick
plan: 001
subsystem: products
tags: ["shopify", "sync", "bulk", "polling"]

dependency-graph:
  requires: []
  provides:
    - "BulkPushJob Prisma model"
    - "POST /api/products/bulk-push endpoint"
    - "GET /api/products/bulk-push/[jobId] endpoint"
    - "/products/bulk-push UI page"
  affects:
    - "products page (navigation link)"

tech-stack:
  added: []
  patterns:
    - "Job-based async processing with DB progress tracking"
    - "Polling-based UI updates (2 second interval)"

key-files:
  created:
    - "prisma/migrations/manual/add_bulk_push_job.sql"
    - "src/app/api/products/bulk-push/route.ts"
    - "src/app/api/products/bulk-push/[jobId]/route.ts"
    - "src/app/(dashboard)/products/bulk-push/page.tsx"
  modified:
    - "prisma/schema.prisma"
    - "src/app/(dashboard)/products/page.tsx"

decisions:
  - key: "Job-based sync pattern"
    choice: "BulkPushJob model with JSON progress field"
    reason: "Allows real-time tracking without websockets"
  - key: "Polling interval"
    choice: "2 seconds"
    reason: "Balance between responsiveness and server load"
  - key: "Progress update frequency"
    choice: "Every 5 products"
    reason: "Reduce DB write overhead while maintaining feedback"
  - key: "Error handling"
    choice: "Continue on per-product errors"
    reason: "One failed product should not stop entire sync"

metrics:
  duration: "~8 minutes"
  completed: "2026-01-26"
---

# Quick Task 001: Bulk Product Push Summary

**One-liner:** Bulk push page with job-based progress tracking and per-store polling UI

## What Was Done

Created a complete bulk product push feature that syncs all products with active Shopify channels to their respective stores, with real-time progress tracking via polling.

### Task 1: BulkPushJob Model
- Added `BulkPushJob` model to Prisma schema with status, progress JSON, and error fields
- Created manual SQL migration for `bulk_push_jobs` table
- Index on status for efficient queries

### Task 2: POST /api/products/bulk-push
- Creates job record with "pending" status
- Groups product channels by Shopify store
- Initializes progress JSON with store names and product totals
- Processes each product: creates new or updates existing in Shopify
- Updates DB progress every 5 products for feedback
- Captures per-product errors without stopping job
- Marks job "completed" when done

### Task 3: GET /api/products/bulk-push/[jobId]
- Returns job status with full progress JSON
- Used for UI polling
- Requires products.view permission

### Task 4: Bulk Push UI Page
- Located at /products/bulk-push
- Start button triggers job creation
- Polls status every 2 seconds while running
- Global progress bar shows overall completion
- Per-store cards with individual progress
- Shows created/updated/errors per store
- Error messages displayed with overflow handling
- Toast notifications on completion/failure

### Task 5: Navigation Link
- Added "Bulk Push" button to products page header
- Uses Upload icon for consistency
- Placed before "Mapare Inventar" link

### Task 6: Verification
- All files created and verified
- Key link patterns confirmed in UI page
- Navigation link confirmed in products page

## Key Links Verified

| From | To | Via |
|------|-----|-----|
| bulk-push/page.tsx | /api/products/bulk-push | fetch POST to start job |
| bulk-push/page.tsx | /api/products/bulk-push/[jobId] | polling fetch GET for status |
| products/page.tsx | /products/bulk-push | Link navigation |

## Files Changed

### Created
- `prisma/migrations/manual/add_bulk_push_job.sql` - SQL migration
- `src/app/api/products/bulk-push/route.ts` - Start job endpoint (304 lines)
- `src/app/api/products/bulk-push/[jobId]/route.ts` - Status endpoint (57 lines)
- `src/app/(dashboard)/products/bulk-push/page.tsx` - UI page (350 lines)

### Modified
- `prisma/schema.prisma` - Added BulkPushJob model
- `src/app/(dashboard)/products/page.tsx` - Added navigation link

## Migration Required

Before using, run:
```bash
psql $DATABASE_URL -f prisma/migrations/manual/add_bulk_push_job.sql
npx prisma generate
```

Or with Prisma db push:
```bash
npx prisma db push
```

## Usage

1. Navigate to /products page
2. Click "Bulk Push" button in header
3. On bulk push page, click "Start Bulk Push"
4. Watch progress bars update in real-time
5. Toast notification shows when complete

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| b57b26b | 1 | Add BulkPushJob model to Prisma schema |
| 9a96009 | 2 | Create POST /api/products/bulk-push endpoint |
| faf2420 | 3 | Create GET /api/products/bulk-push/[jobId] endpoint |
| e25b8cb | 4 | Create bulk push UI page with real-time polling |
| 0dee1cb | 5 | Add Bulk Push navigation link to products page |
