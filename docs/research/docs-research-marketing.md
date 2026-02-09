# Research: Ads, Trendyol, Temu & Products Modules

## 1. Module Overview

This document covers four major module groups in the ERP:

1. **Advertising (Meta/TikTok)** - Campaign management, performance tracking, alert rules, AI insights
2. **Trendyol Marketplace** - Multi-store integration, product publishing, order sync, product mapping
3. **Temu Marketplace** - Multi-store integration, order sync, stock sync
4. **Products (PIM)** - Master product catalog, multi-channel publishing, recipes/BOM, inventory mapping

---

## 2. Products Module (PIM - Product Information Management)

### 2.1 Purpose
Central product catalog ("MasterProduct") that serves as the single source of truth for all sales channels (Shopify, Trendyol, Temu, etc.).

### 2.2 Data Model

**MasterProduct** (`prisma/schema.prisma:1253`)
- Core fields: `sku` (unique, immutable), `barcode` (EAN-13), `title`, `description` (rich text), `price`, `compareAtPrice`, `tags[]`, `weight`
- Warehouse: `warehouseLocation` (e.g., "A-12-3")
- Category: FK to `Category`
- Stock: `stock` (synced from inventory system), `stockLastSyncedAt`
- Composite/BOM: `isComposite`, `recipeAsParent[]`, `recipeAsComponent[]`
- Google Drive integration: `driveFolderUrl`, `imagesLastSyncedAt`
- Trendyol fields: `trendyolBarcode`, `trendyolBrandId`, `trendyolBrandName`, `trendyolProductId`, `trendyolStatus`, `trendyolBatchId`, `trendyolError`, `trendyolAttributes`, `trendyolCategoryId`, `trendyolAttributeValues`
- Inventory mapping: `inventoryItemId` FK to `InventoryItem`
- Relations: `images[]`, `channels[]`, `lineItems[]`, `adsCampaigns[]`, `trendyolOrderItems[]`, `trendyolProductMappings[]`, `trendyolProducts[]`, `temuOrderItems[]`, `tasks[]`

**Category** (`prisma/schema.prisma:1230`)
- Fields: `name` (unique), `description`, `shopifyCollectionIds` (JSON map per store), `trendyolCategoryId`, `trendyolCategoryName`, `trendyolAttributes` (JSON)
- Supports Shopify collection mapping AND Trendyol category mapping simultaneously

**Channel** (`prisma/schema.prisma:1208`)
- Enum `ChannelType`: SHOPIFY, TRENDYOL, EMAG, etc.
- Fields: `name`, `type`, `storeId` (FK to Shopify Store), `isActive`, `settings` (JSON)

**MasterProductChannel** (`prisma/schema.prisma:1389`)
- Many-to-many between MasterProduct and Channel
- Fields: `isPublished`, `isActive`, `externalId` (e.g., Shopify product ID), `externalHandle`, `overrides` (JSON for per-channel title/price overrides), `lastSyncedAt`, `syncError`

**MasterProductImage** (`prisma/schema.prisma:1366`)
- Fields: `url` (Google Drive URL), `filename`, `position` (0=primary), `driveFileId`, `driveModified`
- Unique constraint on `[productId, position]`

**ProductRecipe** (`prisma/schema.prisma:1336`)
- BOM/recipe for composite products
- Fields: `parentProductId`, `componentProductId`, `quantity` (Decimal 10,3), `unit`, `sortOrder`
- Unique on `[parentProductId, componentProductId]`

### 2.3 Pages

| Page | Path | Purpose |
|------|------|---------|
| Products List | `/products` | Master product catalog with multi-channel publishing status, search, filters |
| Product Detail | `/products/[id]` | Full product editor - info, images, channels, Trendyol attributes |
| Recipes | `/products/recipes` | BOM/recipe management for composite products |
| Inventory Mapping | `/products/inventory-mapping` | Map MasterProduct ↔ InventoryItem for stock sync |

