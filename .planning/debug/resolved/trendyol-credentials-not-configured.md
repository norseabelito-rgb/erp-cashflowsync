---
status: resolved
trigger: "Trendyol credentials not configured error despite 2 stores added"
created: 2026-02-05T10:00:00Z
updated: 2026-02-05T10:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - syncTrendyolOrders reads from Settings table while stores use TrendyolStore table
test: Verify that TrendyolStore table has records while Settings.trendyol* fields are empty
expecting: Settings table has no trendyol credentials, TrendyolStore table has 2 stores
next_action: Confirm root cause and implement fix

## Symptoms

expected: Orders from Trendyol should sync successfully - user has 2 Trendyol stores added and connected correctly (tested)
actual: Error thrown: "Trendyol credentials not configured"
errors: |
  [Trendyol Sync] Failed: Error: Trendyol credentials not configured
      at l (/app/.next/server/chunks/5780.js:1:14272)
      at async p (/app/.next/server/app/api/trendyol/orders/route.js:1:1662)
reproduction: User tries to sync Trendyol orders
started: User has 2 Trendyol stores configured and tested - connection works but order sync fails

## Eliminated

## Evidence

- timestamp: 2026-02-05T10:02:00Z
  checked: src/lib/trendyol.ts line 800-810
  found: syncTrendyolOrders reads credentials from Settings table (settings.trendyolSupplierId, settings.trendyolApiKey, settings.trendyolApiSecret)
  implication: This is the OLD credential storage method - from before multi-store support

- timestamp: 2026-02-05T10:02:00Z
  checked: src/app/api/trendyol/stores/[id]/test/route.ts line 35-52
  found: Test connection reads credentials from TrendyolStore table (store.supplierId, store.apiKey, store.apiSecret)
  implication: This is the NEW credential storage method - multi-store support

- timestamp: 2026-02-05T10:02:00Z
  checked: Both files
  found: TWO DIFFERENT CREDENTIAL SOURCES - Settings table vs TrendyolStore table
  implication: ROOT CAUSE IDENTIFIED - syncTrendyolOrders was never updated to use multi-store TrendyolStore table

- timestamp: 2026-02-05T10:05:00Z
  checked: src/lib/trendyol-stock-sync.ts lines 47-69
  found: Existing working code uses exact same pattern: prisma.trendyolStore.findMany({where:{isActive:true}})
  implication: Fix pattern is validated by existing working code

- timestamp: 2026-02-05T10:06:00Z
  checked: src/lib/trendyol.ts lines 1086-1174
  found: syncTrendyolOrdersForStore already exists and properly handles store-specific sync
  implication: Fix leverages existing, tested multi-store function

## Resolution

root_cause: syncTrendyolOrders function (line 786) reads credentials from Settings table (legacy single-store), while TrendyolStore table (multi-store) is where user's 2 stores are actually configured. The function syncTrendyolOrdersForStore (line 1086) exists for multi-store but syncTrendyolOrders was never updated to use it.
fix: Modify syncTrendyolOrders to fetch all active TrendyolStore records and call syncTrendyolOrdersForStore for each
verification: |
  1. Code follows exact same pattern as trendyol-stock-sync.ts (which works correctly)
  2. Uses prisma.trendyolStore.findMany with isActive filter
  3. Calls existing syncTrendyolOrdersForStore for each store
  4. Aggregates results from all stores
  5. Error message now correctly says "No active Trendyol stores configured" instead of "credentials not configured"
files_changed: [src/lib/trendyol.ts]
