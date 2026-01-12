import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHistoricalInsights, syncCampaignDailyStats } from "@/lib/meta-ads";
import { prisma } from "@/lib/db";

/**
 * GET - Obține insights istorice pentru grafice
 * 
 * Query params:
 * - start: Data de început (YYYY-MM-DD)
 * - end: Data de sfârșit (YYYY-MM-DD)
 * - preset: last_7d, last_14d, last_30d, this_month, last_month
 * - refresh: true pentru a forța re-sync
 */
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

    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse dates
    let startDate: Date;
    let endDate: Date = new Date();
    
    const preset = searchParams.get("preset");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const refresh = searchParams.get("refresh") === "true";

    if (preset) {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      
      switch (preset) {
        case "last_7d":
          startDate.setDate(startDate.getDate() - 6);
          break;
        case "last_14d":
          startDate.setDate(startDate.getDate() - 13);
          break;
        case "last_30d":
          startDate.setDate(startDate.getDate() - 29);
          break;
        case "this_month":
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
          endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
          break;
        default:
          startDate.setDate(startDate.getDate() - 29); // default 30 days
      }
    } else if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
    } else {
      // Default: last 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
    }

    startDate.setHours(0, 0, 0, 0);

    // Verifică că campania există
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu există" }, { status: 404 });
    }

    // Dacă refresh sau nu avem date, sincronizează
    if (refresh) {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      await syncCampaignDailyStats(
        campaign.accountId,
        campaign.externalId,
        campaign.account.accessToken,
        days + 1
      );
    }

    // Obține datele
    const result = await getHistoricalInsights(id, startDate, endDate);

    // Adaugă metadata
    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        days: result.data.length,
      },
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching historical insights:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}