### 2.4 API Routes (15 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products` | GET/POST | List/create master products |
| `/api/products/[id]` | GET/PUT/DELETE | CRUD single product |
| `/api/products/[id]/channels` | GET/PUT | Manage channel assignments for product |
| `/api/products/recipes` | GET/POST | Recipe/BOM management |
| `/api/products/inventory-mapping` | GET/POST | Map products to inventory items |
| `/api/products/import` | POST | Bulk import products |
| `/api/products/export` | GET | CSV export |
| `/api/products/bulk` | POST | Bulk operations (delete, update) |
| `/api/products/bulk-publish` | POST | Bulk publish to channels |
| `/api/products/bulk-publish/[jobId]` | GET | Check bulk publish job status |
| `/api/products/ids` | GET | Get product IDs for selection |
| `/api/products/sync-stock` | POST | Sync stock from inventory system |
| `/api/products/sync-images` | POST | Sync images from Google Drive |
| `/api/products/sync-shopify` | POST | Sync products to/from Shopify |
| `/api/products/backfill-handles` | POST | Backfill Shopify handles |

### 2.5 Key Features
- **Multi-channel publishing**: Publish to Shopify, Trendyol, etc. with per-channel overrides (title, price)
- **Google Drive image sync**: Images auto-synced from Drive folders via `driveFileId`
- **Inventory mapping**: Link MasterProduct to InventoryItem for stock tracking
- **Recipe/BOM system**: Define composite products with component quantities
- **Bulk operations**: Import, export CSV, bulk publish, bulk delete
- **Trendyol attribute management**: Store Trendyol-specific attributes per product

---

## 3. Advertising Module (Meta Ads & TikTok Ads)

### 3.1 Purpose
Centralized advertising management across Meta (Facebook/Instagram) and TikTok platforms. Provides campaign monitoring, performance tracking, automated alerts, AI-powered insights, and campaign creation.

### 3.2 Data Model

**AdsSettings** (`prisma/schema.prisma:1682`) - OAuth app credentials per platform
**AdsApp** (`prisma/schema.prisma:1705`) - Multiple OAuth apps per platform (supports multiple Business Managers)
**AdsAccount** (`prisma/schema.prisma:1744`) - Connected ad accounts with OAuth tokens, sync status
**AdsSyncJob** (`prisma/schema.prisma:1786`) - Sync progress tracking with resume capability
**AdsPixel** (`prisma/schema.prisma:1826`) - Tracking pixels per platform
**AdsCampaign** (`prisma/schema.prisma:1863`) - Normalized campaigns from all platforms
**AdsAdSet** (`prisma/schema.prisma:1937`) - Ad Sets (Meta) / Ad Groups (TikTok)
**AdsAd** (`prisma/schema.prisma:1991`) - Individual ads with creative info
**AdsDailyStats** (`prisma/schema.prisma:2034`) - Daily performance stats per campaign
**AdsCampaignProduct** (`prisma/schema.prisma:2070`) - Campaign ↔ Product/SKU mapping
**AdsAlertRule** (`prisma/schema.prisma:2123`) - Automated alert rules with conditions
**AdsAlert** (`prisma/schema.prisma:2169`) - Generated alerts with action tracking
**AdsCreative** (`prisma/schema.prisma:2208`) - Creative library (images/videos from Drive)
**AdsWebhookConfig** (`prisma/schema.prisma:2246`) - Webhook configuration per platform
**AdsWebhookEvent** (`prisma/schema.prisma:2274`) - Webhook event audit log

**Enums**: `AdsPlatform` (META, TIKTOK, GOOGLE), `AdsAccountStatus`, `AdsCampaignStatus`, `AdsMappingSource`, `AdsAlertScope`, `AdsAlertAction`, `AdsAlertStatus`

### 3.3 Key Architecture Patterns

#### Campaign Naming Convention
Format: `[OBJECTIVE]_[TYPE]_[CODE]_[AUDIENCE]_[DATE]`
Example: `CONV_SKU_PAT001-PAT002_BROAD_2024Q1`
- Parsed to extract: objective (CONV/TRAFFIC/AWARE/CATALOG), type (SKU/CAT/ALL), product codes, audience type
- Auto-maps campaigns to products based on parsed SKU codes
- `namingValid` boolean tracks if convention is followed

