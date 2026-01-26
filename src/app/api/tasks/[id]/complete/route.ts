import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * POST /api/tasks/[id]/complete
 *
 * Toggles task completion status.
 * PENDING -> COMPLETED (sets completedAt, completedById)
 * COMPLETED -> PENDING (clears completedAt, completedById)
 *
 * This enables the single-click completion flow specified in CONTEXT.md.
 */
export async function POST(
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

    // Query existing task
    // @ts-expect-error - prisma.task exists after prisma generate (Task model added in 07-01)
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task-ul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Toggle status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: any;

    if (existingTask.status === "PENDING") {
      // Mark as COMPLETED
      updateData = {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: session.user.id,
      };
    } else {
      // Mark as PENDING (reopen)
      updateData = {
        status: "PENDING",
        completedAt: null,
        completedById: null,
      };
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
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("Error toggling task completion:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizarea task-ului" },
      { status: 500 }
    );
  }
}
