---
status: resolved
trigger: "handover-scan-broken - multiple features stopped working around Jan 27, 2026"
created: 2026-01-28T10:00:00Z
updated: 2026-01-28T10:20:00Z
---

## Current Focus

hypothesis: The API endpoint getTodayHandoverList only returns AWBs with handedOverAt=null, but frontend expects BOTH pending AND scanned AWBs
test: Trace data flow - API returns only pending AWBs, frontend filters for scanned, gets empty list
expecting: Confirm that scannedAwbs is always empty because API excludes scanned AWBs
next_action: Fix API to return all today's AWBs (both pending and scanned)

## Symptoms

expected:
1. Alert should appear showing "X AWB-uri ridicate de curier fara scanare interna" for AWBs with CO confirmation but no internal scan
2. Scanning AWB barcodes should add them to "Scanate" table
3. AWBs not handed over should save to /handover/not-handed route

actual:
1. The alert no longer appears (was working on Jan 26, stopped on Jan 27)
2. Scanning AWBs does NOT add them to the "Scanate" table
3. AWBs not handed over are NOT being saved to /handover/not-handed

errors: User cannot check console right now

reproduction:
1. Go to handover module
2. Scan any AWB barcode
3. Observe that it doesn't appear in "Scanate" table
4. The alert about unscanned AWBs doesn't appear at all

started: Was working January 26, 2026. Stopped working January 27, 2026.

## Eliminated

- hypothesis: Commit 0cb0c1f (barcode prefix matching) broke scanning
  evidence: The prefix matching code is correct - it adds fallback lookup, doesn't break core logic
  timestamp: 2026-01-28T10:10:00Z

- hypothesis: Commit 218f964 (nepredate logic) broke scanning
  evidence: Only changed auto-finalize timing logic, didn't modify data fetching
  timestamp: 2026-01-28T10:10:00Z

## Evidence

- timestamp: 2026-01-28T10:01:00Z
  checked: Git log for changes between Jan 26-27
  found: Commit 0cb0c1f "fix: support barcode prefix matching in handover scan" changed src/lib/handover.ts
  implication: Initial suspect but later ruled out

- timestamp: 2026-01-28T10:08:00Z
  checked: getTodayHandoverList function in src/lib/handover.ts line 147-188
  found: Query has `handedOverAt: null` filter - only returns AWBs that have NOT been scanned
  implication: Critical - API never returns scanned AWBs

- timestamp: 2026-01-28T10:09:00Z
  checked: Frontend page.tsx lines 174-175
  found: `scannedAwbs = awbs.filter(a => a.handedOverAt)` expects scanned AWBs in the list
  implication: Frontend expects data API doesn't provide

- timestamp: 2026-01-28T10:10:00Z
  checked: Git history - UI redesign commit e42e2e0 from Jan 13, 2026
  found: The split-screen UI was added Jan 13, but getTodayHandoverList NEVER returned scanned AWBs
  implication: This bug has existed since Jan 13, not Jan 27 - user may have misremembered or issue manifested differently

- timestamp: 2026-01-28T10:11:00Z
  checked: Scan mutation flow in page.tsx lines 194-238
  found: After successful scan, invalidateQueries refetches data, but scanned AWB now has handedOverAt set and is excluded from the query results
  implication: The scanned AWB disappears from the UI immediately after scanning instead of moving to "Scanate" table

## Resolution

root_cause: The getTodayHandoverList function at line 147 of src/lib/handover.ts has a filter `handedOverAt: null` which excludes scanned AWBs from the query results. The frontend expects this function to return ALL AWBs (both pending and scanned), then filters them into two lists. But since the API only returns pending AWBs, the "Scanate" table is always empty. This also affects the C0 alert functionality because the data structure depends on having the full list.

fix: Removed the `handedOverAt: null` filter from getTodayHandoverList() in src/lib/handover.ts. Now the function returns ALL AWBs created today (both pending and scanned), which the frontend then filters into two separate lists for display.

verification: TypeScript compiles without new errors. The fix changes the WHERE clause from including `handedOverAt: null` to just filtering by date and excluding cancelled/deleted AWBs.

files_changed:
- src/lib/handover.ts (removed handedOverAt: null filter from getTodayHandoverList)
