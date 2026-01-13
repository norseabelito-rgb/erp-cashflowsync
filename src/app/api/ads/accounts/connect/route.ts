import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getMetaOAuthUrl, getMetaOAuthUrlWithApp } from "@/lib/meta-ads";
import { getTikTokOAuthUrl, getTikTokOAuthUrlWithApp } from "@/lib/tiktok-ads";
import { isPlatformConfigured } from "@/lib/ads-config";
import { prisma } from "@/lib/db";
import { AdsPlatform } from "@/types/prisma-enums";
import crypto from "crypto";
import { 
  cleanupExpiredStates, 
  addPendingState, 
  getPendingState 
} from "@/lib/ads-oauth-state";

// POST - Inițiază OAuth flow
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
    const { platform, appId } = body; // appId = ID-ul aplicației din AdsApp

    if (!platform || !["META", "TIKTOK"].includes(platform)) {
      return NextResponse.json(
        { error: "Platformă invalidă. Folosește META sau TIKTOK" },
        { status: 400 }
      );
    }

    let authUrl: string;
    let appData: { id: string; name: string } | null = null;

    // Dacă e specificat appId, folosim aplicația din AdsApp
    if (appId) {
      const app = await prisma.adsApp.findUnique({
        where: { id: appId },
      });

      if (!app) {
        return NextResponse.json({ error: "Aplicația nu există" }, { status: 404 });
      }
      if (app.platform !== platform) {
        return NextResponse.json({ error: "Aplicația nu e pentru platforma selectată" }, { status: 400 });
      }
      if (!app.isActive) {
        return NextResponse.json({ error: "Aplicația nu este activă" }, { status: 400 });
      }

      appData = { id: app.id, name: app.name };

      // Cleanup expired states
      cleanupExpiredStates();

      // Generează un state unic pentru securitate
      const state = crypto.randomBytes(32).toString("hex");
      
      // Stochează state-ul pentru validare la callback (include appId pentru callback)
      addPendingState(state, {
        userId: session.user.id,
        platform,
        appId: app.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // Generează URL-ul de autorizare cu credențialele aplicației
      if (platform === "META") {
        authUrl = getMetaOAuthUrlWithApp(state, app.appId, app.appSecret, app.redirectUri);
      } else {
        authUrl = getTikTokOAuthUrlWithApp(state, app.appId, app.appSecret, app.redirectUri);
      }

      return NextResponse.json({
        success: true,
        authUrl,
        state,
        app: appData,
      });
    }

    // Fallback: folosește setările globale (legacy AdsSettings)
    const isConfigured = await isPlatformConfigured(platform as AdsPlatform);
    if (!isConfigured) {
      // Verifică dacă există aplicații configurate
      const appsCount = await prisma.adsApp.count({
        where: { platform: platform as AdsPlatform, isActive: true }
      });

      if (appsCount > 0) {
        return NextResponse.json(
          { error: `Selectează o aplicație pentru ${platform} din lista de mai jos.` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `${platform} nu este configurat. Adaugă o aplicație în Ads > Setări.` },
        { status: 400 }
      );
    }

    // Cleanup expired states
    cleanupExpiredStates();

    // Generează un state unic pentru securitate
    const state = crypto.randomBytes(32).toString("hex");
    
    // Stochează state-ul pentru validare la callback (expiră în 10 minute)
    addPendingState(state, {
      userId: session.user.id,
      platform,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Generează URL-ul de autorizare
    if (platform === "META") {
      authUrl = await getMetaOAuthUrl(state);
    } else if (platform === "TIKTOK") {
      authUrl = await getTikTokOAuthUrl(state);
    } else {
      return NextResponse.json({ error: "Platformă nesuportată" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    console.error("Error initiating OAuth:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la inițierea conectării" },
      { status: 500 }
    );
  }
}

// GET - Verifică un state (pentru debugging)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");

    if (!state) {
      return NextResponse.json({ valid: false, error: "State lipsă" });
    }

    const pending = getPendingState(state);
    
    if (!pending) {
      return NextResponse.json({ valid: false, error: "State invalid sau expirat" });
    }

    return NextResponse.json({
      valid: true,
      platform: pending.platform,
      appId: pending.appId,
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message });
  }
}