#### Three-Tier Sync Strategy
1. **Light Sync** (`syncMetaAccountLight`) - Campaigns + aggregate insights only, used by CRON every 30 min
2. **Full Sync** (`syncMetaAccount`) - Campaigns + ad sets + ads, with progress tracking and resume
3. **Detail Sync** (`syncCampaignDetails`) - Lazy loading when user views a specific campaign

#### Rate Limit Handling
- Exponential backoff: 5min → 15min → 30min → 1h → 2h
- Sync jobs paused with `retryAt` timestamp
- Resume from last position via `AdsSyncJob` state

#### KPIs Tracked
- spend, impressions, reach, clicks, conversions, revenue
- Calculated: CTR, CPC, CPM, CPA, ROAS, frequency

### 3.4 Lib Files

| File | Lines | Purpose |
|------|-------|---------|
| `meta-ads.ts` | ~2537 | Full Meta Graph API integration: OAuth, accounts, campaigns, ad sets, ads, insights, pixels, creation, sync (light/full/detail), daily stats, historical insights, period comparison |
| `tiktok-ads.ts` | ~1210 | TikTok Marketing API integration: OAuth, advertisers, campaigns, ad groups, ads, reports, pixels, creation, sync |
| `ads-config.ts` | ~117 | Config helper with 5-min cache for platform credentials |
| `ads-oauth-state.ts` | - | OAuth state management for secure callbacks |

### 3.5 Pages (6 pages)

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/ads` | Overview with total spend, impressions, clicks, conversions, ROAS across all platforms |
| Accounts | `/ads/accounts` | Manage connected ad accounts (connect Meta/TikTok, sync status) |
| Campaigns | `/ads/campaigns` | Campaign list with status filters, budget management, KPI display |
| Pixels | `/ads/pixels` | Tracking pixel management and validation |
| Alerts | `/ads/alerts` | Alert rules configuration and triggered alert history |
| Products | `/ads/products` | Campaign-to-product mapping for per-SKU ROAS tracking |
| Settings | `/ads/settings` | Platform OAuth app configuration |

### 3.6 API Routes (19 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ads/settings` | GET/PUT | Platform settings (OAuth credentials) |
| `/api/ads/apps` | GET/POST/DELETE | Multiple OAuth apps per platform |
| `/api/ads/accounts` | GET/POST/DELETE | List/manage connected ad accounts |
| `/api/ads/accounts/connect` | POST | Initiate OAuth connection flow |
| `/api/ads/accounts/callback/meta` | GET | Meta OAuth callback handler |
| `/api/ads/accounts/callback/tiktok` | GET | TikTok OAuth callback handler |
| `/api/ads/accounts/[id]/sync-status` | GET | Check sync job progress |
| `/api/ads/campaigns` | GET | List all campaigns with filters |
| `/api/ads/campaigns/create` | POST | Create campaign on platform |
| `/api/ads/campaigns/[id]` | GET/PUT/DELETE | Campaign details and status changes |
| `/api/ads/campaigns/[id]/insights` | GET | Historical insights with date range |
| `/api/ads/campaigns/[id]/refresh` | POST | Refresh campaign metrics |
| `/api/ads/campaigns/[id]/compare` | GET | Compare two time periods |
| `/api/ads/products` | GET/POST | Campaign-product mappings |
| `/api/ads/pixels` | GET | List pixels per account |
| `/api/ads/stats` | GET | Aggregate dashboard stats |
| `/api/ads/alerts` | GET | List triggered alerts |
| `/api/ads/alerts/rules` | GET/POST | Alert rule CRUD |
| `/api/ads/webhooks` | POST | Webhook event receiver |

### 3.7 Campaign Creation
Both Meta and TikTok support full campaign creation hierarchy:
- **Meta**: Campaign → Ad Set (targeting, budget) → Ad (creative)
- **TikTok**: Campaign → Ad Group (targeting, budget) → Ad (creative)

Objectives available:
- Meta: Awareness, Engagement, Traffic, Leads, Sales, App Promotion
- TikTok: Reach, Traffic, Video Views, Lead Generation, Conversions, Product Sales

### 3.8 AI Insights System

