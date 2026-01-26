# Phase 7: Task Management Core - Research

**Researched:** 2026-01-26
**Domain:** Task Management System with Prisma/Next.js
**Confidence:** HIGH

## Summary

This research investigates implementing a task management system for an ERP application, building on existing patterns established in the codebase (Orders, Invoices pages). The system requires CRUD operations for tasks with filtering, sorting, grouping by date, and file attachments.

The codebase already has well-established patterns for list pages with table views (Invoices, Orders), API route handlers with authentication/authorization, file uploads (AWBComment system), and UI components (shadcn/ui). The task management implementation should follow these existing patterns rather than introducing new approaches.

Key findings:
1. The existing Prisma schema patterns and API route structures provide a clear template
2. File attachments should follow the AWBCommentImage pattern already in use
3. Table list views with filtering should match Orders/Invoices page patterns
4. Date grouping (Today, Tomorrow, This Week, Later) can be computed client-side from task deadlines

**Primary recommendation:** Build the Task model following existing Prisma patterns (cuid IDs, audit timestamps, User relations), create API routes mirroring `/api/invoices` structure, and implement the UI following the Invoices page pattern with table, filter bar, and action dropdowns.

## Standard Stack

The established libraries/tools for this domain (already in use in the project):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | (existing) | ORM for PostgreSQL | Already used throughout project, provides type safety |
| Next.js 14 | (existing) | App router with API routes | Project foundation |
| @tanstack/react-query | (existing) | Server state management | Used in all list pages |
| shadcn/ui | (existing) | UI components | Consistent design system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | (add if needed) | Date manipulation | Computing date groups (today, tomorrow, etc.) |
| lucide-react | (existing) | Icons | Task type icons, action buttons |
| class-variance-authority | (existing) | Component variants | Priority badges |

### Already Available (No Installation Needed)
- Table, Card, Button, Badge, Dialog, DropdownMenu, Select, Input, Textarea
- TooltipProvider, ActionTooltip
- EmptyState, SkeletonTableRow
- useErrorModal hook
- FILTER_BAR, STATUS_STYLES design tokens

**Installation:**
```bash
# date-fns may already be installed, verify first
npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── tasks/
│   │       └── page.tsx         # Main tasks list page
│   └── api/
│       └── tasks/
│           ├── route.ts         # GET (list), POST (create)
│           └── [id]/
│               ├── route.ts     # GET, PATCH, DELETE
│               └── complete/
│                   └── route.ts # POST (mark complete/reopen)
├── components/
│   └── tasks/
│       ├── task-form-dialog.tsx # Create/edit dialog
│       └── task-filters.tsx     # Filter presets component
├── lib/
│   └── task-utils.ts           # Date grouping, sorting helpers
└── prisma/
    └── schema.prisma           # Task, TaskAttachment models
```

### Pattern 1: Prisma Model with Enum Types
**What:** Define task model following existing patterns (cuid IDs, DateTime fields, User relations)
**When to use:** All new database models
**Example:**
```prisma
// Source: Existing schema patterns (Order, AWBComment models)
enum TaskType {
  PICKING       // Picking din depozit
  VERIFICARE    // Verificare comanda
  EXPEDIERE     // Expediere colet
  MEETING       // Intalnire
  DEADLINE      // Termen limita
  FOLLOW_UP     // Urmarire
  BUSINESS      // Task business general
  OTHER         // Altele
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING       // Task activ
  COMPLETED     // Finalizat
}

model Task {
  id          String       @id @default(cuid())

  // Core fields
  title       String
  description String?      @db.Text
  type        TaskType     @default(BUSINESS)
  priority    TaskPriority @default(MEDIUM)
  status      TaskStatus   @default(PENDING)

  // Deadline (optional per CONTEXT.md)
  deadline    DateTime?

  // Assignment
  assigneeId  String?
  assignee    User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])

  // Creator tracking (metadata only, no special permissions)
  createdById String
  createdBy   User         @relation("TaskCreator", fields: [createdById], references: [id])

  // Linked entities (optional)
  linkedOrderId   String?
  linkedOrder     Order?   @relation(fields: [linkedOrderId], references: [id])
  linkedProductId String?
  linkedProduct   MasterProduct? @relation(fields: [linkedProductId], references: [id])
  linkedInvoiceId String?
  linkedInvoice   Invoice? @relation(fields: [linkedInvoiceId], references: [id])

  // Completion tracking
  completedAt   DateTime?
  completedById String?
  completedBy   User?      @relation("TaskCompleter", fields: [completedById], references: [id])

  // Reassignment tracking
  reassignmentNote String?  @db.Text

  // Attachments
  attachments TaskAttachment[]

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([assigneeId])
  @@index([status])
  @@index([deadline])
  @@index([type])
  @@index([priority, deadline])
  @@map("tasks")
}

model TaskAttachment {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  filename    String
  storagePath String
  mimeType    String
  size        Int

  uploadedById String
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  createdAt   DateTime @default(now())

  @@index([taskId])
  @@map("task_attachments")
}
```

