---
status: resolved
trigger: "FanCourier AWBs are being truncated/cut off - missing characters at the end"
created: 2026-01-27T12:00:00Z
updated: 2026-01-28T02:00:00Z
resolved: 2026-01-28T02:00:00Z
---

## ROOT CAUSE FOUND

**The problem was NOT truncation due to JavaScript number precision!**

The real issue: We were storing `awbNumber` (13-digit numeric: `7000121083646`) but the scanner reads `barcodes[0]` (21-char full barcode: `7000121083646001F1870`).

### FanCourier API Response Structure

```json
{
  "info": {
    "awbNumber": 7000121083646,        // 13 digits - numeric ID
    "barcodes": [
      "7000121083646001F1870"           // 21 chars - THIS is on the label!
    ]
  }
}
```

The barcode printed on the shipping label is `barcodes[0]`, which starts with `awbNumber` but has an additional suffix (`001F1870`).

### What Was Happening

1. FanCourier creation API returns `awbNumber` (13 digits)
2. We saved this to our database
3. The printed AWB label has `barcodes[0]` (21 chars) as the scannable barcode
4. Scanner in warehouse scans the 21-char barcode
5. Matching failed because database had 13 chars, scanner sent 21 chars

### Fix Applied

1. **Automatic repair** now uses `barcodes[0]` from borderou response for matching
2. **Debug UI** shows both `barcode` and `awbNumber` clearly
3. The `json-bigint` fix was unnecessary for this issue (but doesn't hurt)

## Commits (Final Session)

- `fe3a4bc` - fix: reduce perPage to 100 for FanCourier borderou API
- `293c35c` - fix: use barcodes[0] for AWB repair instead of awbNumber

## Files Changed

- `src/lib/fancourier.ts` - Repair logic now uses `barcodes[0]` for matching
- `src/app/api/awb/repair/debug/route.ts` - Shows barcode vs awbNumber
- `src/app/(dashboard)/settings/awb-repair/page.tsx` - UI shows both fields

## How to Repair Existing AWBs

1. Go to `/settings/awb-repair`
2. Select date range that covers when AWBs were created
3. Click "Bulk Repair" - it will now match by checking if `barcodes[0]` starts with the stored `awbNumber`
4. For any that don't match automatically, use Manual Repair

## Future Consideration

Consider storing `barcodes[0]` instead of `awbNumber` when creating new AWBs. However, this requires:
1. Fetching borderou data after AWB creation (extra API call)
2. Or changing how the scanner/matching module works to support prefix matching

Current fix allows repair of existing data and matching can be updated to handle prefix lookups.
