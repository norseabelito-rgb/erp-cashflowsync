# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
erp-cashflowsync/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Authenticated routes grouped layout
│   │   │   ├── activity/             # Activity log pages
│   │   │   ├── ads/                  # Ads platform management
│   │   │   ├── awb/                  # Shipping labels
│   │   │   ├── categories/           # Product categories
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── docs/                 # Documentation
│   │   │   ├── handover/             # Handover sessions
│   │   │   ├── intercompany/         # Inter-company transfers
│   │   │   ├── inventory/            # Stock management
│   │   │   ├── invoices/             # Invoice management
│   │   │   ├── notifications/        # Notifications
│   │   │   ├── orders/               # Order management
│   │   │   ├── picking/              # Picking lists
│   │   │   ├── preferences/          # User preferences
│   │   │   ├── processing-errors/    # Error handling
│   │   │   ├── products/             # Product management
│   │   │   ├── profile/              # User profile
│   │   │   ├── settings/             # System settings
│   │   │   ├── stores/               # Store management
│   │   │   ├── sync-history/         # Sync logs
│   │   │   ├── tracking/             # Order tracking
│   │   │   ├── trendyol/             # Trendyol integration
│   │   │   └── layout.tsx            # Dashboard layout wrapper
│   │   ├── api/                      # API routes
│   │   │   ├── activity/             # Activity log endpoints
│   │   │   ├── admin/                # Admin operations
│   │   │   ├── ads/                  # Ad platform APIs
│   │   │   ├── ai/                   # AI insights
│   │   │   ├── auth/                 # NextAuth handlers
│   │   │   ├── awb/                  # Shipping label APIs
│   │   │   ├── backup/               # Data backup
│   │   │   ├── categories/           # Category APIs
│   │   │   ├── channels/             # Channel management
│   │   │   ├── companies/            # Company APIs
│   │   │   ├── cron/                 # Background jobs
│   │   │   ├── drive-image/          # Google Drive image sync
│   │   │   ├── fancourier/           # FanCourier integration
│   │   │   ├── goods-receipts/       # Goods receipt APIs
│   │   │   ├── handover/             # Handover APIs
│   │   │   ├── health/               # Health check
│   │   │   ├── intercompany/         # Inter-company APIs
│   │   │   ├── inventory/            # Inventory APIs
│   │   │   ├── invoice-series/       # Invoice numbering
│   │   │   ├── invoices/             # Invoice APIs
│   │   │   ├── notifications/        # Notification APIs
│   │   │   ├── orders/               # Order APIs
│   │   │   ├── picking/              # Picking APIs
│   │   │   ├── print-client/         # Print client APIs
│   │   │   ├── print-jobs/           # Print job APIs
│   │   │   ├── printers/             # Printer APIs
│   │   │   ├── processing-errors/    # Processing error APIs
│   │   │   ├── products/             # Product APIs
│   │   │   ├── rbac/                 # Permission/role APIs
│   │   │   ├── settings/             # Settings APIs
│   │   │   ├── stats/                # Statistics APIs
│   │   │   ├── stock/                # Stock APIs
│   │   │   ├── stores/               # Store APIs
│   │   │   ├── suppliers/            # Supplier APIs
│   │   │   ├── sync/                 # Sync orchestration
│   │   │   ├── tracking/             # Tracking APIs
│   │   │   ├── transfers/            # Stock transfer APIs
│   │   │   ├── trendyol/             # Trendyol APIs
│   │   │   ├── upload/               # File upload
│   │   │   ├── user/                 # User profile APIs
│   │   │   ├── warehouses/           # Warehouse APIs
│   │   │   ├── webhooks/             # Webhook handlers
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── providers.tsx         # Context providers
│   │   │   ├── page.tsx              # Redirect to dashboard
│   │   │   └── globals.css           # Global styles
│   │   ├── invite/                   # Invite link pages
│   │   ├── login/                    # Login page
│   │   ├── signup/                   # Signup page
│   │   ├── privacy-policy/           # Legal pages
│   │   └── terms-of-service/         # Legal pages
│   ├── components/                   # React components
│   │   ├── ui/                       # Radix UI primitives + custom
│   │   ├── layout/                   # Layout components
│   │   ├── ads/                      # Ads-specific components
│   │   ├── onboarding/               # Onboarding flow
│   │   ├── docs/                     # Documentation components
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   ├── user-menu.tsx             # User dropdown menu
│   │   ├── global-loading.tsx        # Loading overlay
│   │   ├── ai-insights.tsx           # AI recommendations
│   │   ├── session-monitor.tsx       # Session tracking
│   │   ├── route-guard.tsx           # Permission checks
│   │   ├── auto-sync.tsx             # Auto-sync provider
│   │   └── auth-provider.tsx         # Auth wrapper
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-permissions.tsx       # RBAC context + hook
│   │   ├── use-display.tsx           # UI state context
│   │   ├── use-auto-sync.ts          # Auto-sync trigger
│   │   └── use-toast.ts              # Toast notifications
│   ├── lib/                          # Business logic & services
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── permissions.ts            # RBAC utilities
│   │   ├── db.ts                     # Prisma client
│   │   ├── invoice-service.ts        # Invoice creation/cancellation
│   │   ├── sync-service.ts           # Sync orchestration
│   │   ├── awb-service.ts            # Shipping label management
│   │   ├── invoice-series.ts         # Invoice numbering
│   │   ├── intercompany-service.ts   # Inter-company transfers
│   │   ├── stock-transfer-service.ts # Stock transfers
│   │   ├── inventory-stock.ts        # Stock calculations
│   │   ├── stock.ts                  # Stock operations
│   │   ├── shopify.ts                # Shopify API client
│   │   ├── trendyol.ts               # Trendyol API client
│   │   ├── trendyol-status.ts        # Trendyol status mapping
│   │   ├── fancourier.ts             # FanCourier SOAP client
│   │   ├── fancourier-statuses.ts    # FanCourier status mapping
│   │   ├── facturis.ts               # E-invoice API client
│   │   ├── meta-ads.ts               # Meta Ads API client
│   │   ├── tiktok-ads.ts             # TikTok Ads API client
│   │   ├── anaf.ts                   # Romanian tax authority API
│   │   ├── ai.ts                     # AI recommendations
│   │   ├── activity-log.ts           # Audit trail
│   │   ├── cron-lock.ts              # Distributed cron lock
│   │   ├── ads-config.ts             # Ads platform config
│   │   ├── ads-oauth-state.ts        # OAuth state management
│   │   ├── excel.ts                  # Excel export utilities
│   │   ├── handover.ts               # Handover session logic
│   │   ├── google-drive.ts           # Google Drive integration
│   │   ├── utils.ts                  # General utilities
│   │   └── validators.ts             # Zod validation schemas
│   ├── types/                        # TypeScript definitions
│   │   ├── next-auth.d.ts            # NextAuth session type
│   │   └── prisma-enums.ts           # Prisma enum definitions
│   └── tests/                        # Test files
│       ├── api/                      # API integration tests
│       └── [unit tests co-located]   # *.test.ts, *.spec.ts
├── prisma/                           # Database
│   ├── schema.prisma                 # Data model
│   ├── seed.ts                       # Database seeding
│   └── migrations/                   # Migration history
├── public/                           # Static assets
├── .env.local                        # Local environment variables
├── .env.example                      # Template for env vars
├── tsconfig.json                     # TypeScript config
├── next.config.js                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── vitest.config.ts                  # Vitest config
├── package.json                      # Dependencies
└── scripts/                          # Build/migration scripts
    ├── force-migration.js            # Database migration
    └── run-migration.js              # Database migration runner
