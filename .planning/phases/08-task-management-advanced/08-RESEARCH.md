# Phase 8: Task Management Advanced - Research

**Researched:** 2026-01-26
**Domain:** Automated Task System (Notifications, Auto-creation, Auto-complete, Activity Reports)
**Confidence:** HIGH

## Summary

This research investigates implementing advanced task management features for the ERP, building on the core task system from Phase 7. The phase includes five requirements: deadline notifications (TASK-05), activity reports (TASK-06), auto-creation from system events (TASK-07), auto-assignment (TASK-08), and auto-completion (TASK-09).

The codebase already has mature patterns for all required functionality:
1. **Notification system** - Existing `Notification` model with full CRUD API at `/api/notifications`, used by picking list system
2. **Cron infrastructure** - Established `/api/cron/*` pattern with `cron-lock.ts` for concurrent execution prevention, Railway deployment supports cron jobs
3. **Activity logging** - `ActivityLog` model and `logActivity()` helper already track entity actions
4. **Event hooks** - System events (AWB creation, order processing, picking completion) have identifiable hook points in service files

The constraint "no job queue" (deferred to v2) is handled by using the existing cron-based approach: a periodic cron job checks for conditions (deadlines, events) rather than real-time event processing.

**Primary recommendation:** Implement all features using existing patterns - cron endpoint for deadline checks/notifications, service-layer hooks for auto-task creation, state-change detection for auto-completion, and a new reports API endpoint with the ActivityLog as data source.

## Standard Stack

The established libraries/tools for this domain (already in use):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | ORM - queries for task/activity/notification | Already handles all DB operations |
| Next.js 14 API Routes | (existing) | Cron endpoints, report endpoints | Established `/api/cron/*` pattern |
| date-fns | (existing) | Date calculations (deadline proximity) | Already used in task-utils.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cron-lock.ts | (existing) | Prevent concurrent cron execution | All cron jobs that modify data |
| activity-log.ts | (existing) | Log task activities | Activity report data source |

### No New Dependencies Needed
All requirements can be met with existing codebase patterns:
- Notifications: Use existing `Notification` model + `prisma.notification.createMany()`
- Cron: Use existing `/api/cron/run-all` pattern
- Reports: Query `ActivityLog` with filtering/grouping

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   └── task-reminders/
│   │   │       └── route.ts        # NEW: Deadline notification cron
│   │   ├── tasks/
│   │   │   ├── route.ts            # EXISTING: GET/POST
│   │   │   └── [id]/
│   │   │       └── route.ts        # EXISTING: GET/PATCH/DELETE
│   │   └── reports/
│   │       └── activity/
│   │           └── route.ts        # NEW: Activity report endpoint
│   └── (dashboard)/
│       └── reports/
│           └── activity/
│               └── page.tsx        # NEW: Activity report page
├── lib/
│   ├── task-service.ts             # NEW: Auto-creation, auto-assignment logic
│   ├── task-utils.ts               # EXISTING: Date grouping, priority
│   ├── activity-log.ts             # EXISTING: Add task-specific logging
│   └── notification-utils.ts       # NEW: Task notification helpers
└── types/
    └── prisma-enums.ts             # UPDATE: Add TASK entity type