**AIInsight** (`prisma/schema.prisma:2318`)
- Types: PRODUCT_PRICE, PRODUCT_STOCK, AD_BUDGET, AD_STATUS, AD_BID, AD_TARGETING, GENERAL
- Status lifecycle: PENDING → APPLIED/DISMISSED/EXPIRED
- Fields: `targetType`, `targetId`, `currentValue`, `suggestedValue`, `reasoning` (AI explanation), `confidence` (0-100%), `estimatedImpact`

**AIActionLog** (`prisma/schema.prisma:2358`)
- Tracks actions taken on insights (apply/dismiss/modify)
- Outcome tracking for AI learning: `outcomeTracked`, `outcomeMetrics`

**AIAnalysisRun** (`prisma/schema.prisma:2390`)
- Scheduled analysis runs (daily, on-demand, product-specific, ads-specific)
- Tracks: `insightsGenerated`, `tokensUsed`, `costEstimate`

### 3.9 Alert System
- **Rules**: Configurable conditions like "CPA > 50 for 24h"
- **Scope**: ALL campaigns, specific PLATFORM, specific SKU, or selected CAMPAIGNS
- **Actions**: NOTIFY, PAUSE campaign, REDUCE_BUDGET by percentage
- **Auto-rollback**: Restore original state after X hours
- **Cooldown**: Prevent re-triggering for same campaign within cooldown period

---

## 4. Trendyol Marketplace Integration

### 4.1 Purpose
Full integration with Trendyol marketplace (Turkey + International: RO, DE, BG, etc.) for product publishing, order management, invoice/AWB sync, and stock synchronization.

### 4.2 Data Model

**TrendyolStore** (`prisma/schema.prisma:2422`)
- Multi-store support: `name`, `supplierId`, `apiKey`, `apiSecret`, `webhookSecret`
- Fields: `storeFrontCode` (RO/DE/BG/TR), `isTestMode`, `defaultBrandId`, `currencyRate`, `invoiceSeriesName`
- FK to `Company` for multi-entity support

**TrendyolOrder** (`prisma/schema.prisma:2450`)
- Fields: `trendyolOrderId` (unique), `trendyolOrderNumber`, `orderDate`, `status`
- Customer: name, email, phone, address, city, district, postalCode
- Shipping: `cargoProviderName`, `cargoTrackingNumber`, `cargoTrackingLink`
- Financial: `totalPrice`, `currency` (default TRY)
- Local link: `orderId` FK to main `Order` system
- Invoice sync: `invoiceSentToTrendyol`, `oblioInvoiceLink`
- AWB sync: `trackingSentToTrendyol`, `localAwbNumber`, `localCarrier`
- Multi-store: `trendyolStoreId` FK

**TrendyolOrderItem** (`prisma/schema.prisma:2516`)
- Fields: `trendyolProductId`, `barcode`, `title`, `quantity`, `price`, `merchantSku`, `productColor`, `productSize`
- Mapping: `localSku`, `masterProductId`, `isMapped`

**TrendyolProductMapping** (`prisma/schema.prisma:2548`)
- Maps Trendyol products to local MasterProducts
- Fields: `trendyolProductId` (unique), `barcode`, `localSku`, `masterProductId`, `isAutoMapped`, `mappedBy`

**TrendyolProduct** (`prisma/schema.prisma:2679`)
- Synced product data from Trendyol API
- Fields: `trendyolProductId`, `barcode`, `title`, `merchantSku`, `brandName`, `categoryName`, `listPrice`, `salePrice`, `quantity`
- Status flags: `onSale`, `approved`, `archived`, `locked`
- Mapping: `localSku`, `masterProductId`

**TrendyolCampaign** (`prisma/schema.prisma:2724`)
- Trendyol marketplace campaigns (DISCOUNT, FLASH_SALE, FEATURED, PROMOTION)
- Performance: `totalRevenue`, `totalUnitsSold`
- Products: `TrendyolCampaignProduct[]` with campaign-specific pricing

### 4.3 Lib Files (10 files)

