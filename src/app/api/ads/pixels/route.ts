import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { AdsPlatform } from "@/types/prisma-enums";
import { getMetaPixels } from "@/lib/meta-ads";

const META_API_BASE = "https://graph.facebook.com/v21.0";
const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

// Helper: Parse pixel last_fired_time (can be ISO string or Unix timestamp)
function parseLastFiredTime(lastFiredTime: any): Date | null {
  if (!lastFiredTime) return null;
  
  if (typeof lastFiredTime === 'number') {
    // Unix timestamp
    return new Date(lastFiredTime * 1000);
  }
  
  if (typeof lastFiredTime === 'string') {
    // Fix timezone format: +0200 -> +02:00
    let dateStr = lastFiredTime;
    dateStr = dateStr.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}

// GET - Lista pixelilor
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
    const accountId = searchParams.get("accountId");

    const pixels = await prisma.adsPixel.findMany({
      where: accountId ? { accountId } : {},
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pixels });
  } catch (error: any) {
    console.error("Error fetching pixels:", error);
    return NextResponse.json(
      { error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}

// POST - Adaugă/Sincronizează pixeli
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
    const { action, accountId, pixelId, name } = body;

    if (action === "sync") {
      // Sincronizează pixelii din platformă
      if (!accountId) {
        return NextResponse.json({ error: "accountId necesar" }, { status: 400 });
      }

      const account = await prisma.adsAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return NextResponse.json({ error: "Cont negăsit" }, { status: 404 });
      }

      let syncedCount = 0;

      if (account.platform === "META") {
        // Use the comprehensive getMetaPixels function
        const metaAccountId = `act_${account.externalId}`;
        console.log(`[Pixels API] Syncing pixels for ${metaAccountId}`);
        
        const pixels = await getMetaPixels(metaAccountId, account.accessToken, account.businessId);
        console.log(`[Pixels API] Found ${pixels.length} pixels`);

        for (const pixel of pixels) {
          const lastEventAt = parseLastFiredTime(pixel.last_fired_time);
          
          await prisma.adsPixel.upsert({
            where: {
              platform_externalId: {
                platform: "META",
                externalId: pixel.id,
              },
            },
            create: {
              accountId: account.id,
              platform: "META",
              externalId: pixel.id,
              name: pixel.name || `Pixel ${pixel.id}`,
              isInstalled: !!pixel.last_fired_time,
              lastEventAt,
            },
            update: {
              name: pixel.name || `Pixel ${pixel.id}`,
              isInstalled: !!pixel.last_fired_time,
              lastEventAt,
              lastCheckedAt: new Date(),
            },
          });
          syncedCount++;
        }
      } else if (account.platform === "TIKTOK") {
        // Fetch TikTok pixels
        const response = await fetch(
          `${TIKTOK_API_BASE}/pixel/list/?advertiser_id=${account.externalId}`,
          {
            headers: {
              "Access-Token": account.accessToken,
            },
          }
        );
        const data = await response.json();

        if (data.data?.pixels) {
          for (const pixel of data.data.pixels) {
            await prisma.adsPixel.upsert({
              where: {
                platform_externalId: {
                  platform: "TIKTOK",
                  externalId: pixel.pixel_id,
                },
              },
              create: {
                accountId: account.id,
                platform: "TIKTOK",
                externalId: pixel.pixel_id,
                name: pixel.pixel_name,
                isInstalled: pixel.pixel_active === 1,
              },
              update: {
                name: pixel.pixel_name,
                isInstalled: pixel.pixel_active === 1,
                lastCheckedAt: new Date(),
              },
            });
            syncedCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        synced: syncedCount,
        message: `${syncedCount} pixeli sincronizați`,
      });
    }

    if (action === "check") {
      // Verifică statusul unui pixel
      if (!pixelId) {
        return NextResponse.json({ error: "pixelId necesar" }, { status: 400 });
      }

      const pixel = await prisma.adsPixel.findUnique({
        where: { id: pixelId },
        include: { account: true },
      });

      if (!pixel) {
        return NextResponse.json({ error: "Pixel negăsit" }, { status: 404 });
      }

      let checkStatus = "OK";
      let checkMessage = "Pixel activ";
      let eventsTracked: string[] = [];

      if (pixel.platform === "META") {
        // Verifică evenimentele Meta pixel
        const response = await fetch(
          `${META_API_BASE}/${pixel.externalId}?fields=id,name,last_fired_time,data_use_setting&access_token=${pixel.account.accessToken}`
        );
        const data = await response.json();

        if (data.error) {
          checkStatus = "ERROR";
          checkMessage = data.error.message;
        } else if (!data.last_fired_time) {
          checkStatus = "WARNING";
          checkMessage = "Pixelul nu a primit evenimente recent";
        } else {
          const lastFired = parseLastFiredTime(data.last_fired_time);
          if (lastFired) {
            const hoursSinceLastEvent = (Date.now() - lastFired.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceLastEvent > 24) {
              checkStatus = "WARNING";
              checkMessage = `Ultimul event acum ${Math.round(hoursSinceLastEvent)} ore`;
            }
          }

          // Fetch recent events
          const statsResponse = await fetch(
            `${META_API_BASE}/${pixel.externalId}/stats?aggregation=event&start_time=${Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60}&end_time=${Math.floor(Date.now() / 1000)}&access_token=${pixel.account.accessToken}`
          );
          const statsData = await statsResponse.json();
          
          if (statsData.data) {
            // Filter out undefined/null values
            eventsTracked = Array.from(new Set(
              statsData.data
                .map((s: any) => s.event_name)
                .filter((name: any): name is string => typeof name === 'string' && name.length > 0)
            )) as string[];
          }
        }
      } else if (pixel.platform === "TIKTOK") {
        // Verifică TikTok pixel
        const response = await fetch(
          `${TIKTOK_API_BASE}/pixel/list/?advertiser_id=${pixel.account.externalId}&pixel_ids=["${pixel.externalId}"]`,
          {
            headers: {
              "Access-Token": pixel.account.accessToken,
            },
          }
        );
        const data = await response.json();

        if (data.code !== 0) {
          checkStatus = "ERROR";
          checkMessage = data.message;
        } else if (data.data?.pixels?.[0]) {
          const p = data.data.pixels[0];
          if (p.pixel_active !== 1) {
            checkStatus = "WARNING";
            checkMessage = "Pixelul nu este activ";
          }
        }
      }

      await prisma.adsPixel.update({
        where: { id: pixelId },
        data: {
          lastCheckedAt: new Date(),
          checkStatus,
          checkMessage,
          eventsTracked: eventsTracked.length > 0 ? eventsTracked : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        status: checkStatus,
        message: checkMessage,
        eventsTracked,
      });
    }

    if (action === "add") {
      // Adaugă manual un pixel
      if (!accountId || !pixelId || !name) {
        return NextResponse.json(
          { error: "accountId, pixelId și name sunt necesare" },
          { status: 400 }
        );
      }

      const account = await prisma.adsAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return NextResponse.json({ error: "Cont negăsit" }, { status: 404 });
      }

      const pixel = await prisma.adsPixel.create({
        data: {
          accountId,
          platform: account.platform,
          externalId: pixelId,
          name,
        },
      });

      return NextResponse.json({
        success: true,
        pixel,
        message: `Pixel ${name} adăugat`,
      });
    }

    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing pixels:", error);
    return NextResponse.json(
      { error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge un pixel
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
    const pixelId = searchParams.get("id");

    if (!pixelId) {
      return NextResponse.json({ error: "ID necesar" }, { status: 400 });
    }

    await prisma.adsPixel.delete({
      where: { id: pixelId },
    });

    return NextResponse.json({
      success: true,
      message: "Pixel șters",
    });
  } catch (error: any) {
    console.error("Error deleting pixel:", error);
    return NextResponse.json(
      { error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}
