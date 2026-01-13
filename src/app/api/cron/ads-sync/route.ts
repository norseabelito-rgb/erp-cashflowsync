import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncMetaAccountLight, syncMetaAccount } from "@/lib/meta-ads";
import { syncTikTokAccount } from "@/lib/tiktok-ads";
import { AdsAccountStatus } from "@/types/prisma-enums";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * CRON Job - Sincronizează toate conturile de ads
 * 
 * Moduri:
 * - light (default): Sync rapid - doar campanii + insights (30 min)
 * - full: Sync complet inclusiv ad sets/ads (folosit rar)
 * - resume: Repornește job-uri în pauză
 */
export async function GET(request: NextRequest) {
  try {
    // Verifică autorizarea
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "light"; // "light", "full", or "resume"

    console.log(`[ADS SYNC CRON] Starting ${mode} sync at`, new Date().toISOString());

    const results: Array<{
      accountId: string;
      name: string;
      platform: string;
      success: boolean;
      campaignsSynced?: number;
      adSetsSynced?: number;
      adsSynced?: number;
      paused?: boolean;
      retryAt?: Date;
      error?: string;
    }> = [];

    // STEP 1: Check for paused jobs that are ready to resume
    if (mode === "resume" || mode === "full") {
      const now = new Date();
      const pausedJobs = await prisma.adsSyncJob.findMany({
        where: {
          status: 'paused',
          retryAt: { lte: now },
          retryCount: { lt: 5 },
        },
        include: {
          account: true,
        },
        orderBy: { retryAt: 'asc' },
        take: 3,
      });

      console.log(`[ADS SYNC CRON] Found ${pausedJobs.length} paused jobs ready to resume`);

      for (const job of pausedJobs) {
        console.log(`[ADS SYNC CRON] Resuming job ${job.id} for ${job.account.name}`);
        
        try {
          let result;
          if (job.account.platform === "META") {
            result = await syncMetaAccount(job.accountId, job.id);
          } else if (job.account.platform === "TIKTOK") {
            result = await syncTikTokAccount(job.accountId);
          } else {
            continue;
          }

          results.push({
            accountId: job.accountId,
            name: job.account.name,
            platform: job.account.platform,
            success: result.success,
            campaignsSynced: result.campaignsSynced,
            adSetsSynced: (result as any).adSetsSynced || 0,
            adsSynced: (result as any).adsSynced || 0,
            paused: (result as any).paused,
            retryAt: (result as any).retryAt,
            error: result.error,
          });

          console.log(
            `[ADS SYNC CRON] Resume ${job.account.name}: ` +
            `${result.success ? "SUCCESS" : (result as any).paused ? "PAUSED AGAIN" : "FAILED"}`
          );
        } catch (err: any) {
          console.error(`[ADS SYNC CRON] Error resuming job ${job.id}:`, err);
          
          await prisma.adsSyncJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              errorMessage: err.message,
              completedAt: new Date(),
            },
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // STEP 2: Sync accounts based on mode
    if (mode === "light" || mode === "full") {
      // Obține toate conturile active care NU au un job în progress
      let activeJobAccountIds: string[] = [];
      
      try {
        const accountsWithActiveJobs = await prisma.adsSyncJob.findMany({
          where: {
            status: { in: ['running', 'paused', 'pending'] },
          },
          select: { accountId: true },
        });
        activeJobAccountIds = accountsWithActiveJobs.map(j => j.accountId);
      } catch {
        // Table might not exist
      }

      const accounts = await prisma.adsAccount.findMany({
        where: {
          status: {
            in: [AdsAccountStatus.ACTIVE, AdsAccountStatus.ERROR],
          },
          syncInProgress: false,
          id: { notIn: activeJobAccountIds },
        },
      });

      console.log(`[ADS SYNC CRON] Found ${accounts.length} accounts for ${mode} sync`);

      for (const account of accounts) {
        console.log(`[ADS SYNC CRON] Syncing ${account.platform} account: ${account.name}`);

        try {
          let result;

          if (account.platform === "META") {
            // Use light sync by default, full sync only when explicitly requested
            if (mode === "light") {
              result = await syncMetaAccountLight(account.id);
            } else {
              result = await syncMetaAccount(account.id);
            }
          } else if (account.platform === "TIKTOK") {
            result = await syncTikTokAccount(account.id);
          } else {
            result = { success: false, campaignsSynced: 0, error: "Unsupported platform" };
          }

          results.push({
            accountId: account.id,
            name: account.name,
            platform: account.platform,
            success: result.success,
            campaignsSynced: result.campaignsSynced,
            adSetsSynced: (result as any).adSetsSynced || 0,
            adsSynced: (result as any).adsSynced || 0,
            paused: (result as any).paused,
            retryAt: (result as any).retryAt,
            error: result.error,
          });

          console.log(
            `[ADS SYNC CRON] ${account.name}: ${result.success ? "SUCCESS" : (result as any).paused ? "PAUSED" : "FAILED"} - ` +
            `${result.campaignsSynced || 0} campaigns`
          );
        } catch (err: any) {
          results.push({
            accountId: account.id,
            name: account.name,
            platform: account.platform,
            success: false,
            error: err.message,
          });

          console.error(`[ADS SYNC CRON] Error syncing ${account.name}:`, err);
        }

        // Delay between accounts
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Sumar
    const successCount = results.filter((r) => r.success).length;
    const pausedCount = results.filter((r) => r.paused).length;
    const failedCount = results.filter((r) => !r.success && !r.paused).length;
    const totalCampaigns = results.reduce((sum, r) => sum + (r.campaignsSynced || 0), 0);
    const totalAdSets = results.reduce((sum, r) => sum + (r.adSetsSynced || 0), 0);
    const totalAds = results.reduce((sum, r) => sum + (r.adsSynced || 0), 0);

    console.log(
      `[ADS SYNC CRON] Completed: ${successCount} success, ${pausedCount} paused, ${failedCount} failed, ` +
      `${totalCampaigns} campaigns, ${totalAdSets} ad sets, ${totalAds} ads`
    );

    return NextResponse.json({
      success: true,
      mode,
      timestamp: new Date().toISOString(),
      summary: {
        successful: successCount,
        paused: pausedCount,
        failed: failedCount,
        totalCampaignsSynced: totalCampaigns,
        totalAdSetsSynced: totalAdSets,
        totalAdsSynced: totalAds,
      },
      results,
    });
  } catch (error: any) {
    console.error("[ADS SYNC CRON] Fatal error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