| File | Purpose |
|------|---------|
| `trendyol.ts` | Core API client (TrendyolClient class): categories, brands, products CRUD, price/inventory updates, orders, webhooks, test connection, order sync, product mapping, stats |
| `trendyol-order-sync.ts` | Order sync logic (multi-store) |
| `trendyol-stock-sync.ts` | Stock sync to Trendyol |
| `trendyol-status.ts` | Status normalization (Trendyol → local statuses) |
| `trendyol-awb.ts` | AWB/tracking number sync back to Trendyol |
| `trendyol-invoice.ts` | Invoice link sync to Trendyol (Oblio integration) |
| `trendyol-batch-status.ts` | Batch request status checking |
| `trendyol-category-ai.ts` | AI-powered category suggestion for product publishing |
| `trendyol-courier-map.ts` | Map local carriers to Trendyol carrier codes |
| `trendyol-returns.ts` | Return/claim processing |

### 4.4 TrendyolClient API

The `TrendyolClient` class provides:
- **Authentication**: Basic Auth (Base64 of API_KEY:API_SECRET)
- **Categories**: `getCategories(storeFrontCode)`, `getCategoryAttributes(categoryId)`
- **Brands**: `getBrands()`, `searchBrands(name)` (public endpoints)
- **Products**: `getProducts()`, `createProducts()`, `updateProducts()`, `updatePriceAndInventory()`, `deleteProducts()`, `getBatchRequestResult()`
- **Orders**: `getOrders()`, `updateTrackingNumber()`, `sendInvoiceLink()`
- **Webhooks**: `registerWebhook()`, `listWebhooks()`, `deleteWebhook()`, `updateWebhook()`
- **Connection test**: Tries multiple storeFrontCodes (RO, DE, BG, HU, CZ, PL, GR) to find products
- **Turkish → Romanian translation**: Built-in dictionary for category names (100+ word pairs)
- **EAN-13 barcode generation**: `generateBarcode(sku)` for Trendyol listing

### 4.5 Order Sync Flow
1. Fetch active `TrendyolStore` records (multi-store)
2. For each store, create `TrendyolClient` from credentials
3. Paginate through orders from Trendyol API (default: last 7 days)
4. Upsert `TrendyolOrder` records with customer info, shipping, financials
5. Create `TrendyolOrderItem` records for each line item
6. Auto-map products: match by barcode → trendyolBarcode → SKU
7. Create `TrendyolProductMapping` for successful auto-matches

### 4.6 Pages (4 pages)

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/trendyol` | Product listing from Trendyol API with multi-store support, barcode search, approval filters |
| Orders | `/trendyol/orders` | Trendyol order list with status filters |
| Mapping | `/trendyol/mapping` | Manual product mapping (Trendyol barcode → local SKU) |
| Publish | `/trendyol/publish` | Publish MasterProducts to Trendyol with category/brand/attribute selection |

### 4.7 API Routes (12 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trendyol` | GET | General Trendyol data |
| `/api/trendyol/stores` | GET/POST | Multi-store CRUD |
| `/api/trendyol/stores/[id]` | PUT/DELETE | Store edit/delete |
| `/api/trendyol/stores/[id]/test` | POST | Test store connection |
| `/api/trendyol/orders` | GET | List Trendyol orders |
| `/api/trendyol/mapping` | GET/POST | Product mapping CRUD |
| `/api/trendyol/stats` | GET | Dashboard statistics |
| `/api/trendyol/attributes` | GET | Trendyol category attributes |
| `/api/trendyol/batch-status` | GET | Check batch request status |
| `/api/trendyol/category-suggest` | POST | AI category suggestion |
| `/api/trendyol/webhook` | POST | Webhook receiver (generic) |
| `/api/trendyol/webhook/[storeId]` | POST | Per-store webhook with HMAC validation |

---

## 5. Temu Marketplace Integration

### 5.1 Purpose
Integration with Temu marketplace (EU, US, Global regions) for order management, stock sync, and AWB sync.

### 5.2 Data Model

**TemuStore** (`prisma/schema.prisma:2578`)
- Fields: `appKey`, `appSecret`, `accessToken`, `accessTokenExpiry` (3-month), `webhookSecret`, `region` (EU/US/GLOBAL), `currencyRate`, `invoiceSeriesName`
- FK to `Company`

