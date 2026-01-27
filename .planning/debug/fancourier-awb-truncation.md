---
status: investigating
trigger: "FanCourier AWBs are being truncated/cut off - missing characters at the end"
created: 2026-01-27T12:00:00Z
updated: 2026-01-28T03:00:00Z
---

## Current Focus

hypothesis: FanCourier /reports/awb endpoint returns AWB numbers as numeric values that may also be truncated at the source - the API documentation shows awbNumber: 2078300120037 (13 digits numeric)
test: Enhanced debug endpoint to inspect raw borderou response structure and field paths
expecting: If AWBs in borderou are also truncated/numeric, automatic repair is impossible via this endpoint
actual: Need to verify by viewing actual API response
next_action: User needs to trigger debug endpoint via browser (requires auth) to see raw FanCourier response

## Symptoms

expected: Complete AWB numbers from FanCourier API (e.g., `7000121028926001F2491` - 21 chars)
actual: AWBs stored as `7000121028926` (13 chars) - missing `001F2491` suffix
errors: None reported - AWBs save silently with truncated numbers
reproduction: Create any FanCourier AWB - it will be truncated on save
started: Always been broken - never worked correctly

## Known Sample AWB

- Truncated (stored in DB): `7000121028926` (13 chars)
- Correct (from FanCourier portal): `7000121028926001F2491` (21 chars, includes letters)
- AWB created: 2026-01-27 (yesterday)
- Missing part: `001F2491`

## Progress Summary

### 1. Root Cause CONFIRMED
JavaScript number precision loss when parsing FanCourier API JSON response.
- FanCourier returns `awbNumber` as a numeric type
- `JSON.parse()` loses precision for large numbers
- Fixed with `json-bigint` package in axios `transformResponse`
- **NEW AWBs should now save correctly**

### 2. Repair Page UI - WORKING
- `/settings/awb-repair` - Shows AWBs from database ✅
- Manual repair button per row - Can enter correct AWB number manually ✅
- Bulk Dry Run button - Attempts automatic matching ✅

### 3. Automatic Repair - NOT WORKING
The automatic borderou matching doesn't find any matches. Multiple approaches tried:

**Approach 1: Per-AWB borderou lookup**
- Fetches borderou for AWB's createdAt date
- Uses `startsWith` matching
- Result: No matches found

**Approach 2: Multi-date search (±1 day)**
- Fetches borderou for day before, day of, day after
- Uses `startsWith` matching
- Result: No matches found

**Approach 3: Bulk prefix matching**
- Fetches ALL borderou data for 7-60 days
- Builds map: first 13 chars → full AWB
- Matches by prefix lookup
- Result: No matches found

## Key Question: What does the borderou API actually return?

The matching logic assumes:
1. Borderou contains AWB numbers as strings
2. AWB numbers in borderou are complete (e.g., `7000121028926001F2491`)
3. `item.info?.awbNumber` is the correct field path

**Need to verify:**
- What format are AWB numbers in the borderou response?
- Are they strings or numbers?
- Do they include the full AWB with letters (`001F2491`)?
- Is `info.awbNumber` the correct field path?

## Debug Endpoint Available

Call this to see raw borderou data:
```
GET /api/awb/repair/debug?date=2026-01-27&search=7000121028926
```

Response will show:
- `awbNumber` - String conversion
- `rawAwbNumber` - Original value
- `rawType` - typeof the original value
- Recipient, address, status

## Commits Made (Session 2)

7. `29a7e61` - fix: use correct customer name fields in AWB repair list
8. `88b14cc` - fix: update AWB repair UI to use borderou verification instead of length heuristic
9. `a5239e2` - feat: add manual AWB repair and debug endpoints
10. `342ac54` - fix: improve AWB repair with skipTracking and multi-date borderou search
11. `7378b0c` - feat: add bulk repair with prefix matching across all FanCourier data
12. `6b590cb` - fix: reduce bulk repair date range and add days selector
13. `7026ba7` - fix: restore missing useMutation declaration for manual repair

## Files Changed (Session 2)

- src/app/api/awb/repair/manual/route.ts (NEW - manual repair endpoint)
- src/app/api/awb/repair/debug/route.ts (NEW - debug endpoint to inspect borderou)
- src/app/api/awb/repair/bulk/route.ts (NEW - bulk repair with prefix matching)
- src/app/(dashboard)/settings/awb-repair/page.tsx (added manual repair, bulk repair, days selector)
- src/lib/fancourier.ts (pagination for getAllAWBsForDate, skipTracking option)
- src/app/api/awb/repair/route.ts (skipTracking parameter)

## Changes Made This Session

1. **Enhanced debug endpoint** (`/api/awb/repair/debug/route.ts`)
   - Added logging of raw item structure (top-level keys, info keys)
   - Try multiple field paths: `info.awbNumber`, `info.awb`, `awbNumber`, `awb`
   - Include `rawSample` in response with full first item JSON

2. **Added Debug UI section** (`settings/awb-repair/page.tsx`)
   - New "Debug: Raw FanCourier Borderou Data" card at bottom of page
   - Date picker to select borderou date
   - Displays raw structure, field paths, and first 10 AWBs
   - Shows AWB length and data type to identify truncation

## Next Steps

**USER ACTION REQUIRED:**

1. Open browser to `/settings/awb-repair` page (need to be logged in as admin)
2. Scroll to bottom "Debug: Raw FanCourier Borderou Data" section
3. Select a date when truncated AWBs were created (e.g., 2026-01-27)
4. Click "Fetch Raw Data"
5. **Report back:**
   - What are the top-level keys? (e.g., `info`, `awb`, `awbNumber`?)
   - What does `info.awbNumber` look like? (truncated? full? has letters?)
   - What is the AWB length and type?
   - Is there a different field that has the full AWB?

## Potential Outcomes

**If borderou AWBs are also truncated/numeric:**
- FanCourier API returns truncated numbers - automatic repair via borderou is impossible
- Need to find alternative: tracking endpoint, direct AWB detail endpoint, or CSV import

**If borderou AWBs are correct but wrong field path:**
- Update bulk repair logic to use correct field
- Should be straightforward fix

**If borderou AWBs are correct with current path:**
- Matching logic has different bug (date range, prefix length, etc.)
- Need to debug the matching algorithm

## Resume Command

To continue this debug session:
```
/gsd:debug
```
Then select "Resume session #1" for fancourier-awb-truncation
