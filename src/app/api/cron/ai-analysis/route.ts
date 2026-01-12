import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  analyzeAdsPerformance,
  analyzeProductPrices,
  getHistoricalActions,
  saveInsights,
  createAnalysisRun,
  completeAnalysisRun,
  getAISettings,
} from "@/lib/ai";

// Vercel Cron or external cron should call this endpoint
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/ai-analysis", "schedule": "0 * * * *" }] }
// This runs every hour and checks if it's time for daily analysis

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow without secret for development, but log warning
      console.warn("AI Cron called without valid secret");
    }

    // Get AI settings
    const settings = await getAISettings();
    
    if (!settings?.aiApiKey) {
      return NextResponse.json({
        skipped: true,
        reason: "API Key nu este configurat",
      });
    }

    if (!settings.aiDailyAnalysisEnabled) {
      return NextResponse.json({
        skipped: true,
        reason: "Analiza zilnică este dezactivată",
      });
    }

    // Check if it's time to run
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse configured time (format: "HH:MM")
    const [configuredHour, configuredMinute] = (settings.aiDailyAnalysisTime || "08:00")
      .split(":")
      .map(Number);

    // Only run if current hour matches and we're within the first 15 minutes
    // This prevents multiple runs if cron runs more frequently
    if (currentHour !== configuredHour || currentMinute > 15) {
      return NextResponse.json({
        skipped: true,
        reason: `Nu este ora programată. Ora curentă: ${currentHour}:${currentMinute}, Ora programată: ${configuredHour}:${configuredMinute}`,
      });
    }

    // Check if we already ran today
    const fullSettings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { aiLastAnalysisAt: true },
    });

    if (fullSettings?.aiLastAnalysisAt) {
      const lastRun = new Date(fullSettings.aiLastAnalysisAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (lastRun >= today) {
        return NextResponse.json({
          skipped: true,
          reason: "Analiza a fost deja rulată azi",
          lastRun: lastRun.toISOString(),
        });
      }
    }

    console.log(`[AI Cron] Starting daily analysis at ${now.toISOString()}`);

    // Create analysis run
    const run = await createAnalysisRun("daily_auto", "system_cron");
    
    let allInsights: any[] = [];
    let totalTokens = 0;
    let summaries: string[] = [];
    let errors: string[] = [];

    // 1. Analyze Ads
    try {
      const adsData = await getAdsDataForAnalysis();
      if (adsData.length > 0) {
        const historicalActions = await getHistoricalActions("AD_BUDGET", 20);
        const adsResult = await analyzeAdsPerformance(adsData, historicalActions);
        allInsights.push(...adsResult.insights);
        totalTokens += adsResult.tokensUsed;
        if (adsResult.summary) summaries.push(`Ads: ${adsResult.summary}`);
        console.log(`[AI Cron] Ads analysis: ${adsResult.insights.length} insights`);
      } else {
        console.log("[AI Cron] No active ads campaigns to analyze");
      }
    } catch (adsError: any) {
      console.error("[AI Cron] Ads analysis error:", adsError);
      errors.push(`Ads: ${adsError.message}`);
    }

    // 2. Analyze Products
    try {
      const { products, sales } = await getProductsDataForAnalysis();
      if (products.length > 0) {
        const historicalActions = await getHistoricalActions("PRODUCT_PRICE", 20);
        const productsResult = await analyzeProductPrices(products, sales, historicalActions);
        allInsights.push(...productsResult.insights);
        totalTokens += productsResult.tokensUsed;
        if (productsResult.summary) summaries.push(`Produse: ${productsResult.summary}`);
        console.log(`[AI Cron] Products analysis: ${productsResult.insights.length} insights`);
      } else {
        console.log("[AI Cron] No active products to analyze");
      }
    } catch (productsError: any) {
      console.error("[AI Cron] Products analysis error:", productsError);
      errors.push(`Produse: ${productsError.message}`);
    }

    // Save insights
    if (allInsights.length > 0) {
      await saveInsights(allInsights, run.id);
    }

    // Complete the run
    const errorMessage = errors.length > 0 ? errors.join("; ") : undefined;
    await completeAnalysisRun(run.id, allInsights.length, totalTokens, errorMessage);

    // Update last analysis timestamp
    await prisma.settings.update({
      where: { id: "default" },
      data: { aiLastAnalysisAt: new Date() },
    });

    console.log(`[AI Cron] Daily analysis complete: ${allInsights.length} insights, ${totalTokens} tokens`);

    return NextResponse.json({
      success: true,
      runId: run.id,
      insightsGenerated: allInsights.length,
      tokensUsed: totalTokens,
      summaries,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error("[AI Cron] Fatal error:", error);
    return NextResponse.json({
      error: error.message || "Eroare la analiza zilnică",
    }, { status: 500 });
  }
}

// Get ads data for analysis (copied from analyze route, should be shared)
async function getAdsDataForAnalysis() {
  const campaigns = await prisma.adsCampaign.findMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    include: {
      account: {
        select: { name: true, platform: true },
      },
      adSets: {
        include: {
          ads: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return campaigns.map((c) => ({
    id: c.id,
    platformId: c.externalId,
    name: c.name,
    platform: c.account.platform,
    accountName: c.account.name,
    status: c.status,
    objective: c.objective,
    budget: c.dailyBudget || c.lifetimeBudget,
    budgetType: c.dailyBudget ? "daily" : "lifetime",
    spend: c.spend,
    impressions: Number(c.impressions),
    clicks: Number(c.clicks),
    ctr: Number(c.impressions) > 0 ? ((Number(c.clicks) / Number(c.impressions)) * 100).toFixed(2) : 0,
    cpc: Number(c.clicks) > 0 ? (Number(c.spend) / Number(c.clicks)).toFixed(2) : 0,
    conversions: c.conversions,
    revenue: c.revenue,
    roas: Number(c.spend) > 0 ? (Number(c.revenue) / Number(c.spend)).toFixed(2) : 0,
    cpa: c.conversions > 0 ? (Number(c.spend) / c.conversions).toFixed(2) : 0,
    adSetsCount: c.adSets.length,
    activeAdSets: c.adSets.filter((as) => as.status === "ACTIVE").length,
  }));
}

// Get products data for analysis
async function getProductsDataForAnalysis() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      costPrice: true,
      stockQuantity: true,
      lowStockAlert: true,
      category: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesBySku = await prisma.lineItem.groupBy({
    by: ["sku"],
    where: {
      sku: { not: null },
      order: {
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: ["CANCELLED", "RETURNED"] },
      },
    },
    _sum: {
      quantity: true,
      price: true,
    },
    _count: true,
  });

  const salesMap = new Map<string, { totalSold: number; revenue: number; orderCount: number }>();
  for (const s of salesBySku) {
    if (s.sku) {
      salesMap.set(s.sku, {
        totalSold: s._sum?.quantity || 0,
        revenue: Number(s._sum?.price) || 0,
        orderCount: s._count || 0,
      });
    }
  }

  const productsWithSales = products.map((p) => {
    const sales = salesMap.get(p.sku) || { totalSold: 0, revenue: 0, orderCount: 0 };
    const margin = p.costPrice && Number(p.costPrice) > 0
      ? ((Number(p.price) - Number(p.costPrice)) / Number(p.price) * 100).toFixed(1)
      : null;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: Number(p.price),
      costPrice: Number(p.costPrice) || null,
      margin: margin ? `${margin}%` : "N/A",
      stock: p.stockQuantity,
      lowStockThreshold: p.lowStockAlert,
      category: p.category,
      unitsSold: sales.totalSold,
      revenue: sales.revenue.toFixed(2),
      ordersCount: sales.orderCount,
      avgDailySales: (sales.totalSold / 30).toFixed(2),
    };
  });

  return {
    products: productsWithSales,
    sales: salesBySku,
  };
}
