import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { syncMetaAccount } from "@/lib/meta-ads";
import { syncTikTokAccount } from "@/lib/tiktok-ads";

// GET - Lista toate conturile ads conectate
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "ads.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const accounts = await prisma.adsAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            campaigns: true,
            pixels: true,
          },
        },
      },
    });

    // Nu returnăm token-urile în response
    const safeAccounts = accounts.map((account: any) => ({
      id: account.id,
      platform: account.platform,
      externalId: account.externalId,
      name: account.name,
      currency: account.currency,
      timezone: account.timezone,
      businessId: account.businessId,
      businessName: account.businessName,
      status: account.status,
      lastSyncAt: account.lastSyncAt,
      lastSyncError: account.lastSyncError,
      syncInProgress: account.syncInProgress,
      createdAt: account.createdAt,
      campaignsCount: account._count.campaigns,
      pixelsCount: account._count.pixels,
    }));

    return NextResponse.json({ accounts: safeAccounts });
  } catch (error: any) {
    console.error("Error fetching ads accounts:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcarea conturilor" },
      { status: 500 }
    );
  }
}

// DELETE - Deconectează un cont
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json({ error: "ID-ul contului este necesar" }, { status: 400 });
    }

    // Verifică că există
    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Contul nu a fost găsit" }, { status: 404 });
    }

    // Șterge contul (cascade va șterge și campaniile, alerts, etc.)
    await prisma.adsAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({
      success: true,
      message: `Contul ${account.name} a fost deconectat`,
    });
  } catch (error: any) {
    console.error("Error deleting ads account:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la deconectare" },
      { status: 500 }
    );
  }
}

// POST - Sync manual pentru un cont
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, action } = body;

    if (action !== "sync") {
      return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: "ID-ul contului este necesar" }, { status: 400 });
    }

    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Contul nu a fost găsit" }, { status: 404 });
    }

    // Check for existing paused job that can be resumed
    const pausedJob = await prisma.adsSyncJob.findFirst({
      where: {
        accountId,
        status: 'paused',
      },
      orderBy: { createdAt: 'desc' },
    });

    // If there's a paused job, check if it's ready to retry
    let existingJobId: string | undefined;
    if (pausedJob) {
      const now = new Date();
      if (pausedJob.retryAt && new Date(pausedJob.retryAt) <= now) {
        // Ready to resume
        existingJobId = pausedJob.id;
        console.log(`[Sync] Resuming paused job ${pausedJob.id}`);
      } else if (pausedJob.retryAt) {
        // Not ready yet, return info about when it will retry
        return NextResponse.json({
          success: false,
          paused: true,
          jobId: pausedJob.id,
          retryAt: pausedJob.retryAt,
          error: `Sincronizare în pauză. Va reporni automat.`,
          progress: {
            campaigns: { total: pausedJob.totalCampaigns, synced: pausedJob.syncedCampaigns },
            adSets: { total: pausedJob.totalAdSets, synced: pausedJob.syncedAdSets },
            ads: { total: pausedJob.totalAds, synced: pausedJob.syncedAds },
          }
        });
      }
    }

    // Check if sync already in progress (running job exists)
    const runningJob = await prisma.adsSyncJob.findFirst({
      where: {
        accountId,
        status: 'running',
      },
    });

    if (runningJob) {
      return NextResponse.json({ 
        error: "Sincronizare deja în curs",
        jobId: runningJob.id,
      }, { status: 400 });
    }

    // Start sync în funcție de platformă
    let result: any;
    if (account.platform === "META") {
      result = await syncMetaAccount(accountId, existingJobId);
    } else if (account.platform === "TIKTOK") {
      result = await syncTikTokAccount(accountId);
    } else {
      return NextResponse.json({ error: "Platformă nesuportată" }, { status: 400 });
    }

    // Handle paused state (rate limit)
    if (result.paused) {
      return NextResponse.json({
        success: false,
        paused: true,
        jobId: result.jobId,
        retryAt: result.retryAt,
        error: result.error || 'Rate limit atins',
        campaignsSynced: result.campaignsSynced,
        adSetsSynced: result.adSetsSynced || 0,
        adsSynced: result.adsSynced || 0,
      });
    }

    if (result.success) {
      const adSetsSynced = (result as any).adSetsSynced || 0;
      const adsSynced = (result as any).adsSynced || 0;
      
      let message = `Sincronizare completă: ${result.campaignsSynced} campanii`;
      if (adSetsSynced > 0) message += `, ${adSetsSynced} ad sets`;
      if (adsSynced > 0) message += `, ${adsSynced} ads`;
      
      return NextResponse.json({
        success: true,
        message,
        jobId: result.jobId,
        campaignsSynced: result.campaignsSynced,
        adSetsSynced,
        adsSynced,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        jobId: result.jobId,
      });
    }
  } catch (error: any) {
    console.error("Error syncing ads account:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la sincronizare" },
      { status: 500 }
    );
  }
}
