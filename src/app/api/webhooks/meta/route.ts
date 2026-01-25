import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

/**
 * Meta Webhooks Endpoint
 *
 * Gestionează:
 * 1. Verificarea inițială de la Meta (GET)
 * 2. Primirea evenimentelor (POST)
 *
 * Configurare în Facebook Developer Console:
 * - Callback URL: https://erp.cashflowgrup.net/api/webhooks/meta
 * - Verify Token: Se generează în platformă (Ads > Setări > Webhooks)
 */

/**
 * Extract unique event ID from Facebook webhook payload.
 * Facebook provides event IDs in different locations depending on event type.
 * Falls back to MD5 hash of payload if no explicit ID found.
 */
function extractEventId(entry: any, change: any): string {
  // Try multiple locations where Facebook might put the event ID
  const possibleIds = [
    change.value?.id,                          // Most campaign events
    change.value?.event_id,                    // Some conversion events
    entry.id && change.field ? `${entry.id}_${change.field}_${change.value?.time || Date.now()}` : null, // Composite
  ].filter(Boolean);

  if (possibleIds.length > 0) {
    return String(possibleIds[0]);
  }

  // Fallback: generate deterministic hash from payload
  // This ensures the same payload always produces the same ID
  const payloadString = JSON.stringify({
    entryId: entry.id,
    field: change.field,
    value: change.value,
  });

  return crypto
    .createHash('md5')
    .update(payloadString)
    .digest('hex');
}

// Helper: Create notification for all users with ads access
async function createAdsNotification(notification: {
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    // Find all users who have ads permissions (superAdmins or users with ads role)
    const usersWithAdsAccess = await prisma.user.findMany({
      where: {
        OR: [
          { isSuperAdmin: true },
          {
            roles: {
              some: {
                role: {
                  permissions: {
                    some: {
                      permission: {
                        code: { startsWith: "ads." }
                      }
                    }
                  }
                }
              }
            }
          }
        ],
        isActive: true,
      },
      select: { id: true },
    });

    // Create notification for each user
    if (usersWithAdsAccess.length > 0) {
      await prisma.notification.createMany({
        data: usersWithAdsAccess.map(user => ({
          userId: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
        })),
      });
    }
  } catch (error) {
    console.error("[Meta Webhook] Error creating notifications:", error);
  }
}

// GET - Verificare webhook de la Meta
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    
    console.log("[Meta Webhook] Verification request:", { mode, token: token?.substring(0, 8) + "...", challenge });
    
    if (mode !== "subscribe") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    
    if (!token || !challenge) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    
    // Verifică token-ul din DB
    const config = await prisma.adsWebhookConfig.findUnique({
      where: { platform: "META" },
    });
    
    if (!config) {
      console.error("[Meta Webhook] No webhook config found for META");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 404 });
    }
    
    if (config.verifyToken !== token) {
      console.error("[Meta Webhook] Invalid verify token");
      return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
    }
    
    // Marchează ca verificat
    await prisma.adsWebhookConfig.update({
      where: { platform: "META" },
      data: { isVerified: true, updatedAt: new Date() },
    });
    
    console.log("[Meta Webhook] Verification successful!");
    
    // Meta așteaptă challenge-ul ca plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: any) {
    console.error("[Meta Webhook] Verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Primire evenimente de la Meta
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();
    
    console.log("[Meta Webhook] Received event");
    
    // Obține config
    const config = await prisma.adsWebhookConfig.findUnique({
      where: { platform: "META" },
    });
    
    if (!config || !config.isActive) {
      console.log("[Meta Webhook] Webhook not active or not configured");
      return NextResponse.json({ received: true });
    }
    
    // Validează signature dacă avem app secret
    if (config.appSecret && signature) {
      const expectedSignature = "sha256=" + crypto
        .createHmac("sha256", config.appSecret)
        .update(rawBody)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("[Meta Webhook] Invalid signature");
        await prisma.adsWebhookConfig.update({
          where: { platform: "META" },
          data: { 
            lastError: "Invalid signature",
            lastErrorAt: new Date(),
          },
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }
    
    // Parse body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("[Meta Webhook] Invalid JSON");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    console.log("[Meta Webhook] Payload:", JSON.stringify(body, null, 2));
    
    // Procesează fiecare entry
    const entries = body.entry || [];
    
    for (const entry of entries) {
      const objectId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        const eventType = change.field;
        const value = change.value;

        // Extract unique event ID for deduplication
        const externalEventId = extractEventId(entry, change);

        // Check for duplicate event
        const existingEvent = await prisma.adsWebhookEvent.findFirst({
          where: {
            platform: "META",
            externalEventId,
          },
        });

        if (existingEvent) {
          console.log(`[Meta Webhook] Duplicate event ${externalEventId}, skipping`);
          continue; // Silent skip per decisions
        }

        // Save event with dedup key
        await prisma.adsWebhookEvent.create({
          data: {
            platform: "META",
            eventType,
            objectId,
            externalEventId,
            payload: value,
          },
        });

        console.log(`[Meta Webhook] Processing ${eventType} for ${objectId} (eventId: ${externalEventId})`);

        // Procesează imediat anumite tipuri de evenimente
        await processWebhookEvent(eventType, objectId, value);
      }
    }
    
    // Update stats
    await prisma.adsWebhookConfig.update({
      where: { platform: "META" },
      data: {
        lastEventAt: new Date(),
        eventsReceived: { increment: entries.length },
        lastError: null,
        lastErrorAt: null,
      },
    });
    
    // Meta așteaptă răspuns rapid (sub 20 secunde)
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Meta Webhook] Error processing event:", error);
    
    // Încearcă să salveze eroarea
    try {
      await prisma.adsWebhookConfig.update({
        where: { platform: "META" },
        data: {
          lastError: error.message,
          lastErrorAt: new Date(),
        },
      });
    } catch {}
    
    // Răspundem cu 200 pentru a evita retry-uri de la Meta
    return NextResponse.json({ received: true, error: error.message });
  }
}

