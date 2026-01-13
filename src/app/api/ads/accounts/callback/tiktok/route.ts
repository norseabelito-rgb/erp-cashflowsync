import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeTikTokCode, exchangeTikTokCodeWithApp, getTikTokAdvertisers } from "@/lib/tiktok-ads";
import { AdsAccountStatus } from "@/types/prisma-enums";
import { getPendingState, removePendingState } from "@/lib/ads-oauth-state";

// Helper to get proper base URL
function getBaseUrl(request: NextRequest): string {
  // Prima prioritate: NEXTAUTH_URL din environment (cel mai reliable)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Fallback: headers (pentru dezvoltare locală)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  return `${forwardedProto}://${host}`;
}

// GET - TikTok OAuth callback
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const authCode = searchParams.get("auth_code");
    const state = searchParams.get("state");

    // Verifică parametrii necesari
    if (!authCode) {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=Cod%20de%20autorizare%20lipsă`
      );
    }

    let adsAppId: string | null = null;
    let pending: any = null;

    // Verifică state-ul din storage-ul partajat
    if (state) {
      pending = getPendingState(state);
      if (!pending) {
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Sesiune%20expirată%20sau%20invalidă`
        );
      }
    }

    let accessToken: string;
    let advertiserIds: string[] = [];
    let scope: string = "";

    // Verifică dacă avem appId în state (folosim AdsApp)
    if (pending?.appId) {
      const app = await prisma.adsApp.findUnique({
        where: { id: pending.appId },
      });

      if (!app) {
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Aplicația%20nu%20mai%20există`
        );
      }

      adsAppId = app.id;

      // Exchange code cu credențialele aplicației
      const tokenResponse = await exchangeTikTokCodeWithApp(authCode, app.appId, app.appSecret);

      if (!tokenResponse.data?.access_token) {
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Nu%20s-a%20putut%20obține%20token-ul`
        );
      }

      accessToken = tokenResponse.data.access_token;
      advertiserIds = tokenResponse.data.advertiser_ids || [];
      scope = tokenResponse.data.scope?.join(",") || "";
    } else {
      // Fallback: folosim setările globale (legacy)
      const tokenResponse = await exchangeTikTokCode(authCode);

      if (!tokenResponse.data?.access_token) {
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Nu%20s-a%20putut%20obține%20token-ul`
        );
      }

      accessToken = tokenResponse.data.access_token;
      advertiserIds = tokenResponse.data.advertiser_ids || [];
      scope = tokenResponse.data.scope?.join(",") || "";
    }

    if (advertiserIds.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=Nu%20s-au%20găsit%20conturi%20de%20ads`
      );
    }

    // Obține detalii despre advertisers
    const advertisers = await getTikTokAdvertisers(accessToken, advertiserIds);

    // Salvează toate conturile găsite
    let savedCount = 0;
    const errors: string[] = [];

    for (const advertiser of advertisers) {
      try {
        // Skip dacă contul nu e activ
        if (advertiser.status !== "STATUS_ENABLE") {
          continue;
        }

        // Verifică dacă contul există deja
        const existing = await prisma.adsAccount.findFirst({
          where: {
            platform: "TIKTOK",
            externalId: advertiser.advertiser_id,
          },
        });

        if (existing) {
          // Actualizează token-ul și appId
          await prisma.adsAccount.update({
            where: { id: existing.id },
            data: {
              accessToken,
              tokenScope: scope,
              status: AdsAccountStatus.ACTIVE,
              lastSyncError: null,
              appId: adsAppId, // Leagă de noua aplicație
            },
          });
          savedCount++;
        } else {
          // Creează cont nou
          await prisma.adsAccount.create({
            data: {
              platform: "TIKTOK",
              externalId: advertiser.advertiser_id,
              name: advertiser.advertiser_name,
              currency: advertiser.currency || "RON",
              timezone: advertiser.timezone || "Europe/Bucharest",
              businessName: advertiser.company,
              accessToken,
              tokenScope: scope,
              status: AdsAccountStatus.ACTIVE,
              appId: adsAppId, // Leagă de aplicație
            },
          });
          savedCount++;
        }
      } catch (err: any) {
        errors.push(`${advertiser.advertiser_name}: ${err.message}`);
      }
    }

    // Cleanup state
    if (state) {
      removePendingState(state);
    }

    // Redirect cu succes
    if (savedCount > 0) {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?success=${encodeURIComponent(`${savedCount} cont(uri) TikTok conectat(e) cu succes`)}`
      );
    } else {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=${encodeURIComponent(errors.join("; ") || "Nu s-au putut salva conturile")}`
      );
    }
  } catch (error: any) {
    console.error("TikTok OAuth callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/ads/accounts?error=${encodeURIComponent(error.message || "Eroare la conectare")}`
    );
  }
}
