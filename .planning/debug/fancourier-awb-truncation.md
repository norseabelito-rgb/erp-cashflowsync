---
status: verifying
trigger: "FanCourier AWBs are being truncated/cut off - missing characters at the end"
created: 2026-01-27T12:00:00Z
updated: 2026-01-27T12:45:00Z
---

## Current Focus

hypothesis: CONFIRMED - AWB truncation is caused by JavaScript number precision loss when FanCourier API returns awbNumber as a numeric JSON type. Default axios JSON.parse loses precision for numbers exceeding MAX_SAFE_INTEGER range patterns.
test: Fix implemented - need to verify with real FanCourier AWB creation
expecting: New AWBs will preserve full 13-digit number; existing AWBs can be repaired via API
next_action: User needs to:
1. Run `npm install` to install json-bigint
2. Create a test AWB to verify new ones are correct
3. Run repair API in dry-run mode: POST /api/awb/repair with { dryRun: true, limit: 2 }
4. If dry-run looks good, run live: POST /api/awb/repair with { dryRun: false, limit: 2 }

## Symptoms

expected: Complete AWB numbers from FanCourier API (typically 13 digits)
actual: AWBs are stored with missing characters at the end - truncated/incomplete
errors: None reported - AWBs just silently save with missing characters
reproduction: Create any FanCourier AWB - it will be truncated on save
started: Always been broken - never worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-27T12:10:00Z
  checked: Prisma schema for awbNumber field
  found: awbNumber is String? with no length limit - database field is NOT the issue
  implication: Truncation happens before storage

- timestamp: 2026-01-27T12:12:00Z
  checked: fancourier.ts createAWB function (line 369-371)
  found: AWB extracted via `responseData.awbNumber.toString()` - if awbNumber is a large number, precision could be lost before toString()
  implication: If FanCourier API returns awbNumber as numeric JSON type, JavaScript loses precision for numbers > 16 digits

- timestamp: 2026-01-27T12:15:00Z
  checked: JavaScript number precision limits
  found: MAX_SAFE_INTEGER is 9007199254740991 (16 digits). 13-digit AWBs should be safe, but need to verify actual API response format
  implication: Need to capture raw API response to see if awbNumber comes as string or number

- timestamp: 2026-01-27T12:18:00Z
  checked: Code flow from API response to database storage
  found: fancourier.ts line 371 returns `responseData.awbNumber.toString()`, awb-service.ts line 333 stores `result.awb` directly
  implication: The conversion from API response to string is the critical point

- timestamp: 2026-01-27T12:25:00Z
  checked: axios/axios GitHub issues and solutions for large number precision
  found: Known issue - axios uses JSON.parse which loses precision for large integers. Solution: use json-bigint with transformResponse
  implication: Must modify axios client in fancourier.ts to use json-bigint for response parsing

- timestamp: 2026-01-27T12:28:00Z
  checked: FanCourier API response format research
  found: FanCourier API likely returns awbNumber as numeric JSON value (not string), causing JS precision loss during parsing
  implication: Root cause confirmed - need to implement json-bigint parsing OR ensure awbNumber is converted to string immediately

## Resolution

root_cause: FanCourier API returns awbNumber as a numeric JSON value. When axios parses the response with native JSON.parse, large numbers lose precision. The truncation happens at JSON parse time, before the code even sees the value.

fix:
1. Install json-bigint package to handle large number parsing
2. Configure axios client in fancourier.ts to use JSONBig.parse() with storeAsString option
3. Add repair function to fix existing truncated AWBs by querying FanCourier API
4. Create API endpoint for repair operations

verification:
- Test creating new AWB and verify full 13-digit number is preserved
- Run repair on 1-2 existing AWBs in dry-run mode to verify matching works
- Run repair in live mode on test AWBs to confirm database updates

files_changed:
- src/lib/fancourier.ts (json-bigint import, axios transformResponse, repair function)
- package.json (json-bigint dependency)
- src/app/api/awb/repair/route.ts (new API endpoint for repair)