```

## Directory Purposes

**`src/app/(dashboard)/`:**
- Purpose: Authenticated user interface pages following Next.js App Router
- Contains: Page.tsx files, nested layouts, client components
- Key files: `layout.tsx` (dashboard wrapper with providers), `[resource]/page.tsx` (list pages), `[resource]/[id]/page.tsx` (detail pages)

**`src/app/api/`:**
- Purpose: REST API endpoints matching feature domains
- Contains: Route handlers using Next.js `route.ts` pattern
- Pattern: `GET`, `POST`, `PUT`, `DELETE` methods per resource, nested routes for sub-resources
- Auth: Session checked via `getServerSession()` + permission check via `hasPermission()`

**`src/components/ui/`:**
- Purpose: Reusable UI primitives and design system components
- Contains: Radix UI wrappers (Button, Dialog, Select, etc.) + custom components (DataTable, EmptyState)
- Pattern: Presentational, no business logic, accept props for customization

**`src/components/layout/`:**
- Purpose: Page layout shells and navigation
- Key: Sidebar, header, footer, responsive wrappers

**`src/lib/`:**
- Purpose: Encapsulated business logic and external integrations
- Pattern: Static methods or exported functions, no class instantiation
- Key types: Service (invoice-service, sync-service), Client (shopify, fancourier), Utility (formatters, validators)

**`src/hooks/`:**
- Purpose: Shared stateful logic with React lifecycle
- Pattern: React Context for global state (permissions, display), custom hooks for local state
- Key: `usePermissions()` for auth, `useDisplay()` for UI state, `useAutoSync()` for background sync

**`src/types/`:**
- Purpose: Shared TypeScript definitions and Prisma enum mirror
- Key: `prisma-enums.ts` duplicates Prisma enums to support offline development

**`prisma/`:**
- Purpose: Database schema and migrations
- Schema: 50+ models covering users, orders, invoices, stock, ads, etc.
- Migrations: Auto-generated by `prisma migrate dev`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with metadata, Geist fonts, providers wrapper
- `src/app/page.tsx`: Redirect to `/dashboard` (client-side to allow health checks)
- `src/app/(dashboard)/layout.tsx`: Dashboard wrapper with sidebar, permission/display providers
- `src/app/(dashboard)/dashboard/page.tsx`: Main dashboard view

**Configuration:**
- `src/lib/auth.ts`: NextAuth options, SUPER_ADMIN role setup, permission list
- `src/lib/permissions.ts`: RBAC queries, permission evaluation logic
- `.env.local`: Database URL, API keys (not committed)
- `prisma/schema.prisma`: 1700+ lines defining all data models

**Core Logic:**
- `src/lib/invoice-service.ts`: Unified invoice creation/cancellation
- `src/lib/sync-service.ts`: Order sync orchestration with logging
- `src/lib/awb-service.ts`: Shipping label lifecycle (create, update, track)
- `src/lib/inventory-stock.ts`: Stock calculations, reserved quantities
- `src/lib/facturis.ts`: E-invoice generation API wrapper
- `src/lib/fancourier.ts`: SOAP API wrapper for shipping (1235 lines)

**API Endpoints:**
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth OAuth callback
- `src/app/api/invoices/route.ts`: GET invoices with filtering
- `src/app/api/invoices/issue/route.ts`: POST to create invoice
- `src/app/api/orders/[id]/sync/route.ts`: POST to sync single order
- `src/app/api/sync/full/route.ts`: POST to trigger full sync
- `src/app/api/webhooks/shopify/route.ts`: Shopify order webhook handler
- `src/app/api/cron/sync/route.ts`: Scheduled background job trigger

**UI Components:**
- `src/components/sidebar.tsx`: Navigation with role-based menu items
- `src/components/data-table.tsx`: Reusable TanStack table wrapper
- `src/components/ui/data-table.tsx`: Data table UI primitives
- `src/components/route-guard.tsx`: Permission-based route access control

**Testing:**
- `src/lib/inventory-stock.test.ts`: Stock calculation unit tests
- `src/tests/api/`: API integration tests (sparse coverage)

## Naming Conventions

**Files:**
- Services: `[domain]-service.ts` (invoice-service, sync-service, awb-service)
- API clients: `[provider].ts` (shopify.ts, fancourier.ts, facturis.ts)
- Status mappings: `[provider]-status.ts` (fancourier-statuses.ts, trendyol-status.ts)
- Config files: `[domain]-config.ts` or `[domain]-oauth-state.ts`
- Utilities: `[feature].ts` or `utils.ts`
- Hooks: `use-[feature].ts` or `use-[feature].tsx` (React context)
- Components: PascalCase with `.tsx` extension
- Pages: `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx` (Next.js convention)

**Directories:**
- Feature domains: lowercase, plural (orders, invoices, products, stores)
- Grouped layouts: parentheses `(dashboard)`, `(auth)`
- API routes: kebab-case (e.g., `/api/invoice-series`, `/api/goods-receipts`)
- Dynamic segments: brackets `[id]`, `[resource]`

**Types & Enums:**
- Enums: UPPER_CASE_SNAKE_CASE (OrderStatus, SyncType, LogLevel)
- Interfaces: PascalCase with leading I or descriptive names (IssueInvoiceResult, SyncContext)
- Types: PascalCase descriptive names (PermissionsContextType, PrismaTransactionClient)

## Where to Add New Code

**New Feature (e.g., "Refunds"):**
1. **Database model**: Add to `prisma/schema.prisma`, run `prisma migrate dev`
2. **Service logic**: Create `src/lib/refund-service.ts` with core functions
3. **API endpoints**: Create `src/app/api/refunds/route.ts` (list), `[id]/route.ts` (detail), `create/route.ts` (POST)
4. **UI pages**: Create `src/app/(dashboard)/refunds/page.tsx` (list), `[id]/page.tsx` (detail)
5. **Components**: Add to `src/components/refunds/` (RefundForm, RefundTable, etc.)
6. **Permissions**: Add to `ALL_PERMISSIONS` in `src/lib/auth.ts` (refunds.view, refunds.create, etc.)

**New Component (UI or Layout):**
- Reusable UI: `src/components/ui/[component-name].tsx`
- Feature-specific: `src/components/[feature]/[component-name].tsx`
- Layout: `src/components/layout/[component-name].tsx`
- Follow: Radix UI composition pattern, no hard-coded colors (use Tailwind CSS classes)

**New API Route:**
- List endpoint: `src/app/api/[resource]/route.ts` with GET handler
- Detail endpoint: `src/app/api/[resource]/[id]/route.ts` with GET/PUT/DELETE
- Action endpoint: `src/app/api/[resource]/[action]/route.ts` (e.g., `/invoices/issue`, `/orders/sync`)
- Template: Session check → Permission check → Prisma query → NextResponse.json()

**New Utility/Helper:**
- General utils: `src/lib/utils.ts`
- Domain-specific: `src/lib/[domain]-utils.ts` or co-locate in service file
- Validators: `src/lib/validators.ts` (Zod schemas)

**New Hook:**
- Global state: `src/hooks/use-[feature].tsx` with React Context
- Component logic: `src/hooks/use-[feature].ts` (simple hook)
- Pattern: Export hook + optional context provider

**New Middleware/Guard:**
- Route protection: Add route to `ROUTE_PERMISSIONS` in `src/hooks/use-permissions.tsx`
- Component guard: Use `<RequirePermission permission="code">` wrapper
- API check: Call `hasPermission(userId, "code")` in handler

## Special Directories

**`prisma/migrations/`:**
- Purpose: Database migration history (auto-generated)
- Generated: Yes (by `prisma migrate dev`)
- Committed: Yes (required for reproducibility)

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by build step)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (use package-lock.json)

**`public/`:**
- Purpose: Static assets (favicon, images, fonts)
- Committed: Yes (except large binaries)

**`.planning/`:**
- Purpose: GSD codebase documentation (this file)
- Generated: By mapping agent
- Committed: Yes

**`.claude/`:**
- Purpose: Claude-specific context or cache files
- Generated: May be auto-generated
- Committed: Typically no

---

*Structure analysis: 2026-01-23*
