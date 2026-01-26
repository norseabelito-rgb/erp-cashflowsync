import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/tasks/[id]
 *
 * Returns a single task with full details including attachments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Query task with full includes
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const task = await prisma.task.findUnique({
      where: { id },
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
            image: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        linkedOrder: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            customerFirstName: true,
            customerLastName: true,
          },
        },
        linkedProduct: {
          select: {
            id: true,
            title: true,
            sku: true,
          },
        },
        linkedInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task-ul nu a fost gasit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la incarcarea task-ului" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 *
 * Updates a task. If assigneeId is changing, requires reassignmentNote.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const canEdit = await hasPermission(session.user.id, "tasks.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a edita task-uri" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Query existing task
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        assigneeId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task-ul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Reassignment validation (per CONTEXT.md)
    // If assigneeId is changing AND new assigneeId !== old assigneeId, require reassignmentNote
    const {
      title,
      description,
      type,
      priority,
      deadline,
      assigneeId,
      reassignmentNote,
      linkedOrderId,
      linkedProductId,
      linkedInvoiceId,
    } = body;

    const isReassigning =
      assigneeId !== undefined &&
      existingTask.assigneeId !== assigneeId;

    if (isReassigning && !reassignmentNote) {
      return NextResponse.json(
        { error: "Nota de transfer este obligatorie la reasignare" },
        { status: 400 }
      );
    }

    // Build update data - only include fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { error: "Titlul nu poate fi gol" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    if (reassignmentNote !== undefined) {
      updateData.reassignmentNote = reassignmentNote?.trim() || null;
    }

    if (linkedOrderId !== undefined) {
      updateData.linkedOrderId = linkedOrderId || null;
    }

    if (linkedProductId !== undefined) {
      updateData.linkedProductId = linkedProductId || null;
    }

    if (linkedInvoiceId !== undefined) {
      updateData.linkedInvoiceId = linkedInvoiceId || null;
    }

    // Update task
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
        completedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizarea task-ului" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 *
 * Deletes a task. Attachments are cascade deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const canDelete = await hasPermission(session.user.id, "tasks.delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a sterge task-uri" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if task exists
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task-ul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Delete task (cascade will handle attachments)
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la stergerea task-ului" },
      { status: 500 }
    );
  }
}
