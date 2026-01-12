import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";
import { 
  updateMetaCampaignStatus, 
  updateMetaCampaignBudget,
  updateMetaAdSetStatus,
} from "@/lib/meta-ads";
import {
  updateTikTokCampaignStatus,
  updateTikTokCampaignBudget,
} from "@/lib/tiktok-ads";

// Types for AI Insights
export interface AIInsightSuggestion {
  type: "PRODUCT_PRICE" | "PRODUCT_STOCK" | "AD_BUDGET" | "AD_STATUS" | "AD_BID" | "AD_TARGETING" | "GENERAL";
  targetType: "product" | "campaign" | "adset" | "ad";
  targetId?: string;
  targetName?: string;
  currentValue: string;
  suggestedValue: string;
  title: string;
  reasoning: string;
  confidence: number;
  estimatedImpact?: string;
}

export interface AIAnalysisResult {
  insights: AIInsightSuggestion[];
  summary: string;
  tokensUsed: number;
}

// Get AI settings from database
export async function getAISettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: {
      aiApiKey: true,
      aiModel: true,
      aiDailyAnalysisEnabled: true,
      aiDailyAnalysisTime: true,
    },
  });
  
  return settings;
}

// Initialize Anthropic client
export async function getAnthropicClient() {
  const settings = await getAISettings();
  
  if (!settings?.aiApiKey) {
    throw new Error("API Key Claude nu este configurat. Mergi la Setări → AI pentru a-l adăuga.");
  }
  
  return new Anthropic({
    apiKey: settings.aiApiKey,
  });
}

// Analyze ads performance
export async function analyzeAdsPerformance(
  campaignsData: any[],
  historicalActions: any[] = []
): Promise<AIAnalysisResult> {
  const client = await getAnthropicClient();
  const settings = await getAISettings();
  
  const systemPrompt = `Ești un expert în marketing digital și optimizare campanii publicitare.
Analizezi date de performanță pentru campanii Meta Ads și TikTok Ads.
Obiectivul tău este să identifici oportunități de optimizare și să oferi recomandări concrete, actionable.

IMPORTANT:
- Răspunde DOAR în format JSON valid
- Fiecare recomandare trebuie să aibă valori concrete (nu intervale)
- Confidence trebuie să fie între 0-100
- Estimatedimpact să fie concis (ex: "+15% ROAS", "-20% CPA")
- Reasoning să explice DE CE recomanzi asta, bazat pe date

Istoric acțiuni anterioare (pentru learning):
${JSON.stringify(historicalActions.slice(-10), null, 2)}

Ține cont de ce a funcționat sau nu în trecut când faci recomandări.`;

  const userPrompt = `Analizează următoarele campanii și generează recomandări de optimizare:

${JSON.stringify(campaignsData, null, 2)}

Răspunde în format JSON:
{
  "insights": [
    {
      "type": "AD_BUDGET" | "AD_STATUS" | "AD_BID",
      "targetType": "campaign" | "adset" | "ad",
      "targetId": "id-ul obiectului",
      "targetName": "numele pentru display",
      "currentValue": "valoarea curentă",
      "suggestedValue": "valoarea sugerată",
      "title": "titlu scurt",
      "reasoning": "explicație detaliată",
      "confidence": 85,
      "estimatedImpact": "+15% ROAS"
    }
  ],
  "summary": "rezumat general al analizei"
}`;

  const response = await client.messages.create({
    model: settings?.aiModel || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      { role: "user", content: userPrompt }
    ],
    system: systemPrompt,
  });

  // Parse response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Răspuns AI invalid");
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
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

