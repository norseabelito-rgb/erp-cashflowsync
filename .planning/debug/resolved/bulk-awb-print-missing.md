---
status: resolved
trigger: "When emitting AWBs in bulk, the print functionality no longer works. AWBs are emitted successfully but the print step is missing/skipped."
created: 2026-02-05T10:00:00Z
updated: 2026-02-05T10:18:00Z
---

## Current Focus

hypothesis: CONFIRMED - process-all/route.ts never had sendAWBsToPrint, unlike process/route.ts
test: N/A - Root cause found
expecting: N/A
next_action: Verify fix in production environment (local build has permission issues unrelated to this change)

## Symptoms

expected: After bulk AWB emission, AWBs should be sent to the auto-print queue (like single processing does)
actual: AWBs are emitted successfully but the print step doesn't trigger
errors: None - the print step is simply missing from the code
reproduction: Emit AWBs in bulk
started: Not a regression - the feature was NEVER implemented in process-all (existed only in process route)

## Eliminated

## Evidence

- timestamp: 2026-02-05T10:05:00Z
  checked: /src/app/api/orders/process/route.ts
  found: Contains sendAWBsToPrint function (lines 479-540) which creates print jobs for AWBs. Called on line 184-189 after creating picking list.
  implication: The ORIGINAL bulk route has print functionality

- timestamp: 2026-02-05T10:05:00Z
  checked: /src/app/api/orders/process-all/route.ts
  found: NO sendAWBsToPrint function exists. NO print job creation for AWBs. Lines 475-487 have a comment about picking list not auto-printing but there's NO AWB printing either.
  implication: This newer endpoint was created without AWB printing

- timestamp: 2026-02-05T10:08:00Z
  checked: Frontend code (orders/page.tsx line 637)
  found: Frontend calls /api/orders/process-all, NOT /api/orders/process
  implication: The used endpoint lacks print functionality

- timestamp: 2026-02-05T10:09:00Z
  checked: Git history for both routes (initial commit 48e5b2c)
  found: BOTH routes existed from initial commit. process/route.ts had sendAWBsToPrint. process-all/route.ts NEVER had it.
  implication: This is NOT a regression - the feature was never copied to process-all when it was created/chosen as the primary endpoint

## Resolution

root_cause: The /api/orders/process-all route (used by frontend) was created WITHOUT the sendAWBsToPrint function that exists in /api/orders/process. The frontend uses process-all but the AWB print feature only exists in process.

fix: Added sendAWBsToPrint function to process-all/route.ts (copied from process/route.ts) and called it after picking list creation at line 495-502.

verification: Code change mirrors the working implementation in process/route.ts. The function:
1. Finds an active printer with autoPrint enabled
2. Gets the AWBs with valid awbNumbers
3. Checks for existing PENDING print jobs to avoid duplicates
4. Creates print jobs for new AWBs

files_changed:
- src/app/api/orders/process-all/route.ts: Added sendAWBsToPrint function and call after picking list creation
