# Plan 02-05 Summary: Failed Invoices Page & Oblio Migration

## What Was Built

1. **Failed Invoices Page** (`/invoices/failed`)
   - Table view of all failed invoice attempts
   - Status filtering (pending, resolved, all)
   - Retry button for re-attempting invoice generation
   - Context display: store, company, series, error details

2. **Oblio Migration** (Facturis → Oblio)
   - Created `src/lib/oblio.ts` - OAuth 2.0 client for Oblio API
   - Updated Prisma schema: oblioEmail, oblioSecretToken, oblioCif fields
   - Updated invoice-service.ts to use Oblio instead of Facturis
   - Updated UI: "Oblio" tab in company settings
   - Removed old facturis.ts code
   - SQL migration for renaming columns executed in Railway

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Oblio OAuth 2.0 with email + token | Simpler than SmartBill/Facturis - no API key rotation needed |
| Keep series as text input | Oblio uses series names directly (e.g., "SHOP1"), no separate series ID |
| Single test-oblio endpoint | Validates credentials and CIF access in one call |

## Files Modified

- `src/app/(dashboard)/invoices/failed/page.tsx` - New failed invoices UI
- `src/lib/oblio.ts` - New Oblio API client
- `src/services/invoice-service.ts` - Switched from Facturis to Oblio
- `src/app/api/test-oblio/route.ts` - Connection test endpoint
- `src/app/(dashboard)/settings/companies/[id]/page.tsx` - Oblio config tab
- `prisma/schema.prisma` - Oblio credential fields

## Verification

- [x] SQL migration executed in Railway
- [x] Oblio credentials configured in ERP
- [x] Invoice generation tested successfully

## Outcome

Phase 2 complete. Invoices now generate through Oblio API with automatic series selection based on store/company mapping.

---
*Completed: 2026-01-25*
*Duration: ~2 sessions (code + testing)*