**TemuOrder** (`prisma/schema.prisma:2606`)
- Fields: `temuOrderId` (unique), `temuOrderNumber`, `orderDate`, `status`
- Customer: name, email, phone, address
- Financial: `totalPrice`, `currency` (default EUR)
- Local link: `orderId` FK to main `Order`
- Invoice sync: `invoiceSentToTemu`, `invoiceSentAt`, `invoiceSendError`
- AWB sync: `trackingSentToTemu`, `trackingSentAt`, `trackingSendError`
- Multi-store: `temuStoreId` FK

**TemuOrderItem** (`prisma/schema.prisma:2655`)
- Fields: `goodsId`, `skuId`, `title`, `quantity`, `price`
- Mapping: `localSku`, `masterProductId`, `isMapped`

### 5.3 Lib Files (5 files)

| File | Purpose |
|------|---------|
| `temu.ts` | Core API client (TemuClient class): MD5 signature auth, orders, products, stock/price updates, connection test |
| `temu-order-sync.ts` | Order sync logic |
| `temu-stock-sync.ts` | Stock sync to Temu |
| `temu-status.ts` | Status normalization |
| `temu-awb.ts` | AWB/tracking sync back to Temu |

### 5.4 TemuClient API

The `TemuClient` class provides:
- **Authentication**: MD5 signature - Sort params, concatenate, wrap with appSecret, MD5 uppercase
- **Orders**: `getOrders()`, `getOrderDetail()`, `updateTracking()`
- **Products**: `getProducts()`, `updateStock()`, `updatePrice()`
- **Connection test**: Fetches one order to verify credentials
- **Region-based endpoints**: EU (openapi-b-eu.temu.com), US, GLOBAL

### 5.5 Pages (2 pages)

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/temu` | Order stats (today/week/month), revenue, sync functionality |
| Orders | `/temu/orders` | Temu order list |

### 5.6 API Routes (5 endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/temu/stores` | GET/POST | Multi-store CRUD |
| `/api/temu/stores/[id]` | PUT/DELETE | Store edit/delete |
| `/api/temu/sync` | POST | Trigger order sync |
| `/api/temu/stats` | GET | Dashboard statistics |
| `/api/temu/orders` | GET | List Temu orders |

---

## 6. Customer Notes

### 6.1 Data Model
**CustomerNote** (`prisma/schema.prisma:3980`)
- Simple model: `email` (unique, normalized lowercase), `note` (text), `updatedAt`, `updatedBy`
- Used for adding notes to customers by email address
- Linked to order display for customer context

---

## 7. Cross-Module Integration Points

### 7.1 Product → Channel Flow
```
MasterProduct → MasterProductChannel → Channel (Shopify/Trendyol/eMAG)
                    ↳ externalId (Shopify Product ID)
                    ↳ overrides (per-channel title/price)
                    ↳ sync status
```

### 7.2 Product → Inventory Flow
```
MasterProduct.inventoryItemId → InventoryItem
         ↳ stock sync via /api/products/sync-stock
         ↳ warehouseLocation for picking
```

### 7.3 Trendyol Order → Local Order Flow
```
TrendyolOrder.orderId → Order (main order system)
    ↳ TrendyolOrderItem.masterProductId → MasterProduct
    ↳ TrendyolProductMapping (barcode → localSku)
    ↳ Invoice: oblioInvoiceLink → sendInvoiceLink() → Trendyol API
    ↳ AWB: localAwbNumber → updateTrackingNumber() → Trendyol API
```

### 7.4 Temu Order → Local Order Flow
```
TemuOrder.orderId → Order (main order system)
    ↳ TemuOrderItem.masterProductId → MasterProduct
    ↳ Invoice: invoiceSentToTemu tracking
    ↳ AWB: trackingSentToTemu tracking
```

### 7.5 Ads → Product Attribution
```
AdsCampaign → AdsCampaignProduct → MasterProduct
    ↳ Auto-mapped from campaign naming convention (CONV_SKU_PAT001_BROAD_...)
    ↳ Manual mapping also supported
    ↳ Per-SKU ROAS tracking via allocated spend/revenue
```

