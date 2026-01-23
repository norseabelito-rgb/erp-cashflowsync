# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Full-stack Next.js monolith with modular business logic layer

**Key Characteristics:**
- Next.js App Router for frontend and API routing
- Client-server separation via React context providers and API boundaries
- Domain-driven services layer for business logic (`/src/lib`)
- Role-based access control (RBAC) enforced at API and component levels
- Transaction-based data consistency for invoice and order operations
- Event-driven sync system for external integrations

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle client-side state, route guards
- Location: `src/app/(dashboard)/`, `src/components/`
- Contains: Page components, UI components (Radix primitives), layout shells
- Depends on: React Query hooks, context providers, custom hooks
- Used by: Browser clients

**API Layer:**
- Purpose: HTTP endpoints following REST conventions, auth/permission checks, data transformation
- Location: `src/app/api/`
- Contains: Route handlers (GET/POST/PUT/DELETE), request validation, NextAuth integration
- Depends on: Prisma client, service layer, permission utilities
- Used by: Frontend, webhooks, external services

**Service Layer:**
- Purpose: Encapsulate business logic, external API integrations, data transformations
- Location: `src/lib/`
- Contains: Services (invoice-service.ts, sync-service.ts, etc.), API clients (Shopify, FanCourier, Facturis, Trendyol), utility functions
- Depends on: Prisma ORM, environment configuration, logging
- Used by: API routes, scheduled tasks, background jobs

**Data Access Layer:**
- Purpose: ORM and database abstraction
- Location: `prisma/schema.prisma`, `src/lib/db.ts`
- Contains: Prisma schema definitions, transaction management
- Depends on: PostgreSQL database
- Used by: All layers via prisma client

**State Management:**
- Client-side: React Query (TanStack Query) for server state, React Context for UI state
- Location: `src/providers.tsx`, `src/hooks/use-permissions.tsx`, `src/hooks/use-display.tsx`
- Server-side: Database as source of truth, Prisma caching disabled for consistency

## Data Flow

**Order Processing Flow:**

1. External channels (Shopify/Trendyol/EMAG) → Webhooks or API polling
2. `src/app/api/webhooks/shopify/route.ts` or sync endpoint → Process incoming orders
3. `src/lib/sync-service.ts:syncSingleOrder()` → Validate and normalize order data
4. `src/lib/invoice-service.ts:issueInvoice()` → Generate invoice via Facturis API
5. `src/lib/awb-service.ts` → Create shipping label via FanCourier API
6. Database updates via Prisma transactions → Update order and related entities
7. Frontend polls via React Query → UI reflects changes

**Permission Resolution Flow:**

1. API route handler → `getServerSession()` extracts user ID
2. `src/lib/permissions.ts:hasPermission()` → Query Prisma for user roles/permissions
3. RBAC model: User → UserRoleAssignment/UserGroupMembership → Role → RolePermission → Permission
4. Response: boolean authorization decision
5. Frontend: `usePermissions()` context fetches via `/api/rbac/users` on mount
6. Component: `<RequirePermission>` conditionally renders based on permission set

**State Management Flow:**

1. React Query caches fetch results with 1-minute stale time
2. Mutations invalidate related queries on success
3. Optimistic updates for form submissions
4. Context providers (SessionProvider, ThemeProvider, QueryClientProvider) wrap app tree

## Key Abstractions

**Service Classes:**

- `InvoiceService`: Handles invoice creation, cancellation, numbering sequences
  - Location: `src/lib/invoice-service.ts`
  - Pattern: Static methods with transaction support
  - Key: Atomic number increment + Facturis API call + database save

- `SyncService`: Orchestrates order/invoice/AWB synchronization
  - Location: `src/lib/sync-service.ts`
  - Pattern: Session-based logging with event tracking
  - Key: Coordinated updates across multiple external APIs

- `AwbService`: Shipping label management (FanCourier integration)
  - Location: `src/lib/awb-service.ts`
  - Pattern: Status tracking, delivery updates via webhooks
  - Key: Sync between platform status and FanCourier states

**API Client Adapters:**

- `FanCourierClient`: FanCourier SOAP API wrapper
  - Location: `src/lib/fancourier.ts` (1235 lines)
  - Pattern: SOAP to JSON mapping, status enum conversion
  - Key: XML parsing, courier tracking data normalization

- Facturis API: E-invoice generation
  - Location: `src/lib/facturis.ts` (1058 lines)
  - Pattern: Invoice data validation, XML generation, PDF retrieval
  - Key: Company-specific invoice numbering, automatic storno (reversal) creation

- Shopify API: Order and product sync
  - Location: `src/lib/shopify.ts` (678 lines)
  - Pattern: REST API pagination, webhook validation
  - Key: Order polling, inventory level sync

