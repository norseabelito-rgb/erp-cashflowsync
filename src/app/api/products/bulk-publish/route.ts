import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processBulkPublishJob, getActiveJobForUser } from "@/lib/bulk-publish-worker";

// Local enum pentru status (nu depinde de Prisma generate)
const BulkPublishStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

/**
 * POST /api/products/bulk-publish
 * Creează un job de publicare bulk și îl pornește în background
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, channelIds } = body;

    // Validare input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin un produs" },
        { status: 400 }
      );
    }

    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin un canal" },
        { status: 400 }
      );
    }

    // Verifică dacă există un job în curs
    const activeJobId = await getActiveJobForUser();
    if (activeJobId) {
      return NextResponse.json(
        {
          success: false,
          error: "Există deja un job de publicare în curs",
          jobId: activeJobId,
        },
        { status: 409 }
      );
    }

    // Verifică că canalele sunt valide și de tip Shopify
    const channels = await prisma.channel.findMany({
      where: {
        id: { in: channelIds },
        type: "SHOPIFY",
      },
      select: { id: true, name: true },
    });

    if (channels.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nu există canale Shopify valide în selecție" },
        { status: 400 }
      );
    }

    // Verifică că produsele există
    const productCount = await prisma.masterProduct.count({
      where: { id: { in: productIds } },
    });

    if (productCount === 0) {
      return NextResponse.json(
        { success: false, error: "Produsele selectate nu există" },
        { status: 400 }
      );
    }

    // Creează job-ul
    const totalItems = productCount * channels.length;
    const job = await (prisma as any).bulkPublishJob.create({
      data: {
        status: BulkPublishStatus.PENDING,
        productIds: productIds,
        channelIds: channels.map((c) => c.id),
        totalProducts: productCount,
        totalChannels: channels.length,
        totalItems,
        channelProgress: {},
      },
    });

    // Pornește procesarea în background (fire-and-forget)
    // Nu așteptăm să se termine, returnăm imediat jobId
    processBulkPublishJob(job.id).catch((error) => {
      console.error(`Background job ${job.id} failed:`, error);
      (prisma as any).bulkPublishJob
        .update({
          where: { id: job.id },
          data: {
            status: BulkPublishStatus.FAILED,
            errorMessage: error.message,
            completedAt: new Date(),
          },
        })
        .catch(console.error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Job creat. Se procesează ${productCount} produse pe ${channels.length} canale.`,
    });
  } catch (error: any) {
    console.error("Error creating bulk publish job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la crearea job-ului" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products/bulk-publish
 * Returnează job-ul activ (dacă există)
 */
export async function GET() {
  try {
    const activeJobId = await getActiveJobForUser();

    if (!activeJobId) {
      return NextResponse.json({ active: false });
    }

    const job = await (prisma as any).bulkPublishJob.findUnique({
      where: { id: activeJobId },
    });

    if (!job) {
      return NextResponse.json({ active: false });
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

    return NextResponse.json({
      active: true,
      job: {
        id: job.id,
        status: job.status,
        progress: {
          total: job.totalItems,
          done: job.processedItems,
          percent: job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
          created: job.createdCount,
          updated: job.updatedCount,
          failed: job.failedCount,
        },
        channelProgress,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      },
    });
  } catch (error: any) {
    console.error("Error fetching active bulk publish job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la obținerea job-ului" },
      { status: 500 }
    );
  }
}