```

### Pattern 1: Cron-Based Deadline Notifications
**What:** A cron job runs periodically (e.g., every 15 minutes) to check for approaching deadlines and create notifications
**When to use:** When real-time notifications aren't required and periodic checking is acceptable
**Why:** Avoids job queue dependency; uses proven cron pattern from codebase
**Example:**
```typescript
// Source: Existing /api/cron/ads-alerts pattern
// src/app/api/cron/task-reminders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withCronLock } from "@/lib/cron-lock";
import prisma from "@/lib/db";
import { addHours, addDays, isBefore, startOfDay, endOfDay } from "date-fns";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await withCronLock("task-reminders", async () => {
    const now = new Date();

    // Find tasks with deadlines in the next 24 hours that haven't been notified
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        status: "PENDING",
        deadline: {
          gte: now,
          lte: addHours(now, 24),
        },
        assigneeId: { not: null },
        // Use a notification tracking field or check existing notifications
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const notifications = [];
    for (const task of upcomingDeadlines) {
      // Check if notification already sent (avoid duplicates)
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId!,
          type: "task_deadline_reminder",
          data: { path: ["taskId"], equals: task.id },
          createdAt: { gte: startOfDay(now) },
        },
      });

      if (!existing) {
        notifications.push({
          userId: task.assigneeId!,
          type: "task_deadline_reminder",
          title: "Deadline apropiat",
          message: `Task "${task.title}" are deadline ${formatDeadline(task.deadline)}`,
          actionUrl: `/tasks?highlight=${task.id}`,
          data: { taskId: task.id, deadline: task.deadline },
        });
      }
    }

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    return { checked: upcomingDeadlines.length, notified: notifications.length };
  });

  return NextResponse.json(result);
}
```

### Pattern 2: Event-Driven Auto Task Creation (Service Layer Hook)
**What:** Create tasks automatically when specific system events occur by hooking into existing service functions
**When to use:** When an existing service function completes an action that should trigger a task
**Why:** No need for pub/sub or job queue; direct function call after event
**Example:**
```typescript
// Source: Pattern from awb-service.ts logAWBCreated call
// src/lib/task-service.ts

import prisma from "@/lib/db";

interface AutoTaskConfig {
  taskType: string;
  defaultAssigneeRole: string; // e.g., "Picker"
  titleTemplate: string;
  descriptionTemplate?: string;
  defaultPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadlineOffset?: { hours?: number; days?: number }; // Relative to now
}

// Configuration for auto-created tasks per event type
export const AUTO_TASK_CONFIG: Record<string, AutoTaskConfig> = {
  AWB_BATCH_CREATED: {
    taskType: "PICKING",
    defaultAssigneeRole: "Picker",
    titleTemplate: "Picking pentru {awbCount} AWB-uri",
    descriptionTemplate: "Picking list {pickingListCode} generat la {timestamp}",
    defaultPriority: "HIGH",
    deadlineOffset: { hours: 4 },
  },
  ORDER_PROCESSING_ERROR: {
    taskType: "VERIFICARE",
    defaultAssigneeRole: "Manager",
    titleTemplate: "Eroare procesare comanda #{orderNumber}",
    defaultPriority: "URGENT",
  },
  INVENTORY_LOW_STOCK: {
    taskType: "BUSINESS",
    defaultAssigneeRole: "Manager",
    titleTemplate: "Stoc scazut: {productName}",
    defaultPriority: "MEDIUM",
  },
};

/**
 * Auto-create a task from a system event
 */
export async function createAutoTask(
  eventType: keyof typeof AUTO_TASK_CONFIG,
  context: Record<string, any>,
  createdByUserId: string
): Promise<{ taskId: string } | null> {
  const config = AUTO_TASK_CONFIG[eventType];
  if (!config) return null;

  // Find default assignee by role
  const assignee = await findUserByRole(config.defaultAssigneeRole);

  // Calculate deadline
  let deadline: Date | null = null;
  if (config.deadlineOffset) {
    deadline = new Date();
    if (config.deadlineOffset.hours) {
      deadline.setHours(deadline.getHours() + config.deadlineOffset.hours);
    }
    if (config.deadlineOffset.days) {
      deadline.setDate(deadline.getDate() + config.deadlineOffset.days);
    }
  }

  // Interpolate templates
  const title = interpolateTemplate(config.titleTemplate, context);
  const description = config.descriptionTemplate
    ? interpolateTemplate(config.descriptionTemplate, context)
    : null;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      type: config.taskType as any,
      priority: config.defaultPriority,
      deadline,
      assigneeId: assignee?.id || null,
      createdById: createdByUserId,
      linkedOrderId: context.orderId || null,
      linkedProductId: context.productId || null,
    },
  });

  // Notify assignee
  if (assignee) {
    await prisma.notification.create({
      data: {
        userId: assignee.id,
        type: "task_assigned",
        title: "Task nou asignat",
        message: `Ti-a fost asignat task-ul: "${title}"`,
        actionUrl: `/tasks?highlight=${task.id}`,
        data: { taskId: task.id },
      },
    });
  }

  return { taskId: task.id };
}

