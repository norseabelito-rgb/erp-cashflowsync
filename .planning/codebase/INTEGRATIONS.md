# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**E-Commerce Platforms:**
- Shopify - Order synchronization and product management
  - SDK/Client: Custom `ShopifyClient` in `src/lib/shopify.ts`
  - Authentication: OAuth via access tokens stored per store
  - Webhook endpoint: `/api/webhooks/shopify` (HMAC signature verification)
  - Integration points:
    - Order sync via REST API v2024-01
    - Product fetching and updates
    - Store configuration per tenant
- Trendyol - Turkish e-commerce platform integration
  - SDK/Client: Custom `TrendyolClient` in `src/lib/trendyol.ts`
  - Authentication: Basic Auth (API Key + API Secret, Base64 encoded)
  - API Endpoints:
    - Production: `https://apigw.trendyol.com`
    - Test: `https://stageapigw.trendyol.com`
  - Features: Product sync, category management, brand management, order sync
  - Config: `TrendyolConfig` interface with `supplierId`, `apiKey`, `apiSecret`, `isTestMode`

**Advertising Platforms:**
- Meta (Facebook/Instagram) Ads
  - SDK/Client: Custom `Meta Ads API` integration in `src/lib/meta-ads.ts`
  - API Version: v21.0
  - Base URL: `https://graph.facebook.com/v21.0`
  - Authentication: OAuth with scopes (`ads_management`, `ads_read`, `business_management`)
  - Capabilities: Campaign management, ad set management, budget control, status updates
  - Webhook endpoint: `/api/webhooks/meta` (for real-time campaign updates)
  - Configuration: Via `getMetaAdsConfig()` in `src/lib/ads-config.ts`
- TikTok Ads
  - SDK/Client: Custom `TikTok Ads API` integration in `src/lib/tiktok-ads.ts`
  - API Base: `https://business-api.tiktok.com/open_api/v1.3`
  - Auth URL: `https://business-api.tiktok.com/portal/auth`
  - Authentication: OAuth with access tokens
  - Capabilities: Campaign management, ad group management, budget control
  - Configuration: Via `getTikTokAdsConfig()` in `src/lib/ads-config.ts`

**Shipping & Logistics:**
- FanCourier - Romanian courier service integration
  - SDK/Client: `FanCourierAPI` class in `src/lib/fancourier.ts`
  - API Base: `https://api.fancourier.ro`
  - Authentication: Username/password-based with token caching (24h validity per company)
  - Features: AWB creation, AWB tracking, locality lookup, status updates
  - Multi-tenant support: Token caching per company (clientId+username)
  - Config: `FanCourierConfig` with username, password, clientId
  - Status mapper: `src/lib/fancourier-statuses.ts`

**Tax & Regulatory:**
- ANAF (Romanian Tax Authority) API
  - Purpose: Tax registration validation
  - API Base: `https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`
  - Implementation: `src/lib/anaf.ts`
  - Usage: Validate company tax registration numbers

**Google Services:**
- Google Drive
  - SDK/Client: Google APIs library (`googleapis` v137.0.0)
  - Purpose: Store and retrieve product images/documents
  - Authentication: Service Account credentials (stored in settings)
  - Scope: `https://www.googleapis.com/auth/drive.readonly`
  - Implementation: `src/lib/google-drive.ts`
  - Capabilities: List folders, read files, generate download/thumbnail URLs
- Google OAuth (Authentication)
  - SDK/Client: NextAuth GoogleProvider
  - Purpose: User login via Google accounts
  - Configuration: Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
  - Implementation: `src/lib/auth.ts`

