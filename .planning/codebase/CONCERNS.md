# Codebase Concerns

**Analysis Date:** 2026-01-23

## Tech Debt

**Large Monolithic Components:**
- Issue: Several UI components exceed 2000 lines (max is 2536 LOC in `meta-ads.ts`)
- Files:
  - `src/lib/meta-ads.ts` (2536 lines)
  - `src/app/(dashboard)/orders/page.tsx` (2301 lines)
  - `src/app/(dashboard)/settings/page.tsx` (1624 lines)
  - `src/lib/fancourier.ts` (1235 lines)
- Impact: Difficult to test, maintain, and modify; high risk of introducing bugs during changes
- Fix approach: Extract smaller, reusable functions/hooks; split components by concern (data fetching, display, mutations)

**OAuth State Management in Memory:**
- Issue: OAuth state stored in `globalThis.pendingOAuthStates` Map without persistent cleanup mechanism
- Files: `src/lib/ads-oauth-state.ts`
- Impact: Memory accumulation in production; expired states may not be cleaned if cleanup function isn't called regularly; potential token leaks across recompilations
- Fix approach: Implement time-based cleanup as part of cron job; consider Redis/DB storage for multi-instance deployments; ensure cleanup runs on server startup

**Debug Logging Always Enabled:**
- Issue: `DEBUG_OAUTH = true` hardcoded with comment "Always enabled for now"
- Files: `src/lib/ads-oauth-state.ts` (line 25)
- Impact: Logs leaking sensitive state information (user IDs, platform details) to console in production
- Fix approach: Move to environment variable (DEBUG_OAUTH_LOGS); disable by default in production; add log level controls

**Token Caching Without Expiration Validation:**
- Issue: FanCourier tokens cached for 23 hours without checking server-side expiration before use
- Files: `src/lib/fancourier.ts` (lines 86-89)
- Impact: Requests fail silently if token expires server-side before 23-hour mark; no fallback to re-auth
- Fix approach: Add token validation request before using cached token; implement exponential backoff on auth failures

**Missing Input Validation in API Routes:**
- Issue: Many routes accept JSON without schema validation; only basic presence checks
- Files:
  - `src/app/api/orders/process/route.ts` (basic array check only)
  - `src/app/api/settings/route.ts` (no validation)
  - `src/app/api/products/bulk/route.ts` (minimal validation)
- Impact: Malformed requests can cause crashes; wrong data types accepted without coercion/rejection
- Fix approach: Implement Zod schemas for all API payloads; validate before processing

**No Transaction Handling for Multi-Step Operations:**
- Issue: Order processing creates invoice then AWB in sequence without database transaction
- Files: `src/app/api/orders/process/route.ts` (lines 64-155)
- Impact: If AWB creation fails after invoice succeeds, data becomes inconsistent; no rollback mechanism
- Fix approach: Wrap order processing in Prisma transaction; handle rollback for failed operations

**Inline SQL String Concatenation Risk:**
- Issue: Manual migration script processes SQL files with limited injection protection
- Files: `scripts/force-migration.js` (regex-based statement splitting)
- Impact: Malformed SQL in migration files could cause unexpected behavior; limited error context
- Fix approach: Use Prisma migrations exclusively; remove manual SQL execution script

---

## Known Bugs

**Image Sync Unique Constraint Violation:**
- Symptoms: Endpoint returns 500 error when syncing product images that already exist
- Error: `Unique constraint failed on (productId, position)`
- Files: `src/app/api/products/sync-images/route.ts`
- Trigger: POST request to `/api/products/sync-images` for products with existing images
- Workaround: None; requires fix. Currently users must manually delete images first.
- Root cause: Code creates new image records without checking if they exist or deleting old ones

**SKU Duplicate in Product Creation Dropdown:**
- Symptoms: Dropdown in product creation dialog shows SKUs already assigned to MasterProducts
- Files: `src/app/(dashboard)/products/page.tsx`
- Trigger: Open product creation dialog after adding inventory items
- Workaround: Manually avoid selecting duplicate SKUs
- Root cause: Inventory products query doesn't filter out existing MasterProduct SKUs

**Missing Product Line Items in Order Details:**
- Symptoms: Order detail dialog shows order info but no product list
- Files: `src/app/(dashboard)/orders/page.tsx` (TODO comment line not implemented)
- Trigger: Click "View" on any order to open details dialog
- Workaround: None; users cannot see what products are in orders from UI
- Root cause: lineItems relationship not fetched or displayed in order dialog

