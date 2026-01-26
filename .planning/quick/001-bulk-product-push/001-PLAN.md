---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/manual/add_bulk_push_job.sql
  - src/app/api/products/bulk-push/route.ts
  - src/app/api/products/bulk-push/[jobId]/route.ts
  - src/app/(dashboard)/products/bulk-push/page.tsx
autonomous: true

must_haves:
  truths:
    - "User can start a bulk push to all Shopify stores"
    - "User can see real-time progress per store"
    - "Progress shows created, updated, and error counts per store"
    - "UI updates automatically via polling"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "BulkPushJob model"
      contains: "model BulkPushJob"
    - path: "src/app/api/products/bulk-push/route.ts"
      provides: "Start bulk push endpoint"
      exports: ["POST"]
    - path: "src/app/api/products/bulk-push/[jobId]/route.ts"
      provides: "Job status endpoint"
      exports: ["GET"]
    - path: "src/app/(dashboard)/products/bulk-push/page.tsx"
      provides: "Bulk push UI page"
      min_lines: 100
  key_links:
    - from: "src/app/(dashboard)/products/bulk-push/page.tsx"
      to: "/api/products/bulk-push"
      via: "fetch POST to start job"
      pattern: "fetch.*api/products/bulk-push.*POST"
    - from: "src/app/(dashboard)/products/bulk-push/page.tsx"
      to: "/api/products/bulk-push/[jobId]"
      via: "polling fetch GET for status"
      pattern: "fetch.*api/products/bulk-push.*jobId"
---

<objective>
Create a one-time bulk product push page that syncs all products to all Shopify stores with real-time progress tracking via polling.

Purpose: Enable pushing all catalog products to multiple Shopify stores simultaneously with visibility into sync progress per store.
Output: New BulkPushJob model, START/STATUS API endpoints, and UI page with progress bars per store.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@prisma/schema.prisma (first 500 lines - see existing models)
@src/app/api/products/sync-shopify/route.ts (existing sync logic to adapt)
@src/lib/shopify.ts (ShopifyClient with createProduct/updateProduct methods)
@src/components/ui/progress.tsx (shadcn Progress component)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add BulkPushJob model to Prisma schema</name>
  <files>prisma/schema.prisma, prisma/migrations/manual/add_bulk_push_job.sql</files>
  <action>
Add BulkPushJob model to prisma/schema.prisma after the existing models:

```prisma
model BulkPushJob {
  id          String   @id @default(cuid())
  status      String   @default("pending") // pending, running, completed, failed
  startedAt   DateTime @default(now())
  completedAt DateTime?
  progress    Json     @default("{}") // Per-store progress as JSON
  error       String?  // Global error message if job fails

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@map("bulk_push_jobs")
}
```

The progress JSON structure:
```json
{
  "store-id-1": { "storeName": "Store 1", "total": 100, "done": 45, "created": 10, "updated": 35, "errors": 0, "errorMessages": [] },
  "store-id-2": { "storeName": "Store 2", "total": 80, "done": 0, "created": 0, "updated": 0, "errors": 0, "errorMessages": [] }
}
```

Create manual migration SQL in `prisma/migrations/manual/add_bulk_push_job.sql`:
```sql
CREATE TABLE IF NOT EXISTS bulk_push_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bulk_push_jobs_status_idx ON bulk_push_jobs(status);
```
  </action>
  <verify>Run `npx prisma validate` - schema should be valid. Check SQL file exists and has correct syntax.</verify>
  <done>BulkPushJob model added to schema with JSON progress field, manual migration SQL created.</done>
</task>

<task type="auto">
  <name>Task 2: Create POST /api/products/bulk-push endpoint (start job)</name>
  <files>src/app/api/products/bulk-push/route.ts</files>
  <action>
Create the bulk push START endpoint. This endpoint:
1. Creates a BulkPushJob record with status "pending"
2. Queries all active Shopify stores and their product channels
3. Initializes progress JSON with store totals
4. Updates status to "running"
5. Iterates through each store and syncs products (similar to existing sync-shopify/route.ts logic)
6. Updates progress in DB after each product (or batch of 5-10 for performance)
7. Sets status to "completed" when done

Key implementation details:
- Use existing ShopifyClient from `@/lib/shopify`
- Reuse the Google Drive URL conversion logic from sync-shopify/route.ts
- Group products by store using MasterProductChannel with active Shopify channels
- Process products sequentially within each store to respect rate limits
- Update progress every 5 products to avoid excessive DB writes
- Handle errors gracefully - continue with next product, log error in errorMessages array
- Require `products.edit` permission

