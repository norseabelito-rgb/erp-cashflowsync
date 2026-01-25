# Phase 3: Internal Settlement - Research

**Researched:** 2026-01-25
**Domain:** Internal business settlement, invoicing integration, order aggregation
**Confidence:** HIGH

## Summary

This phase implements the internal settlement (decontare interna) flow for tracking orders from secondary company stores and settling them weekly via internal invoicing from Aquaterra (primary company) to secondary companies.

The codebase already has substantial backend infrastructure:
- `intercompany-service.ts` with core functions (`generateSettlementPreview`, `generateIntercompanyInvoice`, `runWeeklySettlement`)
- Database models (`IntercompanyInvoice`, `IntercompanyOrderLink`)
- API routes (`/api/intercompany/preview`, `/api/intercompany/generate`, `/api/intercompany/invoices`)
- Basic UI page at `/intercompany`

**Key gaps to address:**
1. Price calculation uses order prices, not acquisition prices (costPrice) + markup
2. No integration with Oblio for internal invoice generation (currently internal-only tracking)
3. No order selection workflow (currently all-or-nothing per company)
4. Missing warnings for products without acquisition price
5. No configurable markup per company (uses hardcoded fallback)

**Primary recommendation:** Extend existing infrastructure rather than rebuild. Focus on: (1) switching price calculation to use `InventoryItem.costPrice`, (2) adding order selection UI with pre-selection, (3) integrating Oblio for actual invoice generation, (4) adding company-specific markup configuration.

## Standard Stack

The phase uses the project's established stack - no new libraries needed.

### Core (Existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 5.10.2 | Database ORM | Already used throughout codebase |
| Next.js | 14.1.3 | API routes + React | Project framework |
| React Query | 5.28.0 | Server state management | Pattern for all data fetching |
| Radix UI | 1.x-2.x | UI components | Project-wide component library |
| date-fns | 3.3.1 | Date manipulation | Used for period calculations |

### Supporting (Existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Oblio API | custom client | Invoice generation | For actual invoice creation |
| Zod | 3.22.4 | Validation | Request body validation |

### No New Dependencies Needed
The existing stack handles all requirements. Key existing utilities:
- `createOblioClient()` - Create Oblio API client per company
- `createOblioInvoiceItem()` - Format line items for Oblio
- `formatDateForOblio()` - Date formatting

## Architecture Patterns

### Recommended Project Structure

All new code fits into existing structure:

```
src/
├── lib/
│   └── intercompany-service.ts  # EXTEND - add costPrice calculation
├── app/
│   ├── api/
│   │   └── intercompany/
│   │       ├── preview/route.ts     # EXTEND - add order selection
│   │       ├── generate/route.ts    # EXTEND - Oblio integration
│   │       ├── eligible-orders/route.ts  # NEW - fetch eligible orders
│   │       └── invoices/[id]/
│   │           └── oblio/route.ts   # NEW - generate Oblio invoice
│   └── (dashboard)/
│       └── intercompany/
│           └── page.tsx             # EXTEND - order selection UI
└── prisma/
    └── schema.prisma                # EXTEND - add fields
```

### Pattern 1: Settlement Model

**What:** The Settlement model tracks a decontare session with linked orders
**When to use:** Every time internal settlement is performed

Current schema (sufficient, extend slightly):
```prisma
model IntercompanyInvoice {
  id                String   @id @default(cuid())
  issuedByCompanyId   String
  receivedByCompanyId String
  periodStart       DateTime
  periodEnd         DateTime
  invoiceNumber     String   @unique  // Internal: IC-YYYY-XXXXX
  totalValue        Decimal  @db.Decimal(12, 2)
  totalItems        Int
  status            String   @default("pending")  // pending, issued, paid
  lineItems         Json     // Aggregated products

  // NEW: Link to Oblio invoice
  oblioInvoiceId    String?  // Oblio reference after generation
  oblioSeriesName   String?  // e.g., "DEC" or "DECONT"
  oblioInvoiceNumber String?

  includedOrders    IntercompanyOrderLink[]
}

model IntercompanyOrderLink {
  id                    String   @id @default(cuid())
  orderId               String   @unique
  intercompanyInvoiceId String?
  status                String   @default("pending")

  // Already has: orderValue, costValue, intercompanyValue
  // These can store the calculated values
}
```

### Pattern 2: Price Calculation Flow

**What:** Calculate settlement value from acquisition prices
**When to use:** During preview and invoice generation

```typescript
// Current (WRONG): Uses order.totalPrice
// NEW (CORRECT): Uses InventoryItem.costPrice

async function calculateSettlementValue(orders: OrderWithItems[]) {
  const productMap = new Map<string, AggregatedProduct>();
  const warnings: string[] = [];

  for (const order of orders) {
    for (const lineItem of order.lineItems) {
      // Get acquisition price from InventoryItem
      const inventoryItem = await getInventoryItemBySku(lineItem.sku);
      const costPrice = inventoryItem?.costPrice;

      if (!costPrice) {
        warnings.push(`${lineItem.sku}: Pret achizitie lipsa`);
      }

      // Aggregate by SKU
      const key = lineItem.sku || lineItem.title;
      // ... accumulate quantities and values
    }
  }

  // Apply markup to total
  const markup = company.intercompanyMarkup || 10;
  const total = subtotal * (1 + markup / 100);

  return { productMap, subtotal, markup, total, warnings };
}
```

