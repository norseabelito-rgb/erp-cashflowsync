import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Overview statistics
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

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const platform = searchParams.get("platform");
    const dateRange = searchParams.get("dateRange") || "30d"; // 7d, 30d, 90d, ytd

    // Build where clause
    const where: any = {};
    if (accountId) {
      where.accountId = accountId;
    }
    if (platform) {
      where.account = { platform };
    }

    // Get accounts count
    const accountsCount = await prisma.adsAccount.count({
      where: { status: "ACTIVE" },
    });

    // Get campaigns count by status
    const campaignCounts = await prisma.adsCampaign.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    const campaignCountMap = campaignCounts.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = c._count;
      return acc;
    }, {} as Record<string, number>);

    // Aggregate KPIs from all campaigns
    const aggregated = await prisma.adsCampaign.aggregate({
      where,
      _sum: {
        spend: true,
        impressions: true,
        reach: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
      _count: true,
    });

    const totalSpend = parseFloat(aggregated._sum.spend?.toString() || "0");
    const totalImpressions = Number(aggregated._sum.impressions || 0);
    const totalReach = Number(aggregated._sum.reach || 0);
    const totalClicks = Number(aggregated._sum.clicks || 0);
    const totalConversions = aggregated._sum.conversions || 0;
    const totalRevenue = parseFloat(aggregated._sum.revenue?.toString() || "0");

    // Calculate average KPIs
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;

    // Get new alerts count
    const newAlertsCount = await prisma.adsAlert.count({
      where: { status: "NEW" },
    });

    // Top campaigns by spend
    const topCampaigns = await prisma.adsCampaign.findMany({
      where: { ...where, status: "ACTIVE" },
      orderBy: { spend: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        spend: true,
        conversions: true,
        roas: true,
        account: {
          select: { platform: true },
        },
      },
    });

    // Top performing by ROAS
    const topByRoas = await prisma.adsCampaign.findMany({
      where: { ...where, status: "ACTIVE", roas: { gt: 0 } },
      orderBy: { roas: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        spend: true,
        revenue: true,
        roas: true,
        account: {
          select: { platform: true },
        },
      },
    });

    // Worst performing by CPA
    const worstByCpa = await prisma.adsCampaign.findMany({
      where: { ...where, status: "ACTIVE", cpa: { gt: 0 } },
      orderBy: { cpa: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        spend: true,
        conversions: true,
        cpa: true,
        account: {
          select: { platform: true },
        },
      },
    });

    return NextResponse.json({
      overview: {
        accountsConnected: accountsCount,
        totalCampaigns: aggregated._count,
        activeCampaigns: campaignCountMap.ACTIVE || 0,
        pausedCampaigns: campaignCountMap.PAUSED || 0,
        totalSpend,
        totalImpressions,
        totalReach,
        totalClicks,
        totalConversions,
        totalRevenue,
        avgCtr,
        avgCpc,
        avgCpm,
        avgCpa,
        avgRoas,
        avgFrequency,
        newAlertsCount,
      },
      topCampaigns: topCampaigns.map((c: any) => ({
        ...c,
        spend: parseFloat(c.spend.toString()),
        roas: c.roas ? parseFloat(c.roas.toString()) : null,
      })),
      topByRoas: topByRoas.map((c: any) => ({
        ...c,
        spend: parseFloat(c.spend.toString()),
        revenue: parseFloat(c.revenue.toString()),
        roas: c.roas ? parseFloat(c.roas.toString()) : null,
      })),
      worstByCpa: worstByCpa.map((c: any) => ({
        ...c,
        spend: parseFloat(c.spend.toString()),
        cpa: c.cpa ? parseFloat(c.cpa.toString()) : null,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching stats overview:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcarea statisticilor" },
      { status: 500 }
    );
  }
}