The endpoint should NOT use background workers - it runs synchronously but updates DB progress which the client polls.

Structure:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ShopifyClient } from "@/lib/shopify";

// Helper from sync-shopify
function getPublicGoogleDriveUrl(url: string): string | null { ... }

export async function POST(request: NextRequest) {
  // Auth check
  // Permission check (products.edit)

  // Create job record
  const job = await prisma.bulkPushJob.create({ data: { status: "pending" } });

  // Query stores and product channels
  // Initialize progress JSON with store names and totals
  // Update job to "running"

  // Process each store
  for (const [storeId, channels] of byStore) {
    // Create ShopifyClient
    // Process each product channel
    // Update progress in DB periodically
  }

  // Mark complete
  return NextResponse.json({ success: true, jobId: job.id });
}
```
  </action>
  <verify>TypeScript compiles. Endpoint returns jobId when called. Progress updates visible in DB during execution.</verify>
  <done>POST /api/products/bulk-push creates job, processes products per store, updates progress in DB.</done>
</task>

<task type="auto">
  <name>Task 3: Create GET /api/products/bulk-push/[jobId] endpoint (status)</name>
  <files>src/app/api/products/bulk-push/[jobId]/route.ts</files>
  <action>
Create the job STATUS endpoint that returns current progress for polling.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "products.view");
  if (!canView) {
    return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
  }

  const job = await prisma.bulkPushJob.findUnique({
    where: { id: params.jobId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      progress: true,
      error: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job negasit" }, { status: 404 });
  }

  return NextResponse.json(job);
}
```

Response format:
```json
{
  "id": "clxxx...",
  "status": "running",
  "startedAt": "2026-01-26T...",
  "completedAt": null,
  "progress": {
    "store-1": { "storeName": "Shop 1", "total": 100, "done": 45, "created": 10, "updated": 35, "errors": 0, "errorMessages": [] }
  },
  "error": null
}
```
  </action>
  <verify>curl GET /api/products/bulk-push/{jobId} returns job status with progress JSON.</verify>
  <done>GET endpoint returns job status with per-store progress for UI polling.</done>
</task>

<task type="auto">
  <name>Task 4: Create bulk push UI page with polling</name>
  <files>src/app/(dashboard)/products/bulk-push/page.tsx</files>
  <action>
Create the bulk push page with:

1. "Start Bulk Push" button - calls POST /api/products/bulk-push
2. Progress section showing per-store progress bars
3. Counters: Total / Created / Updated / Errors per store
4. Polling every 2 seconds while job is running
5. Success/error state when complete

Use existing patterns from the codebase:
- PageHeader component for title
- Progress component from shadcn/ui
- Card component for store progress cards
- Badge for counters
- useQuery/useMutation from tanstack-query
- toast for notifications
- Loader2 for loading states

