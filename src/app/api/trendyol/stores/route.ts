import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/trendyol/stores - Lista magazine Trendyol
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "stores.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const stores = await prisma.trendyolStore.findMany({
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
      apiSecret: undefined,
      webhookSecret: undefined,
      hasApiCredentials: !!(store.apiKey && store.apiSecret),
      hasWebhookSecret: !!store.webhookSecret,
    }));

    return NextResponse.json({ stores: storesWithoutSecrets });
  } catch (error: any) {
    console.error("[TrendyolStore] Error fetching stores:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea magazinelor Trendyol" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trendyol/stores - Creeaza magazin Trendyol nou
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "stores.manage");
    if (!canManage) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      supplierId,
      apiKey,
      apiSecret,
      storeFrontCode,
      companyId,
      isTestMode,
      defaultBrandId,
      currencyRate,
      invoiceSeriesName,
    } = body;

    // Validare campuri obligatorii
    if (!name || !supplierId || !apiKey || !apiSecret || !storeFrontCode || !companyId) {
      return NextResponse.json(
        {
          error: "Campuri obligatorii: name, supplierId, apiKey, apiSecret, storeFrontCode, companyId",
        },
        { status: 400 }
      );
    }

    // Verificam ca supplier ID nu exista deja
    const existing = await prisma.trendyolStore.findUnique({
      where: { supplierId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Acest Supplier ID este deja configurat", existingId: existing.id },
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

    // Generam webhook secret
    const webhookSecret = crypto.randomBytes(32).toString("hex");

    // Cream magazinul
    const store = await prisma.trendyolStore.create({
      data: {
        name: name.trim(),
        supplierId: supplierId.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        webhookSecret,
        storeFrontCode: storeFrontCode.trim().toUpperCase(),
        isTestMode: isTestMode ?? false,
        defaultBrandId: defaultBrandId ? parseInt(defaultBrandId) : null,
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

    // Generam webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
    const webhookUrl = `${baseUrl}/api/trendyol/webhook/${store.id}`;

    console.log(`[TrendyolStore] Created store ${store.id} for company ${company.name}`);

    return NextResponse.json({
      store: {
        ...store,
        apiSecret: undefined,
        webhookSecret: undefined,
      },
      webhookUrl,
      webhookSecret, // Returnam o singura data la creare
      message: "Magazin Trendyol adaugat cu succes",
      success: true,
    });
  } catch (error: any) {
    console.error("[TrendyolStore] Error creating store:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Acest Supplier ID este deja configurat" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Eroare la crearea magazinului Trendyol" },
      { status: 500 }
    );
  }
}
