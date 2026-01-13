import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createMetaCampaign, META_OBJECTIVES } from "@/lib/meta-ads";
import { createTikTokCampaign, TIKTOK_OBJECTIVES } from "@/lib/tiktok-ads";
import { AdsPlatform } from "@/types/prisma-enums";

// GET - Obține datele necesare pentru creare campanie
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Obține conturile active
    const accounts = await prisma.adsAccount.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        platform: true,
        name: true,
        externalId: true,
      },
    });

    // Obține produsele pentru mapping
    const products = await prisma.masterProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        title: true,
        images: {
          select: { url: true },
          take: 1,
        },
      },
      take: 100,
      orderBy: { title: "asc" },
    });

    return NextResponse.json({
      accounts,
      products,
      objectives: {
        META: META_OBJECTIVES,
        TIKTOK: TIKTOK_OBJECTIVES,
      },
    });
  } catch (error: any) {
    console.error("Error fetching campaign creation data:", error);
    return NextResponse.json(
      { error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}

// POST - Creează o campanie nouă
export async function POST(request: NextRequest) {
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
    const {
      accountId,
      name,
      objective,
      dailyBudget,
      lifetimeBudget,
      status = "PAUSED",
      productSkus = [],
    } = body;

    if (!accountId || !name || !objective) {
      return NextResponse.json(
        { error: "Cont, nume și obiectiv sunt obligatorii" },
        { status: 400 }
      );
    }

    // Obține contul
    const account = await prisma.adsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Cont negăsit" }, { status: 404 });
    }

    // Construiește numele campaniei cu convenția
    let campaignName = name;
    if (productSkus.length > 0) {
      // CONV_SKU_[COD]_BROAD_2024Q4
      const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      const year = new Date().getFullYear();
      const skuPart = productSkus.slice(0, 3).join("_");
      campaignName = `CONV_SKU_${skuPart}_BROAD_${year}${quarter}`;
    }

    let result: { success: boolean; campaignId?: string; error?: string };

    if (account.platform === "META") {
      result = await createMetaCampaign({
        accountExternalId: account.externalId,
        accessToken: account.accessToken,
        name: campaignName,
        objective,
        status: status === "ACTIVE" ? "ACTIVE" : "PAUSED",
        dailyBudget,
        lifetimeBudget,
      });
    } else if (account.platform === "TIKTOK") {
      result = await createTikTokCampaign({
        advertiserId: account.externalId,
        accessToken: account.accessToken,
        name: campaignName,
        objective,
        budget: dailyBudget,
        budgetMode: "BUDGET_MODE_DAY",
        status: status === "ACTIVE" ? "ENABLE" : "DISABLE",
      });
    } else {
      return NextResponse.json(
        { error: "Platformă nesuportată" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Eroare la creare campanie" },
        { status: 400 }
      );
    }

    // Salvează campania în DB
    const campaign = await prisma.adsCampaign.create({
      data: {
        accountId: account.id,
        externalId: result.campaignId!,
        name: campaignName,
        status: status === "ACTIVE" ? "ACTIVE" : "PAUSED",
        objective,
        dailyBudget,
        lifetimeBudget,
        namingValid: productSkus.length > 0,
        parsedCodes: productSkus,
      },
    });

    // Creează mapping-uri pentru produse
    if (productSkus.length > 0) {
      for (const sku of productSkus) {
        const product = await prisma.masterProduct.findFirst({
          where: { sku: { contains: sku, mode: "insensitive" } },
        });

        await prisma.adsCampaignProduct.create({
          data: {
            campaignId: campaign.id,
            sku,
            masterProductId: product?.id || null,
            mappingSource: "MANUAL",
            confidence: 1.0,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        externalId: campaign.externalId,
        name: campaign.name,
      },
      message: `Campania "${campaignName}" a fost creată cu succes`,
    });
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la creare" },
      { status: 500 }
    );
  }
}
