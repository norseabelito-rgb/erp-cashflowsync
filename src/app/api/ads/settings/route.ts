import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { AdsPlatform } from "@/types/prisma-enums";

// GET - Obține setările pentru toate platformele
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.accounts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Obține setările existente
    const settings = await prisma.adsSettings.findMany();

    // Creează un map pentru acces rapid
    const settingsMap: Record<string, any> = {};
    
    for (const platform of ["META", "TIKTOK", "GOOGLE"]) {
      const existing = settings.find((s: any) => s.platform === platform);
      settingsMap[platform] = existing ? {
        id: existing.id,
        platform: existing.platform,
        appId: existing.appId || "",
        // Nu returnăm appSecret complet, doar indicăm dacă e setat
        appSecretSet: !!existing.appSecret,
        redirectUri: existing.redirectUri || "",
        isConfigured: existing.isConfigured,
        testMode: existing.testMode,
        notes: existing.notes || "",
      } : {
        platform,
        appId: "",
        appSecretSet: false,
        redirectUri: "",
        isConfigured: false,
        testMode: false,
        notes: "",
      };
    }

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error("Error fetching ads settings:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}

// POST - Salvează setările pentru o platformă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.accounts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { platform, appId, appSecret, redirectUri, testMode, notes } = body;

    if (!platform || !["META", "TIKTOK", "GOOGLE"].includes(platform)) {
      return NextResponse.json({ error: "Platformă invalidă" }, { status: 400 });
    }

    // Verifică dacă avem minimul necesar pentru a fi configurat
    const isConfigured = !!(appId && (appSecret || body.keepExistingSecret) && redirectUri);

    // Upsert setările
    const updateData: any = {
      appId: appId || null,
      redirectUri: redirectUri || null,
      isConfigured,
      testMode: testMode ?? false,
      notes: notes || null,
    };

    // Actualizăm secretul doar dacă e furnizat (nu e gol)
    if (appSecret && appSecret.trim() !== "") {
      updateData.appSecret = appSecret;
    }

    const settings = await prisma.adsSettings.upsert({
      where: { platform: platform as AdsPlatform },
      create: {
        platform: platform as AdsPlatform,
        appId: appId || null,
        appSecret: appSecret || null,
        redirectUri: redirectUri || null,
        isConfigured,
        testMode: testMode ?? false,
        notes: notes || null,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Setările pentru ${platform} au fost salvate`,
      isConfigured: settings.isConfigured,
    });
  } catch (error: any) {
    console.error("Error saving ads settings:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la salvare" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge credențialele pentru o platformă
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.accounts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform || !["META", "TIKTOK", "GOOGLE"].includes(platform)) {
      return NextResponse.json({ error: "Platformă invalidă" }, { status: 400 });
    }

    await prisma.adsSettings.update({
      where: { platform: platform as AdsPlatform },
      data: {
        appId: null,
        appSecret: null,
        redirectUri: null,
        isConfigured: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Credențialele pentru ${platform} au fost șterse`,
    });
  } catch (error: any) {
    console.error("Error deleting ads settings:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la ștergere" },
      { status: 500 }
    );
  }
}
