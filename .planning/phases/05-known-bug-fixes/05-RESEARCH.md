# Phase 5: Known Bug Fixes - Research

**Researched:** 2026-01-25
**Domain:** Bug fixes for existing ERP functionality (image sync, SKU dropdown, order details, notifications, invoice series)
**Confidence:** HIGH

## Summary

Phase 5 addresses five documented bugs from the codebase audit (CONCERNS.md). These are straightforward fixes to existing functionality rather than new features. The codebase already has the necessary patterns and components in place; the bugs stem from incomplete implementation or missing edge case handling.

Key findings:
- **Image sync** (Bug 1): Currently deletes all images then recreates - works but inefficient. The decision to skip existing images requires comparing URLs before insert.
- **SKU dropdown** (Bug 2): The `excludeMapped` filter exists and works at API level (line 68-69 in inventory-items route). Bug is that it only checks MasterProduct mapping, not which products own which SKUs. Needs grouped UI with "already assigned" section.
- **Order details** (Bug 3): LineItems are already fetched and rendered (orders/page.tsx lines 1948-1971). The table view exists but needs transformation to card layout per decisions.
- **Notification dedup** (Bug 4): AdsWebhookEvent model exists with eventType/objectId fields. Need to add unique key field for Facebook event ID and check before creating notifications.
- **Invoice series** (Bug 5): Auto-correct logic exists but only handles `< 1` case. Need to handle additional edge cases idempotently.

**Primary recommendation:** These are isolated bug fixes that can be implemented independently. Each fix should be testable in isolation and not affect other functionality.

## Standard Stack

No new libraries required. All fixes use existing patterns:

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^5.10.2 | Database ORM | Existing schema, transactions, unique constraints |
| React Query | ^5.28.0 | Data fetching | Existing mutation/query patterns |
| Radix UI | Various | UI components | Progress, Collapsible, Command already imported |
| Zod | ^3.22.4 | Validation | Schema validation for edge cases |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-progress | ^1.0.3 | Progress indicator | Image sync progress display |
| @radix-ui/react-collapsible | ^1.0.3 | Grouped sections | SKU dropdown assigned section |
| lucide-react | ^0.344.0 | Icons | Warning icons, product icons |

### No Additional Dependencies Needed
All five bugs can be fixed with existing libraries and patterns.

## Architecture Patterns

### Pattern 1: Idempotent Upsert for Image Sync

**What:** Check if image URL exists before creating, skip duplicates
**When to use:** Any sync operation that may run multiple times
**Example:**
```typescript
// Pattern from existing codebase (sync-images/route.ts)
// Current: delete all + recreate
// New: check exists + skip

// Use Prisma upsert or conditional create
const existingImage = await prisma.masterProductImage.findFirst({
  where: {
    productId: product.id,
    url: imageUrl  // Check by URL, not position
  }
});

if (!existingImage) {
  await prisma.masterProductImage.create({
    data: {
      productId: product.id,
      url: imageUrl,
      filename: driveImg.name,
      position: nextPosition,
      driveFileId: driveImg.id,
    }
  });
  added++;
} else {
  skipped++;
}
```

### Pattern 2: Grouped Command Menu for SKU Dropdown

**What:** Two CommandGroups - "Available" and "Already Assigned" (collapsed)
**When to use:** Selection UI where some options are informational only
**Example:**
```typescript
// Pattern from existing products/page.tsx Command usage
<Command shouldFilter={false}>
  <CommandInput placeholder="Search SKU..." />
  <CommandList>
    <CommandGroup heading="Available">
      {availableItems.map(item => (
        <CommandItem onSelect={() => handleSelect(item)}>
          {item.sku} - {item.name}
        </CommandItem>
      ))}
    </CommandGroup>
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger asChild>
        <CommandGroup heading="Already Assigned" className="opacity-60">
          <ChevronDown className="h-4 w-4" />
        </CommandGroup>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {assignedItems.map(item => (
          <CommandItem disabled className="cursor-not-allowed">
            {item.sku} - {item.name}
            <Link to={`/products/${item.productId}`}>
              View Product
            </Link>
          </CommandItem>
        ))}
      </CollapsibleContent>
    </Collapsible>
  </CommandList>
</Command>
```

### Pattern 3: Card-based Line Item Display

