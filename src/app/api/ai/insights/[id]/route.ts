import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { applyInsight, dismissInsight } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { id } = params;
    const { action, newValue } = await request.json();

    if (!action || !["apply", "dismiss"].includes(action)) {
      return NextResponse.json({
        error: "Acțiune invalidă. Folosește: apply sau dismiss",
      }, { status: 400 });
    }

    // Get the insight
    const insight = await prisma.aIInsight.findUnique({
      where: { id },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight negăsit" }, { status: 404 });
    }

    if (insight.status !== "PENDING") {
      return NextResponse.json({
        error: "Acest insight a fost deja procesat",
      }, { status: 400 });
    }

    let result: any;

    if (action === "apply") {
      // Apply the insight
      result = await applyInsight(id, session.user.id, newValue);

      // Now actually apply the change based on insight type
      try {
        await applyActualChange(insight, newValue || insight.suggestedValue);
      } catch (applyError: any) {
        // Log the error but don't fail the whole operation
        console.error("Error applying actual change:", applyError);
        
        // Update action log with error
        await prisma.aIActionLog.update({
          where: { id: result.id },
          data: {
            success: false,
            errorMessage: applyError.message,
          },
        });

        return NextResponse.json({
          success: false,
          error: `Insight marcat ca aplicat, dar modificarea efectivă a eșuat: ${applyError.message}`,
          requiresManualAction: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Insight aplicat cu succes",
        actionLogId: result.id,
      });

    } else {
      // Dismiss the insight
      await dismissInsight(id, session.user.id);

      return NextResponse.json({
        success: true,
        message: "Insight respins",
      });
    }

  } catch (error: any) {
    console.error("Error processing insight action:", error);
    return NextResponse.json({
      error: error.message || "Eroare la procesarea acțiunii",
    }, { status: 500 });
  }
}

// Apply the actual change based on insight type
async function applyActualChange(insight: any, newValue: string) {
  switch (insight.type) {
    case "PRODUCT_PRICE":
      await applyProductPriceChange(insight.targetId, newValue);
      break;
    
    case "AD_BUDGET":
      await applyAdBudgetChange(insight.targetId, insight.targetType, newValue);
      break;
    
    case "AD_STATUS":
      await applyAdStatusChange(insight.targetId, insight.targetType, newValue);
      break;
    
    default:
      console.log(`Insight type ${insight.type} requires manual application`);
  }
}

// Apply product price change
async function applyProductPriceChange(productId: string, newPrice: string) {
  // Extract numeric value from price string (e.g., "120 RON" -> 120)
  const priceValue = parseFloat(newPrice.replace(/[^0-9.,]/g, "").replace(",", "."));
  
  if (isNaN(priceValue)) {
    throw new Error(`Valoare preț invalidă: ${newPrice}`);
  }

  // Update product price in database
  await prisma.product.update({
    where: { id: productId },
    data: { price: priceValue },
  });

  // Note: The product page will alert user to sync to Shopify
  // We don't auto-sync to avoid unintended changes
}

// Apply ad budget change
async function applyAdBudgetChange(targetId: string, targetType: string, newBudget: string) {
  // Extract numeric value
  const budgetValue = parseFloat(newBudget.replace(/[^0-9.,]/g, "").replace(",", "."));
  
  if (isNaN(budgetValue)) {
    throw new Error(`Valoare buget invalidă: ${newBudget}`);
  }

  if (targetType === "campaign") {
    // Get campaign to find platform details
    const campaign = await prisma.adsCampaign.findUnique({
      where: { id: targetId },
      include: { account: true },
    });

    if (!campaign) {
      throw new Error("Campanie negăsită");
    }

    // Update local database
    await prisma.adsCampaign.update({
      where: { id: targetId },
      data: { dailyBudget: budgetValue },
    });

    // TODO: Call Meta/TikTok API to update actual budget
    // This requires implementing the budget update in meta-ads.ts
    // For now, we mark it as requiring manual verification
    console.log(`Budget update for campaign ${campaign.externalId}: ${budgetValue}`);
  }
}

// Apply ad status change (pause/activate)
async function applyAdStatusChange(targetId: string, targetType: string, newStatus: string) {
  const statusUpper = newStatus.toUpperCase();
  
  if (!["ACTIVE", "PAUSED"].includes(statusUpper)) {
    throw new Error(`Status invalid: ${newStatus}`);
  }

  // Cast to the proper enum type
  const status = statusUpper as "ACTIVE" | "PAUSED";

  if (targetType === "campaign") {
    await prisma.adsCampaign.update({
      where: { id: targetId },
      data: { status },
    });
  } else if (targetType === "adset") {
    await prisma.adsAdSet.update({
      where: { id: targetId },
      data: { status },
    });
  } else if (targetType === "ad") {
    await prisma.adsAd.update({
      where: { id: targetId },
      data: { status },
    });
  }

  // TODO: Call Meta/TikTok API to update actual status
  console.log(`Status update for ${targetType} ${targetId}: ${status}`);
}

// GET - Get insight details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { id } = params;

    const insight = await prisma.aIInsight.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { performedAt: "desc" },
        },
      },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight negăsit" }, { status: 404 });
    }

    return NextResponse.json({ insight });

  } catch (error: any) {
    console.error("Error fetching insight:", error);
    return NextResponse.json({
      error: error.message || "Eroare",
    }, { status: 500 });
  }
}
