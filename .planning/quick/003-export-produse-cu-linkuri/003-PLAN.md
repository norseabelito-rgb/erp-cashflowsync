# Quick Task 003: Export Produse cu Linkuri

## Goal
Adauga linkurile produselor (Shopify admin URLs) in exportul CSV de produse.

## Context
- Export endpoint: `/api/products/export/route.ts`
- MasterProductChannel contine `externalId` (Shopify Product ID)
- Channel e legat de Store prin `storeId`
- Store contine `shopifyDomain` pentru URL-ul magazinului
- URL pattern: `https://{shopifyDomain}/admin/products/{externalId}`

## Tasks

### Task 1: Add channel data to export query
**File:** `src/app/api/products/export/route.ts`

Modify the Prisma query to include:
- `channels` relation with `channel` and `externalId`
- `channel.store` for `shopifyDomain`

### Task 2: Add link columns to CSV export
**File:** `src/app/api/products/export/route.ts`

- Add new header column: "Link_Shopify"
- Build URL for each product from channel data
- If product is published to multiple stores, include first store URL
- Handle products without channel (empty string)

## Verification
- [ ] Export CSV includes "Link_Shopify" column
- [ ] Links are in format `https://{domain}/admin/products/{id}`
- [ ] Products without Shopify publish have empty cell

## Estimated Impact
- 1 file modified
- ~15 lines changed
