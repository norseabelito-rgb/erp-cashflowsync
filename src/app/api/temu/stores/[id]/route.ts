import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/temu/stores/[id] - Detalii magazin Temu
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const store = await prisma.temuStore.findUnique({
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
        { error: "Magazinul Temu nu a fost gasit" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      store: {
        ...store,
        appSecret: undefined,
        webhookSecret: undefined,
        hasApiCredentials: !!(store.appKey && store.appSecret),
        hasWebhookSecret: !!store.webhookSecret,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TemuStore] Error fetching store:", message);
    return NextResponse.json(
      { error: "Eroare la incarcarea magazinului Temu" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/temu/stores/[id] - Actualizeaza magazin Temu
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();

    // Verificam ca magazinul exista
    const existing = await prisma.temuStore.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Magazinul Temu nu a fost gasit" },
        { status: 404 }
      );
    }

    // Construim update data - only update fields that are provided
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.appKey !== undefined) updateData.appKey = body.appKey.trim();
    if (body.appSecret !== undefined && body.appSecret) updateData.appSecret = body.appSecret.trim();
    if (body.accessToken !== undefined && body.accessToken) updateData.accessToken = body.accessToken.trim();
    if (body.accessTokenExpiry !== undefined) updateData.accessTokenExpiry = new Date(body.accessTokenExpiry);
    if (body.webhookSecret !== undefined) updateData.webhookSecret = body.webhookSecret?.trim() || null;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.currencyRate !== undefined) updateData.currencyRate = body.currencyRate ? parseFloat(body.currencyRate) : null;
    if (body.invoiceSeriesName !== undefined) updateData.invoiceSeriesName = body.invoiceSeriesName?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.companyId !== undefined) updateData.companyId = body.companyId;

    const store = await prisma.temuStore.update({
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

    console.log(`[TemuStore] Updated store ${id}:`, Object.keys(updateData));

    return NextResponse.json({
      store: {
        ...store,
        appSecret: undefined,
        webhookSecret: undefined,
      },
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TemuStore] Error updating store:", message);
    return NextResponse.json(
      { error: message || "Eroare la actualizarea magazinului Temu" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/temu/stores/[id] - Sterge magazin Temu
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Verificam ca magazinul exista
    const existing = await prisma.temuStore.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Magazinul Temu nu a fost gasit" },
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

    await prisma.temuStore.delete({
      where: { id },
    });

    console.log(`[TemuStore] Deleted store ${id}`);

    return NextResponse.json(
      {
        success: true,
        message: "Magazin Temu sters cu succes",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TemuStore] Error deleting store:", message);
    return NextResponse.json(
      { error: message || "Eroare la stergerea magazinului Temu" },
      { status: 500 }
    );
  }
}