**Notification Spam from Ads Webhooks:**
- Symptoms: Multiple notifications created for same event
- Files: `src/app/api/webhooks/meta/route.ts` (line 52-61)
- Trigger: Meta webhook fires multiple times for single campaign change
- Workaround: Dismiss notifications manually
- Root cause: No deduplication of events; each webhook payload creates notifications for all ads users

**Invoice Series Auto-Correct Not Idempotent:**
- Symptoms: Running invoice generation multiple times can set currentNumber to unexpected values
- Files: Related to invoice series synchronization
- Trigger: Multiple rapid requests to sync invoice series
- Root cause: Auto-correction logic in recent fix (commit 3cd1baf) may not handle edge cases

---

## Security Considerations

**Authentication Token Verification:**
- Risk: Webhook token comparison uses string equality, susceptible to timing attacks
- Files: `src/app/api/webhooks/meta/route.ts` (line 97: `config.verifyToken !== token`)
- Current mitigation: Token stored in DB; production uses HTTPS
- Recommendations:
  - Use constant-time comparison (crypto.timingSafeEqual)
  - Implement webhook signature verification (HMAC)
  - Rate-limit webhook endpoints
  - Add request logging for security audit

**Credentials in Request Bodies:**
- Risk: Courier/payment provider credentials sent in clear HTTP POST bodies
- Files: API routes for credentials (settings, courier setup)
- Current mitigation: HTTPS enforced via middleware
- Recommendations:
  - Use encrypted credential storage
  - Never log full credentials (mask sensitive fields)
  - Implement credential rotation
  - Add encryption at rest for DB credentials

**User-Supplied Input to Courier APIs:**
- Risk: Address data from orders sent to FanCourier without sanitization
- Files: `src/lib/fancourier.ts` (lines 150-300+)
- Impact: Potential for special character injection in delivery addresses
- Recommendations:
  - Validate addresses against expected patterns
  - Sanitize special characters before sending to courier API
  - Add integration tests with courier test environment

**No Rate Limiting on API Endpoints:**
- Risk: Sync endpoints can be called unlimited times, causing resource exhaustion
- Files: `/api/products/sync-stock`, `/api/orders/sync`, `/api/ads/accounts/[id]/sync`
- Impact: Denial of service via repeated sync requests
- Recommendations:
  - Implement per-user rate limiting (e.g., 1 sync per minute)
  - Add request deduplication (prevent duplicate sync within 30 seconds)
  - Queue sync operations instead of running inline

**RBAC Permission Checks Incomplete:**
- Risk: Some API routes perform minimal permission validation
- Files: Many API routes check only basic `hasPermission` call
- Impact: Subtle permission bypasses possible with complex role structures
- Recommendations:
  - Audit all API routes for store-level permission scoping
  - Ensure users can only access resources from their authorized stores
  - Add integration tests for multi-store access control

**Hardcoded Verify Tokens in Development:**
- Risk: OAuth and webhook tokens may be visible in git history or comments
- Files: Configuration scattered across repo
- Recommendations:
  - Remove any development/test tokens from version control
  - Use environment variables exclusively
  - Add pre-commit hooks to catch secrets

---

## Performance Bottlenecks

**N+1 Query Patterns in List Views:**
- Problem: Order/product list queries fetch records but may load relations individually per row
- Files:
  - `src/app/(dashboard)/orders/page.tsx`
  - `src/app/(dashboard)/products/page.tsx`
  - `src/app/(dashboard)/inventory/page.tsx`
- Cause: React components fetch order data, then for each row fetch store/invoice/AWB details individually
- Performance impact: 100 orders = 1 base query + 300+ follow-up queries (store, invoice, awb × order count)
- Improvement path:
  - Use Prisma `include` to eagerly load relations
  - Implement API endpoint to batch-fetch with all relations
  - Add query caching layer (React Query with proper invalidation)

**Synchronization Operations Block Request Handler:**
- Problem: `/api/products/sync-stock`, `/api/orders/sync` run inline without async job queue
- Files: Multiple sync endpoints
- Cause: Large sync operations (100+ products/orders) complete before response sent
- Performance impact: Long response times; potential timeout on large datasets
- Improvement path:
  - Implement job queue (Bull, Resque, or cron-based)
  - Return job ID immediately, poll for status
  - Process syncs in background with progress tracking

