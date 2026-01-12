import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { comparePeriods } from "@/lib/meta-ads";
import { prisma } from "@/lib/db";

/**
 * GET - Compară două perioade pentru o campanie
 * 
 * Query params:
 * - period1_start, period1_end: Prima perioadă
 * - period2_start, period2_end: A doua perioadă
 * - preset: vs_previous (compară cu perioada anterioară de aceeași lungime)
 *           vs_last_week, vs_last_month
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
    
    const preset = searchParams.get("preset");
    
    let period1Start: Date;
    let period1End: Date;
    let period2Start: Date;
    let period2End: Date;

    if (preset) {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      switch (preset) {
        case "vs_previous_7d":
          // Ultimele 7 zile vs 7 zile anterioare
          period1End = new Date(now);
          period1Start = new Date(now);
          period1Start.setDate(period1Start.getDate() - 6);
          
          period2End = new Date(period1Start);
          period2End.setDate(period2End.getDate() - 1);
          period2Start = new Date(period2End);
          period2Start.setDate(period2Start.getDate() - 6);
          break;

        case "vs_previous_14d":
          // Ultimele 14 zile vs 14 zile anterioare
          period1End = new Date(now);
          period1Start = new Date(now);
          period1Start.setDate(period1Start.getDate() - 13);
          
          period2End = new Date(period1Start);
          period2End.setDate(period2End.getDate() - 1);
          period2Start = new Date(period2End);
          period2Start.setDate(period2Start.getDate() - 13);
          break;

        case "vs_previous_30d":
          // Ultimele 30 zile vs 30 zile anterioare
          period1End = new Date(now);
          period1Start = new Date(now);
          period1Start.setDate(period1Start.getDate() - 29);
          
          period2End = new Date(period1Start);
          period2End.setDate(period2End.getDate() - 1);
          period2Start = new Date(period2End);
          period2Start.setDate(period2Start.getDate() - 29);
          break;

        case "this_week_vs_last":
          // Săptămâna curentă vs săptămâna trecută
          const dayOfWeek = now.getDay();
          period1Start = new Date(now);
          period1Start.setDate(now.getDate() - dayOfWeek + 1); // Monday this week
          period1End = new Date(now);
          
          period2Start = new Date(period1Start);
          period2Start.setDate(period2Start.getDate() - 7);
          period2End = new Date(period1Start);
          period2End.setDate(period2End.getDate() - 1);
          break;

        case "this_month_vs_last":
          // Luna curentă vs luna trecută
          period1Start = new Date(now.getFullYear(), now.getMonth(), 1);
          period1End = new Date(now);
          
          period2Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          period2End = new Date(now.getFullYear(), now.getMonth(), 0);
          break;

        default:
          return NextResponse.json({ error: "Preset invalid" }, { status: 400 });
      }
    } else {
      // Parse manual dates
      const p1s = searchParams.get("period1_start");
      const p1e = searchParams.get("period1_end");
      const p2s = searchParams.get("period2_start");
      const p2e = searchParams.get("period2_end");

      if (!p1s || !p1e || !p2s || !p2e) {
        return NextResponse.json({ 
          error: "Lipsesc parametrii. Folosește preset sau period1_start, period1_end, period2_start, period2_end" 
        }, { status: 400 });
      }

      period1Start = new Date(p1s);
      period1End = new Date(p1e);
      period2Start = new Date(p2s);
      period2End = new Date(p2e);
    }

    // Set hours
    period1Start.setHours(0, 0, 0, 0);
    period1End.setHours(23, 59, 59, 999);
    period2Start.setHours(0, 0, 0, 0);
    period2End.setHours(23, 59, 59, 999);

    // Verifică că campania există
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu există" }, { status: 404 });
    }

    // Compară perioadele
    const comparison = await comparePeriods(
      id,
      period1Start,
      period1End,
      period2Start,
      period2End
    );

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      comparison,
      // Interpretare a schimbărilor
      summary: {
        spendChange: formatChange(comparison.changes.spend, "spend"),
        roasChange: formatChange(comparison.changes.roas, "roas"),
        conversionsChange: formatChange(comparison.changes.conversions, "conversions"),
      },
    });
  } catch (error: any) {
    console.error("Error comparing periods:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la comparare" },
      { status: 500 }
    );
  }
}

function formatChange(change: number | null, metric: string): string {
  if (change === null) return "N/A";
  
  const direction = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const absChange = Math.abs(change).toFixed(1);
  
  // Interpretare
  let interpretation = "";
  if (metric === "spend") {
    interpretation = change > 0 ? "Cheltuieli mai mari" : "Economie";
  } else if (metric === "roas") {
    interpretation = change > 0 ? "ROI mai bun" : "ROI mai slab";
  } else if (metric === "conversions") {
    interpretation = change > 0 ? "Mai multe conversii" : "Mai puține conversii";
  }

  return `${direction} ${absChange}% - ${interpretation}`;
}
