import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/temu/stores - Lista magazine Temu
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "settings.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const stores = await prisma.temuStore.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Nu expunem secretele
    const storesWithoutSecrets = stores.map((store) => ({
      ...store,
      appSecret: undefined,
      webhookSecret: undefined,
      hasApiCredentials: !!(store.appKey && store.appSecret),
      hasWebhookSecret: !!store.webhookSecret,
    }));

    return NextResponse.json({ stores: storesWithoutSecrets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TemuStore] Error fetching stores:", message);
    return NextResponse.json(
      { error: "Eroare la incarcarea magazinelor Temu" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/temu/stores - Creeaza magazin Temu nou
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "settings.edit");
    if (!canManage) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      appKey,
      appSecret,
      accessToken,
      companyId,
      region,
      currencyRate,
      invoiceSeriesName,
      webhookSecret,
    } = body;

    // Validare campuri obligatorii
    if (!name || !appKey || !appSecret || !accessToken || !companyId) {
      return NextResponse.json(
        {
          error: "Campuri obligatorii: name, appKey, appSecret, accessToken, companyId",
        },
        { status: 400 }
      );
    }

    // Verificam ca appKey nu exista deja
    const existing = await prisma.temuStore.findUnique({
      where: { appKey },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Acest App Key este deja configurat", existingId: existing.id },
        { status: 409 }
      );
    }

    // Verificam ca firma exista
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Firma selectata nu exista" },
        { status: 400 }
      );
    }

    // Calculam expirarea token-ului (3 luni de acum)
    const accessTokenExpiry = new Date();
    accessTokenExpiry.setMonth(accessTokenExpiry.getMonth() + 3);

    // Cream magazinul
    const store = await prisma.temuStore.create({
      data: {
        name: name.trim(),
        appKey: appKey.trim(),
        appSecret: appSecret.trim(),
        accessToken: accessToken.trim(),
        accessTokenExpiry,
        webhookSecret: webhookSecret?.trim() || null,
        region: region || "EU",
        currencyRate: currencyRate ? parseFloat(currencyRate) : null,
        invoiceSeriesName: invoiceSeriesName?.trim() || null,
        companyId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[TemuStore] Created store ${store.id} for company ${company.name}`);

    return NextResponse.json(
      {
        store: {
          ...store,
          appSecret: undefined,
          webhookSecret: undefined,
        },
        message: "Magazin Temu adaugat cu succes",
        success: true,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TemuStore] Error creating store:", message);

    // Check for Prisma unique constraint error
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Acest App Key este deja configurat" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: message || "Eroare la crearea magazinului Temu" },
      { status: 500 }
    );
  }
}