**Unoptimized Database Queries for Bulk Operations:**
- Problem: Backup/export endpoints load full records without pagination
- Files: `src/app/api/backup/route.ts`, `src/app/api/cron/backup/route.ts`
- Cause: `findMany()` without limit for all stores, orders, invoices
- Performance impact: Memory overflow on large databases; slow exports
- Improvement path:
  - Implement cursor-based pagination
  - Stream responses instead of loading into memory
  - Use database views for common aggregations

**Expensive Permission Queries on Every Request:**
- Problem: Permission checks load entire role/permission tree
- Files: `src/lib/permissions.ts` (line 426, 438)
- Cause: `findMany` for all stores even when checking single permission
- Performance impact: Every API request may trigger complex permission lookups
- Improvement path:
  - Cache permission results per user/session
  - Use simplified permission check for common operations
  - Denormalize permissions for frequently-checked rights

---

## Fragile Areas

**OAuth State Cleanup Timing:**
- Files: `src/lib/ads-oauth-state.ts`
- Why fragile: Expired states only cleaned when cleanup function is called; no automatic trigger
- Safe modification:
  - Always call cleanupExpiredStates in cron or middleware
  - Add tests to verify stale states are removed
  - Document cleanup requirement
- Test coverage: No tests for cleanup logic; brittle to accidental removal

**FanCourier Token Caching:**
- Files: `src/lib/fancourier.ts`
- Why fragile: No mechanism to detect if token expired server-side; silent failures possible
- Safe modification:
  - Add try-catch around all token-using operations
  - Implement retry logic with re-authentication on 401
  - Add monitoring for token failures
- Test coverage: No test for expired token scenario

**Order Processing Sequential Dependency:**
- Files: `src/app/api/orders/process/route.ts`
- Why fragile: Invoice creation must succeed before AWB; no rollback if AWB fails
- Safe modification:
  - Wrap both operations in transaction
  - Add tests for partial failure scenarios
  - Implement error recovery UI
- Test coverage: No tests for mixed success/failure cases

**Invoice Series Auto-Correction Logic:**
- Files: Invoice series sync and generation code
- Why fragile: Recent fix (3cd1baf) auto-corrects but may have edge cases
- Safe modification:
  - Add comprehensive test suite for edge cases (negative numbers, zero, large gaps)
  - Add monitoring/alerts for corrections happening
  - Require manual intervention for series > 10 issues
- Test coverage: Limited tests; logic changed recently

**Multi-Store Admin Permission Gaps:**
- Files: `src/lib/permissions.ts`
- Why fragile: Complex RBAC logic with store-level scoping
- Safe modification:
  - Add thorough integration tests for each role
  - Document permission expectations per role
  - Audit queries to ensure store filtering applied
- Test coverage: No integration tests for RBAC scenarios

---

## Scaling Limits

**OAuth State Map Unbounded Growth:**
- Current capacity: Limited by server memory (typically 500MB-1GB for Node process)
- Estimate: Each state object ~500 bytes; 1GB = ~2M states
- Limit: Exceeds available memory in production
- Scaling path:
  - Move to Redis for distributed cleanup
  - Implement TTL-based auto-removal in database
  - Add monitoring for state map size

**Webhook Queue Not Persistent:**
- Current capacity: In-memory notifications; lost on server restart
- Limit: No queue persistence; webhooks during deployment lose events
- Impact: Missing ads campaign status updates, inconsistent data
- Scaling path:
  - Implement durable event queue (Postgres LISTEN/NOTIFY, Bull, RabbitMQ)
  - Add webhook retry logic
  - Log all webhook payloads for replay if needed

**Session Management Without Pooling:**
- Current capacity: Prisma Client default pool (2-10 connections)
- Limit: Concurrent requests > connection pool size = request queueing
- Impact: Slow API response times under load; timeouts under high concurrency
- Scaling path:
  - Configure Prisma connection pooling (via PgBouncer)
  - Add monitoring for connection pool saturation
  - Use read replicas for read-heavy queries

**Backup Operations Not Incremental:**
- Current capacity: Full database dump; grows linearly with data
- Limit: Backup size = database size; takes longer as data grows
- Scaling path:
  - Implement incremental backups (log-based or CDC)
  - Use database snapshots (if using managed DB)
  - Archive old data to cold storage

---

## Dependencies at Risk

