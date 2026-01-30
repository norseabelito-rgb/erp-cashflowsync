# Phase 7.1 Context: Trendyol Complete Integration

## Overview

This phase completes the Trendyol integration to achieve feature parity with Shopify. The goal is to have Trendyol orders flow through the same invoice/AWB workflow as Shopify orders.

## Current State (Pre-Phase)

### What Exists (~60-70% complete)

**API Client** (`src/lib/trendyol.ts` - 1068 lines):
- Full TrendyolClient class with Basic Auth
- Browser headers for Cloudflare bypass
- Auto-detection of storeFrontCode (RO, DE, BG, HU, CZ, PL, GR)
- All product endpoints: create, update, delete, updatePriceAndInventory
- Order endpoints: getOrders, updateTrackingNumber, sendInvoiceLink
- Category/brand/attribute endpoints

**Database Models** (Prisma):
- `TrendyolOrder` - synced orders with customer/shipping info
- `TrendyolOrderItem` - order line items with product mapping
- `TrendyolProduct` - product catalog sync
- `TrendyolProductMapping` - barcode/SKU mappings
- `TrendyolCampaign`, `TrendyolCampaignProduct` - campaign support
- Settings fields: supplierId, apiKey, apiSecret, testMode, currencyRate, storeFrontCode

**UI Pages**:
- `/trendyol` - Product listing with status filters
- `/trendyol/mapping` - Category mapping with TR→RO translation
- `/trendyol/publish` - Product publishing with brand selection
- `/trendyol/orders` - Order listing (standalone, not integrated)
- `/settings` - Trendyol configuration tab

### What's Missing

1. **Webhook receiver** - No endpoint for real-time notifications
2. **Order integration** - TrendyolOrder doesn't create main Order records
3. **Invoice feedback** - sendInvoiceLink() not called after Oblio
4. **AWB feedback** - updateTrackingNumber() not called after AWB
5. **Stock sync** - No automatic sync when products update
6. **Company association** - No multi-company support for Trendyol

## Target State (Post-Phase)

1. Webhook endpoint receives Trendyol events in real-time
2. Trendyol orders appear in main Order list with "trendyol" source
3. Invoice generation automatically sends link to Trendyol
4. AWB generation automatically sends tracking to Trendyol
5. Product stock/price changes sync to Trendyol automatically
6. Each Trendyol account is linked to a specific company

## Technical Decisions

### Order Integration Strategy

**Decision**: Reuse `shopifyOrderId` field for Trendyol orders, add `source` field
- Avoids major schema migration
- Allows unified queries with simple source filter
- TrendyolOrder links to Order via existing `orderId` field

### Webhook Validation

**Decision**: HMAC-SHA256 signature validation
- Standard webhook security pattern
- `trendyolWebhookSecret` stored in Settings
- Timing-safe comparison to prevent timing attacks

### Company Association

**Decision**: Add `trendyolCompanyId` to Settings
- Links Trendyol account to a Company
- Orders inherit company for invoice series selection
- AWBs use company's courier credentials

### Currency Handling

**Decision**: Convert RON ↔ EUR using `trendyolCurrencyRate`
- Trendyol International uses EUR
- ERP uses RON internally
- Rate configurable in Settings (default: 5.0)

## Wave Structure

| Wave | Plans | Focus |
|------|-------|-------|
| 1 | 07.1-01 | Webhook receiver, company association |
| 2 | 07.1-02 | Order table integration |
| 3 | 07.1-03, 07.1-04 | Invoice/AWB feedback (parallel) |
| 4 | 07.1-05 | Stock/price sync automation |
| 5 | 07.1-06 | Dashboard, gap closure |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/trendyol.ts` | API client (existing) |
| `src/lib/trendyol-status.ts` | Status mapping (existing) |
| `src/lib/trendyol-order-sync.ts` | Order sync service (new) |
| `src/lib/trendyol-invoice.ts` | Invoice feedback (new) |
| `src/lib/trendyol-awb.ts` | AWB feedback (new) |
| `src/lib/trendyol-stock-sync.ts` | Stock sync (new) |
| `src/app/api/trendyol/webhook/route.ts` | Webhook endpoint (new) |

## Dependencies

- Oblio integration (Phase 2) - for invoice link generation
- AWB generation (existing) - for tracking number
- Settings page (existing) - for configuration UI
- Order page (existing) - for unified display

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Trendyol API rate limits | Sync failures | Batch updates, retry with backoff |
| Webhook missed events | Lost orders | Manual sync button as backup |
| Currency conversion drift | Wrong prices | Daily rate update, alerts |
| Carrier name mismatch | Tracking not sent | Mapping table, fallback to "Other" |

## Success Metrics

1. Orders appear in main list within 5 seconds of Trendyol creation
2. Invoice link sent to Trendyol within 1 minute of Oblio creation
3. Tracking number sent within 1 minute of AWB generation
4. Stock sync completes within 5 minutes of ERP update
5. Zero manual intervention needed for standard order flow

---
*Context created: 2026-01-30*
*Phase: 7.1 - Trendyol Complete Integration (INSERTED)*
