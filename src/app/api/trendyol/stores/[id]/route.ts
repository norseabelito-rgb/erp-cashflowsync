import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trendyol/stores/[id] - Detalii magazin Trendyol
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const store = await prisma.trendyolStore.findUnique({
      where: { id },
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
    });

    if (!store) {
      return NextResponse.json(
        { error: "Magazinul Trendyol nu a fost gasit" },
        { status: 404 }
      );
    }

    // Generam webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
    const webhookUrl = `${baseUrl}/api/trendyol/webhook/${store.id}`;

    return NextResponse.json({
      store: {
        ...store,
        apiSecret: undefined,
        webhookSecret: undefined,
        hasApiCredentials: !!(store.apiKey && store.apiSecret),
        hasWebhookSecret: !!store.webhookSecret,
      },
      webhookUrl,
    });
  } catch (error: any) {
    console.error("[TrendyolStore] Error fetching store:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea magazinului Trendyol" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trendyol/stores/[id] - Actualizeaza magazin Trendyol
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();

    // Verificam ca magazinul exista
    const existing = await prisma.trendyolStore.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Magazinul Trendyol nu a fost gasit" },
        { status: 404 }
      );
    }

    // Construim update data
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.apiKey !== undefined) updateData.apiKey = body.apiKey.trim();
    if (body.apiSecret !== undefined) updateData.apiSecret = body.apiSecret.trim();
    if (body.storeFrontCode !== undefined) updateData.storeFrontCode = body.storeFrontCode.trim().toUpperCase();
    if (body.isTestMode !== undefined) updateData.isTestMode = body.isTestMode;
    if (body.defaultBrandId !== undefined) updateData.defaultBrandId = body.defaultBrandId ? parseInt(body.defaultBrandId) : null;
    if (body.currencyRate !== undefined) updateData.currencyRate = body.currencyRate ? parseFloat(body.currencyRate) : null;
    if (body.invoiceSeriesName !== undefined) updateData.invoiceSeriesName = body.invoiceSeriesName?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.companyId !== undefined) updateData.companyId = body.companyId;

    // Regenerare webhook secret daca cerut
    let newWebhookSecret: string | undefined;
    if (body.regenerateWebhookSecret) {
      newWebhookSecret = crypto.randomBytes(32).toString("hex");
      updateData.webhookSecret = newWebhookSecret;
    }

    const store = await prisma.trendyolStore.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[TrendyolStore] Updated store ${id}:`, Object.keys(updateData));

    const response: any = {
      store: {
        ...store,
        apiSecret: undefined,
        webhookSecret: undefined,
      },
      success: true,
    };

    // Returnam noul secret doar daca a fost regenerat
    if (newWebhookSecret) {
      response.webhookSecret = newWebhookSecret;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[TrendyolStore] Error updating store:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizarea magazinului Trendyol" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trendyol/stores/[id] - Sterge magazin Trendyol
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Verificam ca magazinul exista
    const existing = await prisma.trendyolStore.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Magazinul Trendyol nu a fost gasit" },
        { status: 404 }
      );
    }

    // Avertisment daca are comenzi
    if (existing._count.orders > 0) {
      return NextResponse.json(
        {
          error: `Magazinul are ${existing._count.orders} comenzi asociate. Stergerea nu este permisa.`,
          ordersCount: existing._count.orders,
        },
        { status: 400 }
      );
    }

    await prisma.trendyolStore.delete({
      where: { id },
    });

    console.log(`[TrendyolStore] Deleted store ${id}`);

    return NextResponse.json({
      success: true,
      message: "Magazin Trendyol sters cu succes",
    });
  } catch (error: any) {
    console.error("[TrendyolStore] Error deleting store:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la stergerea magazinului Trendyol" },
      { status: 500 }
    );
  }
}
