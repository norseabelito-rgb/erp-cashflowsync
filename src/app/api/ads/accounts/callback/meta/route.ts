import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  exchangeMetaCode, 
  exchangeMetaCodeWithApp,
  extendMetaToken, 
  getMetaAdAccounts,
} from "@/lib/meta-ads";
import { AdsAccountStatus } from "@prisma/client";
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

// GET - Meta OAuth callback
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    console.log("[Meta Callback] Received callback:", {
      hasCode: !!code,
      state: state?.substring(0, 8) + "...",
      error,
      errorDescription,
      baseUrl
    });

    // Verifică dacă a fost o eroare de la Meta
    if (error) {
      console.error("[Meta Callback] Meta OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Verifică parametrii necesari
    if (!code || !state) {
      console.error("[Meta Callback] Missing parameters:", { hasCode: !!code, hasState: !!state });
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=Parametri%20lipsă`
      );
    }

    // Verifică state-ul din storage-ul partajat
    const pending = getPendingState(state);
    console.log("[Meta Callback] Pending state lookup:", {
      state: state.substring(0, 8) + "...",
      found: !!pending,
      appId: pending?.appId,
      platform: pending?.platform
    });
    
    if (!pending) {
      console.error("[Meta Callback] State not found or expired:", state.substring(0, 8) + "...");
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=Sesiune%20expirată%20sau%20invalidă`
      );
    }

    let accessToken: string;
    let expiresAt: Date | null = null;
    let adsAppId: string | null = null;

    // Verifică dacă avem appId în state (folosim AdsApp)
    if (pending.appId) {
      console.log("[Meta Callback] Using AdsApp:", pending.appId);
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
      console.log("[Meta Callback] Exchanging code for app:", { 
        appName: app.name, 
        appId: app.appId.substring(0, 8) + "..." 
      });
      
      const tokenResponse = await exchangeMetaCodeWithApp(code, app.appId, app.appSecret, app.redirectUri);
      
      console.log("[Meta Callback] Token response:", {
        hasToken: !!tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in
      });
      
      if (!tokenResponse.access_token) {
        console.error("[Meta Callback] No access token in response");
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Nu%20s-a%20putut%20obține%20token-ul`
        );
      }

      accessToken = tokenResponse.access_token;
      if (tokenResponse.expires_in) {
        expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
      }

      // Extinde token-ul pentru long-lived access
      try {
        const extendParams = new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: app.appId,
          client_secret: app.appSecret,
          fb_exchange_token: accessToken,
        });
        const extendResponse = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?${extendParams}`
        );
        if (extendResponse.ok) {
          const extendedToken = await extendResponse.json();
          if (extendedToken.access_token) {
            accessToken = extendedToken.access_token;
            if (extendedToken.expires_in) {
              expiresAt = new Date(Date.now() + extendedToken.expires_in * 1000);
            }
          }
        }
      } catch (err) {
        console.warn("Could not extend token, using short-lived:", err);
      }
    } else {
      // Fallback: folosim setările globale (legacy)
      const tokenResponse = await exchangeMetaCode(code);
      
      if (!tokenResponse.access_token) {
        return NextResponse.redirect(
          `${baseUrl}/ads/accounts?error=Nu%20s-a%20putut%20obține%20token-ul`
        );
      }

      accessToken = tokenResponse.access_token;
      if (tokenResponse.expires_in) {
        expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
      }

      // Extinde token-ul pentru long-lived access (60 zile)
      try {
        const extendedToken = await extendMetaToken(accessToken);
        accessToken = extendedToken.access_token;
        if (extendedToken.expires_in) {
          expiresAt = new Date(Date.now() + extendedToken.expires_in * 1000);
        }
      } catch (err) {
        console.warn("Could not extend token, using short-lived:", err);
      }
    }

    // Obține ad accounts disponibile
    console.log("[Meta Callback] Fetching ad accounts...");
    const adAccounts = await getMetaAdAccounts(accessToken);
    
    console.log("[Meta Callback] Found ad accounts:", {
      count: adAccounts.length,
      accounts: adAccounts.map(a => ({ id: a.account_id, name: a.name, status: a.account_status }))
    });

    if (adAccounts.length === 0) {
      console.error("[Meta Callback] No ad accounts found");
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=Nu%20s-au%20găsit%20conturi%20de%20ads`
      );
    }

    // Salvează toate conturile găsite
    let savedCount = 0;
    const errors: string[] = [];

    for (const adAccount of adAccounts) {
      try {
        // Skip dacă contul nu e activ (account_status: 1 = ACTIVE)
        if (adAccount.account_status !== 1) {
          continue;
        }

        // Verifică dacă contul există deja
        const existing = await prisma.adsAccount.findFirst({
          where: {
            platform: "META",
            externalId: adAccount.account_id,
          },
        });

        if (existing) {
          // Actualizează token-ul și appId
          await prisma.adsAccount.update({
            where: { id: existing.id },
            data: {
              accessToken,
              tokenExpiresAt: expiresAt,
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
              platform: "META",
              externalId: adAccount.account_id,
              name: adAccount.name,
              currency: adAccount.currency || "RON",
              timezone: adAccount.timezone_name || "Europe/Bucharest",
              businessId: adAccount.business?.id,
              businessName: adAccount.business?.name,
              accessToken,
              tokenExpiresAt: expiresAt,
              status: AdsAccountStatus.ACTIVE,
              appId: adsAppId, // Leagă de aplicație
            },
          });
          savedCount++;
        }
      } catch (err: any) {
        errors.push(`${adAccount.name}: ${err.message}`);
      }
    }

    // Cleanup state
    removePendingState(state);

    // Redirect cu succes
    if (savedCount > 0) {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?success=${encodeURIComponent(`${savedCount} cont(uri) Meta conectat(e) cu succes`)}`
      );
    } else {
      return NextResponse.redirect(
        `${baseUrl}/ads/accounts?error=${encodeURIComponent(errors.join("; ") || "Nu s-au putut salva conturile")}`
      );
    }
  } catch (error: any) {
    console.error("Meta OAuth callback error:", error);
    // În catch nu avem baseUrl, folosim un fallback simplu
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return NextResponse.redirect(
      `${proto}://${host}/ads/accounts?error=${encodeURIComponent(error.message || "Eroare la conectare")}`
    );
  }
}
