import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  getAnthropicClient,
  getAISettings,
  saveInsights,
  createAnalysisRun,
  completeAnalysisRun,
  getHistoricalActions,
  AIInsightSuggestion,
} from "@/lib/ai";

// POST - Analyze specific campaign (on-demand)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { id: campaignId } = params;

    // Check if AI is configured
    const settings = await getAISettings();
    if (!settings?.aiApiKey) {
      return NextResponse.json({
        error: "API Key Claude nu este configurat. Mergi la Setări → AI pentru a-l adăuga.",
      }, { status: 400 });
    }

    // Get campaign with full details
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: campaignId },
      include: {
        account: {
          select: { name: true, platform: true, currency: true },
        },
        adSets: {
          include: {
            ads: true,
          },
        },
        dailyStats: {
          orderBy: { date: "desc" },
          take: 14, // Last 14 days
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campania nu a fost găsită" }, { status: 404 });
    }

    // Create analysis run
    const run = await createAnalysisRun(`campaign:${campaignId}`, session.user.id);

    try {
      // Get historical actions for learning
      const historicalActions = await getHistoricalActions("AD_BUDGET", 20);

      // Prepare campaign data for analysis
      const campaignData = {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.account.platform,
        accountName: campaign.account.name,
        currency: campaign.account.currency || "RON",
        status: campaign.status,
        objective: campaign.objective,
        
        // Budget
        dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
        lifetimeBudget: campaign.lifetimeBudget ? Number(campaign.lifetimeBudget) : null,
        
        // Current metrics
        spend: Number(campaign.spend),
        impressions: Number(campaign.impressions),
        reach: Number(campaign.reach),
        clicks: Number(campaign.clicks),
        conversions: campaign.conversions,
        revenue: Number(campaign.revenue),
        
        // Calculated KPIs
        ctr: campaign.ctr ? Number(campaign.ctr) : null,
        cpc: campaign.cpc ? Number(campaign.cpc) : null,
        cpm: campaign.cpm ? Number(campaign.cpm) : null,
        cpa: campaign.cpa ? Number(campaign.cpa) : null,
        roas: campaign.roas ? Number(campaign.roas) : null,
        
        // Structure
        adSets: campaign.adSets.map((adSet: any) => ({
          id: adSet.id,
          name: adSet.name,
          status: adSet.status,
          dailyBudget: adSet.dailyBudget ? Number(adSet.dailyBudget) : null,
          spend: Number(adSet.spend),
          impressions: Number(adSet.impressions),
          clicks: Number(adSet.clicks),
          conversions: adSet.conversions,
          ctr: adSet.ctr ? Number(adSet.ctr) : null,
          cpa: adSet.cpa ? Number(adSet.cpa) : null,
          adsCount: adSet.ads.length,
          activeAds: adSet.ads.filter((a: any) => a.status === "ACTIVE").length,
        })),
        
        // Daily performance trend
        dailyTrend: campaign.dailyStats.map((d: any) => ({
          date: d.date.toISOString().split("T")[0],
          spend: Number(d.spend),
          impressions: Number(d.impressions),
          clicks: Number(d.clicks),
          conversions: d.conversions,
          revenue: Number(d.revenue),
        })),
      };

      // Call Claude for analysis
      const result = await analyzeCampaignWithAI(campaignData, historicalActions, settings.aiModel);

      // Save insights to database with campaign target
      if (result.insights.length > 0) {
        const insightsWithTarget: AIInsightSuggestion[] = result.insights.map((insight: AIInsightSuggestion) => ({
          ...insight,
          targetId: insight.targetId || campaignId,
          targetName: insight.targetName || campaign.name,
        }));
        await saveInsights(insightsWithTarget, run.id);
      }

      // Complete the run
      await completeAnalysisRun(run.id, result.insights.length, result.tokensUsed);

      return NextResponse.json({
        success: true,
        runId: run.id,
        insightsGenerated: result.insights.length,
        tokensUsed: result.tokensUsed,
        summary: result.summary,
      });

    } catch (analysisError: any) {
      await completeAnalysisRun(run.id, 0, 0, analysisError.message);
      throw analysisError;
    }

  } catch (error: any) {
    console.error("Campaign AI Analysis error:", error);
    return NextResponse.json({
      error: error.message || "Eroare la analiza AI",
    }, { status: 500 });
  }
}

// GET - Get insights for specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { id: campaignId } = params;

    // Get pending insights for this campaign
    const insights = await prisma.aIInsight.findMany({
      where: {
        targetId: campaignId,
        status: "PENDING",
      },
      orderBy: [
        { confidence: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ insights });

  } catch (error: any) {
    console.error("Error fetching campaign insights:", error);
    return NextResponse.json({
      error: error.message || "Eroare",
    }, { status: 500 });
  }
}

// AI Analysis function for single campaign
async function analyzeCampaignWithAI(
  campaignData: any,
  historicalActions: any[],
  model: string = "claude-sonnet-4-20250514"
) {
  const client = await getAnthropicClient();
  
  const systemPrompt = `Ești un expert în optimizare campanii publicitare digitale.
Analizezi o singură campanie în detaliu pentru a identifica oportunități concrete de îmbunătățire.

FOCUS:
1. Performanță vs buget - campania folosește eficient bugetul?
2. Trend-uri zilnice - există pattern-uri sau probleme?
3. Structura (Ad Sets) - sunt unele care performează mai bine?
4. KPIs - CTR, CPA, ROAS - sunt în limite acceptabile?

IMPORTANT:
- Răspunde DOAR în format JSON valid
- Fiecare recomandare trebuie să fie specifică și acționabilă
- Confidence trebuie să fie între 0-100
- Oferă recomandări DOAR dacă sunt justificate de date
- Dacă campania performează bine, poți returna array gol

Istoric acțiuni anterioare (pentru learning):
${JSON.stringify(historicalActions.slice(-5), null, 2)}`;

  const userPrompt = `Analizează în detaliu această campanie:

${JSON.stringify(campaignData, null, 2)}

Răspunde în format JSON:
{
  "insights": [
    {
      "type": "AD_BUDGET" | "AD_STATUS" | "AD_BID",
      "targetType": "campaign" | "adset",
      "targetId": "id-ul obiectului (campaign sau adset)",
      "targetName": "numele pentru display",
      "currentValue": "valoarea curentă",
      "suggestedValue": "valoarea sugerată concretă",
      "title": "titlu scurt și descriptiv",
      "reasoning": "explicație detaliată bazată pe datele din campanie",
      "confidence": 85,
      "estimatedImpact": "+15% ROAS sau -20% CPA"
    }
  ],
  "summary": "rezumat scurt al stării campaniei și principalelor observații"
}

REGULI:
- Dacă campania are ROAS > 3, probabil nu necesită modificări majore
- Dacă un AdSet are performanță mult sub medie, sugerează pauză sau ajustare
- Budget-ul ar trebui crescut DOAR dacă ROAS/CPA sunt bune și există potențial
- Nu sugera modificări pentru campanii cu date insuficiente (< 7 zile sau < 1000 impressions)`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "user", content: userPrompt }
    ],
    system: systemPrompt,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Răspuns AI invalid");
  }

  try {
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    return {
      insights: parsed.insights || [],
      summary: parsed.summary || "",
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (e) {
    console.error("Failed to parse AI response:", content.text);
    throw new Error("Nu am putut procesa răspunsul AI");
  }
}