async function findUserByRole(roleName: string) {
  const role = await prisma.role.findFirst({
    where: { name: roleName },
    include: {
      users: {
        include: { user: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });

  const activeUsers = role?.users.filter(u => u.user.isActive) || [];
  // Return first active user (or implement round-robin later)
  return activeUsers[0]?.user || null;
}

function interpolateTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || `{${key}}`);
}
```

### Pattern 3: Auto-Completion via State Detection
**What:** Detect when the underlying action for a task is completed and auto-mark the task as done
**When to use:** When tasks are linked to entities (Order, AWB) whose state changes indicate completion
**Why:** Avoids manual task completion; ensures data consistency
**Example:**
```typescript
// Source: Pattern from picking list auto-complete (line 405 of picking/[id]/route.ts)
// Add to relevant service or cron job

/**
 * Auto-complete tasks based on linked entity state changes
 * Called periodically by cron or after specific operations
 */
export async function autoCompleteTasks(): Promise<{ completed: number }> {
  let completedCount = 0;

  // Pattern: PICKING tasks linked to orders where AWB is created
  const pickingTasks = await prisma.task.findMany({
    where: {
      type: "PICKING",
      status: "PENDING",
      linkedOrderId: { not: null },
    },
    include: {
      linkedOrder: {
        include: { awb: true },
      },
    },
  });

  for (const task of pickingTasks) {
    // Auto-complete if AWB was created and has a valid number
    if (task.linkedOrder?.awb?.awbNumber) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          // System completion - no user
        },
      });
      completedCount++;
    }
  }

  // Pattern: EXPEDIERE tasks linked to orders where AWB status is "livrat"
  const expeditieTasks = await prisma.task.findMany({
    where: {
      type: "EXPEDIERE",
      status: "PENDING",
      linkedOrderId: { not: null },
    },
    include: {
      linkedOrder: {
        include: { awb: true },
      },
    },
  });

  for (const task of expeditieTasks) {
    const status = task.linkedOrder?.awb?.currentStatus?.toLowerCase() || "";
    if (status.includes("livrat") || status.includes("delivered")) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
      completedCount++;
    }
  }

  return { completed: completedCount };
}
```

### Pattern 4: Activity Report from ActivityLog
**What:** Generate reports by querying and aggregating ActivityLog + Task completion data
**When to use:** TASK-06 activity reports ("cine a facut ce, cand")
**Why:** ActivityLog already exists with rich data; add task-specific logging
**Example:**
```typescript
// Source: Pattern from getActivityHistory in activity-log.ts
// src/app/api/reports/activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { startOfDay, endOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const canViewReports = await hasPermission(session.user.id, "reports.view");
  if (!canViewReports) {
    return NextResponse.json({ error: "Fara permisiune" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");
  const userId = searchParams.get("userId") || null;
  const startDate = subDays(new Date(), days);

  // Get completed tasks in period
  const completedTasks = await prisma.task.findMany({
    where: {
      completedAt: { gte: startDate },
      ...(userId ? { completedById: userId } : {}),
    },
    include: {
      completedBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  // Aggregate by user
  const byUser: Record<string, { name: string; tasks: number; types: Record<string, number> }> = {};

  for (const task of completedTasks) {
    const userId = task.completedById || task.assigneeId || "system";
    const userName = task.completedBy?.name || task.assignee?.name || "System";

    if (!byUser[userId]) {
      byUser[userId] = { name: userName, tasks: 0, types: {} };
    }
    byUser[userId].tasks++;
    byUser[userId].types[task.type] = (byUser[userId].types[task.type] || 0) + 1;
  }

  // Get overall stats
  const stats = {
    totalCompleted: completedTasks.length,
    byUser: Object.entries(byUser).map(([id, data]) => ({
      userId: id,
      ...data,
    })),
    byDay: groupByDay(completedTasks),
    byType: groupByType(completedTasks),
  };

  return NextResponse.json({
    success: true,
    period: { start: startDate, end: new Date(), days },
    stats,
    tasks: completedTasks,
  });
}

function groupByDay(tasks: any[]) {
  // Group completed tasks by completion date
  const byDay: Record<string, number> = {};
  for (const task of tasks) {
    if (task.completedAt) {
      const day = task.completedAt.toISOString().split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }
  }
  return byDay;
}

function groupByType(tasks: any[]) {
  const byType: Record<string, number> = {};
  for (const task of tasks) {
    byType[task.type] = (byType[task.type] || 0) + 1;
  }
  return byType;
}
```

### Anti-Patterns to Avoid
- **Real-time event bus without queue:** Don't try to build pub/sub without proper infrastructure (deferred to ADV-01)
- **Polling from frontend:** Don't have the frontend poll for notifications; use the cron approach server-side
- **Over-notification:** Don't notify on every minor event; batch notifications and respect user preferences
- **Hardcoded assignees:** Don't hardcode user IDs for auto-assignment; use role-based lookup

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deadline checking | Custom scheduler in Next.js | Cron endpoint + `withCronLock()` | Proven pattern, handles concurrency |
| Notification delivery | Custom WebSocket server | Existing `Notification` model + polling in UI | Simple, already working |
| Activity logging | Custom audit trail | `logActivity()` from activity-log.ts | Comprehensive, standardized |
| User by role lookup | Manual SQL joins | Query Role with users relation | Already established in notification code |
| Concurrent cron protection | Simple flag checking | `withCronLock()` | Handles race conditions properly |
| Date calculations | Manual arithmetic | date-fns functions | Edge cases handled (DST, timezones) |

**Key insight:** The codebase has mature patterns for periodic tasks, notifications, and activity logging. The "no job queue" constraint is not a blocker because the cron-based approach is already proven effective.

## Common Pitfalls

### Pitfall 1: Duplicate Notifications
**What goes wrong:** Same deadline reminder sent multiple times
**Why it happens:** Cron runs repeatedly without tracking what was already notified
**How to avoid:** Check for existing notification before creating new one, use notification `data` field to store taskId and check by date
**Warning signs:** Users complaining about notification spam
**Solution:** Query existing notifications with same type, taskId, and created today before inserting

### Pitfall 2: Auto-Task Creation Loops
**What goes wrong:** Creating a task triggers an event that creates another task
**Why it happens:** Poorly defined event conditions
**How to avoid:** Be explicit about event conditions; auto-tasks should not trigger new auto-tasks
**Warning signs:** Hundreds of tasks created from a single action
**Solution:** Add `isAutoCreated` flag to tasks and exclude them from event triggers

### Pitfall 3: Auto-Complete Race Conditions
**What goes wrong:** Task auto-completed but user was mid-edit
**Why it happens:** No locking between auto-complete cron and manual PATCH
**How to avoid:** Check `updatedAt` timestamp; only auto-complete if not recently modified
**Warning signs:** User reports "lost changes"
**Solution:** Add grace period check: `updatedAt < NOW() - 5 minutes`

### Pitfall 4: Activity Report Performance
**What goes wrong:** Activity report endpoint times out with large data
**Why it happens:** Unbounded queries without pagination
**How to avoid:** Always limit query results; use pagination for large reports
**Warning signs:** Slow page loads, timeouts in production
**Solution:** Default to 7 days, limit results, add indexes on `completedAt`

### Pitfall 5: Missing Assignee for Auto-Tasks
**What goes wrong:** Auto-created task has no assignee, gets lost
**Why it happens:** Role has no active users, or role doesn't exist
**How to avoid:** Fallback to creator or admin; log warning when no assignee found
**Warning signs:** Unassigned tasks accumulating
**Solution:** Query multiple fallback roles; create notification for admins about orphaned tasks

## Code Examples

Verified patterns from existing codebase:

### Creating Notifications (from process-all/route.ts)
```typescript
// Source: src/app/api/orders/process-all/route.ts lines 542-558
await prisma.notification.createMany({
  data: pickerUserIds.map(userId => ({
    userId,
    type: "picking_list_created",
    title: "Picking List Nou",
    message: `Un nou picking list (${pickingList.code}) cu ${pickingList.totalItems} produse asteapta sa fie preluat.`,
    actionUrl: `/picking/${pickingList.id}`,
    data: {
      pickingListId: pickingList.id,
      pickingListCode: pickingList.code,
      totalItems: pickingList.totalItems,
    },
  })),
});
```

### Using withCronLock (from cron-lock.ts)
```typescript
// Source: src/lib/cron-lock.ts lines 124-147
const result = await withCronLock("task-reminders", async () => {
  // Your cron job logic here
  // Lock is automatically acquired and released
  return { success: true, processed: count };
}, 10 * 60 * 1000); // 10 minute TTL

if (result.skipped) {
  console.log("Skipped - job already running");
}
```

### Finding Users by Role (from process-all/route.ts)
```typescript
// Source: src/app/api/orders/process-all/route.ts lines 524-538
const pickerRole = await prisma.role.findFirst({
  where: { name: "Picker" },
  include: {
    users: { select: { userId: true } },
  },
});

const pickerUserIds = pickerRole?.users.map(u => u.userId) || [];
```

### Logging Activity (from activity-log.ts)
```typescript
// Source: src/lib/activity-log.ts
import { logActivity } from "@/lib/activity-log";
import { EntityType, ActionType } from "@/types/prisma-enums";

await logActivity({
  entityType: EntityType.TASK,  // Add TASK to enum
  entityId: task.id,
  action: ActionType.COMPLETE_TASK, // Add to enum
  description: `Task "${task.title}" finalizat de ${userName}`,
  details: {
    taskType: task.type,
    assigneeId: task.assigneeId,
    completedAt: new Date(),
  },
  source: "auto", // or "manual"
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-memory schedulers | Database-backed cron locks | 2024+ | Survives restarts, handles scaling |
| Real-time WebSocket | Polling + periodic cron | Current project | Simpler, no infra dependency |
| Manual task completion | State-based auto-detection | Current project | Reduces user clicks, ensures consistency |
| Activity log per feature | Centralized ActivityLog | Current project | Single source of truth for reports |

**Current (good) approaches:**
- Railway cron jobs with `/api/cron/*` endpoints
- Database-level locking via `CronLock` table
- Notification model with `data` JSON for flexible metadata

**Future considerations (v2/ADV-01):**
- Job queue (BullMQ, Inngest) for complex workflows
- Real-time notifications via WebSocket/SSE
- Prisma Pulse for event-driven architecture

## Open Questions

Things that couldn't be fully resolved:

1. **Notification frequency preferences**
   - What we know: Users have `preferences` JSON field
   - What's unclear: Should users be able to disable deadline reminders?
   - Recommendation: Add to preferences later; for now, always notify assignees

2. **Auto-task creation for which events exactly**
   - What we know: AWB batch, order errors mentioned in requirements
   - What's unclear: Full list of events that should create tasks
   - Recommendation: Start with 3 events (AWB batch, processing error, picking list created), expand based on feedback

3. **Round-robin vs first-available for auto-assignment**
   - What we know: Need to assign to "responsible persons"
   - What's unclear: How to handle multiple eligible users
   - Recommendation: Start with first active user in role, implement round-robin in v2

4. **Activity report date range limits**
   - What we know: Reports can cover any period
   - What's unclear: Performance implications of large date ranges
   - Recommendation: Default 7 days, max 90 days, add warning for large ranges

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/src/app/api/cron/run-all/route.ts` - Cron orchestration pattern
- Existing codebase: `/src/lib/cron-lock.ts` - Concurrent execution prevention
- Existing codebase: `/src/app/api/orders/process-all/route.ts` lines 524-562 - Notification creation pattern
- Existing codebase: `/src/lib/activity-log.ts` - Activity logging helpers
- Existing codebase: `/prisma/schema.prisma` - Notification, Task, Role models
- Existing codebase: `/src/app/api/notifications/route.ts` - Notification CRUD API

### Secondary (MEDIUM confidence)
- [Railway Cron Jobs Documentation](https://docs.railway.com/reference/cron-jobs) - Supports cron with 5-minute minimum intervals
- [Node Schedule for flexible timing](https://medium.com/@farmaan30327/running-a-scheduled-job-in-nextjs-with-node-cron-77f0433a713b) - Alternative for in-process scheduling

### Tertiary (LOW confidence)
- [Prisma Pulse for real-time events](https://www.prisma.io/data-platform/pulse) - Future consideration for v2 (requires Prisma Cloud)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using 100% existing project patterns and libraries
- Architecture: HIGH - Extending proven cron/notification patterns
- Auto-creation hooks: MEDIUM - Requires integration points in existing services
- Auto-completion logic: MEDIUM - Entity state mapping needs validation with real data

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable patterns, internal focus)
