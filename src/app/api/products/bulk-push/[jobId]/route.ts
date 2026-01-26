import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/products/bulk-push/[jobId]
 * Get the status of a bulk push job for polling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    const job = await prisma.bulkPushJob.findUnique({
      where: { id: jobId },
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Get bulk push job error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
