import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Detalii campanie cu ad sets și ads
export async function GET(
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

    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: params.id },
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            name: true,
            externalId: true,
          },
        },
        adSets: {
          include: {
            ads: true,
          },
          orderBy: { spend: "desc" },
        },
        productMappings: {
          include: {
            masterProduct: {
              select: {
                id: true,
                title: true,
                sku: true,
                images: {
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            rule: {
              select: {
                name: true,
                action: true,
              },
            },
          },
        },
        dailyStats: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu a fost găsită" }, { status: 404 });
    }

    // Transform BigInt to numbers
    const transformCampaign = (c: any) => ({
      ...c,
      impressions: Number(c.impressions),
      reach: Number(c.reach),
      clicks: Number(c.clicks),
      spend: parseFloat(c.spend?.toString() || "0"),
      revenue: parseFloat(c.revenue?.toString() || "0"),
      dailyBudget: c.dailyBudget ? parseFloat(c.dailyBudget.toString()) : null,
      lifetimeBudget: c.lifetimeBudget ? parseFloat(c.lifetimeBudget.toString()) : null,
      ctr: c.ctr ? parseFloat(c.ctr.toString()) : null,
      cpc: c.cpc ? parseFloat(c.cpc.toString()) : null,
      cpm: c.cpm ? parseFloat(c.cpm.toString()) : null,
      cpa: c.cpa ? parseFloat(c.cpa.toString()) : null,
      roas: c.roas ? parseFloat(c.roas.toString()) : null,
      frequency: c.frequency ? parseFloat(c.frequency.toString()) : null,
      adSets: c.adSets?.map((as: any) => ({
        ...as,
        impressions: Number(as.impressions),
        reach: Number(as.reach),
        clicks: Number(as.clicks),
        spend: parseFloat(as.spend?.toString() || "0"),
        revenue: parseFloat(as.revenue?.toString() || "0"),
        dailyBudget: as.dailyBudget ? parseFloat(as.dailyBudget.toString()) : null,
        ctr: as.ctr ? parseFloat(as.ctr.toString()) : null,
        cpc: as.cpc ? parseFloat(as.cpc.toString()) : null,
        cpa: as.cpa ? parseFloat(as.cpa.toString()) : null,
        roas: as.roas ? parseFloat(as.roas.toString()) : null,
        ads: as.ads?.map((ad: any) => ({
          ...ad,
          impressions: Number(ad.impressions),
          reach: Number(ad.reach),
          clicks: Number(ad.clicks),
          spend: parseFloat(ad.spend?.toString() || "0"),
          revenue: parseFloat(ad.revenue?.toString() || "0"),
          ctr: ad.ctr ? parseFloat(ad.ctr.toString()) : null,
          cpc: ad.cpc ? parseFloat(ad.cpc.toString()) : null,
          cpa: ad.cpa ? parseFloat(ad.cpa.toString()) : null,
          roas: ad.roas ? parseFloat(ad.roas.toString()) : null,
        })),
      })),
      dailyStats: c.dailyStats?.map((ds: any) => ({
        ...ds,
        impressions: Number(ds.impressions),
        reach: Number(ds.reach),
        clicks: Number(ds.clicks),
        spend: parseFloat(ds.spend?.toString() || "0"),
        revenue: parseFloat(ds.revenue?.toString() || "0"),
      })),
    });

    return NextResponse.json({ campaign: transformCampaign(campaign) });
  } catch (error: any) {
    console.error("Error fetching campaign details:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}

// PATCH - Update product mapping
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { action, sku, productId } = body;

    if (action === "addProductMapping") {
      if (!sku) {
        return NextResponse.json({ error: "SKU necesar" }, { status: 400 });
      }

      // Check if mapping exists
      const existing = await prisma.adsCampaignProduct.findFirst({
        where: { campaignId: params.id, sku },
      });

      if (existing) {
        return NextResponse.json({ error: "Mapping-ul există deja" }, { status: 400 });
      }

      // Find product if productId not provided
      let masterProductId = productId;
      if (!masterProductId) {
        const product = await prisma.masterProduct.findFirst({
          where: { sku: { contains: sku, mode: "insensitive" } },
        });
        masterProductId = product?.id || null;
      }

      await prisma.adsCampaignProduct.create({
        data: {
          campaignId: params.id,
          sku,
          masterProductId,
          mappingSource: "MANUAL",
          confidence: 1.0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `SKU ${sku} adăugat la campanie`,
      });
    }

    if (action === "removeProductMapping") {
      if (!sku) {
        return NextResponse.json({ error: "SKU necesar" }, { status: 400 });
      }

      await prisma.adsCampaignProduct.deleteMany({
        where: { campaignId: params.id, sku },
      });

      return NextResponse.json({
        success: true,
        message: `SKU ${sku} eliminat din campanie`,
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
