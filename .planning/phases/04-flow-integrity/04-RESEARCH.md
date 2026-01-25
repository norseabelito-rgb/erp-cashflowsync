# Phase 4: Flow Integrity - Research

**Researched:** 2026-01-25
**Domain:** Data consistency through transfer blocking and AWB routing
**Confidence:** HIGH

## Summary

This phase implements two complementary data integrity features in an existing Next.js/Prisma brownfield system:

1. **Transfer Warning System**: Warn users (not block) when attempting to invoice an order with an unfinished transfer. User must explicitly confirm to proceed, with audit logging.

2. **AWB Company Routing**: Ensure AWBs are generated using the correct company's FanCourier credentials based on Store -> Company mapping.

**Key findings:**
- The existing `invoice-service.ts` already has transfer blocking logic (hard block) that needs to be converted to a warning flow
- FanCourier credentials are already stored per-Company in the database schema
- The `awb-service.ts` already uses per-company credentials - just needs verification/mismatch detection
- ActivityLog infrastructure exists and can be extended for audit trail
- Radix UI Dialog/AlertDialog components are already in use for modals

**Primary recommendation:** Implement a confirmation modal that interrupts the invoice flow when transfers are unfinished. Extend existing services with mismatch detection and logging rather than building new infrastructure.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.0.4 | App Router framework | Already in use |
| Prisma | Latest | ORM with PostgreSQL | Already in use |
| @tanstack/react-query | Latest | Data fetching/caching | Already in use |
| @radix-ui/react-dialog | Latest | Modal components | Already in use |
| @radix-ui/react-alert-dialog | Latest | Confirmation dialogs | Already in use |

### Supporting (Already in Use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest | Icons | AlertTriangle for warning icon |
| sonner/toast | Latest | Toast notifications | For audit confirmations |
| tailwindcss | Latest | Styling | Warning colors (amber/orange) |

### No New Dependencies Needed

All required functionality can be implemented with existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── invoice-service.ts        # Modify: Add transfer warning check
│   ├── awb-service.ts            # Modify: Add mismatch detection
│   ├── activity-log.ts           # Extend: Add warning override logging
│   └── flow-integrity.ts         # NEW: Shared validation utilities
├── components/
│   └── orders/
│       └── transfer-warning-modal.tsx  # NEW: Confirmation modal
├── app/
│   └── api/
│       └── orders/
│           └── [id]/
│               └── check-transfer/route.ts  # NEW: Pre-check endpoint
```

### Pattern 1: Warning-then-Proceed Flow
**What:** Two-phase action where user is warned and must explicitly confirm
**When to use:** When action has potential consequences but should not be blocked entirely
**Example:**
```typescript
// Phase 1: Check for warnings
const checkResult = await checkTransferStatus(orderId);
if (checkResult.hasWarning) {
  // Show modal, wait for explicit confirmation
  return { needsConfirmation: true, warning: checkResult };
}