### 7.6 AI Insights → Actions
```
AIAnalysisRun → AIInsight (PENDING)
    ↳ User reviews suggestion
    ↳ APPLIED → AIActionLog + actual API call (change price/budget/status)
    ↳ DISMISSED → AIActionLog
    ↳ Outcome tracked for AI learning
```

---

## 8. Technology Stack Patterns

### 8.1 API Integration Patterns
- **Meta Ads**: OAuth 2.0 flow, Facebook Graph API v21.0, token extension for 60-day long-lived tokens
- **TikTok Ads**: OAuth flow, TikTok Business API v1.3, Access-Token header auth
- **Trendyol**: Basic Auth (Base64), Cloudflare bypass headers (User-Agent spoofing), multi-storefront support
- **Temu**: MD5 signature auth, region-based endpoint routing (EU/US/GLOBAL)

### 8.2 Sync Strategies
- **Ads**: 3-tier (light/full/detail), rate limit handling with exponential backoff, resumable sync jobs
- **Trendyol**: Paginated order sync per-store, auto product mapping, batch request tracking
- **Temu**: Simple paginated order sync per-store

### 8.3 Multi-Store Pattern
Both Trendyol and Temu support multiple stores per company:
- `TrendyolStore` / `TemuStore` linked to `Company`
- Orders linked to specific store for reporting
- API credentials per store

### 8.4 Product Mapping Pattern
Both marketplaces use a mapping table to link external products to local MasterProducts:
- Auto-mapping: Match by barcode → EAN → SKU
- Manual mapping: User selects local SKU for unmapped products
- `isMapped` flag on order items for quick filtering

---

## 9. File Inventory

### Pages (16 total)
- `/ads` - Dashboard
- `/ads/accounts` - Account management
- `/ads/campaigns` - Campaign list
- `/ads/pixels` - Pixel management
- `/ads/alerts` - Alert rules & history
- `/ads/products` - Product attribution
- `/ads/settings` - Platform configuration
- `/trendyol` - Product dashboard
- `/trendyol/orders` - Order list
- `/trendyol/mapping` - Product mapping
- `/trendyol/publish` - Product publishing
- `/temu` - Dashboard
- `/temu/orders` - Order list
- `/products` - Master catalog
- `/products/[id]` - Product detail
- `/products/recipes` - Recipe/BOM management
- `/products/inventory-mapping` - Inventory mapping

### API Routes (51 total)
- Ads: 19 endpoints
- Trendyol: 12 endpoints
- Temu: 5 endpoints
- Products: 15 endpoints

### Lib Files (17 total)
- `meta-ads.ts` (~2537 lines)
- `tiktok-ads.ts` (~1210 lines)
- `ads-config.ts` (~117 lines)
- `ads-oauth-state.ts`
- `trendyol.ts` (~1216 lines)
- `trendyol-order-sync.ts`
- `trendyol-stock-sync.ts`
- `trendyol-status.ts`
- `trendyol-awb.ts`
- `trendyol-invoice.ts`
- `trendyol-batch-status.ts`
- `trendyol-category-ai.ts`
- `trendyol-courier-map.ts`
- `trendyol-returns.ts`
- `temu.ts` (~408 lines)
- `temu-order-sync.ts`
- `temu-stock-sync.ts`
- `temu-status.ts`
- `temu-awb.ts`

### Prisma Models (22 models in this scope)
- Product, ProductComponent, StockMovement (legacy)
- MasterProduct, MasterProductImage, MasterProductChannel, ProductRecipe
- Category, Channel
- AdsSettings, AdsApp, AdsAccount, AdsSyncJob, AdsPixel, AdsCampaign, AdsAdSet, AdsAd, AdsDailyStats, AdsCampaignProduct, AdsAlertRule, AdsAlert, AdsCreative, AdsWebhookConfig, AdsWebhookEvent
- AIInsight, AIActionLog, AIAnalysisRun
- TrendyolStore, TrendyolOrder, TrendyolOrderItem, TrendyolProductMapping, TrendyolProduct, TrendyolCampaign, TrendyolCampaignProduct
- TemuStore, TemuOrder, TemuOrderItem
- CustomerNote
