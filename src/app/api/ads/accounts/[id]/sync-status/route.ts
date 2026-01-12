import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/ads/accounts/[id]/sync-status - Get current sync job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if sync jobs table exists and get most recent job
    let syncJob = null;
    try {
      syncJob = await prisma.adsSyncJob.findFirst({
        where: { accountId: id },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e: any) {
      // Table doesn't exist yet - return idle status
      if (e.code === 'P2021' || e.message?.includes('does not exist')) {
        return NextResponse.json({ 
          status: 'idle',
          message: 'Sync jobs table not initialized'
        });
      }
      throw e;
    }

    if (!syncJob) {
      return NextResponse.json({ 
        status: 'idle',
        message: 'Nu există sincronizare în curs'
      });
    }

    // Calculate progress percentage
    const totalItems = syncJob.totalCampaigns + syncJob.totalAdSets + syncJob.totalAds;
    const syncedItems = syncJob.syncedCampaigns + syncJob.syncedAdSets + syncJob.syncedAds;
    const progressPercent = totalItems > 0 ? Math.round((syncedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      id: syncJob.id,
      status: syncJob.status,
      progress: {
        campaigns: {
          total: syncJob.totalCampaigns,
          synced: syncJob.syncedCampaigns,
        },
        adSets: {
          total: syncJob.totalAdSets,
          synced: syncJob.syncedAdSets,
        },
        ads: {
          total: syncJob.totalAds,
          synced: syncJob.syncedAds,
        },
        percent: progressPercent,
      },
      currentPhase: syncJob.currentPhase,
      error: syncJob.errorMessage,
      errorCode: syncJob.errorCode,
      retryAt: syncJob.retryAt,
      retryCount: syncJob.retryCount,
      startedAt: syncJob.startedAt,
      completedAt: syncJob.completedAt,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    // Return idle instead of error to prevent polling issues
    return NextResponse.json({ 
      status: 'idle',
      message: 'Error checking sync status'
    });
  }
}

// DELETE /api/ads/accounts/[id]/sync-status - Cancel current sync job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Cancel any running sync jobs
    await prisma.adsSyncJob.updateMany({
      where: {
        accountId: id,
        status: { in: ['pending', 'running', 'paused'] }
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      }
    });

    // Update account sync status
    await prisma.adsAccount.update({
      where: { id },
      data: { syncInProgress: false }
    });

    return NextResponse.json({ success: true, message: 'Sincronizare anulată' });
  } catch (error) {
    console.error("Error cancelling sync:", error);
    return NextResponse.json(
      { error: "Failed to cancel sync" },
      { status: 500 }
    );
  }
}