// Phase 2: Execute with optional override flag
const result = await issueInvoice(orderId, {
  acknowledgeTransferWarning: true,
  warningDetails: checkResult
});
```

### Pattern 2: Audit Trail for Overrides
**What:** Log every case where user proceeds despite warning
**When to use:** When business needs visibility into override decisions
**Example:**
```typescript
await logActivity({
  entityType: EntityType.ORDER,
  action: ActionType.WARNING_OVERRIDE,
  description: `User proceeded with invoice despite transfer #${transferNumber} being unfinished`,
  details: {
    transferId,
    transferStatus,
    userId,
    acknowledgedAt: new Date().toISOString(),
  },
});
```

### Pattern 3: Pre-flight Check Endpoint
**What:** Separate endpoint to check conditions before action
**When to use:** When UI needs to know about warnings before user commits
**Example:**
```typescript
// GET /api/orders/[id]/check-transfer
export async function GET(req, { params }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { requiredTransfer: true }
  });

  return {
    hasUnfinishedTransfer: order.requiredTransfer?.status !== 'COMPLETED',
    transferNumber: order.requiredTransfer?.transferNumber,
    transferStatus: order.requiredTransfer?.status,
  };
}
```

### Anti-Patterns to Avoid
- **Hard-coding transfer check in multiple places:** Keep transfer check logic in one service function
- **Skipping audit log:** Every override MUST be logged, no exceptions
- **Silent failures:** If AWB company mismatch occurs, it must be visible to user
- **Blocking without explanation:** Always provide clear message about what's wrong and how to fix it

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation modal | Custom modal component | `@radix-ui/react-alert-dialog` | Already in use, accessible, tested |
| Toast notifications | Custom toast system | Existing `toast` hook from `@/hooks/use-toast` | Consistent UX |
| Activity logging | New audit table | Existing `ActivityLog` model + `logActivity()` | Infrastructure exists |
| Company credentials | New credentials store | Existing `Company` model with FanCourier fields | Already implemented |

**Key insight:** The existing codebase already has 90% of the infrastructure needed. The task is primarily wiring existing pieces together with new validation logic.

## Common Pitfalls

### Pitfall 1: Race Condition in Invoice Generation
**What goes wrong:** User bypasses warning by opening multiple tabs or making concurrent requests
**Why it happens:** Warning check and invoice generation are separate operations
**How to avoid:** Use database transaction with row-level lock (already used in awb-service.ts)
**Warning signs:** Duplicate invoices for same order

### Pitfall 2: Stale Transfer Status
**What goes wrong:** Transfer completes between warning display and user confirmation
**Why it happens:** Time passes between check and action
**How to avoid:** Re-check transfer status at execution time, log the status at both check and execution
**Warning signs:** Audit log shows different status than what user saw

### Pitfall 3: Missing FanCourier Credentials
**What goes wrong:** User attempts AWB generation for company without configured credentials
**Why it happens:** Company setup incomplete
**How to avoid:** Pre-check credentials before attempting AWB, show clear error with link to settings
**Warning signs:** Generic "AWB failed" errors without clear cause
**Existing handling:** `awb-service.ts` already handles this at lines 147-153

### Pitfall 4: Inconsistent Logging
**What goes wrong:** Some overrides are logged, others are not
**Why it happens:** Logging added in some code paths but not others
**How to avoid:** Single function for invoice generation that always logs overrides
**Warning signs:** Audit trail has gaps

### Pitfall 5: Modal UX Breaking Flow
**What goes wrong:** User loses context, doesn't understand what they're confirming
**Why it happens:** Generic or unclear warning message
**How to avoid:** Include specific transfer number, status, and recommended action in warning
**Warning signs:** Users ask "what does this mean?"

## Code Examples

Verified patterns from existing codebase:

### Existing Transfer Check (invoice-service.ts lines 273-281)
```typescript
// Current implementation - HARD BLOCK
if (order.requiredTransferId && order.requiredTransfer) {
  if (order.requiredTransfer.status !== "COMPLETED") {
    return {
      success: false,
      error: getInvoiceErrorMessage("TRANSFER_PENDING"),
      errorCode: "TRANSFER_PENDING",
    };
  }
}
```

### Target Pattern: Warning with Override
```typescript
// New implementation - SOFT WARNING with confirmation
interface InvoiceOptions {
  acknowledgeTransferWarning?: boolean;
  warningAcknowledgedBy?: string;
}