**What:** Order line items as cards instead of table rows
**When to use:** Visual-heavy displays with multiple data points and actions
**Example:**
```typescript
// Existing table pattern in orders/page.tsx, transform to cards
<div className="grid gap-3">
  {lineItems.map(item => (
    <Card key={item.id} className="p-4">
      <div className="flex gap-4">
        {item.imageUrl && (
          <img src={item.imageUrl} className="w-16 h-16 object-cover rounded" />
        )}
        <div className="flex-1">
          <h4 className="font-medium">{item.title}</h4>
          {item.variantTitle && <p className="text-sm text-muted">{item.variantTitle}</p>}
          <p className="font-mono text-xs">{item.sku || '-'}</p>
        </div>
        <div className="text-right">
          <p>{item.quantity}x</p>
          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline">View Product</Button>
        <Button size="sm" variant="outline">Check Stock</Button>
      </div>
    </Card>
  ))}
</div>
```

### Pattern 4: Webhook Event Deduplication

**What:** Store unique event ID from Facebook, check before processing
**When to use:** Any webhook that may fire multiple times for same event
**Example:**
```typescript
// In Meta webhook route, before creating notifications
// Facebook provides unique event identifiers in webhook payloads

// Add field to AdsWebhookEvent model
// externalEventId String? @unique

// Check before processing
const existing = await prisma.adsWebhookEvent.findFirst({
  where: {
    platform: "META",
    externalEventId: facebookEventId,
  }
});

if (existing) {
  console.log(`[Meta Webhook] Duplicate event ${facebookEventId}, skipping`);
  return; // Silent skip per decisions
}

// Create event with dedup key
await prisma.adsWebhookEvent.create({
  data: {
    platform: "META",
    eventType,
    objectId,
    externalEventId: facebookEventId, // Store for dedup
    payload: value,
  }
});
```

### Pattern 5: Idempotent Invoice Series Correction

**What:** Handle all edge cases in getNextInvoiceNumber with proper guards
**When to use:** Any counter/sequence generation that may be called multiple times
**Example:**
```typescript
// Expand existing auto-correct in invoice-series.ts
// Current: handles < 1 case only
// New: handle all edge cases idempotently

let currentNumber = series.currentNumber;
let correctionApplied = false;

// Case 1: Negative or zero (existing)
if (currentNumber < 1) {
  currentNumber = Math.max(1, series.startNumber || 1);
  correctionApplied = true;
}

// Case 2: Below startNumber (new)
if (currentNumber < series.startNumber) {
  currentNumber = series.startNumber;
  correctionApplied = true;
}

// Case 3: Detect gaps by checking last issued invoice (new)
const lastInvoice = await tx.invoice.findFirst({
  where: { seriesId: series.id },
  orderBy: { invoiceNumber: 'desc' },
});
if (lastInvoice && lastInvoice.invoiceNumber >= currentNumber) {
  currentNumber = lastInvoice.invoiceNumber + 1;
  correctionApplied = true;
}

// Only update DB if correction was needed (idempotent)
if (correctionApplied) {
  await tx.invoiceSeries.update({
    where: { id: seriesId },
    data: { currentNumber },
  });
}
```

### Anti-Patterns to Avoid

- **Delete-all-recreate for sync:** Current image sync pattern; wasteful and loses metadata. Use upsert or conditional create instead.
- **Client-side filtering for available items:** CONCERNS.md notes the SKU dropdown bug is that filtering happens wrong. Keep `excludeMapped` server-side but also return mapping info for grouped display.
- **Multiple notifications without dedup key:** Current webhook creates notifications for every payload. Always store and check external event ID first.
- **Non-transactional sequence operations:** Invoice number generation must stay in transaction to prevent race conditions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress indicator | Custom percentage calculation | @radix-ui/react-progress | Already imported, handles accessibility |
| Grouped dropdown | Custom accordion in Command | Collapsible + CommandGroup | Existing pattern, keyboard navigation |
| Unique constraint check | Manual SELECT + INSERT | Prisma upsert or findFirst | Handles race conditions properly |
| Event deduplication | Time-window based | Unique constraint on externalEventId | Simpler, database enforced |
| Card layout | Custom flex containers | Card component with variants | Consistent styling, hover states |

**Key insight:** The codebase already has all necessary UI components. These bugs are logic/data issues, not missing infrastructure.

## Common Pitfalls