### Pattern 2: API Route with Authentication/Authorization
**What:** Next.js route handler following existing patterns
**When to use:** All API endpoints
**Example:**
```typescript
// Source: /api/invoices/route.ts pattern
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "tasks.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza task-uri" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const preset = searchParams.get("preset"); // today, overdue, this_week, my_tasks

    const where: any = {};

    // Build where clause from filters...

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        linkedOrder: { select: { id: true, shopifyOrderNumber: true } },
      },
      orderBy: [
        { priority: "desc" },  // Urgent first
        { deadline: "asc" },   // Soonest deadline within priority
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 3: Date Grouping Helper
**What:** Client-side grouping of tasks by date sections
**When to use:** Task list rendering
**Example:**
```typescript
// Source: Best practice for date-based task grouping
import { isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from "date-fns";

interface Task {
  id: string;
  deadline: string | null;
  status: string;
  // ... other fields
}

type DateGroup = "overdue" | "today" | "tomorrow" | "this_week" | "later" | "no_deadline" | "completed";

export function groupTasksByDate(tasks: Task[]): Record<DateGroup, Task[]> {
  const groups: Record<DateGroup, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    no_deadline: [],
    completed: [],
  };

  const now = startOfDay(new Date());

  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      groups.completed.push(task);
      continue;
    }

    if (!task.deadline) {
      groups.no_deadline.push(task);
      continue;
    }

    const deadline = new Date(task.deadline);

    if (isBefore(deadline, now)) {
      groups.overdue.push(task);
    } else if (isToday(deadline)) {
      groups.today.push(task);
    } else if (isTomorrow(deadline)) {
      groups.tomorrow.push(task);
    } else if (isThisWeek(deadline)) {
      groups.this_week.push(task);
    } else {
      groups.later.push(task);
    }
  }

  return groups;
}

