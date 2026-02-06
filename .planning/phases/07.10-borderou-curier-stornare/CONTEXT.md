# Phase 7.10: Courier Manifest & Invoice Reconciliation

## Overview

Automated courier manifest processing with bulk invoice cancellation for returns, automatic payment marking for delivered shipments, and stuck shipments reporting.

## Problem Statement

Currently:
1. **Returns**: Staff manually processes each return, storneaza invoices one by one
2. **Deliveries**: No automated payment marking - Office manually marks invoices as paid
3. **Stuck shipments**: No visibility into AWBs that are neither delivered nor returned
4. **No restrictions**: Anyone can stornare/mark paid manually without verification

Desired state:
1. Returns scanned → manifest generated → Office verifies against courier → bulk stornare
2. Courier delivery manifest → auto-process → invoices marked as paid
3. Daily report shows stuck shipments (>3 days)
4. Manual operations blocked unless manifest OR PIN approval from George

## Three Main Workflows

### Workflow 1: Retururi (Returns)

```
Depozit                    Office                         Oblio
   │                          │                              │
   ├─ Scaneaza AWB retur ─────┤                              │
   │  (in /returns)           │                              │
   │                          │                              │
   ├─ Genereaza manifest ─────┤                              │
   │  (AWB retur + AWB tur)   │                              │
   │                          │                              │
   │                     ├─ Primeste manifest                │
   │                     ├─ Compara cu borderou curier       │
   │                     ├─ Confirma                         │
   │                     │                                   │
   │                     ├─ Stornare bulk ──────────────────>│
   │                     │  (toate facturile asociate        │
   │                     │   AWB-urilor de tur)              │
   │                     │                                   │
```

### Workflow 2: Livrari (Deliveries)

```
FanCourier API             ERP                          Invoice DB
      │                      │                              │
      ├─ Borderou livrari ──>│                              │
      │  (automat sau        │                              │
      │   upload manual)     │                              │
      │                      │                              │
      │                 ├─ Proceseaza borderou              │
      │                 │                                   │
      │                 ├─ Marcheaza facturi ──────────────>│
      │                 │  ca incasate                      │
      │                 │                                   │
      │                 ├─ Notifica Office ──> "X facturi   │
      │                 │                      procesate"   │
```

### Workflow 3: Stuck Shipments Report

```
Cron Daily                 ERP                          Page Display
     │                      │                              │
     ├─ Trigger 08:00 ──────>│                              │
     │                      │                              │
     │                 ├─ Query AWBs:                       │
     │                 │  - created > 3 days ago            │
     │                 │  - NOT incasata                    │
     │                 │  - NOT retur                       │
     │                 │                                   │
     │                 ├─ Generate report ─────────────────>│
     │                 │  - Nr comanda                      │
     │                 │  - Nr AWB                          │
     │                 │  - Serie factura                   │
     │                 │  - Telefon client                  │
```

## Security Model

### PIN Approval System

```
┌─────────────────────────────────────────────────────────┐
│                      OPERATIONS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Stornare Factura         Marcare Incasata              │
│       │                         │                        │
│       ▼                         ▼                        │
│  ┌─────────┐              ┌─────────┐                   │
│  │Exista in│              │Exista in│                   │
│  │manifest │              │manifest │                   │
│  │retur?   │              │livrari? │                   │
│  └────┬────┘              └────┬────┘                   │
│       │                         │                        │
│   DA  │  NU                 DA  │  NU                   │
│   ▼   │  ▼                  ▼   │  ▼                    │
│ ALLOW │ PIN?              ALLOW │ PIN?                  │
│       │   │                     │   │                   │
│       │   ▼                     │   ▼                   │
│       │ ┌─────────────────────────────┐                 │
│       │ │     PIN 6-digit Dialog      │                 │
│       │ │  "Operatie fara borderou"   │                 │
│       │ │  [______] [Confirma]        │                 │
│       │ └──────────────┬──────────────┘                 │
│       │                │                                │
│       │         VALID  │  INVALID                       │
│       │           ▼    │    ▼                           │
│       │         ALLOW  │  BLOCK                         │
│       │                │                                │
└───────┴────────────────┴────────────────────────────────┘
```

### PIN Storage

- PIN stored as bcrypt hash in Settings table
- Only George can set/change PIN via /settings/security
- PIN never transmitted in plaintext (hashed client-side)
- Failed attempts logged for security audit

### Audit Trail

Every exception operation logs:
- Timestamp
- User ID
- Operation type (stornare/incasare)
- Invoice ID
- Reason (manual_no_manifest)
- PIN approval reference

## Database Models

### New Models

```prisma
model CourierManifest {
  id            String          @id @default(cuid())
  type          ManifestType    // RETURN, DELIVERY
  status        ManifestStatus  // DRAFT, PENDING_VERIFICATION, CONFIRMED, PROCESSED
  documentDate  DateTime
  courierRef    String?         // Reference from FanCourier
  createdAt     DateTime        @default(now())
  confirmedAt   DateTime?
  confirmedById String?
  confirmedBy   User?           @relation(fields: [confirmedById], references: [id])
  items         ManifestItem[]
}

model ManifestItem {
  id              String          @id @default(cuid())
  manifestId      String
  manifest        CourierManifest @relation(fields: [manifestId], references: [id])
  awbNumber       String          // AWB number from manifest
  originalAwb     String?         // For returns: original outbound AWB
  invoiceId       String?         // Linked invoice
  invoice         Invoice?        @relation(fields: [invoiceId], references: [id])
  processedAt     DateTime?
  status          ItemStatus      // PENDING, PROCESSED, ERROR
  errorMessage    String?
}

model PINApprovalRequest {
  id            String              @id @default(cuid())
  type          PINApprovalType     // STORNARE, INCASARE
  status        PINApprovalStatus   // PENDING, APPROVED, REJECTED, EXPIRED
  invoiceId     String
  invoice       Invoice             @relation(fields: [invoiceId], references: [id])
  requestedById String
  requestedBy   User                @relation(fields: [requestedById], references: [id])
  reason        String?
  createdAt     DateTime            @default(now())
  expiresAt     DateTime            // 5 min from creation
  resolvedAt    DateTime?
  resolvedById  String?
}
```

