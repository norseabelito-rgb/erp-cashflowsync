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

interface Condition {
  metric: string;
  operator: string;
  value: number;
  timeframe?: string;
}

/**
 * CRON Job - Verifică regulile de alertă
 * Rulează la fiecare 15 minute
 * 
 * Schedule: *\/15 * * * *
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ADS ALERTS CRON] Starting check at", new Date().toISOString());

    // Get all active rules
    const rules = await prisma.adsAlertRule.findMany({
      where: { isActive: true },
    });

    console.log(`[ADS ALERTS CRON] Found ${rules.length} active rules`);

    let alertsTriggered = 0;
    let actionsExecuted = 0;

    for (const rule of rules) {
      try {
        // Get campaigns in scope
        const campaigns = await getCampaignsInScope(rule);

        for (const campaign of campaigns) {
          // Check if recently alerted (cooldown)
          const recentAlert = await prisma.adsAlert.findFirst({
            where: {
              ruleId: rule.id,
              campaignId: campaign.id,
              createdAt: {
                gte: new Date(Date.now() - rule.cooldownHours * 60 * 60 * 1000),
              },
            },
          });

          if (recentAlert) {
            continue; // Skip, in cooldown
          }

          // Evaluate conditions
          const conditions = rule.conditions as unknown as Condition[];
          const { passed, metricSnapshot, conditionsMet } = evaluateConditions(
            conditions,
            campaign,
            rule.conditionLogic
          );

          if (passed) {
            // Create alert
            const alert = await prisma.adsAlert.create({
              data: {
                ruleId: rule.id,
                campaignId: campaign.id,
                metricSnapshot,
                conditionsMet,
                actionTaken: "NOTIFIED",
                previousState: { status: campaign.status, dailyBudget: campaign.dailyBudget },
              },
            });

            alertsTriggered++;

            // Execute action
            if (rule.action === "PAUSE") {
              await executePauseAction(campaign, alert.id, rule);
              actionsExecuted++;
            } else if (rule.action === "REDUCE_BUDGET" && rule.reducePct) {
              await executeReduceBudgetAction(campaign, rule.reducePct, alert.id, rule);
              actionsExecuted++;
            }

            // Update rule stats
            await prisma.adsAlertRule.update({
              where: { id: rule.id },
              data: {
                triggerCount: { increment: 1 },
                lastCheckedAt: new Date(),
              },
            });

            // TODO: Send notifications (email, in-app)
            if (rule.notifyEmail) {
              console.log(`[ADS ALERTS CRON] Would send email for campaign ${campaign.name}`);
            }
            if (rule.notifyInApp) {
              // Create in-app notification
              // await createNotification(...)
            }
          }
        }
      } catch (err) {
        console.error(`[ADS ALERTS CRON] Error processing rule ${rule.id}:`, err);
      }
    }

    console.log(`[ADS ALERTS CRON] Completed: ${alertsTriggered} alerts, ${actionsExecuted} actions`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      rulesChecked: rules.length,
      alertsTriggered,
      actionsExecuted,
    });
  } catch (error: any) {
    console.error("[ADS ALERTS CRON] Fatal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getCampaignsInScope(rule: any) {
  const where: any = { status: "ACTIVE" };

  switch (rule.scopeType) {
    case "PLATFORM":
      where.account = { platform: rule.scopePlatform };
      break;
    case "SKU":
      where.OR = [
        { parsedCodes: { has: rule.scopeSku } },
        { productMappings: { some: { sku: rule.scopeSku } } },
      ];
      break;
    case "CAMPAIGNS":
      if (rule.scopeCampaigns && Array.isArray(rule.scopeCampaigns)) {
        where.id = { in: rule.scopeCampaigns };
      }
      break;
    // ALL - no additional filter
  }

  return prisma.adsCampaign.findMany({
    where,
    include: {
      account: true,
    },
  });
}

function evaluateConditions(
  conditions: Condition[],
  campaign: any,
  logic: string
): { passed: boolean; metricSnapshot: any; conditionsMet: any[] } {
  const metricSnapshot: any = {};
  const conditionsMet: any[] = [];

  // Map metric names to campaign values
  const getMetricValue = (metric: string): number => {
    switch (metric.toLowerCase()) {
      case "spend":
        return parseFloat(campaign.spend?.toString() || "0");
      case "cpa":
        return parseFloat(campaign.cpa?.toString() || "0");
      case "roas":
        return parseFloat(campaign.roas?.toString() || "0");
      case "ctr":
        return parseFloat(campaign.ctr?.toString() || "0");
      case "cpm":
        return parseFloat(campaign.cpm?.toString() || "0");
      case "cpc":
        return parseFloat(campaign.cpc?.toString() || "0");
      case "frequency":
        return parseFloat(campaign.frequency?.toString() || "0");
      case "conversions":
        return campaign.conversions || 0;
      default:
        return 0;
    }
  };

  const evaluateCondition = (condition: Condition): boolean => {
    const value = getMetricValue(condition.metric);
    metricSnapshot[condition.metric] = value;

    // TODO: Handle timeframe filtering for more accurate checks
    // For now, we use the cached aggregate values

    switch (condition.operator) {
      case ">":
        return value > condition.value;
      case "<":
        return value < condition.value;
      case ">=":
        return value >= condition.value;
      case "<=":
        return value <= condition.value;
      case "==":
        return value === condition.value;
      default:
        return false;
    }
  };

  const results = conditions.map((condition, index) => {
    const result = evaluateCondition(condition);
    if (result) {
      conditionsMet.push({ ...condition, actualValue: metricSnapshot[condition.metric] });
    }
    return result;
  });

  const passed = logic === "OR" ? results.some((r) => r) : results.every((r) => r);

  return { passed, metricSnapshot, conditionsMet };
}

async function executePauseAction(campaign: any, alertId: string, rule: any) {
  try {
    if (campaign.account.platform === "META") {
      await updateMetaCampaignStatus(
        campaign.externalId,
        "PAUSED",
        campaign.account.accessToken
      );
    } else if (campaign.account.platform === "TIKTOK") {
      await updateTikTokCampaignStatus(
        campaign.account.externalId,
        campaign.externalId,
        "DISABLE",
        campaign.account.accessToken
      );
    }

    // Update campaign status in DB
    await prisma.adsCampaign.update({
      where: { id: campaign.id },
      data: { status: "PAUSED" },
    });

    // Update alert with rollback info from rule
    await prisma.adsAlert.update({
      where: { id: alertId },
      data: {
        actionTaken: "PAUSED",
        rollbackEligible: rule.autoRollback || false,
        rollbackAt: rule.autoRollback && rule.rollbackAfterH
          ? new Date(Date.now() + rule.rollbackAfterH * 60 * 60 * 1000)
          : null,
      },
    });

    console.log(`[ADS ALERTS CRON] Paused campaign: ${campaign.name}`);
  } catch (err) {
    console.error(`[ADS ALERTS CRON] Failed to pause campaign ${campaign.id}:`, err);
  }
}

async function executeReduceBudgetAction(campaign: any, reducePct: number, alertId: string, rule: any) {
  try {
    const currentBudget = parseFloat(campaign.dailyBudget?.toString() || "0");
    if (currentBudget <= 0) return;

    const newBudget = currentBudget * (1 - reducePct / 100);

    if (campaign.account.platform === "META") {
      await updateMetaCampaignBudget(
        campaign.externalId,
        newBudget,
        null,
        campaign.account.accessToken
      );
    } else if (campaign.account.platform === "TIKTOK") {
      await updateTikTokCampaignBudget(
        campaign.account.externalId,
        campaign.externalId,
        newBudget,
        campaign.account.accessToken
      );
    }

    // Update in DB
    await prisma.adsCampaign.update({
      where: { id: campaign.id },
      data: { dailyBudget: newBudget },
    });

    // Update alert with rollback info from rule
    await prisma.adsAlert.update({
      where: { id: alertId },
      data: {
        actionTaken: "BUDGET_REDUCED",
        rollbackEligible: rule.autoRollback || false,
        rollbackAt: rule.autoRollback && rule.rollbackAfterH
          ? new Date(Date.now() + rule.rollbackAfterH * 60 * 60 * 1000)
          : null,
      },
    });

    console.log(`[ADS ALERTS CRON] Reduced budget for ${campaign.name}: ${currentBudget} -> ${newBudget}`);
  } catch (err) {
    console.error(`[ADS ALERTS CRON] Failed to reduce budget for ${campaign.id}:`, err);
  }
}