// Procesare evenimente specifice
async function processWebhookEvent(eventType: string, objectId: string, value: any) {
  console.log(`[Meta Webhook] Processing ${eventType} for ${objectId}`);
  
  try {
    switch (eventType) {
      case "campaign_status_changes":
        await handleCampaignStatusChange(value);
        break;
        
      case "ad_account":
        await handleAdAccountChange(objectId, value);
        break;
        
      case "ads_insights":
        // Insights sunt procesate de CRON, doar logăm
        console.log("[Meta Webhook] Insights available notification");
        break;
        
      case "leadgen":
        // Lead generation - pentru viitor
        console.log("[Meta Webhook] New lead received");
        break;
        
      default:
        console.log(`[Meta Webhook] Unhandled event type: ${eventType}`);
    }
    
    // Marchează ca procesat
    await prisma.adsWebhookEvent.updateMany({
      where: {
        platform: "META",
        eventType,
        objectId,
        processed: false,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error(`[Meta Webhook] Error processing ${eventType}:`, error);
    
    await prisma.adsWebhookEvent.updateMany({
      where: {
        platform: "META",
        eventType,
        objectId,
        processed: false,
      },
      data: {
        processError: error.message,
      },
    });
  }
}

// Handler pentru schimbări de status campanie
async function handleCampaignStatusChange(value: any) {
  const { campaign_id, status, effective_status } = value;
  
  if (!campaign_id) return;
  
  console.log(`[Meta Webhook] Campaign ${campaign_id} status changed to ${status}`);
  
  // Găsește campania în DB
  const campaign = await prisma.adsCampaign.findFirst({
    where: { externalId: campaign_id },
    include: { account: true },
  });
  
  if (!campaign) {
    console.log(`[Meta Webhook] Campaign ${campaign_id} not found in DB`);
    return;
  }
  
  // Mapează status-ul
  const statusMap: Record<string, string> = {
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    DELETED: "DELETED",
    ARCHIVED: "ARCHIVED",
  };
  
  const newStatus = statusMap[status] || "PAUSED";
  
  // Actualizează în DB
  await prisma.adsCampaign.update({
    where: { id: campaign.id },
    data: {
      status: newStatus as any,
      effectiveStatus: effective_status || status,
      updatedAt: new Date(),
    },
  });
  
  // Creează notificare pentru utilizatorii cu acces la ads
  await createAdsNotification({
    type: "ADS_UPDATE",
    title: `Campanie ${status === "PAUSED" ? "oprită" : "actualizată"}`,
    message: `Campania "${campaign.name}" a fost ${status === "PAUSED" ? "pusă în pauză" : status === "ACTIVE" ? "activată" : "actualizată"}.`,
    data: {
      campaignId: campaign.id,
      externalId: campaign_id,
      oldStatus: campaign.status,
      newStatus,
    },
  });
  
  console.log(`[Meta Webhook] Updated campaign ${campaign.name} to ${newStatus}`);
}

// Handler pentru schimbări de cont
async function handleAdAccountChange(accountId: string, value: any) {
  console.log(`[Meta Webhook] Ad account ${accountId} change:`, value);
  
  const { account_status, disable_reason, spending_limit_reached } = value;
  
  // Găsește contul în DB
  // accountId vine ca "act_123456789", extragem doar numărul
  const externalId = accountId.replace("act_", "");
  
  const account = await prisma.adsAccount.findFirst({
    where: { 
      platform: "META",
      externalId,
    },
  });
  
  if (!account) {
    console.log(`[Meta Webhook] Account ${externalId} not found in DB`);
    return;
  }
  
  // Actualizează status dacă contul e dezactivat
  if (account_status === 2 || disable_reason) {
    await prisma.adsAccount.update({
      where: { id: account.id },
      data: {
        status: "ERROR",
        lastSyncError: disable_reason || "Account disabled",
      },
    });
    
    // Notificare urgentă
    await createAdsNotification({
      type: "ADS_ERROR",
      title: "⚠️ Cont de ads dezactivat",
      message: `Contul "${account.name}" a fost dezactivat. Motiv: ${disable_reason || "necunoscut"}`,
      data: {
        accountId: account.id,
        externalId,
        disable_reason,
      },
    });
  }
  
  // Alertă spending limit
  if (spending_limit_reached) {
    await createAdsNotification({
      type: "ADS_WARNING",
      title: "💰 Limită de cheltuieli atinsă",
      message: `Contul "${account.name}" a atins limita de cheltuieli.`,
      data: {
        accountId: account.id,
        externalId,
      },
    });
  }
}
