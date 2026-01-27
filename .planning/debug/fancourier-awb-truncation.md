---
status: verifying
trigger: "FanCourier AWBs are being truncated/cut off - missing characters at the end"
created: 2026-01-27T12:00:00Z
updated: 2026-01-28T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Repair list API fails because it selects `order.customerName` which doesn't exist on Order model (only exists on TrendyolOrder)
test: Compare Prisma schema with repair list query
expecting: Query should use same fields as working tracking endpoint
actual: Repair list uses `customerName` but Order model has `customerFirstName` and `customerLastName`
fix_applied: Changed query to select customerFirstName and customerLastName, then combine them in the response
next_action: Verify fix works - deploy and test /settings/awb-repair page shows AWBs

## Symptoms

expected: Complete AWB numbers from FanCourier API (typically 13 digits)
actual: AWBs are stored with missing characters at the end - truncated/incomplete
errors: None reported - AWBs just silently save with missing characters
reproduction: Create any FanCourier AWB - it will be truncated on save
started: Always been broken - never worked correctly

## Code Changes Made

### 1. Root cause fix (DEPLOYED)
- Added `json-bigint` package to preserve number precision
- Modified axios client in `src/lib/fancourier.ts` with `transformResponse` to use `JSONBig.parse()`
- New AWBs should now be saved correctly

### 2. Repair API (DEPLOYED)
- `POST /api/awb/repair` - repairs truncated AWBs by fetching correct values from FanCourier borderou
- Accepts `awbIds` array to repair specific AWBs
- Has `dryRun` mode for safe testing

### 3. Admin page (DEPLOYED but NOT WORKING)
- `/settings/awb-repair` - UI for selecting and repairing AWBs
- `GET /api/awb/repair/list` - lists AWBs for repair

## Current Blocker

The `/api/awb/repair/list` endpoint returns 0 AWBs even though:
- Tracking page shows 1078 total AWBs
- Tracking API (`/api/tracking`) uses same query pattern: `prisma.aWB.findMany({ where: { awbNumber: { not: null } } })`

Possible causes to investigate:
1. Permission check failing silently (hasPermission returning false)
2. Different database connection or schema issue
3. The `awbNumber: { not: null }` filter excluding all records (maybe all AWBs have null awbNumber?)
4. Model name mismatch (`aWB` vs `AWB` vs `awb`)

## Evidence

- timestamp: 2026-01-27T12:10:00Z
  checked: Prisma schema for awbNumber field
  found: awbNumber is String? with no length limit - database field is NOT the issue
  implication: Truncation happens before storage

- timestamp: 2026-01-27T12:25:00Z
  checked: axios/axios GitHub issues and solutions for large number precision
  found: Known issue - axios uses JSON.parse which loses precision for large integers. Solution: use json-bigint with transformResponse
  implication: Must modify axios client in fancourier.ts to use json-bigint for response parsing

- timestamp: 2026-01-27T23:56:00Z
  checked: /settings/awb-repair page after deployment
  found: Page loads but shows 0 AWBs, "Nu exista AWB-uri cu numar valid"
  implication: API endpoint not returning data - need to investigate prisma query or permissions

- timestamp: 2026-01-28T00:06:00Z
  checked: Prisma schema for Order model vs repair list query
  found: repair list uses `order.customerName` but Order model only has `customerFirstName` and `customerLastName` (customerName exists on TrendyolOrder model, not Order)
  implication: Prisma query fails because selecting non-existent field - this is why API returns 0 AWBs

## Commits Made

1. `d0df773` - fix: preserve FanCourier AWB number precision with json-bigint
2. `f7f44b6` - chore: update package-lock.json for json-bigint
3. `308cf0d` - feat: add AWB repair admin page
4. `99f2e30` - fix: correct prisma import path in awb repair list route
5. `3e02600` - chore: add logs files to gitignore
6. `2c09ced` - fix: remove date filter from AWB repair list - show all AWBs
7. `29a7e61` - fix: use correct customer name fields in AWB repair list

## Files Changed

- src/lib/fancourier.ts (json-bigint import, axios transformResponse, getAllAWBsForDate, repairTruncatedAWBs)
- package.json (json-bigint, @types/json-bigint dependencies)
- package-lock.json (updated)
- src/app/api/awb/repair/route.ts (NEW - repair API)
- src/app/api/awb/repair/list/route.ts (NEW - list AWBs API)
- src/app/(dashboard)/settings/awb-repair/page.tsx (NEW - admin UI)

## Resolution

### Root Cause (API returning 0 AWBs)
The `/api/awb/repair/list` endpoint was using `order.customerName` in the Prisma query, but the `Order` model does not have a `customerName` field. It has `customerFirstName` and `customerLastName` as separate fields. (The `customerName` field exists only on the `TrendyolOrder` model.)

This caused the Prisma query to fail silently (or throw an error caught by the try/catch), resulting in 0 AWBs being returned.

### Fix Applied
Changed the Prisma select to use `customerFirstName` and `customerLastName`, then combine them in the response mapping:
```typescript
customerName: awb.order
  ? `${awb.order.customerFirstName || ''} ${awb.order.customerLastName || ''}`.trim() || "N/A"
  : "N/A"
```

### Verification Needed
Deploy to production and verify that `/settings/awb-repair` page now shows AWBs.