### Pitfall 1: Image Position Collision on Re-sync
**What goes wrong:** Adding new images without considering existing positions causes unique constraint violations
**Why it happens:** `@@unique([productId, position])` constraint in schema
**How to avoid:**
- Option A (per decisions): Skip existing URLs entirely
- Option B: Calculate next available position after existing images
- Always check existing images BEFORE assigning positions
**Warning signs:** P2002 unique constraint error on `master_product_images`

### Pitfall 2: SKU Dropdown Performance with Large Inventory
**What goes wrong:** Loading all inventory items + all assigned mappings causes slow render
**Why it happens:** O(n*m) comparison if done client-side
**How to avoid:**
- Server returns pre-grouped data (available vs assigned)
- Or: Add `assignedToProductId` field to inventory items query response
- Limit results, use search filter
**Warning signs:** Dropdown lag > 500ms, memory warnings in console

### Pitfall 3: Missing LineItem Images in Order Detail
**What goes wrong:** LineItem.imageUrl is often null because it's not populated at order sync time
**Why it happens:** Shopify order sync doesn't always include product images in line item data
**How to avoid:**
- Fall back to MasterProduct image via SKU lookup
- Show placeholder when no image available
- Don't make image required for card display
**Warning signs:** Most cards show no image despite products having images

### Pitfall 4: Facebook Webhook Payload Structure Varies
**What goes wrong:** Expecting consistent event ID location in payload
**Why it happens:** Different webhook event types have different structures
**How to avoid:**
- Extract event ID from multiple possible locations (entry.id, changes[].id, value.id)
- Fall back to generated hash of payload if no explicit ID
- Log payloads during testing to verify structure
**Warning signs:** Dedup not working for certain event types

### Pitfall 5: Invoice Series Correction Loop
**What goes wrong:** Auto-correct sets number, then next call re-reads and corrects again
**Why it happens:** Not checking if correction already happened
**How to avoid:**
- Make correction idempotent (same input = same output)
- Only update if value actually changes
- Add logging to detect repeated corrections
**Warning signs:** Console shows multiple "Auto-corectie" logs for same series

### Pitfall 6: Empty Order LineItems Array vs Missing
**What goes wrong:** Showing "no line items" warning when data just wasn't fetched
**Why it happens:** Not distinguishing between `lineItems: []` and `lineItems: undefined`
**How to avoid:**
- Check if lineItems was included in query (explicit field)
- Only show warning for `lineItems.length === 0` when data loaded
- Show loading state while fetching
**Warning signs:** Warning shows then disappears on re-render

## Code Examples

### Example 1: Efficient Image Sync with Skip Logic
```typescript
// Source: Derived from existing sync-images/route.ts pattern
async function syncProductImages(
  productId: string,
  driveImages: DriveFile[],
  onProgress: (synced: number, total: number) => void
): Promise<{ added: number; skipped: number; errors: string[] }> {
  const existing = await prisma.masterProductImage.findMany({
    where: { productId },
    select: { url: true, position: true }
  });

  const existingUrls = new Set(existing.map(img => img.url));
  let nextPosition = Math.max(0, ...existing.map(img => img.position)) + 1;

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < driveImages.length; i++) {
    const driveImg = driveImages[i];
    const imageUrl = getPublicImageUrl(driveImg.id);

    if (existingUrls.has(imageUrl)) {
      skipped++;
      onProgress(i + 1, driveImages.length);
      continue;
    }

    try {
      await prisma.masterProductImage.create({
        data: {
          productId,
          url: imageUrl,
          filename: driveImg.name,
          position: nextPosition++,
          driveFileId: driveImg.id,
          driveModified: driveImg.modifiedTime ? new Date(driveImg.modifiedTime) : null,
        }
      });
      added++;
    } catch (error) {
      errors.push(`Failed to add ${driveImg.name}: ${error.message}`);
    }

    onProgress(i + 1, driveImages.length);
  }

  return { added, skipped, errors };
}
```

### Example 2: API Response with Grouped Inventory Items
```typescript
// Source: Extend existing inventory-items/route.ts
// Return both available and assigned items with mapping info

interface GroupedInventoryResponse {
  available: InventoryItem[];
  assigned: (InventoryItem & {
    assignedTo: { productId: string; productName: string; }
  })[];
}

// In GET handler, instead of filtering out mapped items:
const [availableItems, assignedItems] = await Promise.all([
  prisma.inventoryItem.findMany({
    where: {
      ...baseWhere,
      mappedProducts: { none: {} }
    },
  }),
  prisma.inventoryItem.findMany({
    where: {
      ...baseWhere,
      mappedProducts: { some: {} }
    },
    include: {
      mappedProducts: {
        select: {
          id: true,
          title: true,
        },
        take: 1,
      }
    }
  })
]);

return NextResponse.json({
  success: true,
  data: {
    available: availableItems,
    assigned: assignedItems.map(item => ({
      ...item,
      assignedTo: item.mappedProducts[0]
        ? { productId: item.mappedProducts[0].id, productName: item.mappedProducts[0].title }
        : null
    }))
  }
});
```

