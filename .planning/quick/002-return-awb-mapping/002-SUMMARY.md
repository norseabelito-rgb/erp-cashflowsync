---
id: quick-002
type: quick
title: Return AWB Mapping
status: complete
completed: 2026-01-28

subsystem: logistics
tags: [returns, awb, scanning, warehouse]

dependency-graph:
  requires: [AWB model, handover scan permission]
  provides: [ReturnAWB model, return scan API, returns page]
  affects: [invoice reversal (future), stock return (future)]

tech-stack:
  added: []
  patterns: [scan-and-map workflow]

key-files:
  created:
    - prisma/schema.prisma (ReturnAWB model)
    - src/lib/returns.ts
    - src/app/api/returns/scan/route.ts
    - src/app/api/returns/route.ts
    - src/app/api/returns/link/route.ts
    - src/app/(dashboard)/returns/page.tsx
  modified:
    - src/components/sidebar.tsx (navigation entry)

decisions:
  - title: Reuse handover.scan permission
    rationale: Return scanning is logistically similar to handover scanning
    context: q002 Task 2
  - title: Support both auto-mapping and manual linking
    rationale: Not all return AWBs can be auto-matched (FanCourier generates new numbers)
    context: q002 Task 2
  - title: Track both original AWB and order links
    rationale: Original AWB might be deleted but order should remain linked
    context: q002 Task 1

metrics:
  duration: ~5 minutes
  tasks: 3/3
  commits: 3
---

# Quick Task 002: Return AWB Mapping Summary

**One-liner:** Return AWB scanning system with auto-mapping to original orders and manual linking fallback

## What Was Built

### Database Layer
- **ReturnAWB model** with fields for:
  - Return AWB number (unique, scanned at warehouse)
  - Link to original AWB (via OriginalToReturn relation)
  - Direct link to order (backup when AWB deleted)
  - Status tracking: received, processed, stock_returned, invoice_reversed
  - Scan/processing audit fields (who, when)

### Business Logic (src/lib/returns.ts)
- **scanReturnAWB()**: Main scanning function with intelligent mapping:
  1. Check for duplicate scans
  2. Match directly to our AWB (if scanned AWB is our original)
  3. Search for pending returns (AWBs in return status)
  4. Create unlinked record if no auto-match found
- **getScannedReturns()**: List scanned returns with filters
- **getPendingReturns()**: AWBs in return status without scan
- **linkReturnToOrder()**: Manual order-return linking

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/returns/scan | POST | Scan a return AWB |
| /api/returns | GET | List returns with stats |
| /api/returns/link | POST | Manually link return to order |

### UI Page (/returns)
- Scanner input with auto-submit (barcode scanner support)
- Stats cards: scanned today, unmapped, pending returns
- Split layout:
  - Left: Today's scanned returns with mapping status
  - Right: Pending returns (AWBs awaiting physical return)
- Manual linking dialog for unmatched returns
- Visual feedback: success/warning/error states

## Return Status Flow
FanCourier return statuses tracked: S6, S7, S15, S16, S33, S43 (refuz, retur)

```
Original AWB → Return Status (S6/S43) → Return AWB Scan → ReturnAWB Record
                                                              ↓
                                              [Auto-mapped to order OR manual link]
```

## Commits
| Hash | Description |
|------|-------------|
| 2170e8b | add ReturnAWB model for return shipment tracking |
| 398f7a0 | add return AWB scan API and business logic |
| f034c87 | add returns scan page with sidebar navigation |

## Post-Deployment Notes
1. Run `npx prisma db push` to create return_awbs table
2. Run `npx prisma generate` to update Prisma client (requires write access to node_modules/.prisma)
3. Users with handover.scan permission can access /returns page

## Future Enhancements (Foundation Ready)
- Invoice reversal (stornare) linked to return
- Stock return processing
- Automatic FanCourier return AWB matching via API
- Return reason tracking
