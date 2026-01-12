import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { AdsPlatform } from "@prisma/client";
import crypto from "crypto";

/**
 * API pentru gestionarea configurărilor de Webhook pentru Ads
 * 
 * GET - Obține configurările webhook
 * POST - Creează/actualizează configurare
 * DELETE - Dezactivează webhook
 */

// GET - Obține configurările webhook pentru toate platformele
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

    // Obține configurările existente
    const configs = await prisma.adsWebhookConfig.findMany();
    
    // Obține URL-ul de bază pentru callback
    const baseUrl = process.env.NEXTAUTH_URL || "https://erp.cashflowgrup.net";
    
    // Construiește răspunsul cu info pentru fiecare platformă
    const webhookConfigs: Record<string, any> = {};
    
    for (const platform of ["META", "TIKTOK"]) {
      const existing = configs.find(c => c.platform === platform);
      
      webhookConfigs[platform] = {
        platform,
        callbackUrl: `${baseUrl}/api/webhooks/${platform.toLowerCase()}`,
        verifyToken: existing?.verifyToken || null,
        isActive: existing?.isActive || false,
        isVerified: existing?.isVerified || false,
        subscriptions: existing?.subscriptions || [],
        lastEventAt: existing?.lastEventAt || null,
        eventsReceived: existing?.eventsReceived || 0,
        lastError: existing?.lastError || null,
        lastErrorAt: existing?.lastErrorAt || null,
        // Instrucțiuni pentru configurare
        instructions: getSetupInstructions(platform, `${baseUrl}/api/webhooks/${platform.toLowerCase()}`),
      };
    }

    // Obține și ultimele evenimente pentru debugging
    const recentEvents = await prisma.adsWebhookEvent.findMany({
      orderBy: { receivedAt: "desc" },
      take: 10,
      select: {
        id: true,
        platform: true,
        eventType: true,
        objectId: true,
        processed: true,
        processError: true,
        receivedAt: true,
      },
    });

    return NextResponse.json({ 
      webhooks: webhookConfigs,
      recentEvents,
    });
  } catch (error: any) {
    console.error("Error fetching webhook configs:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}

// POST - Creează sau actualizează configurare webhook
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
    const { platform, action, subscriptions, appSecret } = body;

    if (!platform || !["META", "TIKTOK"].includes(platform)) {
      return NextResponse.json({ error: "Platformă invalidă" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://erp.cashflowgrup.net";

    // Acțiuni disponibile
    if (action === "generate_token") {
      // Generează un nou verify token
      const verifyToken = crypto.randomBytes(32).toString("hex");
      
      const config = await prisma.adsWebhookConfig.upsert({
        where: { platform: platform as AdsPlatform },
        create: {
          platform: platform as AdsPlatform,
          verifyToken,
          isActive: true,
          subscriptions: subscriptions || getDefaultSubscriptions(platform),
        },
        update: {
          verifyToken,
          isActive: true,
          isVerified: false, // Resetează verificarea
          subscriptions: subscriptions || undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Token generat cu succes",
        verifyToken: config.verifyToken,
        callbackUrl: `${baseUrl}/api/webhooks/${platform.toLowerCase()}`,
        instructions: getSetupInstructions(platform, `${baseUrl}/api/webhooks/${platform.toLowerCase()}`),
      });
    }

    if (action === "update_subscriptions") {
      if (!subscriptions || !Array.isArray(subscriptions)) {
        return NextResponse.json({ error: "Subscriptions invalid" }, { status: 400 });
      }

      await prisma.adsWebhookConfig.update({
        where: { platform: platform as AdsPlatform },
        data: { subscriptions },
      });

      return NextResponse.json({
        success: true,
        message: "Subscriptions actualizate",
      });
    }

    if (action === "set_app_secret") {
      if (!appSecret) {
        return NextResponse.json({ error: "App Secret necesar" }, { status: 400 });
      }

      await prisma.adsWebhookConfig.update({
        where: { platform: platform as AdsPlatform },
        data: { appSecret },
      });

      return NextResponse.json({
        success: true,
        message: "App Secret salvat pentru validare signature",
      });
    }

    if (action === "toggle") {
      const existing = await prisma.adsWebhookConfig.findUnique({
        where: { platform: platform as AdsPlatform },
      });

      if (!existing) {
        return NextResponse.json({ error: "Configurația nu există" }, { status: 404 });
      }

      await prisma.adsWebhookConfig.update({
        where: { platform: platform as AdsPlatform },
        data: { isActive: !existing.isActive },
      });

      return NextResponse.json({
        success: true,
        message: existing.isActive ? "Webhook dezactivat" : "Webhook activat",
        isActive: !existing.isActive,
      });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating webhook config:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la salvare" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge configurarea webhook
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform || !["META", "TIKTOK"].includes(platform)) {
      return NextResponse.json({ error: "Platformă invalidă" }, { status: 400 });
    }

    await prisma.adsWebhookConfig.delete({
      where: { platform: platform as AdsPlatform },
    });

    return NextResponse.json({
      success: true,
      message: `Webhook pentru ${platform} șters`,
    });
  } catch (error: any) {
    console.error("Error deleting webhook config:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la ștergere" },
      { status: 500 }
    );
  }
}

// Helper: Subscriptions implicite per platformă
function getDefaultSubscriptions(platform: string): string[] {
  if (platform === "META") {
    return [
      "ad_account",
      "campaign_status_changes", 
      "ads_insights",
    ];
  }
  if (platform === "TIKTOK") {
    return [
      "campaign_status",
      "ad_status",
    ];
  }
  return [];
}

// Helper: Instrucțiuni de setup per platformă
function getSetupInstructions(platform: string, callbackUrl: string): string[] {
  if (platform === "META") {
    return [
      "1. Deschide Facebook Developer Console: https://developers.facebook.com/apps",
      "2. Selectează aplicația ta Meta Ads",
      "3. În meniul din stânga, click pe 'Webhooks'",
      "4. Click 'Add Subscription' și selectează 'Ad Account'",
      `5. Callback URL: ${callbackUrl}`,
      "6. Verify Token: Copiază token-ul generat mai sus",
      "7. Selectează subscriptions: ad_account, campaign_status_changes",
      "8. Click 'Verify and Save'",
      "9. Revino aici și verifică că status-ul e 'Verified'",
    ];
  }
  if (platform === "TIKTOK") {
    return [
      "1. Deschide TikTok for Business Developers",
      "2. Selectează aplicația ta",
      "3. Configurează Webhook URL în setări",
      `4. Callback URL: ${callbackUrl}`,
      "5. Copiază Verify Token-ul generat",
    ];
  }
  return [];
}
