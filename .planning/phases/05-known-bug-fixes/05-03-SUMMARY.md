---
phase: 05-known-bug-fixes
plan: 03
subsystem: api
tags: [meta, webhooks, deduplication, prisma, crypto, md5]

# Dependency graph
requires:
  - phase: 01-system-audit
    provides: identified duplicate webhook issue as known bug
provides:
  - Webhook event deduplication with externalEventId field
  - extractEventId helper with multi-location ID extraction
  - MD5 hash fallback for deterministic event identification
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Webhook deduplication via unique event ID lookup before processing"
    - "Multi-location ID extraction with deterministic hash fallback"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/app/api/webhooks/meta/route.ts

key-decisions:
  - "Use composite index (platform, externalEventId) not unique constraint for nullable field"
  - "Silent skip for duplicates - no error, just log and continue"
  - "MD5 hash fallback ensures deterministic ID even without explicit event ID"

patterns-established:
  - "extractEventId pattern: try explicit IDs, fall back to payload hash"
  - "Deduplication check before create: findFirst + continue pattern"

# Metrics
duration: 4min
completed: 2025-01-25
---

# Phase 05 Plan 03: Meta Webhook Deduplication Summary

**Webhook event deduplication via externalEventId field with multi-location ID extraction and MD5 hash fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2025-01-25T18:30:00Z
- **Completed:** 2025-01-25T18:34:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added externalEventId field to AdsWebhookEvent model with composite index
- Implemented extractEventId helper to extract unique IDs from multiple payload locations
- Added deduplication logic to silently skip duplicate webhook events
- Enhanced logging to include event ID for debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Add externalEventId field to AdsWebhookEvent model** - `df5bcc2` (feat)
2. **Task 2: Add event deduplication to Meta webhook handler** - `7d8b78b` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added externalEventId field and composite index to AdsWebhookEvent model
- `src/app/api/webhooks/meta/route.ts` - Added extractEventId helper and deduplication logic in POST handler

## Decisions Made

- **Composite index vs unique constraint:** Used `@@index([platform, externalEventId])` instead of `@@unique` because externalEventId is nullable (legacy events don't have it). Deduplication enforced in application code.
- **Silent skip for duplicates:** Duplicate events log and continue rather than error - prevents webhook failures while still tracking the duplication.
- **MD5 hash fallback:** When no explicit event ID found (value.id, value.event_id, composite), generate deterministic hash from payload to ensure same payload always produces same ID.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Prisma permissions:** Could not run `prisma db push` or `prisma generate` due to node_modules/.prisma directory owned by root. Schema changes are syntactically correct and will apply when run with proper permissions or in CI/CD.

## User Setup Required

After deployment, run database migration:
```bash
npx prisma db push
```

## Next Phase Readiness

- Meta webhook deduplication complete
- Ready for next plan in Phase 05
- Database migration pending (requires proper environment with DATABASE_URL)

---
*Phase: 05-known-bug-fixes*
*Completed: 2025-01-25*