export async function issueInvoiceForOrder(
  orderId: string,
  options?: InvoiceOptions
): Promise<IssueInvoiceResult> {
  // ... existing code ...

  // Check for unfinished transfer
  if (order.requiredTransferId && order.requiredTransfer) {
    if (order.requiredTransfer.status !== "COMPLETED") {
      // If not acknowledged, return warning (not error)
      if (!options?.acknowledgeTransferWarning) {
        return {
          success: false,
          needsConfirmation: true,
          warning: {
            type: "TRANSFER_PENDING",
            transferNumber: order.requiredTransfer.transferNumber,
            transferStatus: order.requiredTransfer.status,
            message: `Transferul #${order.requiredTransfer.transferNumber} nu este finalizat. Continuarea poate duce la erori de facturare.`,
          },
        };
      }

      // User acknowledged - log the override and proceed
      await logActivity({
        entityType: EntityType.ORDER,
        entityId: orderId,
        action: ActionType.WARNING_OVERRIDE,
        description: `Factură emisă cu transfer nefinalizat: ${order.requiredTransfer.transferNumber}`,
        details: {
          transferId: order.requiredTransferId,
          transferStatus: order.requiredTransfer.status,
          acknowledgedBy: options.warningAcknowledgedBy,
        },
        orderId,
        orderNumber: order.shopifyOrderNumber,
      });
    }
  }

  // ... continue with invoice generation ...
}
```

### Existing ActivityLog Usage
```typescript
// From src/lib/activity-log.ts
export async function logActivity(params: LogActivityParams) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        description: params.description,
        details: params.details || undefined,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        // ... other fields
      },
    });
    return log;
  } catch (error) {
    console.error("Error logging activity:", error);
    return null; // Don't block main operation
  }
}
```

### AlertDialog Pattern (existing in codebase)
```typescript
// From src/components/ui/alert-dialog.tsx - already in use
<AlertDialog open={!!deleteCompany} onOpenChange={() => setDeleteCompany(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Atenție!</AlertDialogTitle>
      <AlertDialogDescription className="space-y-2">
        <p className="font-medium text-amber-600">
          Transferul #{transferNumber} nu este finalizat.
        </p>
        <p>
          Continuarea poate duce la diferențe în stoc sau facturare incorectă.
        </p>
        <p className="text-sm text-muted-foreground">
          Recomandare: Finalizează transferul înainte de a emite factura.
        </p>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anulează</AlertDialogCancel>
      <AlertDialogAction
        className="bg-amber-600 hover:bg-amber-700"
        onClick={handleConfirmWithWarning}
      >
        Continuă oricum
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### AWB Company Resolution (existing in awb-service.ts lines 136-145)
```typescript
// Current implementation - already uses per-company credentials
const company = order.billingCompany || order.store?.company;

if (!company) {
  return {
    success: false,
    error: "Comanda nu are o firmă asociată. Configurează firma pentru magazin sau setează billingCompany.",
  };
}

if (!company.fancourierClientId || !company.fancourierUsername || !company.fancourierPassword) {
  return {
    success: false,
    error: `Credențialele FanCourier nu sunt configurate pentru firma "${company.name}". Configurează-le în Setări > Firme.`,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global FanCourier credentials | Per-company credentials | Already implemented | Each company can have own courier account |
| Hard block on transfer pending | Warning with confirmation | This phase | Business continuity while maintaining audit trail |

**Deprecated/outdated:**
- Global `Settings.fancourierClientId/Username/Password` - still in schema but per-company credentials take priority

## Open Questions

Things that couldn't be fully resolved:

1. **ActionType enum extension**
   - What we know: Current ActionType enum in `prisma-enums.ts` doesn't have `WARNING_OVERRIDE`
   - What's unclear: Should we add it to Prisma enum or use existing type with details field?
   - Recommendation: Use existing `UPDATE` action with descriptive details JSON to avoid schema migration

2. **Mismatch detection scope**
   - What we know: AWB/Invoice mismatch can occur if billingCompany differs from store.company
   - What's unclear: How often does this happen in practice?
   - Recommendation: Add detection but only warn (don't block) per CONTEXT.md decisions

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/src/lib/invoice-service.ts` - Transfer check at lines 273-281
  - `/src/lib/awb-service.ts` - Company credential resolution
  - `/src/lib/activity-log.ts` - Logging patterns
  - `/prisma/schema.prisma` - Company, WarehouseTransfer, AWB, ActivityLog models
  - `/src/components/ui/alert-dialog.tsx` - Existing dialog component

### Secondary (MEDIUM confidence)
- Radix UI documentation for AlertDialog patterns

### Tertiary (LOW confidence)
- N/A - All findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against existing package.json and usage
- Architecture: HIGH - Patterns derived from existing codebase
- Pitfalls: MEDIUM - Based on codebase analysis and common patterns

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (stable patterns, internal codebase)