- Trendyol API: Marketplace integration
  - Location: `src/lib/trendyol.ts` (1067 lines)
  - Pattern: REST API with custom status mappings
  - Key: Order acknowledgment, shipment updates

- Meta Ads / TikTok Ads: Campaign management
  - Location: `src/lib/meta-ads.ts`, `src/lib/tiktok-ads.ts`
  - Pattern: OAuth authentication, insights aggregation, campaign CRUD
  - Key: Multi-platform reconciliation of campaign metrics

**Permission System:**

- Location: `src/lib/permissions.ts`, `src/hooks/use-permissions.tsx`
- Pattern: Database-backed RBAC with frontend caching
- Key: Super-admin bypass, dynamic permission fetching

**Context Providers:**

- `PermissionsProvider`: Manages user permissions and group memberships
  - Entry: `src/hooks/use-permissions.tsx`
  - Cache invalidation: Manual via `refetch()`

- `SessionProvider`: NextAuth session management
  - Entry: Built-in via `next-auth/react`

- `QueryClientProvider`: React Query configuration
  - Entry: `src/providers.tsx`
  - Settings: 1-minute stale time, no refetch on window focus

## Entry Points

**Application Entry:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Client-side redirect to `/dashboard` (allows health checks to pass with 200)

**Dashboard Entry:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: User authentication + permission routing
- Responsibilities: Wrap dashboard with permission/display/sync providers, render sidebar

**API Entry Points (Examples):**
- `src/app/api/invoices/route.ts`: GET invoices with filtering/search
- `src/app/api/orders/[id]/sync/route.ts`: POST to sync single order
- `src/app/api/invoices/issue/route.ts`: POST to create new invoice
- `src/app/api/awb/[id]/route.ts`: GET AWB details, PUT to update status
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth callback handler

**Webhook Entry Points:**
- `src/app/api/webhooks/shopify/route.ts`: Shopify order webhooks
- `src/app/api/webhooks/meta/route.ts`: Meta (Facebook) ads events
- `src/app/api/fancourier/services/route.ts`: FanCourier status updates

**Background Job Entry:**
- `src/app/api/cron/sync/route.ts`: Scheduled synchronization trigger (via external cron service)

## Error Handling

**Strategy:** Result-based error handling with detailed logging

**Patterns:**

- API routes: Return NextResponse with error status codes (401, 403, 500) and error message JSON
- Services: Throw specific error types or return result objects with `success: boolean` and `error?: string`
- Transactions: Use Prisma transaction rollback on error; implement manual rollback for invoice numbers
- Logging: Console error logging with context (service name, operation, user ID, details)
- User feedback: Error messages returned in API responses, displayed in toasts via React Query

**Example from invoice-service.ts:**
```typescript
export interface IssueInvoiceResult {
  success: boolean;
  invoiceNumber?: string;
  error?: string;
  errorCode?: string;
}
```

## Cross-Cutting Concerns

**Logging:**
- Approach: Console-based structured logging with context attached to sync sessions
- Location: `src/lib/activity-log.ts` for audit trail, `src/lib/sync-service.ts` for operation logs
- Format: `[Context] Message: details` (e.g., `[Invoice] Rollback number: errors`)

**Validation:**
- Approach: Zod schemas for API request bodies, type guards for Prisma responses
- Location: `src/lib/validators.ts`
- Used by: API routes before processing

**Authentication:**
- Approach: NextAuth.js with Prisma adapter, JWT-based sessions
- Providers: Google OAuth, Email/password credentials
- Location: `src/lib/auth.ts` (NextAuth options, permission setup)
- Super-admin bypass: `isSuperAdmin` flag bypasses all permission checks

**Authorization:**
- Approach: Two-level RBAC (User→Role→Permission and User→Group→Role→Permission)
- Enforcement: API route middleware via `hasPermission(userId, code)`, component guards via `<RequirePermission>`
- Location: `src/lib/permissions.ts`, `src/hooks/use-permissions.tsx`

**Rate Limiting:**
- Approach: Not explicitly configured; relies on external API rate limits
- External APIs: Shopify (40 req/sec), Facturis (varies), FanCourier (varies)

**Caching:**
- Client: React Query with 1-minute stale time
- Server: Database as cache (Prisma doesn't cache by default)
- External: API-specific caching (e.g., campaign insights cached daily in database)

**State Consistency:**
- Approach: Database transactions for multi-step operations
- Key pattern: Increment sequence + API call + save record in same transaction
- Fallback: Rollback functions (e.g., `rollbackInvoiceNumber`) for API failures

---

*Architecture analysis: 2026-01-23*
