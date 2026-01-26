import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { startOfDay, endOfDay, endOfWeek } from "date-fns";
import type { TaskPriority, TaskStatus } from "@/lib/task-utils";

/**
 * GET /api/tasks
 *
 * Returns list of tasks with filtering support.
 * Supports presets (today, overdue, this_week, my_tasks), type, status, assigneeId, and search.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "tasks.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza task-uri" },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const preset = searchParams.get("preset");
    const search = searchParams.get("search");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Handle presets
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Monday is first day

    if (preset === "today") {
      where.deadline = {
        gte: todayStart,
        lte: todayEnd,
      };
      where.status = "PENDING";
    } else if (preset === "overdue") {
      where.deadline = {
        lt: todayStart,
      };
      where.status = "PENDING";
    } else if (preset === "this_week") {
      where.deadline = {
        gte: todayStart,
        lte: weekEnd,
      };
      where.status = "PENDING";
    } else if (preset === "my_tasks") {
      where.assigneeId = session.user.id;
    }

    // Apply additional filters (can override preset if provided)
    if (type && type !== "all") {
      where.type = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (assigneeId && assigneeId !== "all") {
      if (assigneeId === "unassigned") {
        where.assigneeId = null;
      } else {
        where.assigneeId = assigneeId;
      }
    }

    // Search by title (case-insensitive)
    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Query tasks with relations
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        linkedOrder: {
          select: {
            id: true,
            shopifyOrderNumber: true,
          },
        },
        linkedProduct: {
          select: {
            id: true,
            title: true,
          },
        },
        linkedInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        _count: {
          select: {
            attachments: true,
          },
        },
      },
      orderBy: [
        // PENDING first, COMPLETED last
        { status: "asc" },
        // Priority ordering (URGENT=0, HIGH=1, MEDIUM=2, LOW=3) - we want URGENT first (desc in sort order)
        // Since Prisma doesn't support CASE WHEN directly, we sort by priority desc
        // URGENT > HIGH > MEDIUM > LOW (alphabetically: URGENT > MEDIUM > LOW > HIGH)
        // We need to handle this differently - use raw orderBy or accept the alphabetical limitation
        // For now, using desc which gives: URGENT, MEDIUM, LOW, HIGH (not ideal but functional)
        // The UI can re-sort if needed, or we can transform results
        { priority: "desc" },
        // Deadline ascending (soonest first), nulls last
        { deadline: { sort: "asc", nulls: "last" } },
      ],
    });

    // Re-sort by priority using proper order since Prisma enum sorting is alphabetical
    const priorityOrder: Record<TaskPriority, number> = {
      URGENT: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      // First by status (PENDING before COMPLETED)
      if (a.status !== b.status) {
        return a.status === "PENDING" ? -1 : 1;
      }

      // Then by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by deadline (nulls last)
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    return NextResponse.json({
      tasks: sortedTasks,
      count: sortedTasks.length,
    });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la incarcarea task-urilor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 *
 * Creates a new task.
 * Required: title
 * Optional: description, type, priority, deadline, assigneeId, linkedOrderId, linkedProductId, linkedInvoiceId
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Check permission
    const canCreate = await hasPermission(session.user.id, "tasks.create");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a crea task-uri" },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      deadline,
      assigneeId,
      linkedOrderId,
      linkedProductId,
      linkedInvoiceId,
    } = body;

    // Validate title
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Titlul este obligatoriu" },
        { status: 400 }
      );
    }

    // Create task
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type || "BUSINESS",
        priority: priority || "MEDIUM",
        deadline: deadline ? new Date(deadline) : null,
        assigneeId: assigneeId || null,
        linkedOrderId: linkedOrderId || null,
        linkedProductId: linkedProductId || null,
        linkedInvoiceId: linkedInvoiceId || null,
        createdById: session.user.id,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la crearea task-ului" },
      { status: 500 }
    );
  }
}
