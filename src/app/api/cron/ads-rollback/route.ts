import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
} from "@/lib/meta-ads";
import {
  updateTikTokCampaignStatus,
  updateTikTokCampaignBudget,
} from "@/lib/tiktok-ads";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * CRON Job - Rollback automat al campaniilor oprite
 * Rulează la fiecare oră
 * 
 * Verifică alertele care:
 * - Au rollbackEligible = true
 * - Au rollbackAt <= now
 * - Nu au fost încă procesate (rollbackExecuted = false)
 * 
 * Schedule: 0 * * * * (la fiecare oră)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ADS ROLLBACK CRON] Starting at", new Date().toISOString());

    // Găsește alertele eligibile pentru rollback
    const alertsToRollback = await prisma.adsAlert.findMany({
      where: {
        rollbackEligible: true,
        rolledBack: false,
        rollbackAt: {
          lte: new Date(),
        },
      },
      include: {
        campaign: {
          include: {
            account: true,
          },
        },
        rule: true,
      },
    });

    console.log(`[ADS ROLLBACK CRON] Found ${alertsToRollback.length} alerts eligible for rollback`);

    let successCount = 0;
    let failCount = 0;

    for (const alert of alertsToRollback) {
      try {
        const campaign = alert.campaign;
        const previousState = alert.previousState as any;

        if (!previousState) {
          console.log(`[ADS ROLLBACK CRON] No previous state for alert ${alert.id}, skipping`);
          continue;
        }

        // Restaurează statusul anterior
        if (previousState.status && previousState.status !== campaign.status) {
          console.log(`[ADS ROLLBACK CRON] Restoring campaign ${campaign.name} to ${previousState.status}`);

          if (campaign.account.platform === "META") {
            await updateMetaCampaignStatus(
              campaign.externalId,
              previousState.status as "ACTIVE" | "PAUSED",
              campaign.account.accessToken
            );
          } else if (campaign.account.platform === "TIKTOK") {
            await updateTikTokCampaignStatus(
              campaign.account.externalId,
              campaign.externalId,
              previousState.status === "ACTIVE" ? "ENABLE" : "DISABLE",
              campaign.account.accessToken
            );
          }

          // Actualizează în DB
          await prisma.adsCampaign.update({
            where: { id: campaign.id },
            data: { status: previousState.status },
          });
        }

        // Restaurează bugetul anterior (dacă a fost redus)
        if (previousState.dailyBudget && alert.actionTaken === "BUDGET_REDUCED") {
          console.log(`[ADS ROLLBACK CRON] Restoring budget for ${campaign.name} to ${previousState.dailyBudget}`);

          if (campaign.account.platform === "META") {
            await updateMetaCampaignBudget(
              campaign.externalId,
              previousState.dailyBudget,
              null,
              campaign.account.accessToken
            );
          } else if (campaign.account.platform === "TIKTOK") {
            await updateTikTokCampaignBudget(
              campaign.account.externalId,
              campaign.externalId,
              previousState.dailyBudget,
              campaign.account.accessToken
            );
          }

          await prisma.adsCampaign.update({
            where: { id: campaign.id },
            data: { dailyBudget: previousState.dailyBudget },
          });
        }

        // Marchează alerta ca procesată
        await prisma.adsAlert.update({
          where: { id: alert.id },
          data: {
            rolledBack: true,
            rollbackResult: "SUCCESS",
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolution: "Auto-rollback executat",
          },
        });

        successCount++;
        console.log(`[ADS ROLLBACK CRON] Successfully rolled back campaign ${campaign.name}`);

      } catch (err: any) {
        console.error(`[ADS ROLLBACK CRON] Failed to rollback alert ${alert.id}:`, err);
        failCount++;

        // Marchează eroarea
        await prisma.adsAlert.update({
          where: { id: alert.id },
          data: {
            rollbackResult: "FAILED",
            resolution: `Rollback failed: ${err.message}`,
          },
        });
      }
    }

    console.log(`[ADS ROLLBACK CRON] Completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: alertsToRollback.length,
      succeeded: successCount,
      failed: failCount,
    });
  } catch (error: any) {
    console.error("[ADS ROLLBACK CRON] Fatal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