```typescript
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface StoreProgress {
  storeName: string;
  total: number;
  done: number;
  created: number;
  updated: number;
  errors: number;
  errorMessages: string[];
}

interface JobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  progress: Record<string, StoreProgress>;
  error: string | null;
}

export default function BulkPushPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Start job mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/products/bulk-push", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        toast({ title: "Sincronizare pornita", description: "Se trimit produsele..." });
      } else {
        toast({ title: "Eroare", description: data.error, variant: "destructive" });
      }
    },
  });

  // Poll job status
  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ["bulk-push-job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/products/bulk-push/${jobId}`);
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when job is done
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Show toast when job completes
  useEffect(() => {
    if (jobStatus?.status === "completed") {
      toast({ title: "Sincronizare completa!", description: "Toate produsele au fost trimise." });
    } else if (jobStatus?.status === "failed") {
      toast({ title: "Eroare la sincronizare", description: jobStatus.error, variant: "destructive" });
    }
  }, [jobStatus?.status]);

  const isRunning = jobStatus?.status === "running" || startMutation.isPending;
  const progress = jobStatus?.progress || {};
  const stores = Object.entries(progress);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Bulk Push Produse"
        description="Trimite toate produsele catre toate magazinele Shopify"
        actions={
          <Button
            onClick={() => startMutation.mutate()}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se sincronizeaza...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Start Bulk Push
              </>
            )}
          </Button>
        }
      />

      {/* Status indicator */}
      {jobStatus && (
        <div className="mb-6">
          <Badge variant={
            jobStatus.status === "completed" ? "success" :
            jobStatus.status === "failed" ? "destructive" :
            jobStatus.status === "running" ? "default" : "secondary"
          }>
            {jobStatus.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {jobStatus.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
            {jobStatus.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {jobStatus.status.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Store progress cards */}
      {stores.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map(([storeId, store]) => {
            const percent = store.total > 0 ? Math.round((store.done / store.total) * 100) : 0;
            return (
              <Card key={storeId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{store.storeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={percent} className="mb-2" />
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{store.done} / {store.total}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">Create: {store.created}</Badge>
                    <Badge variant="secondary">Update: {store.updated}</Badge>
                    {store.errors > 0 && (
                      <Badge variant="destructive">Erori: {store.errors}</Badge>
                    )}
                  </div>
                  {store.errorMessages.length > 0 && (
                    <div className="mt-2 text-xs text-destructive max-h-20 overflow-y-auto">
                      {store.errorMessages.slice(0, 3).map((msg, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{msg}</span>
                        </div>
                      ))}
                      {store.errorMessages.length > 3 && (
                        <div className="text-muted-foreground">+{store.errorMessages.length - 3} more errors</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!jobId && !isRunning && (
        <Card className="text-center py-12">
          <CardContent>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Apasa butonul pentru a incepe sincronizarea produselor cu toate magazinele Shopify.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

Key UX details:
- Disable button while running
- Show loading spinner on button
- Per-store cards with progress bar
- Badge colors: success for completed, destructive for failed, default for running
- Show first 3 error messages per store, with "+N more" indicator
- Empty state when no job started yet
  </action>
  <verify>Page loads at /products/bulk-push. Button starts job. Progress bars update every 2 seconds. Completion shows toast.</verify>
  <done>Bulk push UI page with real-time polling progress per store.</done>
</task>

<task type="auto">
  <name>Task 5: Add navigation link to products page</name>
  <files>src/app/(dashboard)/products/page.tsx</files>
  <action>
Add a "Bulk Push" button/link in the products page header actions, next to existing "Sync Shopify" button.

Find the PageHeader actions section and add:

```tsx
<Link href="/products/bulk-push">
  <Button variant="outline" size="sm" className="md:size-default">
    <Upload className="h-4 w-4 md:mr-2" />
    <span className="hidden md:inline">Bulk Push</span>
  </Button>
</Link>
```

Add to imports:
- Upload icon is already imported from lucide-react
- Link is already imported from next/link

Place it after the "Sync Shopify" button and before "Mapare Inventar" link.
  </action>
  <verify>Products page shows "Bulk Push" button in header. Clicking navigates to /products/bulk-push.</verify>
  <done>Navigation link added to products page for easy access to bulk push feature.</done>
</task>

<task type="auto">
  <name>Task 6: Run migration and test end-to-end</name>
  <files>None (verification only)</files>
  <action>
1. Run the manual migration:
   ```bash
   psql $DATABASE_URL -f prisma/migrations/manual/add_bulk_push_job.sql
   ```
   Or if using Prisma migrate:
   ```bash
   npx prisma db push
   ```

2. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Verify the full flow:
   - Navigate to /products/bulk-push
   - Click "Start Bulk Push"
   - Verify jobId is returned
   - Verify progress updates in UI (polling working)
   - Check DB: SELECT * FROM bulk_push_jobs
   - Verify products appear in Shopify stores

4. Test error handling:
   - Try with invalid Shopify credentials (should show error in progress)
   - Verify job continues even if one product fails
  </action>
  <verify>
- `SELECT * FROM bulk_push_jobs` shows job record with progress JSON
- UI shows real-time progress bars
- Products appear in Shopify admin
- Errors are captured in errorMessages array
  </verify>
  <done>Migration applied, Prisma regenerated, end-to-end flow verified working.</done>
</task>

</tasks>

<verification>
Overall feature verification:
1. Navigate to /products page - "Bulk Push" button visible
2. Click "Bulk Push" - navigates to /products/bulk-push
3. Click "Start Bulk Push" - job starts, button shows loading state
4. Progress cards appear for each store
5. Progress bars update every 2 seconds
6. Created/Updated/Error counters increment
7. When complete, toast notification appears
8. Check Shopify admin - products are synced
</verification>

<success_criteria>
- BulkPushJob model exists in Prisma schema
- POST /api/products/bulk-push creates job and syncs products
- GET /api/products/bulk-push/[jobId] returns current progress
- /products/bulk-push page shows real-time progress per store
- Navigation link exists on products page
- Error handling captures per-product failures without stopping job
</success_criteria>

<output>
After completion, create `.planning/quick/001-bulk-product-push/001-SUMMARY.md`
</output>