// Romanian labels for sections
export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  overdue: "Intarziate",
  today: "Astazi",
  tomorrow: "Maine",
  this_week: "Saptamana aceasta",
  later: "Mai tarziu",
  no_deadline: "Fara deadline",
  completed: "Finalizate",
};
```

### Pattern 4: Filter Presets
**What:** Smart filter presets like modern task apps
**When to use:** Quick filtering
**Example:**
```typescript
// Source: CONTEXT.md decisions
export const FILTER_PRESETS = {
  all: { label: "Toate", filter: {} },
  today: {
    label: "Astazi",
    filter: {
      deadline: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
      status: "PENDING"
    }
  },
  overdue: {
    label: "Intarziate",
    filter: {
      deadline: { lt: startOfDay(new Date()) },
      status: "PENDING"
    }
  },
  this_week: {
    label: "Saptamana aceasta",
    filter: {
      deadline: { gte: startOfDay(new Date()), lte: endOfWeek(new Date()) },
      status: "PENDING"
    }
  },
  my_tasks: {
    label: "Task-urile mele",
    filter: { assigneeId: "CURRENT_USER" } // Replaced at runtime
  },
} as const;
```

### Anti-Patterns to Avoid
- **Kanban/Board View:** CONTEXT.md explicitly specifies table list view for consistency with Orders/Invoices
- **Complex State Management:** Use React Query, not Redux/Zustand for this simple CRUD
- **Custom Date Picker:** Use existing shadcn/ui components
- **Over-engineering Assignment:** Anyone can assign to anyone, no role-based restrictions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File uploads | Custom upload handler | Existing `/api/upload` pattern | Already handles validation, storage, permissions |
| Date formatting | Custom formatters | `date-fns` + existing `formatDate` util | Consistency, localization support |
| Empty states | Custom empty UI | `EmptyState` component + `empty-states.ts` | Established pattern, consistent UX |
| Loading states | Custom skeletons | `SkeletonTableRow` | Already styled for tables |
| Action tooltips | Native title attr | `ActionTooltip` component | Phase 6 UX pattern requirement |
| Error handling | Alert/toast only | `useErrorModal` hook | Proper error display pattern |
| Permission checks | Inline session checks | `hasPermission()` function | RBAC system already in place |

**Key insight:** The codebase has mature patterns for everything needed. Following existing patterns ensures consistency and reduces bugs.

## Common Pitfalls

### Pitfall 1: Incorrect Priority Sorting
**What goes wrong:** Sorting by priority string (alphabetical) instead of semantic order
**Why it happens:** Prisma default string sort puts "HIGH" before "LOW" alphabetically
**How to avoid:** Use numeric priority internally OR explicit orderBy mapping
**Warning signs:** "High" tasks appearing after "Low" tasks
**Solution:**
```typescript
// Define explicit order
const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// Sort client-side after fetch, or use orderBy with raw SQL
tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
```

### Pitfall 2: Stale Task List After Actions
**What goes wrong:** Task list not updating after complete/reopen/edit
**Why it happens:** Missing query invalidation in mutations
**How to avoid:** Always invalidate "tasks" query key after mutations
**Warning signs:** Need to manually refresh to see changes
**Solution:**
```typescript
const completeMutation = useMutation({
  mutationFn: ...,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast({ title: "Task finalizat" });
  }
});
```

### Pitfall 3: Missing Reassignment Note
**What goes wrong:** Tasks reassigned without context, confusion about why
**Why it happens:** Forgetting to require note on reassignment (per CONTEXT.md)
**How to avoid:** Validate reassignment requires a note in API
**Warning signs:** Tasks changing assignees without explanation in audit trail
**Solution:**
```typescript
// In PATCH /api/tasks/[id]
if (data.assigneeId && data.assigneeId !== task.assigneeId) {
  if (!data.reassignmentNote?.trim()) {
    return NextResponse.json(
      { error: "Nota de transfer este obligatorie" },
      { status: 400 }
    );
  }
}
```

### Pitfall 4: Completed Tasks Not at Bottom
**What goes wrong:** Completed tasks mixed with active tasks
**Why it happens:** Sorting only by priority/deadline, not status
**How to avoid:** Always sort by status first (PENDING before COMPLETED)
**Warning signs:** Green "done" badges scattered throughout the list

### Pitfall 5: File Upload Size Not Validated Client-Side
**What goes wrong:** Large file uploads fail after user waits
**Why it happens:** Only server-side validation, no client-side check
**How to avoid:** Validate file size and type before upload starts
**Warning signs:** Users complaining about slow uploads that fail

## Code Examples

Verified patterns from existing codebase:

### Task Type Badge with Romanian Labels
```typescript
// Source: Badge component + existing patterns
const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: LucideIcon; variant: BadgeProps["variant"] }> = {
  PICKING: { label: "Picking", icon: Package, variant: "info" },
  VERIFICARE: { label: "Verificare", icon: ClipboardCheck, variant: "info" },
  EXPEDIERE: { label: "Expediere", icon: Truck, variant: "info" },
  MEETING: { label: "Intalnire", icon: Users, variant: "neutral" },
  DEADLINE: { label: "Deadline", icon: Clock, variant: "warning" },
  FOLLOW_UP: { label: "Urmarire", icon: MessageCircle, variant: "neutral" },
  BUSINESS: { label: "Business", icon: Briefcase, variant: "default" },
  OTHER: { label: "Altele", icon: MoreHorizontal, variant: "outline" },
};

function TaskTypeBadge({ type }: { type: TaskType }) {
  const config = TASK_TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
```

### Priority Badge with Colors
```typescript
// Source: Badge component variants
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: BadgeProps["variant"] }> = {
  LOW: { label: "Scazuta", variant: "neutral" },
  MEDIUM: { label: "Medie", variant: "info" },
  HIGH: { label: "Ridicata", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },
};

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### Table Row with Quick Complete
```typescript
// Source: Invoices page pattern
<TableRow key={task.id} className="hover:bg-muted/50">
  <TableCell>
    <Checkbox
      checked={task.status === "COMPLETED"}
      onCheckedChange={() => toggleComplete(task.id)}
    />
  </TableCell>
  <TableCell className={cn(task.status === "COMPLETED" && "line-through opacity-60")}>
    {task.title}
  </TableCell>
  <TableCell><TaskTypeBadge type={task.type} /></TableCell>
  <TableCell><PriorityBadge priority={task.priority} /></TableCell>
  <TableCell>
    {task.assignee ? (
      <span className="text-sm">{task.assignee.name}</span>
    ) : (
      <span className="text-muted-foreground text-sm">Neasignat</span>
    )}
  </TableCell>
  <TableCell>
    {task.deadline ? (
      <span className={cn(
        "text-sm",
        isOverdue(task.deadline) && task.status !== "COMPLETED" && "text-status-error font-medium"
      )}>
        {formatDate(task.deadline)}
      </span>
    ) : (
      <span className="text-muted-foreground text-sm">-</span>
    )}
  </TableCell>
  <TableCell>
    <DropdownMenu>
      <ActionTooltip action="Actiuni" consequence="Vezi optiunile disponibile">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
      </ActionTooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openEditDialog(task)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editeaza
        </DropdownMenuItem>
        {task.status === "COMPLETED" ? (
          <DropdownMenuItem onClick={() => reopenTask(task.id)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Redeschide
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => completeTask(task.id)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Finalizeaza
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
</TableRow>
```