### Pattern 3: Oblio Invoice Integration

**What:** Generate actual invoice in Oblio
**When to use:** After settlement preview is confirmed

```typescript
// Reuse existing Oblio patterns from invoice-service.ts
async function generateOblioIntercompanyInvoice(settlementId: string) {
  const settlement = await prisma.intercompanyInvoice.findUnique({...});
  const receivingCompany = settlement.receivedByCompany;
  const issuingCompany = settlement.issuedByCompany; // Aquaterra

  const oblio = createOblioClient(issuingCompany);

  const invoiceData: OblioInvoiceData = {
    cif: issuingCompany.oblioCif,
    seriesName: "DEC", // Dedicated series for settlements
    client: {
      name: receivingCompany.name,
      cif: receivingCompany.cif,
      // ... other company details
    },
    products: settlement.lineItems.map(item => createOblioInvoiceItem({
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      price: item.unitCost * (1 + settlement.markup / 100),
      vatRate: 19,
    })),
    mentions: `Decontare perioada ${format(periodStart)} - ${format(periodEnd)}. Comenzi: ${orderNumbers.join(', ')}`,
  };

  return oblio.createInvoice(invoiceData);
}
```

### Anti-Patterns to Avoid

- **Calculating prices on the fly without caching:** Store calculated values in IntercompanyOrderLink
- **Hard-coding markup:** Always read from Company.intercompanyMarkup
- **Skipping validation:** Always check for missing costPrice before invoice generation
- **Direct DB queries in components:** Use React Query with dedicated API endpoints

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invoice numbering | Custom sequence | Oblio auto-numbering | Oblio manages series; just use dedicated series name |
| PDF generation | pdf-lib custom | Oblio PDF download | Oblio generates compliant PDFs |
| Order aggregation | Manual loops | SQL GROUP BY + Prisma | More efficient for large datasets |
| Date filtering | Custom parsing | date-fns | Handles timezones correctly |

**Key insight:** The existing `intercompany-service.ts` has good structure. Extend it rather than replacing.

## Common Pitfalls

### Pitfall 1: Using Order Price Instead of Acquisition Price
**What goes wrong:** Settlement uses order.totalPrice instead of product costPrice
**Why it happens:** Current implementation in `generateSettlementPreview` sums line item prices
**How to avoid:** Lookup InventoryItem.costPrice for each product by SKU
**Warning signs:** Settlement amounts match customer invoice amounts

### Pitfall 2: Missing Acquisition Prices
**What goes wrong:** Products without costPrice break calculations or silently use 0
**Why it happens:** InventoryItem.costPrice is optional (nullable)
**How to avoid:**
1. Check for null costPrice during preview
2. Show warning in UI for affected products
3. Block invoice generation if critical products lack pricing
**Warning signs:** Settlement totals seem too low

### Pitfall 3: Float Precision in Financial Calculations
**What goes wrong:** Rounding errors accumulate
**Why it happens:** JavaScript float math
**How to avoid:** Use Decimal.js or multiply by 100, work in cents, divide at end
**Warning signs:** Totals don't match line item sums

### Pitfall 4: Online Paid Orders Included Incorrectly
**What goes wrong:** Online-paid orders treated same as COD
**Why it happens:** Not checking financialStatus
**How to avoid:**
1. Include online-paid orders in settlement
2. Mark them differently (already collected)
3. Consider if they need different handling
**Warning signs:** Settlement includes orders where payment was already received

### Pitfall 5: Duplicate Settlements
**What goes wrong:** Same order included in multiple settlements
**Why it happens:** Race conditions or missing status checks
**How to avoid:** Use database transaction when creating settlement links
**Warning signs:** Order appears in multiple IntercompanyOrderLink records

## Code Examples

### Example 1: Get Eligible Orders with Payment Status
```typescript
// Source: Existing pattern in intercompany-service.ts
async function getEligibleOrdersForSettlement(
  companyId: string,
  options?: { fromDate?: Date; toDate?: Date }
) {
  const orders = await prisma.order.findMany({
    where: {
      billingCompanyId: companyId,
      intercompanyStatus: "pending",
      // COD orders: AWB collected
      // OR Online-paid: financialStatus = 'paid'
      OR: [
        { awb: { isCollected: true } },
        { financialStatus: "paid" }, // Online payment
      ],
      invoice: {
        issuedAt: options?.fromDate || options?.toDate ? {
          gte: options?.fromDate,
          lte: options?.toDate,
        } : undefined,
      },
    },
    include: {
      lineItems: {
        include: {
          masterProduct: {
            include: {
              inventoryItem: true, // For costPrice
            },
          },
        },
      },
      awb: { select: { isCollected: true } },
    },
  });

  return orders.map(order => ({
    ...order,
    paymentType: order.awb?.isCollected ? "cod" : "online",
    isAlreadyCollected: order.financialStatus === "paid",
  }));
}
```

