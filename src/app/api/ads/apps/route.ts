import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { AdsPlatform } from "@prisma/client";

// GET - Lista aplicațiilor configurate
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
    const platform = searchParams.get("platform") as AdsPlatform | null;

    const apps = await prisma.adsApp.findMany({
      where: platform ? { platform, isActive: true } : { isActive: true },
      select: {
        id: true,
        platform: true,
        name: true,
        appId: true,
        redirectUri: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { accounts: true }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ 
      apps: apps.map(app => ({
        ...app,
        accountsCount: app._count.accounts,
        _count: undefined,
      }))
    });
  } catch (error: any) {
    console.error("Error fetching ads apps:", error);
    return NextResponse.json(
      { error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}

// POST - Adaugă o aplicație nouă
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
    const { platform, name, appId, appSecret, redirectUri } = body;

    // Validări
    if (!platform || !["META", "TIKTOK", "GOOGLE"].includes(platform)) {
      return NextResponse.json({ error: "Platformă invalidă" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele aplicației este obligatoriu" }, { status: 400 });
    }
    if (!appId?.trim()) {
      return NextResponse.json({ error: "App ID este obligatoriu" }, { status: 400 });
    }
    if (!appSecret?.trim()) {
      return NextResponse.json({ error: "App Secret este obligatoriu" }, { status: 400 });
    }
    if (!redirectUri?.trim()) {
      return NextResponse.json({ error: "Redirect URI este obligatoriu" }, { status: 400 });
    }

    const app = await prisma.adsApp.create({
      data: {
        platform: platform as AdsPlatform,
        name: name.trim(),
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        redirectUri: redirectUri.trim(),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        platform: app.platform,
        name: app.name,
        appId: app.appId,
        redirectUri: app.redirectUri,
      },
      message: `Aplicația "${app.name}" a fost adăugată`,
    });
  } catch (error: any) {
    console.error("Error creating ads app:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la creare" },
      { status: 500 }
    );
  }
}

// PUT - Actualizează o aplicație
export async function PUT(request: NextRequest) {
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
    const { id, name, appId, appSecret, redirectUri, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
    }

    const existing = await prisma.adsApp.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Aplicația nu există" }, { status: 404 });
    }

    const updateData: any = {};
    if (name?.trim()) updateData.name = name.trim();
    if (appId?.trim()) updateData.appId = appId.trim();
    if (appSecret?.trim()) updateData.appSecret = appSecret.trim();
    if (redirectUri?.trim()) updateData.redirectUri = redirectUri.trim();
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const app = await prisma.adsApp.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      app: {
        id: app.id,
        platform: app.platform,
        name: app.name,
        appId: app.appId,
        redirectUri: app.redirectUri,
        isActive: app.isActive,
      },
      message: `Aplicația "${app.name}" a fost actualizată`,
    });
  } catch (error: any) {
    console.error("Error updating ads app:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizare" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge o aplicație
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
    }

    const app = await prisma.adsApp.findUnique({
      where: { id },
      include: { _count: { select: { accounts: true } } },
    });

    if (!app) {
      return NextResponse.json({ error: "Aplicația nu există" }, { status: 404 });
    }

    if (app._count.accounts > 0) {
      return NextResponse.json(
        { error: `Nu poți șterge aplicația - are ${app._count.accounts} conturi conectate` },
        { status: 400 }
      );
    }

    await prisma.adsApp.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Aplicația "${app.name}" a fost ștearsă`,
    });
  } catch (error: any) {
    console.error("Error deleting ads app:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la ștergere" },
      { status: 500 }
    );
  }
}
