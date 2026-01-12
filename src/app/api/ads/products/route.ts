import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Performanță per SKU/Produs
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
    const platform = searchParams.get("platform");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "spend"; // spend, roas, conversions, cpa
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Obține mapping-uri campanie-produs cu statistici agregate
    const productMappings = await prisma.adsCampaignProduct.findMany({
      include: {
        campaign: {
          include: {
            account: {
              select: {
                platform: true,
                name: true,
              },
            },
          },
        },
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
    });

    // Agregă statisticile per SKU
    const skuStats: Record<string, {
      sku: string;
      productTitle: string | null;
      productId: string | null;
      imageUrl: string | null;
      campaignCount: number;
      platforms: Set<string>;
      totalSpend: number;
      totalImpressions: number;
      totalClicks: number;
      totalConversions: number;
      totalRevenue: number;
      campaigns: any[];
    }> = {};

    for (const mapping of productMappings) {
      const sku = mapping.sku;
      
      // Skip mappings without SKU
      if (!sku) continue;
      
      // Filtru platformă
      if (platform && mapping.campaign.account.platform !== platform) {
        continue;
      }

      // Filtru search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSku = sku.toLowerCase().includes(searchLower);
        const matchesProduct = mapping.masterProduct?.title?.toLowerCase().includes(searchLower);
        if (!matchesSku && !matchesProduct) {
          continue;
        }
      }

      if (!skuStats[sku]) {
        skuStats[sku] = {
          sku,
          productTitle: mapping.masterProduct?.title || null,
          productId: mapping.masterProduct?.id || null,
          imageUrl: mapping.masterProduct?.images?.[0]?.url || null,
          campaignCount: 0,
          platforms: new Set(),
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          campaigns: [],
        };
      }

      const campaign = mapping.campaign;
      skuStats[sku].campaignCount++;
      skuStats[sku].platforms.add(campaign.account.platform);
      skuStats[sku].totalSpend += parseFloat(campaign.spend?.toString() || "0");
      skuStats[sku].totalImpressions += Number(campaign.impressions || 0);
      skuStats[sku].totalClicks += Number(campaign.clicks || 0);
      skuStats[sku].totalConversions += campaign.conversions || 0;
      skuStats[sku].totalRevenue += parseFloat(campaign.revenue?.toString() || "0");
      skuStats[sku].campaigns.push({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.account.platform,
        status: campaign.status,
        spend: parseFloat(campaign.spend?.toString() || "0"),
        conversions: campaign.conversions || 0,
        roas: campaign.roas ? parseFloat(campaign.roas.toString()) : null,
      });
    }

    // Calculează KPIs și convertește Set la Array
    const products = Object.values(skuStats).map(stat => ({
      ...stat,
      platforms: Array.from(stat.platforms),
      ctr: stat.totalImpressions > 0 ? (stat.totalClicks / stat.totalImpressions) * 100 : null,
      cpc: stat.totalClicks > 0 ? stat.totalSpend / stat.totalClicks : null,
      cpa: stat.totalConversions > 0 ? stat.totalSpend / stat.totalConversions : null,
      roas: stat.totalSpend > 0 ? stat.totalRevenue / stat.totalSpend : null,
    }));

    // Sortare
    products.sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;

      switch (sortBy) {
        case "spend":
          aVal = a.totalSpend;
          bVal = b.totalSpend;
          break;
        case "roas":
          aVal = a.roas || 0;
          bVal = b.roas || 0;
          break;
        case "conversions":
          aVal = a.totalConversions;
          bVal = b.totalConversions;
          break;
        case "cpa":
          aVal = a.cpa || 999999;
          bVal = b.cpa || 999999;
          break;
        case "revenue":
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
      }

      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Statistici globale
    const totals = products.reduce((acc, p) => ({
      totalSpend: acc.totalSpend + p.totalSpend,
      totalRevenue: acc.totalRevenue + p.totalRevenue,
      totalConversions: acc.totalConversions + p.totalConversions,
      totalImpressions: acc.totalImpressions + p.totalImpressions,
      totalClicks: acc.totalClicks + p.totalClicks,
    }), {
      totalSpend: 0,
      totalRevenue: 0,
      totalConversions: 0,
      totalImpressions: 0,
      totalClicks: 0,
    });

    return NextResponse.json({
      products,
      totals: {
        ...totals,
        avgRoas: totals.totalSpend > 0 ? totals.totalRevenue / totals.totalSpend : null,
        avgCpa: totals.totalConversions > 0 ? totals.totalSpend / totals.totalConversions : null,
      },
      count: products.length,
    });
  } catch (error: any) {
    console.error("Error fetching product performance:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcarea datelor" },
      { status: 500 }
    );
  }
}
