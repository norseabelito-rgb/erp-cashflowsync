# Phase 2: Invoice Series Fix - Research

**Researched:** 2026-01-24
**Domain:** Invoice Series Management, Store-Company Mapping, Facturis Integration
**Confidence:** HIGH

## Summary

This research investigates how to implement automatic invoice series selection based on store-to-company mappings. The current system has invoice series management but lacks direct store-to-series mapping - series are associated with companies, and stores are associated with companies, but there's no direct store-to-series link for automatic selection.

**Critical Finding:** The Facturis API does NOT have a dedicated endpoint for fetching invoice series. The current `getSeries()` method in `facturis.ts` extracts series from existing invoices, which is unreliable for new accounts or series without invoices. This constrains our implementation approach.

**Primary recommendation:** Implement store-level invoice series mapping in the existing Settings > Stores UI, with series dropdowns grouped by company, and validate mappings before invoice generation.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.1.3 | App framework | Already in use |
| Prisma | 5.10.2 | Database ORM | Already in use |
| @tanstack/react-query | 5.28.0 | Data fetching & caching | Already in use |
| shadcn/ui (Radix) | Various | UI components | Already in use |
| Zod | 3.22.4 | Schema validation | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.51.0 | Form management | Complex forms (existing) |
| date-fns | 3.3.1 | Date formatting | Date display (existing) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local series tracking | Facturis API for series | Facturis has NO series endpoint - must use local |
| Complex UI redesign | Extend existing Settings UI | Simpler, maintains consistency |

**No Installation Required:** All needed libraries are already present.

## Architecture Patterns

### Recommended Modifications to Existing Structure
```
src/
├── app/
│   ├── api/
│   │   ├── stores/[id]/route.ts          # ADD: invoiceSeriesId update
│   │   ├── invoice-series/route.ts       # MODIFY: add sync from Facturis
│   │   └── invoices/issue/route.ts       # MODIFY: use store series
│   └── (dashboard)/
│       ├── stores/page.tsx               # MODIFY: add series dropdown
│       └── settings/invoice-series/page.tsx  # ADD: overview table
├── lib/
│   ├── invoice-series.ts                 # MODIFY: getInvoiceSeriesForStore
│   ├── invoice-service.ts                # MODIFY: auto-select series
│   └── facturis.ts                       # MODIFY: improve getSeries
└── components/
    └── ui/                               # Reuse existing components
```

### Pattern 1: Store-Company-Series Hierarchy
**What:** Three-level hierarchy for invoice series resolution
**When to use:** Every invoice generation
**Example:**
```typescript
// Current flow (problematic):
// Order -> Store -> Company -> First active series for company

// New flow:
// Order -> Store -> Store.invoiceSeries (direct, explicit)
// Fallback: Store -> Company -> Company default series

// Validation before invoice:
async function validateSeriesMapping(storeId: string): Promise<{
  valid: boolean;
  series?: InvoiceSeries;
  error?: string;
}> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      invoiceSeries: true,
      company: {
        include: {
          invoiceSeries: { where: { isActive: true, isDefault: true } }
        }
      }
    }
  });

  if (!store) return { valid: false, error: "Magazin negasit" };

  // Direct series on store takes priority
  if (store.invoiceSeries && store.invoiceSeries.isActive) {
    return { valid: true, series: store.invoiceSeries };
  }

  // Fallback to company default
  if (store.company?.invoiceSeries?.[0]) {
    return { valid: true, series: store.company.invoiceSeries[0] };
  }

  return {
    valid: false,
    error: `Magazinul ${store.name} nu are serie de facturare configurata. Mergi la Setari > Magazine pentru a configura.`
  };
}
```

### Pattern 2: Grouped Dropdown UI
**What:** Series dropdown grouped by company
**When to use:** Store configuration UI
**Example:**
```tsx
// Source: shadcn/ui Select with groups
<Select
  value={selectedSeriesId}
  onValueChange={setSelectedSeriesId}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecteaza seria de facturare" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Fara serie (foloseste default firma)</SelectItem>
    {companies.map(company => (
      <SelectGroup key={company.id}>
        <SelectLabel>{company.name}</SelectLabel>
        {company.invoiceSeries
          .filter(s => s.isActive)
          .map(series => (
            <SelectItem key={series.id} value={series.id}>
              {series.prefix} - {series.name}
              {series.isDefault && " (Default)"}
            </SelectItem>
          ))}
      </SelectGroup>
    ))}
  </SelectContent>
</Select>
```