**AI Services:**
- Anthropic Claude
  - SDK/Client: `@anthropic-ai/sdk` v0.30.1
  - Purpose: AI-powered analytics and suggestions for ads/products
  - Implementation: `src/lib/ai.ts`
  - Features: Campaign analysis, pricing suggestions, stock recommendations
  - Configuration: API key stored in database settings (`Settings.aiApiKey`)
  - Model selection: Stored in settings (`Settings.aiModel`)

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` environment variable
  - Client: `@prisma/client` v5.10.2 (ORM)
  - Driver: `pg` v8.17.1 (native driver)
  - Implementation: Singleton pattern in `src/lib/db.ts`
  - Connection pooling: Via Prisma (pg manages pool)
  - Log level: Only errors (configured in PrismaClient)

**File Storage:**
- Local filesystem for uploads (default)
  - Directory: `./uploads` or `process.env.UPLOAD_DIR`
  - Usage: Temporary file storage (Excel, PDFs, etc.)
  - No cloud storage integration currently configured

**Caching:**
- In-memory token cache: `FanCourier` authentication tokens cached per company
- No Redis or distributed caching configured

## Authentication & Identity

**Auth Provider:**
- NextAuth v4.24.7 (NextAuth.js)
  - Session storage: Prisma adapter (`@auth/prisma-adapter`)
  - Strategy: Database sessions (users, accounts, sessions tables)
  - Providers:
    - Google OAuth 2.0
    - Credentials (email/password with bcryptjs hashing)
  - Implementation: `src/lib/auth.ts`
  - Features:
    - Role-based access control (RBAC) with custom permissions
    - Permission-based authorization
    - Multi-tenant support via store access matrix
    - Session timeout: Configurable via `SESSION_TIMEOUT_MINUTES` (default 30 min)

**OAuth Flows:**
- Ads platform OAuth stored in database
  - State management: Via `src/lib/ads-oauth-state.ts`
  - Callback routes: `/api/ads/accounts/callback/[platform]` (Meta, TikTok)

## Monitoring & Observability

**Error Tracking:**
- No external service detected (cloud error tracking not configured)
- Errors logged to console in development

**Logs:**
- Console logging (development via NODE_ENV check)
- Structured logging in sync/cron operations via `src/lib/activity-log.ts`
- Log levels: Info, Warning, Error
- Database logging: Error level only (Prisma config)

**Analytics:**
- Activity audit log stored in database
  - Implementation: `src/lib/activity-log.ts`
  - Tracks: User actions, entity changes, timestamps
  - Entity types: Orders, Products, Invoices, AWB, etc.
  - Action types: Create, Update, Delete, View, etc.

## CI/CD & Deployment

**Hosting:**
- Railway.app (Platform-as-a-Service)
  - Configuration: `railway.toml`
  - Environment: Node.js on Linux
  - Auto-deployment: From git push

**CI Pipeline:**
- Railway build pipeline (automatic)
  - Builder: NIXPACKS
  - Install: `npm install --legacy-peer-deps`
  - Build: `npx prisma generate && npm run build`
  - Start: `node scripts/force-migration.js && npm run start`
  - Restart policy: ON_FAILURE with max 10 retries

**Database Migrations:**
- Prisma migrations
  - Safe migration script: `scripts/force-migration.js` (uses IF NOT EXISTS - non-destructive)
  - Alternative: `npm run db:migrate` (Prisma Migrate)
  - Schema file: `prisma/schema.prisma`

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (mandatory)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - Application callback URL (e.g., https://app.com)
- `NEXTAUTH_SECRET` - Session encryption key (auto-generated if missing)

**Optional env vars:**
- `ALLOWED_EMAILS` - Comma-separated whitelist of allowed login emails
- `CRON_SECRET` - Secret for protecting cron job endpoints
- `UPLOAD_DIR` - File upload directory path (default: `./uploads`)
- `NODE_ENV` - Set to "production" for production builds
- `NEXT_PUBLIC_APP_URL` - Public app URL (for client-side use)
- `SESSION_TIMEOUT_MINUTES` - Session duration in minutes (default: 30)

**Secrets location:**
- Environment variables via `.env.local` (development)
- Railway environment variables (production)
- Database credentials never hardcoded
- OAuth tokens stored encrypted in database

## Webhooks & Callbacks

**Incoming Webhooks (receive from external services):**
- Shopify Order Webhooks: `/api/webhooks/shopify`
  - Topic: orders/create, orders/update
  - Verification: HMAC-SHA256 signature validation
  - Store lookup via `x-shopify-shop-domain` header
  - Secrets: Per-store webhook secret (`Store.webhookSecret`)
- Meta Ads Webhooks: `/api/webhooks/meta`
  - Real-time campaign updates
  - Verification: Challenge-response validation
  - Event types: Campaign status changes, budget alerts

**Outgoing Webhooks (send to external services):**
- None detected (integration is one-way fetch-based)

**Cron Jobs (internal scheduled tasks):**
- `/api/cron/sync-orders` - Sync Shopify/Trendyol orders (CRON_SECRET protected)
- `/api/cron/sync-awb` - Update AWB statuses from FanCourier (CRON_SECRET protected)
- `/api/cron/ads-sync` - Sync ads platform data (CRON_SECRET protected)
- `/api/cron/ai-analysis` - Run AI analysis on campaigns (CRON_SECRET protected)
- `/api/cron/intercompany-settlement` - Intercompany billing (CRON_SECRET protected)
- `/api/cron/handover-finalize` - Finalize pending handovers (CRON_SECRET protected)
- `/api/cron/backup` - Google Drive backup (CRON_SECRET protected)
- `/api/cron/run-all` - Run all cron jobs (CRON_SECRET protected)

**OAuth Callback Routes:**
- `/api/ads/accounts/callback/meta` - Meta OAuth redirect
- `/api/ads/accounts/callback/tiktok` - TikTok OAuth redirect
- Callback URL construction: `${NEXTAUTH_URL || "https://erp.cashflowgrup.net"}/api/ads/accounts/callback/[platform]`

---

*Integration audit: 2026-01-23*
