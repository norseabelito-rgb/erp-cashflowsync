import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { BulkPublishStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/products/bulk-publish/[jobId]
 * Obține statusul și progresul unui job
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    const job = await prisma.bulkPublishJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    const channelProgress = (job.channelProgress || {}) as Record<
      string,
      {
        name: string;
        total: number;
        done: number;
        created: number;
        updated: number;
        failed: number;
        errors: string[];
      }
    >;

    // Calculează canalul curent (primul care nu e 100% done)
    let currentChannel: string | null = null;
    for (const [channelId, progress] of Object.entries(channelProgress)) {
      if (progress.done < progress.total) {
        currentChannel = progress.name;
        break;
      }
    }

    // Estimare timp rămas (bazat pe rata de procesare)
    let estimatedTimeRemaining: string | null = null;
    if (
      job.status === BulkPublishStatus.RUNNING &&
      job.startedAt &&
      job.processedItems > 0
    ) {
      const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
      const itemsPerMs = job.processedItems / elapsedMs;
      const remainingItems = job.totalItems - job.processedItems;
      const remainingMs = remainingItems / itemsPerMs;

      if (remainingMs < 60000) {
        estimatedTimeRemaining = `${Math.ceil(remainingMs / 1000)}s`;
      } else {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.ceil((remainingMs % 60000) / 1000);
        estimatedTimeRemaining = `${minutes}m ${seconds}s`;
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: {
        total: job.totalItems,
        done: job.processedItems,
        percent:
          job.totalItems > 0
            ? Math.round((job.processedItems / job.totalItems) * 100)
            : 0,
        created: job.createdCount,
        updated: job.updatedCount,
        failed: job.failedCount,
      },
      channelProgress,
      currentChannel,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedTimeRemaining,
      errorMessage: job.errorMessage,
    });
  } catch (error: any) {
    console.error("Error fetching bulk publish job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la obținerea job-ului" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/bulk-publish/[jobId]
 * Anulează un job în curs
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    const job = await prisma.bulkPublishJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    if (
      job.status !== BulkPublishStatus.PENDING &&
      job.status !== BulkPublishStatus.RUNNING
    ) {
      return NextResponse.json(
        { success: false, error: "Job-ul nu poate fi anulat (nu e în curs)" },
        { status: 400 }
      );
    }

    await prisma.bulkPublishJob.update({
      where: { id: jobId },
      data: {
        status: BulkPublishStatus.CANCELLED,
        completedAt: new Date(),
        errorMessage: "Anulat de utilizator",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job-ul a fost anulat",
    });
  } catch (error: any) {
    console.error("Error cancelling bulk publish job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la anularea job-ului" },
      { status: 500 }
    );
  }
}
