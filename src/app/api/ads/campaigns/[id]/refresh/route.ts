import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { refreshCampaignInsights, syncCampaignDetails } from "@/lib/meta-ads";
import { prisma } from "@/lib/db";

/**
 * POST - Refresh instant pentru o campanie
 * 
 * Query params:
 * - full=true: sincronizează și ad sets/ads
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "ads.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const fullSync = searchParams.get("full") === "true";

    // Verifică că campania există
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu există" }, { status: 404 });
    }

    // Refresh insights
    const insightsResult = await refreshCampaignInsights(id);
    
    if (!insightsResult.success) {
      return NextResponse.json(
        { error: insightsResult.error || "Eroare la refresh insights" },
        { status: 500 }
      );
    }

    let detailsResult = null;

    // Dacă full sync, sincronizează și detaliile
    if (fullSync) {
      detailsResult = await syncCampaignDetails(id);
    }

    // Obține campania actualizată
    const updatedCampaign = await prisma.adsCampaign.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        _count: {
          select: {
            adSets: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: fullSync ? "Sincronizare completă" : "Insights actualizate",
      campaign: {
        ...updatedCampaign,
        spend: Number(updatedCampaign?.spend),
        impressions: Number(updatedCampaign?.impressions),
        reach: Number(updatedCampaign?.reach),
        clicks: Number(updatedCampaign?.clicks),
        revenue: Number(updatedCampaign?.revenue),
        dailyBudget: updatedCampaign?.dailyBudget ? Number(updatedCampaign.dailyBudget) : null,
        lifetimeBudget: updatedCampaign?.lifetimeBudget ? Number(updatedCampaign.lifetimeBudget) : null,
        ctr: updatedCampaign?.ctr ? Number(updatedCampaign.ctr) : null,
        cpc: updatedCampaign?.cpc ? Number(updatedCampaign.cpc) : null,
        cpm: updatedCampaign?.cpm ? Number(updatedCampaign.cpm) : null,
        cpa: updatedCampaign?.cpa ? Number(updatedCampaign.cpa) : null,
        roas: updatedCampaign?.roas ? Number(updatedCampaign.roas) : null,
      },
      details: detailsResult,
    });
  } catch (error: any) {
    console.error("Error refreshing campaign:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la refresh" },
      { status: 500 }
    );
  }
}