### Pattern 3: Edge Case Auto-Correction
**What:** Automatic fixing of invalid series numbers
**When to use:** During invoice number generation
**Example:**
```typescript
// Already partially implemented in invoice-series.ts
// Enhance to include notification

async function getNextInvoiceNumber(seriesId: string): Promise<NextNumberResult | null> {
  return prisma.$transaction(async (tx) => {
    const series = await tx.invoiceSeries.findUnique({
      where: { id: seriesId },
    });

    if (!series || !series.isActive) return null;

    let currentNumber = series.currentNumber;
    let correctionApplied = false;
    let correctionMessage = null;

    // Auto-correct invalid numbers
    if (currentNumber < 1) {
      currentNumber = Math.max(1, series.startNumber || 1);
      correctionApplied = true;
      correctionMessage = `Numarul seriei a fost corectat de la ${series.currentNumber} la ${currentNumber}`;

      await tx.invoiceSeries.update({
        where: { id: seriesId },
        data: { currentNumber: currentNumber },
      });
    }

    // Increment for next invoice
    await tx.invoiceSeries.update({
      where: { id: seriesId },
      data: { currentNumber: currentNumber + 1 },
    });

    return {
      prefix: series.prefix,
      number: currentNumber,
      formatted: `${series.prefix}${currentNumber.toString().padStart(series.numberPadding || 6, "0")}`,
      seriesId: series.id,
      facturisSeries: series.facturisSeries,
      correctionApplied,
      correctionMessage,
    };
  });
}
```

### Anti-Patterns to Avoid
- **Caching series from Facturis:** Decision says NO cache - always fetch live (but Facturis has no series endpoint, so must track locally)
- **Manual series override at invoice time:** Decision says NO - series always comes from store mapping
- **Multiple series per store:** Current schema allows only one - maintain this simplicity
- **Implicit series selection:** Always validate series exists before invoice generation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grouped select dropdown | Custom select | shadcn/ui SelectGroup | Already supports groups |
| Form validation | Manual checks | Zod + react-hook-form | Consistent with codebase |
| Optimistic updates | Manual state management | React Query mutations | Already in use |
| Error message translation | Switch statements | Centralized error map | Maintainability |

**Key insight:** The existing codebase has patterns for all UI elements needed. The Store edit dialog in settings/page.tsx and the invoice-series page are templates.

## Common Pitfalls

### Pitfall 1: Facturis Series Mismatch
**What goes wrong:** Local series name differs from Facturis series name, causing invoice creation failure
**Why it happens:** Series are created locally but must match Facturis exactly (case-sensitive)
**How to avoid:**
- Use `facturisSeries` field on InvoiceSeries model for the exact Facturis name
- Validate series exists in Facturis when configured (test invoice creation)
- Show clear error when series not found (code 1004)
**Warning signs:** Facturis error "Serie de facturare nu exista"

### Pitfall 2: Race Condition on Number Increment
**What goes wrong:** Two simultaneous invoices get same number
**Why it happens:** Non-atomic read-modify-write
**How to avoid:** Already solved - `getNextInvoiceNumber` uses Prisma transaction
**Warning signs:** Duplicate invoice numbers in Facturis

### Pitfall 3: Orphaned Store-Series Mappings
**What goes wrong:** Series deleted but stores still reference it
**Why it happens:** No cascade or validation on series deletion
**How to avoid:**
- Check for stores using series before deletion
- Auto-clear mappings when series deleted (per decision: "Auto-stergere mapari")
**Warning signs:** Invoice generation fails with "Serie inactiva"

### Pitfall 4: Missing Company Association
**What goes wrong:** Store has series but no company, or series belongs to different company than store
**Why it happens:** Inconsistent data from manual configuration
**How to avoid:**
- Validate that selected series belongs to store's company
- UI should only show series from store's associated company
**Warning signs:** Credential mismatch at Facturis API call

### Pitfall 5: Bulk Generation Progress Visibility
**What goes wrong:** User doesn't know status during bulk invoice generation
**Why it happens:** Long-running operation without feedback
**How to avoid:**
- Per decision: Progress bar during bulk generation
- Save failed invoices for later retry (failed invoices page)
**Warning signs:** User clicking multiple times, duplicate attempts

## Code Examples

