import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check if AI is configured
    const settings = await getAISettings();
    if (!settings?.aiApiKey) {
      return NextResponse.json({
        error: "API Key Claude nu este configurat. Mergi la Setări → AI pentru a-l adăuga.",
      }, { status: 400 });
    }

    const { type } = await request.json();
    
    if (!type || !["ads", "products", "all"].includes(type)) {
      return NextResponse.json({
        error: "Tip de analiză invalid. Folosește: ads, products, sau all",
      }, { status: 400 });
    }

    // Create analysis run
    const run = await createAnalysisRun(type, session.user.id);
    
    let allInsights: any[] = [];
    let totalTokens = 0;
    let summaries: string[] = [];

    try {
      // Analyze Ads
      if (type === "ads" || type === "all") {
        const adsData = await getAdsDataForAnalysis();
        const historicalActions = await getHistoricalActions("AD_BUDGET", 20);
        
        if (adsData.length > 0) {
          const adsResult = await analyzeAdsPerformance(adsData, historicalActions);
          allInsights.push(...adsResult.insights);
          totalTokens += adsResult.tokensUsed;
          if (adsResult.summary) summaries.push(`Ads: ${adsResult.summary}`);
        }
      }

      // Analyze Products
      if (type === "products" || type === "all") {
        const { products, sales } = await getProductsDataForAnalysis();
        const historicalActions = await getHistoricalActions("PRODUCT_PRICE", 20);
        
        if (products.length > 0) {
          const productsResult = await analyzeProductPrices(products, sales, historicalActions);
          allInsights.push(...productsResult.insights);
          totalTokens += productsResult.tokensUsed;
          if (productsResult.summary) summaries.push(`Produse: ${productsResult.summary}`);
        }
      }

      // Save insights to database
      if (allInsights.length > 0) {
        await saveInsights(allInsights, run.id);
      }

      // Complete the run
      await completeAnalysisRun(run.id, allInsights.length, totalTokens);

      // Update last analysis timestamp
      await prisma.settings.update({
        where: { id: "default" },
        data: { aiLastAnalysisAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        runId: run.id,
        insightsGenerated: allInsights.length,
        tokensUsed: totalTokens,
        summary: summaries.join(" | "),
      });

    } catch (analysisError: any) {
      // Complete run with error
      await completeAnalysisRun(run.id, 0, 0, analysisError.message);
      throw analysisError;
    }

  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json({
      error: error.message || "Eroare la analiza AI",
    }, { status: 500 });
  }
}

// Get ads data formatted for AI analysis
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
    take: 20, // Limit to avoid token overflow
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
    // Metrics
    spend: c.spend,
    impressions: Number(c.impressions),
    clicks: Number(c.clicks),
    ctr: Number(c.impressions) > 0 ? ((Number(c.clicks) / Number(c.impressions)) * 100).toFixed(2) : 0,
    cpc: Number(c.clicks) > 0 ? (Number(c.spend) / Number(c.clicks)).toFixed(2) : 0,
    conversions: c.conversions,
    revenue: c.revenue,
    roas: Number(c.spend) > 0 ? (Number(c.revenue) / Number(c.spend)).toFixed(2) : 0,
    cpa: c.conversions > 0 ? (Number(c.spend) / c.conversions).toFixed(2) : 0,
    // Structure
    adSetsCount: c.adSets.length,
    activeAdSets: c.adSets.filter((as) => as.status === "ACTIVE").length,
  }));
}

// Get products data formatted for AI analysis
async function getProductsDataForAnalysis() {
  // Get products with sales data
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

  // Get recent sales (last 30 days) by SKU from LineItems
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

  // Map sales by SKU
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
      // Sales metrics (last 30 days)
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

// GET - Fetch insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      status,
    };
    
    // Support multiple types separated by comma
    if (type) {
      const types = type.split(",").map(t => t.trim());
      if (types.length === 1) {
        where.type = types[0];
      } else {
        where.type = { in: types };
      }
    }

    const insights = await prisma.aIInsight.findMany({
      where,
      orderBy: [
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Get recent runs
    const runs = await prisma.aIAnalysisRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      insights,
      runs,
    });

  } catch (error: any) {
    console.error("Error fetching insights:", error);
    return NextResponse.json({
      error: error.message || "Eroare la încărcarea insight-urilor",
    }, { status: 500 });
  }
}