### Empty State for Tasks
```typescript
// Add to empty-states.ts
tasks: {
  first_time: {
    icon: ClipboardList,
    title: "Niciun task inca",
    description: "Creeaza primul task pentru a incepe gestionarea activitatilor.",
    action: {
      label: "Creeaza task",
      onClick: "createTask"
    }
  },
  filtered: {
    icon: Search,
    title: "Niciun rezultat gasit",
    description: "Nu am gasit task-uri care sa corespunda criteriilor de cautare.",
    action: {
      label: "Reseteaza filtrele",
      onClick: "clearFilters"
    }
  },
  success: {
    icon: CheckCircle,
    title: "Toate task-urile finalizate",
    description: "Nu ai task-uri active. Buna treaba!"
  },
  error: {
    icon: AlertTriangle,
    title: "Eroare la incarcarea task-urilor",
    description: "Nu am putut incarca lista de task-uri. Incearca din nou.",
    action: {
      label: "Reincarca",
      onClick: "refresh"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Functional + hooks | React 16.8+ | Use useState, useQuery |
| Redux for CRUD | React Query | TanStack Query v4+ | Simpler server state |
| Custom fetch | useQuery/useMutation | Adopted in codebase | Consistent patterns |
| Moment.js | date-fns | 2020+ | Smaller bundle, tree-shaking |

**Deprecated/outdated:**
- **Kanban boards for operational tasks:** User explicitly chose table view for consistency
- **Complex drag-and-drop:** Not needed for this phase (simple list with actions)

## Open Questions

Things that couldn't be fully resolved:

1. **Attachment storage location**
   - What we know: AWB comments use local filesystem with `UPLOAD_DIR` env var
   - What's unclear: Should tasks use same approach or cloud storage?
   - Recommendation: Use same pattern as AWBCommentImage (local filesystem) for consistency. Cloud migration can be done later for all attachments simultaneously.

2. **Task permissions**
   - What we know: Need "tasks.view", "tasks.create", "tasks.edit" permissions
   - What's unclear: Should there be "tasks.complete" separate permission?
   - Recommendation: Keep simple - tasks.edit covers completion. Add granular permissions later if needed.

3. **Linked entity picker UI**
   - What we know: Tasks can link to Order, Product, Invoice
   - What's unclear: Best UX for entity picker (dropdown vs search vs modal)
   - Recommendation: Start with searchable dropdown (using existing Select + search pattern). If performance issues with large lists, switch to modal picker.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/src/app/(dashboard)/invoices/page.tsx` - List page pattern
- Existing codebase: `/src/app/api/invoices/route.ts` - API route pattern
- Existing codebase: `/prisma/schema.prisma` - Data model patterns (AWBComment, User relations)
- Existing codebase: `/src/app/api/upload/route.ts` - File upload pattern
- Existing codebase: `/src/components/ui/*` - UI component library

### Secondary (MEDIUM confidence)
- [Prisma Schema Language Best Practices](https://www.prisma.io/blog/prisma-schema-language-the-best-way-to-define-your-data)
- [Next.js App Router Advanced Patterns 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7)
- [Task List Filtering and Sorting](https://tmetric.com/help/tasks/filtering-and-sorting-task-list) - Date grouping approach

### Tertiary (LOW confidence)
- [React Filtering Sorting Guide](https://medium.com/@akxay/mastering-data-management-a-comprehensive-guide-to-sorting-filtering-and-searching-14c5e9fee9a9)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project libraries, no new dependencies except possibly date-fns
- Architecture: HIGH - Following established codebase patterns exactly
- Pitfalls: MEDIUM - Based on common patterns, some project-specific validation needed

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable patterns)