### Example 1: Update Store with Series (API)
```typescript
// src/app/api/stores/[id]/route.ts
// Extend existing updateStore function

async function updateStore(request: NextRequest, storeId: string) {
  const body = await request.json();
  const { name, shopifyDomain, accessToken, isActive, companyId, invoiceSeriesId } = body;

  const updateData: any = {};

  // ... existing fields ...

  // Validate invoiceSeriesId belongs to store's company
  if (invoiceSeriesId !== undefined) {
    if (invoiceSeriesId === null) {
      updateData.invoiceSeriesId = null;
    } else {
      // Get store's company
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { companyId: true }
      });

      // Verify series belongs to same company
      const series = await prisma.invoiceSeries.findFirst({
        where: {
          id: invoiceSeriesId,
          companyId: store?.companyId,
          isActive: true,
        }
      });

      if (!series) {
        return NextResponse.json(
          { error: "Seria selectata nu apartine firmei magazinului sau este inactiva" },
          { status: 400 }
        );
      }

      updateData.invoiceSeriesId = invoiceSeriesId;
    }
  }

  const updatedStore = await prisma.store.update({
    where: { id: storeId },
    data: updateData,
    include: {
      company: { select: { id: true, name: true } },
      invoiceSeries: { select: { id: true, name: true, prefix: true } },
    },
  });

  return NextResponse.json({ store: updatedStore, success: true });
}
```

### Example 2: Store Configuration UI Enhancement
```tsx
// Add to settings/page.tsx - Edit Store Dialog
// Extend existing editingStore state and dialog

<DialogContent>
  <DialogHeader>
    <DialogTitle>Editare magazin</DialogTitle>
  </DialogHeader>

  <div className="grid gap-4 py-4">
    {/* Existing: Company selection */}
    <div className="grid gap-2">
      <Label>Firma de facturare</Label>
      <Select
        value={editStoreCompanyId || "none"}
        onValueChange={(value) => {
          setEditStoreCompanyId(value === "none" ? null : value);
          // Clear series when company changes
          setEditStoreSeriesId(null);
        }}
      >
        {/* ... existing options ... */}
      </Select>
    </div>

    {/* NEW: Series selection (only if company selected) */}
    {editStoreCompanyId && (
      <div className="grid gap-2">
        <Label>Serie de facturare</Label>
        <Select
          value={editStoreSeriesId || "default"}
          onValueChange={(value) => setEditStoreSeriesId(value === "default" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecteaza seria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <span className="text-muted-foreground">
                Foloseste seria default a firmei
              </span>
            </SelectItem>
            {seriesForCompany
              .filter(s => s.companyId === editStoreCompanyId && s.isActive)
              .map(series => (
                <SelectItem key={series.id} value={series.id}>
                  {series.prefix} - {series.name}
                  {series.isDefault && (
                    <Badge variant="outline" className="ml-2">Default</Badge>
                  )}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Toate facturile din acest magazin vor folosi aceasta serie
        </p>
      </div>
    )}
  </div>
</DialogContent>
```

### Example 3: Invoice Generation with Store Series
```typescript
// Modify src/lib/invoice-service.ts - issueInvoiceForOrder

export async function issueInvoiceForOrder(orderId: string): Promise<IssueInvoiceResult> {
  // ... existing code to get order ...

  // NEW: Get series from store first, then fallback to company
  let invoiceSeries = null;

  // Priority 1: Store-specific series
  if (order.store?.invoiceSeries && order.store.invoiceSeries.isActive) {
    invoiceSeries = order.store.invoiceSeries;
    console.log(`[Invoice] Using store series: ${invoiceSeries.prefix}`);
  }
  // Priority 2: Company default series (existing behavior)
  else if (company) {
    invoiceSeries = await getInvoiceSeriesForCompany(company.id);
    console.log(`[Invoice] Using company series: ${invoiceSeries?.prefix || 'none'}`);
  }

  if (!invoiceSeries) {
    return {
      success: false,
      error: `Magazinul ${order.store?.name || 'necunoscut'} nu are serie de facturare configurata. Mergi la Setari > Magazine pentru a configura.`,
      errorCode: "NO_SERIES",
    };
  }

  // ... rest of invoice generation ...
}
```

