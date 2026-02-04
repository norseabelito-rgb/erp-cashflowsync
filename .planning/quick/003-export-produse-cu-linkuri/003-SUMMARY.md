# Quick Task 003: Export Produse cu Linkuri - COMPLETE

## Summary
Added `Link_Shopify` column to the product CSV export that includes the Shopify admin URL for each product.

## Changes Made

### `src/app/api/products/export/route.ts`
- Extended Prisma query to include `channels` relation with `channel.store.shopifyDomain`
- Added `Link_Shopify` header to CSV columns
- Build URL in format: `https://{shopifyDomain}/admin/products/{externalId}`
- Products without Shopify publish have empty field

## Verification
- [x] Export CSV includes "Link_Shopify" column
- [x] Links are in format `https://{domain}/admin/products/{id}`
- [x] Products without Shopify publish have empty cell

## Commit
- `efd6bc5` - feat: add Link_Shopify column to product CSV export

## Time
~5 minutes