// Analyze products for price optimization
export async function analyzeProductPrices(
  productsData: any[],
  salesData: any[],
  historicalActions: any[] = []
): Promise<AIAnalysisResult> {
  const client = await getAnthropicClient();
  const settings = await getAISettings();
  
  const systemPrompt = `Ești un expert în pricing și optimizare e-commerce.
Analizezi produse și date de vânzări pentru a identifica oportunități de ajustare prețuri.

CRITERII DE ANALIZĂ:
1. Marja de profit (preț vs cost)
2. Velocitatea vânzărilor (câte se vând pe zi/săptămână)
3. Stocul disponibil (produse cu stoc mare pot avea prețuri mai competitive)
4. Tendințe de vânzare (crește/scade cererea)

IMPORTANT:
- Răspunde DOAR în format JSON valid
- Sugerează creșteri de preț DOAR pentru produse cu cerere mare și stoc limitat
- Sugerează scăderi DOAR pentru produse cu stoc mare și vânzări slabe
- Confidence trebuie să fie între 0-100
- Explică raționamentul bazat pe date concrete

Istoric acțiuni anterioare (pentru learning):
${JSON.stringify(historicalActions.slice(-10), null, 2)}`;

  const userPrompt = `Analizează următoarele produse și date de vânzări:

PRODUSE:
${JSON.stringify(productsData, null, 2)}

VÂNZĂRI RECENTE:
${JSON.stringify(salesData, null, 2)}

Răspunde în format JSON:
{
  "insights": [
    {
      "type": "PRODUCT_PRICE",
      "targetType": "product",
      "targetId": "id-ul produsului",
      "targetName": "numele produsului",
      "currentValue": "100 RON",
      "suggestedValue": "120 RON",
      "title": "Creștere preț recomandat",
      "reasoning": "explicație detaliată bazată pe date",
      "confidence": 75,
      "estimatedImpact": "+20% marjă"
    }
  ],
  "summary": "rezumat general al analizei"
}`;

  const response = await client.messages.create({
    model: settings?.aiModel || "claude-sonnet-4-20250514",
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

// Save insights to database
export async function saveInsights(insights: AIInsightSuggestion[], analysisRunId: string) {
  const created = await prisma.aIInsight.createMany({
    data: insights.map((insight) => ({
      type: insight.type,
      targetType: insight.targetType,
      targetId: insight.targetId,
      targetName: insight.targetName,
      currentValue: insight.currentValue,
      suggestedValue: insight.suggestedValue,
      title: insight.title,
      reasoning: insight.reasoning,
      confidence: insight.confidence,
      estimatedImpact: insight.estimatedImpact,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })),
  });
  
  return created;
}

// Get historical actions for learning
export async function getHistoricalActions(type?: string, limit = 50) {
  const where = type ? {
    insight: {
      type: type as any,
    },
  } : {};
  
  const actions = await prisma.aIActionLog.findMany({
    where,
    include: {
      insight: {
        select: {
          type: true,
          targetType: true,
          currentValue: true,
          suggestedValue: true,
        },
      },
    },
    orderBy: { performedAt: "desc" },
    take: limit,
  });
  
  return actions;
}

// Apply an insight action
export async function applyInsight(
  insightId: string, 
  userId: string,
  actualNewValue?: string
) {
  const insight = await prisma.aIInsight.findUnique({
    where: { id: insightId },
  });
  
  if (!insight) {
    throw new Error("Insight nu a fost găsit");
  }
  
  if (insight.status !== "PENDING") {
    throw new Error("Acest insight a fost deja procesat");
  }

  const newValue = actualNewValue || insight.suggestedValue;
  let platformSuccess = true;
  let platformError: string | null = null;

  // Apply action to platform based on insight type
  try {
    if (insight.type === "AD_STATUS" && insight.targetId) {
      // Get campaign with account info
      const campaign = await prisma.adsCampaign.findUnique({
        where: { id: insight.targetId },
        include: { account: true },
      });

      if (campaign) {
        const newStatus = newValue.toUpperCase() as "ACTIVE" | "PAUSED";
        
        if (campaign.account.platform === "META") {
          platformSuccess = await updateMetaCampaignStatus(
            campaign.externalId,
            newStatus,
            campaign.account.accessToken
          );
        } else if (campaign.account.platform === "TIKTOK") {
          const tiktokStatus = newStatus === "ACTIVE" ? "ENABLE" : "DISABLE";
          platformSuccess = await updateTikTokCampaignStatus(
            campaign.account.externalId,
            campaign.externalId,
            tiktokStatus,
            campaign.account.accessToken
          );
        }

        // Update local DB if platform call succeeded
        if (platformSuccess) {
          await prisma.adsCampaign.update({
            where: { id: insight.targetId },
            data: { status: newStatus },
          });
        }
      }
    } else if (insight.type === "AD_BUDGET" && insight.targetId) {
      // Get campaign with account info
      const campaign = await prisma.adsCampaign.findUnique({
        where: { id: insight.targetId },
        include: { account: true },
      });

      if (campaign) {
        // Parse budget from suggested value (e.g., "150 RON/zi" -> 150)
        const budgetMatch = newValue.match(/[\d.]+/);
        const newBudget = budgetMatch ? parseFloat(budgetMatch[0]) : null;

        if (newBudget !== null) {
          if (campaign.account.platform === "META") {
            platformSuccess = await updateMetaCampaignBudget(
              campaign.externalId,
              newBudget,
              null,
              campaign.account.accessToken
            );
          } else if (campaign.account.platform === "TIKTOK") {
            platformSuccess = await updateTikTokCampaignBudget(
              campaign.account.externalId,
              campaign.externalId,
              newBudget,
              campaign.account.accessToken
            );
          }

          // Update local DB if platform call succeeded
          if (platformSuccess) {
            await prisma.adsCampaign.update({
              where: { id: insight.targetId },
              data: { dailyBudget: newBudget },
            });
          }
        }
      }
    } else if (insight.type === "PRODUCT_PRICE" && insight.targetId) {
      // Parse price from suggested value
      const priceMatch = newValue.match(/[\d.]+/);
      const newPrice = priceMatch ? parseFloat(priceMatch[0]) : null;

      if (newPrice !== null) {
        // Update product price locally (no external API needed)
        await prisma.product.update({
          where: { id: insight.targetId },
          data: { price: newPrice },
        });
        platformSuccess = true;
      }
    }
    // For other types (AD_BID, AD_TARGETING, GENERAL), just mark as applied
    // These may need manual intervention or aren't automatable
  } catch (error: any) {
    console.error("Platform API error in applyInsight:", error);
    platformSuccess = false;
    platformError = error.message;
  }

  if (!platformSuccess) {
    throw new Error(platformError || "Eroare la aplicarea modificării în platformă");
  }
  
  // Create action log
  const actionLog = await prisma.aIActionLog.create({
    data: {
      insightId,
      action: "apply",
      previousValue: insight.currentValue,
      newValue: newValue,
      performedBy: userId,
      success: true,
    },
  });
  
  // Update insight status
  await prisma.aIInsight.update({
    where: { id: insightId },
    data: {
      status: "APPLIED",
      statusChangedAt: new Date(),
      statusChangedBy: userId,
    },
  });
  
  return actionLog;
}

// Dismiss an insight
export async function dismissInsight(insightId: string, userId: string) {
  const insight = await prisma.aIInsight.findUnique({
    where: { id: insightId },
  });
  
  if (!insight) {
    throw new Error("Insight nu a fost găsit");
  }
  
  // Create action log
  await prisma.aIActionLog.create({
    data: {
      insightId,
      action: "dismiss",
      previousValue: insight.currentValue,
      newValue: insight.currentValue, // No change
      performedBy: userId,
      success: true,
    },
  });
  
  // Update insight status
  await prisma.aIInsight.update({
    where: { id: insightId },
    data: {
      status: "DISMISSED",
      statusChangedAt: new Date(),
      statusChangedBy: userId,
    },
  });
}

// Create analysis run record
export async function createAnalysisRun(type: string, triggeredBy: string) {
  return prisma.aIAnalysisRun.create({
    data: {
      type,
      status: "running",
      triggeredBy,
    },
  });
}

// Complete analysis run
export async function completeAnalysisRun(
  runId: string, 
  insightsGenerated: number, 
  tokensUsed: number,
  error?: string
) {
  const startedAt = await prisma.aIAnalysisRun.findUnique({
    where: { id: runId },
    select: { startedAt: true },
  });
  
  const duration = startedAt 
    ? Math.round((Date.now() - startedAt.startedAt.getTime()) / 1000)
    : 0;
  
  // Estimate cost (approximate pricing)
  // Sonnet: ~$3/1M input, ~$15/1M output
  // Simplified: ~$0.01 per 1000 tokens average
  const costEstimate = tokensUsed * 0.00001;
  
  return prisma.aIAnalysisRun.update({
    where: { id: runId },
    data: {
      status: error ? "failed" : "completed",
      insightsGenerated,
      tokensUsed,
      costEstimate,
      completedAt: new Date(),
      duration,
      errorMessage: error,
    },
  });
}