### Example 4: Mapping Overview Table
```tsx
// Add to settings/invoice-series/page.tsx

<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Table className="h-5 w-5" />
      Sumar mapari
    </CardTitle>
    <CardDescription>
      Configuratia curenta per magazin
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Magazin</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead>Serie</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stores.map(store => {
          const effectiveSeries = store.invoiceSeries
            || store.company?.invoiceSeries?.find(s => s.isDefault);
          const hasValidMapping = !!effectiveSeries && effectiveSeries.isActive;

          return (
            <TableRow key={store.id}>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell>
                {store.company?.name || (
                  <Badge variant="destructive">Neasociat</Badge>
                )}
              </TableCell>
              <TableCell>
                {effectiveSeries ? (
                  <span>{effectiveSeries.prefix} - {effectiveSeries.name}</span>
                ) : (
                  <Badge variant="destructive">Lipsa</Badge>
                )}
              </TableCell>
              <TableCell>
                {hasValidMapping ? (
                  <Badge variant="success">OK</Badge>
                ) : (
                  <Badge variant="destructive">Configureaza</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Example 5: Romanian Error Messages
```typescript
// src/lib/invoice-errors.ts

export const INVOICE_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "Comanda nu a fost gasita.",
  ALREADY_ISSUED: "Factura a fost deja emisa pentru aceasta comanda.",
  TRANSFER_PENDING: "Transferul de stoc nu a fost finalizat. Asteapta finalizarea transferului.",
  NO_COMPANY: "Magazinul nu are o firma de facturare asociata. Mergi la Setari > Magazine pentru a configura.",
  NO_CREDENTIALS: "Credentialele Facturis nu sunt configurate pentru firma. Mergi la Setari > Firme pentru a configura.",
  NO_FACTURIS_CIF: "CIF-ul Facturis nu este configurat pentru firma. Mergi la Setari > Firme pentru a configura.",
  NO_LINE_ITEMS: "Comanda nu are produse. Nu se poate emite factura fara articole.",
  NO_SERIES: "Nu exista serie de facturare configurata pentru acest magazin. Mergi la Setari > Magazine pentru a configura.",
  FACTURIS_ERROR: "Eroare la comunicarea cu Facturis. Incearca din nou.",
  FACTURIS_AUTH_ERROR: "Autentificare esuata la Facturis. Verifica credentialele in Setari > Firme.",
  FACTURIS_1004: "Seria de facturare nu exista in Facturis. Verifica ca seria configurata in ERP corespunde exact cu cea din contul Facturis (case-sensitive).",
  FACTURIS_UNAVAILABLE: "Facturis nu este disponibil momentan. Incearca din nou in cateva minute.",
};

export function getInvoiceErrorMessage(errorCode: string): string {
  return INVOICE_ERROR_MESSAGES[errorCode] || `Eroare necunoscuta: ${errorCode}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Series via Store.invoiceSeriesId only | Series from Company default | Existing | Store.invoiceSeriesId exists but not prioritized |
| Fetch series from Facturis | Track series locally | Current | Facturis has no series endpoint |

**Current state:** The codebase already has:
- `Store.invoiceSeriesId` field in schema (but not used in invoice generation)
- `InvoiceSeries.companyId` for company association
- UI for associating stores with series (in invoice-series page)
- `getInvoiceSeriesForCompany` function

**Gap:** Invoice generation uses `getInvoiceSeriesForCompany(company.id)` which ignores store-level series setting.

## Open Questions

1. **Facturis Series Validation**
   - What we know: Facturis API has no series listing endpoint
   - What's unclear: How to validate a series name exists in Facturis before first invoice
   - Recommendation: Test with a draft invoice or accept validation happens at first real invoice creation

2. **Failed Invoices Page Scope**
   - What we know: Decision requires page for retrying failed invoices
   - What's unclear: Exact data model for tracking failed invoice attempts
   - Recommendation: Add `FailedInvoiceAttempt` model or use existing `ProcessingError` table

3. **Series Sync from Facturis**
   - What we know: Decision wants auto-fetch at settings page load + manual refresh
   - What's unclear: Facturis has no endpoint - can only extract from existing invoices
   - Recommendation: Show series from local DB, allow manual creation to match Facturis

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/facturis.ts`, `src/lib/invoice-service.ts`, `src/lib/invoice-series.ts`
- Codebase analysis: `prisma/schema.prisma` - Store, InvoiceSeries, Company models
- Phase 1 audit: `.planning/phases/01-system-audit/audit-output/flows/order-to-delivery.md`
- Phase context: `.planning/phases/02-invoice-series-fix/02-CONTEXT.md`

### Secondary (MEDIUM confidence)
- WebFetch Facturis API docs (https://facturis-online.ro/apidoc/) - Confirmed NO series endpoint exists

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Extending existing patterns with minimal changes
- Pitfalls: HIGH - Based on actual code review and existing error handling

**Research date:** 2026-01-24
**Valid until:** 90 days (stable domain, no external API changes expected)