### Enums

```prisma
enum ManifestType {
  RETURN      // Borderou retururi
  DELIVERY    // Borderou livrari
}

enum ManifestStatus {
  DRAFT               // Just created
  PENDING_VERIFICATION // Sent to Office
  CONFIRMED           // Office verified
  PROCESSED           // All invoices updated
}

enum ItemStatus {
  PENDING     // Not yet processed
  PROCESSED   // Successfully processed
  ERROR       // Failed to process
}

enum PINApprovalType {
  STORNARE    // Cancel invoice
  INCASARE    // Mark as paid
}

enum PINApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

### Invoice Extensions

```prisma
model Invoice {
  // ... existing fields

  // New fields for tracking source
  cancellationSource  CancellationSource?  // manifest_return | pin_approval | null
  cancelledFromManifestId String?
  cancelledFromManifest   CourierManifest? @relation("CancelledInvoices", fields: [cancelledFromManifestId], references: [id])

  paymentSource       PaymentSource?       // manifest_delivery | pin_approval | null
  paidFromManifestId  String?
  paidFromManifest    CourierManifest?     @relation("PaidInvoices", fields: [paidFromManifestId], references: [id])

  pinApprovals        PINApprovalRequest[]
}

enum CancellationSource {
  MANIFEST_RETURN
  PIN_APPROVAL
}

enum PaymentSource {
  MANIFEST_DELIVERY
  PIN_APPROVAL
}
```

## API Integrations

### FanCourier API (TO BE RESEARCHED)

Need to verify availability of:

```
GET /awb/list?status=delivered&date=YYYY-MM-DD
  → Returns list of delivered AWBs (borderou livrari)

GET /awb/list?status=returned&date=YYYY-MM-DD
  → Returns list of returned AWBs (borderou retururi)
```

Fallback if API not available:
- Manual CSV/Excel upload by Office
- Parse file to create ManifestItems

### Oblio API (TO BE RESEARCHED)

Need to verify stornare endpoint:

```
POST /invoices/{id}/cancel
  or
POST /invoices/{id}/credit-note
  → Creates credit note / cancellation document
```

Current Oblio integration uses:
- `src/lib/services/oblio/oblio-client.ts`
- Need to add stornare method

## UI Pages

### /returns/manifest

Return manifest generation and verification:
- Shows scanned return AWBs grouped by day
- Button "Genereaza Manifest" creates CourierManifest
- Office sees pending manifests with "Verifica" action
- Comparison view: ERP manifest vs courier manifest
- "Confirma si Storneaza" button triggers bulk stornare

### /reports/stuck-shipments

Stuck AWBs report:
- Table with columns: Nr Comanda, Nr AWB, Serie Factura, Telefon Client
- Filter by date range
- Export to CSV button
- Auto-refresh daily

### /settings/security

PIN configuration:
- "Seteaza PIN aprobare exceptii" - 6 digit input
- Only visible to George role
- "Schimba PIN" requires current PIN first

## Known Issues to Fix

### Returns Page Pagination Bug

Current problem in `/returns`:
- Only 100 items displayed
- Pagination not working correctly

Location: `src/app/(dashboard)/returns/page.tsx`

Fix needed:
- Check API limit parameter
- Verify pagination component works
- May need server-side pagination

## Integration Points

### Existing Code to Modify

1. **Invoice Service** (`src/lib/services/invoice-service.ts`)
   - Add `cancelInvoice()` method for Oblio stornare
   - Add source tracking (manifest vs manual)

2. **AWB Service** (`src/lib/services/awb/awb-service.ts`)
   - Query methods for stuck shipments
   - Integration with manifest processing

3. **Returns Page** (`src/app/(dashboard)/returns/page.tsx`)
   - Add manifest generation button
   - Fix pagination bug

4. **Invoice Detail/Actions**
   - Block manual cancel/pay without manifest
   - Show PIN approval dialog when needed

## Success Criteria

1. ✅ Return AWBs scanned at warehouse generate return manifest report
2. ✅ Office can verify return manifest and confirm with single action
3. ✅ Confirmation triggers bulk invoice cancellation in Oblio
4. ✅ Courier delivery manifest fetched automatically (or upload fallback)
5. ✅ Processing delivery manifest marks invoices as "incasate"
6. ✅ Stuck shipments page shows AWBs >3 days without resolution
7. ✅ Manual operations blocked without manifest (or PIN approval)
8. ✅ PIN 6-digit required for exceptions
9. ✅ All operations logged in audit trail
10. ✅ Returns page pagination fixed

---

*Context created: 2026-02-07*
*Phase: NOT PLANNED YET (run /gsd:plan-phase 7.10)*