**NextAuth.js v4 (Out of Support):**
- Risk: Package not receiving security updates; v5 is current
- Current version: ^4.24.7 (from package.json)
- Impact: Security vulnerabilities may accumulate; OAuth providers change compatibility
- Migration plan:
  - Major upgrade required; breaking changes in auth callbacks
  - Alternative: Maintain current version with security patches only
  - Timeline: Plan migration before EOL announcement

**Prisma v5 (Evolving):**
- Risk: Schema changes between versions; potential breaking changes
- Current version: ^5.10.2
- Impact: Major version upgrades may require schema rewrites
- Migration plan:
  - Test major upgrades in staging environment first
  - Keep migration scripts for schema changes
  - Document custom SQL migrations separately

**Deprecated Dependencies - iconv-lite:**
- Risk: Used for charset conversion; alternative libraries available
- Current version: ^0.6.3
- Impact: No longer actively maintained
- Migration plan:
  - Consider `encoding` or `utf8-to-utf16` alternatives
  - Test with real courier data before migration

**Older Testing Framework - Vitest:**
- Risk: Version 4.0.17 may lack newer features; Jest more standard
- Current version: ^4.0.17 (old relative to current stable)
- Impact: Limited test framework features; integration with newer tools
- Migration plan: Plan gradual update to latest Vitest or Jest migration

---

## Missing Critical Features

**No Data Export/Compliance Feature:**
- Problem: No way to export user data for GDPR compliance
- Blocks: Cannot fulfill data export requests; legal compliance
- Implementation approach:
  - Add API endpoint to export user data as JSON
  - Include related records (orders, invoices, etc.)
  - Add audit logging for data exports

**No Backup Verification:**
- Problem: Backups created but never tested for restoration
- Blocks: Cannot verify backups work; risk of unrecoverable data loss
- Implementation approach:
  - Add test restore endpoint (in staging)
  - Schedule backup verification jobs
  - Alert on backup failures

**No Request Audit Logging:**
- Problem: Who changed what and when not tracked for most operations
- Blocks: Cannot trace source of data issues; security incidents undetectable
- Implementation approach:
  - Add logging to all mutations (create, update, delete)
  - Store user, timestamp, old/new values
  - Implement audit log viewer

**No Bulk Error Handling UI:**
- Problem: When bulk sync fails, users see no details about individual failures
- Blocks: Cannot retry specific failed items
- Implementation approach:
  - Return detailed error per item in bulk operations
  - UI to show success/failure count and list of failures
  - Allow retry on individual items

---

## Test Coverage Gaps

**No Tests for OAuth State Lifecycle:**
- What's not tested: State creation, expiration, cleanup, concurrent access
- Files: `src/lib/ads-oauth-state.ts`
- Risk: Memory leaks, race conditions not caught
- Priority: HIGH
- Implementation: Add vitest suite for state lifecycle scenarios

**No Integration Tests for Multi-Store RBAC:**
- What's not tested: Users accessing only their assigned stores
- Files: `src/lib/permissions.ts`, multiple API routes
- Risk: Store access control bypass possible
- Priority: HIGH
- Implementation: Test suite with multiple users and stores

**No Integration Tests for Order Processing:**
- What's not tested: Full flow invoice → AWB with various failure modes
- Files: `src/app/api/orders/process/route.ts`
- Risk: Partial failures, data inconsistency undetected
- Priority: HIGH
- Implementation: Test success, invoice failure, AWB failure scenarios

**No Tests for Concurrent Sync Operations:**
- What's not tested: Two users syncing simultaneously
- Files: All sync endpoints
- Risk: Race conditions, duplicate data
- Priority: MEDIUM
- Implementation: Concurrent request test simulation

**No Tests for Database Constraint Violations:**
- What's not tested: Unique constraint, foreign key violations
- Files: All create/update operations
- Risk: Unclear error messages, poor UX
- Priority: MEDIUM
- Implementation: Test constraint violation error handling

**No Tests for API Rate Limiting:**
- What's not tested: Repeated rapid requests to sync endpoints
- Files: All sync/cron endpoints
- Risk: DoS vulnerability, resource exhaustion
- Priority: MEDIUM
- Implementation: Rate limiting with test verification

**No Tests for Webhook Signature Validation:**
- What's not tested: Invalid signatures, replay attacks
- Files: `src/app/api/webhooks/meta/route.ts`, TikTok webhook
- Risk: Forged webhook events, data corruption
- Priority: HIGH
- Implementation: Test with invalid/missing signatures

---

*Concerns audit: 2026-01-23*
