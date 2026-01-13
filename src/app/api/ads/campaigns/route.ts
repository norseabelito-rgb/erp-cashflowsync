import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
// Prisma types not available due to client not being generated
import { 
  updateMetaCampaignStatus, 
  updateMetaCampaignBudget 
} from "@/lib/meta-ads";
import {
  updateTikTokCampaignStatus,
  updateTikTokCampaignBudget,
} from "@/lib/tiktok-ads";

// GET - Lista campanii cu statistici agregate
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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {};
    
    if (accountId && accountId !== "all") {
      where.accountId = accountId;
    }
    
    if (status && status !== "all") {
      where.status = status as any;
    }
    
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Fetch campaigns with account info
    const campaigns = await prisma.adsCampaign.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { spend: "desc" },
      ],
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            name: true,
            currency: true,
          },
        },
        _count: {
          select: {
            adSets: true,
            productMappings: true,
            alerts: true,
          },
        },
      },
    });

    // Calculate aggregate stats
    const aggregateResult = await prisma.adsCampaign.aggregate({
      where,
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
      _avg: {
        ctr: true,
        cpc: true,
        cpa: true,
        roas: true,
      },
      _count: true,
    });

    const stats = {
      totalCampaigns: aggregateResult._count,
      totalSpend: Number(aggregateResult._sum.spend) || 0,
      totalImpressions: Number(aggregateResult._sum.impressions) || 0,
      totalClicks: Number(aggregateResult._sum.clicks) || 0,
      totalConversions: aggregateResult._sum.conversions || 0,
      totalRevenue: Number(aggregateResult._sum.revenue) || 0,
      avgCTR: aggregateResult._avg.ctr ? Number(aggregateResult._avg.ctr) : null,
      avgCPC: aggregateResult._avg.cpc ? Number(aggregateResult._avg.cpc) : null,
      avgCPA: aggregateResult._avg.cpa ? Number(aggregateResult._avg.cpa) : null,
      avgROAS: aggregateResult._avg.roas ? Number(aggregateResult._avg.roas) : null,
    };

    // Count by status
    const statusCounts = await prisma.adsCampaign.groupBy({
      by: ["status"],
      where: accountId && accountId !== "all" ? { accountId } : undefined,
      _count: true,
    });

    const statusStats = {
      active: 0,
      paused: 0,
      deleted: 0,
      other: 0,
    };

    for (const s of statusCounts) {
      if (s.status === "ACTIVE") statusStats.active = s._count;
      else if (s.status === "PAUSED") statusStats.paused = s._count;
      else if (s.status === "DELETED") statusStats.deleted = s._count;
      else statusStats.other += s._count;
    }

    return NextResponse.json({
      campaigns: campaigns.map((c: any) => ({
        id: c.id,
        accountId: c.accountId,
        externalId: c.externalId,
        name: c.name,
        status: c.status,
        effectiveStatus: c.effectiveStatus,
        objective: c.objective,
        dailyBudget: c.dailyBudget ? Number(c.dailyBudget) : null,
        lifetimeBudget: c.lifetimeBudget ? Number(c.lifetimeBudget) : null,
        spend: Number(c.spend),
        impressions: Number(c.impressions),
        clicks: Number(c.clicks),
        conversions: c.conversions,
        revenue: Number(c.revenue),
        ctr: c.ctr ? Number(c.ctr) : null,
        cpc: c.cpc ? Number(c.cpc) : null,
        cpm: c.cpm ? Number(c.cpm) : null,
        cpa: c.cpa ? Number(c.cpa) : null,
        roas: c.roas ? Number(c.roas) : null,
        namingValid: c.namingValid,
        parsedType: c.parsedType,
        parsedCodes: c.parsedCodes,
        startDate: c.startDate,
        endDate: c.endDate,
        lastSyncAt: c.lastSyncAt,
        createdAt: c.createdAt,
        account: c.account,
        adSetsCount: c._count.adSets,
        productMappingsCount: c._count.productMappings,
        alertsCount: c._count.alerts,
      })),
      stats,
      statusStats,
    });
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcarea campaniilor" },
      { status: 500 }
    );
  }
}

// PATCH - Update campaign (status, budget)
export async function PATCH(request: NextRequest) {
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
    const { campaignId, action, status, dailyBudget, autoRollback, rollbackAfterH } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "ID-ul campaniei este necesar" }, { status: 400 });
    }

    // Get campaign with account
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: campaignId },
      include: { account: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu a fost găsită" }, { status: 404 });
    }

    // Handle different actions
    if (action === "updateStatus" && status) {
      const newStatus = status as "ACTIVE" | "PAUSED";
      
      // Call platform API to update status
      try {
        if (campaign.account.platform === "META") {
          const success = await updateMetaCampaignStatus(
            campaign.externalId,
            newStatus,
            campaign.account.accessToken
          );
          
          if (!success) {
            return NextResponse.json(
              { error: "Meta API a returnat eroare la actualizare status" },
              { status: 500 }
            );
          }
        } else if (campaign.account.platform === "TIKTOK") {
          const tiktokStatus = newStatus === "ACTIVE" ? "ENABLE" : "DISABLE";
          const success = await updateTikTokCampaignStatus(
            campaign.account.externalId, // advertiserId
            campaign.externalId,          // campaignId
            tiktokStatus,
            campaign.account.accessToken
          );
          
          if (!success) {
            return NextResponse.json(
              { error: "TikTok API a returnat eroare la actualizare status" },
              { status: 500 }
            );
          }
        }
      } catch (apiError: any) {
        console.error("Platform API error:", apiError);
        return NextResponse.json(
          { error: `Eroare API platformă: ${apiError.message}` },
          { status: 500 }
        );
      }
      
      // Update local DB after successful API call
      await prisma.adsCampaign.update({
        where: { id: campaignId },
        data: { status: newStatus },
      });

      return NextResponse.json({
        success: true,
        message: `Status actualizat la ${status}`,
      });
    }

    if (action === "updateBudget" && dailyBudget !== undefined) {
      // Call platform API to update budget
      try {
        if (campaign.account.platform === "META") {
          const success = await updateMetaCampaignBudget(
            campaign.externalId,
            dailyBudget,
            null, // lifetimeBudget
            campaign.account.accessToken
          );
          
          if (!success) {
            return NextResponse.json(
              { error: "Meta API a returnat eroare la actualizare buget" },
              { status: 500 }
            );
          }
        } else if (campaign.account.platform === "TIKTOK") {
          const success = await updateTikTokCampaignBudget(
            campaign.account.externalId, // advertiserId
            campaign.externalId,          // campaignId
            dailyBudget,
            campaign.account.accessToken
          );
          
          if (!success) {
            return NextResponse.json(
              { error: "TikTok API a returnat eroare la actualizare buget" },
              { status: 500 }
            );
          }
        }
      } catch (apiError: any) {
        console.error("Platform API error:", apiError);
        return NextResponse.json(
          { error: `Eroare API platformă: ${apiError.message}` },
          { status: 500 }
        );
      }
      
      // Update local DB after successful API call
      await prisma.adsCampaign.update({
        where: { id: campaignId },
        data: { dailyBudget },
      });

      return NextResponse.json({
        success: true,
        message: "Buget actualizat",
      });
    }

    if (action === "updateRollback") {
      await prisma.adsCampaign.update({
        where: { id: campaignId },
        data: { 
          autoRollback: autoRollback ?? false,
          rollbackAfterH: rollbackAfterH ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Setări rollback actualizate",
      });
    }

    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizare" },
      { status: 500 }
    );
  }
}