### Example 3: Webhook Deduplication with Fallback
```typescript
// Source: Extend existing webhooks/meta/route.ts
function extractEventId(entry: any, change: any): string {
  // Try multiple locations for event ID
  // Facebook provides different structures per event type
  return (
    change.value?.id ||           // Most common location
    entry.id + '_' + change.field || // Composite key fallback
    crypto.createHash('md5')
      .update(JSON.stringify({ entry: entry.id, change }))
      .digest('hex')             // Hash fallback for guaranteed uniqueness
  );
}

// In POST handler, before processWebhookEvent:
for (const entry of entries) {
  for (const change of changes) {
    const eventId = extractEventId(entry, change);

    // Check for duplicate
    const existing = await prisma.adsWebhookEvent.findFirst({
      where: { externalEventId: eventId }
    });

    if (existing) {
      console.log(`[Meta Webhook] Duplicate event ${eventId}, skipping`);
      continue; // Silent skip per decisions
    }

    // Save event with dedup key
    await prisma.adsWebhookEvent.create({
      data: {
        platform: "META",
        eventType: change.field,
        objectId: entry.id,
        externalEventId: eventId, // NEW field for dedup
        payload: change.value,
      }
    });

    await processWebhookEvent(change.field, entry.id, change.value);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Delete-all sync | Incremental upsert | Industry standard | Preserves metadata, faster |
| Client-side filter | Server-side with grouped response | Best practice | Better performance, UX |
| Webhook fire-and-forget | Idempotent with dedup | Always been best practice | Prevents spam, reliable |

**Deprecated/outdated:**
- None - these are bug fixes, not technology updates

## Open Questions

1. **Image sync progress indicator placement**
   - What we know: Decision says "live progress indicator during sync"
   - What's unclear: Toast? Modal? Inline in settings?
   - Recommendation: Claude's discretion - suggest inline with Progress component near sync button

2. **Stock check quick action implementation**
   - What we know: Decision says "Quick actions available per line item: view product, check stock"
   - What's unclear: What does "check stock" do? Modal? Navigate? Tooltip?
   - Recommendation: Claude's discretion - suggest tooltip showing current stock from InventoryItem

3. **Facebook event ID extraction reliability**
   - What we know: Facebook webhook payloads vary by event type
   - What's unclear: All possible ID locations in real payloads
   - Recommendation: Implement with fallback hash; monitor logs in production

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `prisma/schema.prisma` - MasterProductImage model with unique constraints
- Codebase analysis: `src/app/api/products/sync-images/route.ts` - Current sync implementation
- Codebase analysis: `src/app/api/inventory-items/route.ts` - excludeMapped filter (lines 68-69)
- Codebase analysis: `src/app/(dashboard)/orders/page.tsx` - LineItems table (lines 1948-1971)
- Codebase analysis: `src/app/api/webhooks/meta/route.ts` - Current webhook handler
- Codebase analysis: `src/lib/invoice-series.ts` - Auto-correct logic
- Codebase analysis: `.planning/codebase/CONCERNS.md` - Bug documentation

### Secondary (MEDIUM confidence)
- Codebase analysis: Existing UI components (Progress, Card, Collapsible, Command)
- Phase context: `05-CONTEXT.md` - User decisions on behavior

### Tertiary (LOW confidence)
- Facebook webhook payload structure - varies by event type, needs production validation

## Metadata

**Confidence breakdown:**
- Image sync fix: HIGH - Clear pattern, simple logic change
- SKU dropdown fix: HIGH - API already has filter, UI change straightforward
- Order detail fix: HIGH - Data already fetched, UI transformation only
- Notification dedup: MEDIUM - Facebook payload structure varies
- Invoice series fix: MEDIUM - Edge cases need careful testing

**Research date:** 2026-01-25
**Valid until:** 60+ days (bug fixes to stable patterns)