### Example 2: Calculate Acquisition Price Total
```typescript
// Source: New pattern based on existing structure
interface AggregatedProduct {
  sku: string;
  title: string;
  quantity: number;
  totalCostPrice: number;  // Sum of (costPrice * quantity)
  hasCostPrice: boolean;
}

async function aggregateProductsWithCostPrice(
  orders: OrderWithLineItems[]
): Promise<{
  products: AggregatedProduct[];
  subtotal: number;
  warnings: string[];
}> {
  const productMap = new Map<string, AggregatedProduct>();
  const warnings: string[] = [];

  // Get all unique SKUs
  const skus = new Set<string>();
  for (const order of orders) {
    for (const item of order.lineItems) {
      if (item.sku) skus.add(item.sku);
    }
  }

  // Batch fetch inventory items
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { sku: { in: Array.from(skus) } },
    select: { sku: true, costPrice: true },
  });
  const costPriceMap = new Map(
    inventoryItems.map(i => [i.sku, i.costPrice ? Number(i.costPrice) : null])
  );

  // Aggregate
  for (const order of orders) {
    for (const item of order.lineItems) {
      const key = item.sku || item.title;
      const costPrice = costPriceMap.get(item.sku || "");

      if (!costPrice) {
        warnings.push(`${item.sku || item.title}: Pret achizitie lipsa`);
      }

      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalCostPrice += (costPrice || 0) * item.quantity;
        existing.hasCostPrice = existing.hasCostPrice && !!costPrice;
      } else {
        productMap.set(key, {
          sku: item.sku || "N/A",
          title: item.title,
          quantity: item.quantity,
          totalCostPrice: (costPrice || 0) * item.quantity,
          hasCostPrice: !!costPrice,
        });
      }
    }
  }

  const products = Array.from(productMap.values());
  const subtotal = products.reduce((sum, p) => sum + p.totalCostPrice, 0);

  return { products, subtotal, warnings };
}
```

### Example 3: Settlement Preview with Selection
```typescript
// Source: Extended from existing generateSettlementPreview
interface SettlementPreviewExtended {
  companyId: string;
  companyName: string;
  companyMarkup: number;

  orders: Array<{
    id: string;
    orderNumber: string;
    date: Date;
    client: string;
    productCount: number;
    orderTotal: number;      // What customer paid
    costTotal: number;       // Acquisition price total
    paymentType: "cod" | "online";
    selected: boolean;       // For UI selection
  }>;

  lineItems: Array<{
    sku: string;
    title: string;
    quantity: number;
    unitCost: number;        // Acquisition price per unit
    lineTotal: number;       // quantity * unitCost
    hasCostPrice: boolean;
  }>;

  totals: {
    orderCount: number;
    subtotal: number;        // Sum of acquisition prices
    markupPercent: number;
    markupAmount: number;
    total: number;           // Final with markup
  };

  warnings: string[];        // Products without costPrice
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Facturis API | Oblio API | Phase 2 (02-05) | Use Oblio for all invoicing |
| Manual number tracking | Oblio auto-numbering | Phase 2 | Let Oblio manage series numbers |
| lineItem.price for settlement | InventoryItem.costPrice | This phase | Correct business logic |

**Deprecated/outdated:**
- Facturis integration: Replaced by Oblio in Phase 2
- Local InvoiceSeries for intercompany: Use Oblio series directly

## Open Questions

1. **Oblio Series Name for Settlements**
   - What we know: Need dedicated series (e.g., "DEC", "DECONT")
   - What's unclear: Must be pre-created in Oblio by user
   - Recommendation: Document series creation in Oblio, store series name in Company model

2. **VAT Handling for Internal Invoices**
   - What we know: B2B invoices between Romanian companies need VAT
   - What's unclear: Are internal settlements taxable? Same 19% rate?
   - Recommendation: Apply standard VAT rate (19%) unless business specifies otherwise

3. **Product Grouping Strategy**
   - What we know: Decision says "one line per product, grouped across orders"
   - What's unclear: Group by exact SKU only, or by title if SKU missing?
   - Recommendation: Group by SKU when available, fall back to title

## Sources

### Primary (HIGH confidence)
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/src/lib/intercompany-service.ts` - Existing implementation
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/src/lib/invoice-service.ts` - Oblio integration pattern
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/src/lib/oblio.ts` - Oblio API client
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/prisma/schema.prisma` - Data models

### Secondary (MEDIUM confidence)
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/.planning/phases/03-internal-settlement/03-CONTEXT.md` - User decisions
- `/Users/stefanpanaite/Documents/GitHub/erp-cashflowsync/.planning/phases/01-system-audit/audit-output/flows/internal-settlement.md` - Flow documentation

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies only
- Architecture: HIGH - Extends existing patterns, verified against codebase
- Pitfalls: HIGH - Identified from code analysis and business requirements

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain, no external API changes expected)
