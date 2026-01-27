---
status: blocked
trigger: "FanCourier AWBs are being truncated/cut off - missing characters at the end"
created: 2026-01-27T12:00:00Z
updated: 2026-01-28T01:30:00Z
---

## Current Focus

hypothesis: Borderou API returns AWB numbers in a different format than expected (possibly numeric type losing precision, or different field structure)
test: Use debug endpoint to inspect raw borderou response
expecting: AWB numbers in borderou should match pattern `7000121028926001F2491` (21 chars with letters)
actual: Unknown - need to verify what borderou actually returns
next_action: Call `/api/awb/repair/debug?date=2026-01-27` to see raw borderou data format

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

## Next Steps

1. **CRITICAL: Inspect borderou response**
   - Call debug endpoint: `/api/awb/repair/debug?date=2026-01-27`
   - Look at `rawAwbNumber` and `rawType` fields
   - Check if AWB numbers match expected format

2. **If borderou AWBs are truncated/numeric:**
   - The borderou API itself may be returning truncated numbers
   - Would need to find a different FanCourier endpoint

3. **If borderou AWBs are correct but different field:**
   - Update field path in matching logic
   - May be using wrong property name

4. **Manual workaround available:**
   - Use "Manual" button to enter correct AWB from FanCourier portal
   - Works for individual AWBs but not practical for 1000+ AWBs

## Resume Command

To continue this debug session:
```
/gsd:debug
```
Then select "Resume session #1" for fancourier-awb-truncation
