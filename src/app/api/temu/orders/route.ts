import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { syncTemuOrdersForStore } from "@/lib/temu-order-sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/temu/orders - Lista comenzi Temu
 *
 * Query params:
 * - page: numar pagina (default 1)
 * - limit: comenzi per pagina (default 50)
 * - status: filtru status (OrderStatus)
 * - storeId: filtru magazin Temu
 * - startDate: data start (ISO string)
 * - endDate: data sfarsit (ISO string)
 * - search: cautare in numar comanda, nume client, telefon
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzile" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const storeId = searchParams.get("storeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // Build where clause for Temu orders
    const where: Record<string, unknown> = { source: "temu" };

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Store filter - can be virtual store ID or temuStoreId
    if (storeId && storeId !== "all") {
      // First try to find by virtual store ID
      where.storeId = storeId;
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.createdAt = {
        lte: new Date(endDate),
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { shopifyOrderNumber: { contains: search, mode: "insensitive" } },
        { customerFirstName: { contains: search, mode: "insensitive" } },
        { customerLastName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch orders with related data
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          lineItems: {
            include: {
              masterProduct: {
                select: {
                  id: true,
                  sku: true,
                  title: true,
                },
              },
            },
          },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              invoiceNumber: true,
              invoiceSeriesName: true,
              status: true,
              errorMessage: true,
              oblioId: true,
            },
          },
          awb: {
            select: {
              id: true,
              awbNumber: true,
              currentStatus: true,
              currentStatusDate: true,
              errorMessage: true,
            },
          },
          temuOrder: {
            include: {
              temuStore: {
                select: {
                  id: true,
                  name: true,
                  region: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          internalStatus: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Get Temu stores for filter dropdown
    const temuStores = await prisma.temuStore.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        region: true,
      },
      orderBy: { name: "asc" },
    });

    // API compat: map invoices[0] → invoice for frontend
    const ordersWithCompat = orders.map((o: any) => ({
      ...o,
      invoice: o.invoices?.[0] || null,
      invoices: undefined,
    }));

    return NextResponse.json({
      success: true,
      orders: ordersWithCompat,
      temuStores,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Temu Orders] Error fetching orders:", message);
    return NextResponse.json(
      { success: false, error: "Eroare la incarcarea comenzilor Temu" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/temu/orders - Sync orders from Temu API
 *
 * Body:
 * - action: "sync"
 * - storeId: (optional) specific store ID to sync
 * - startDate: (optional) start date for sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "orders.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a sincroniza comenzile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, storeId, startDate } = body;

    if (action !== "sync") {
      return NextResponse.json(
        { error: "Actiune invalida. Foloseste 'sync'" },
        { status: 400 }
      );
    }

    // Get store(s) to sync
    const stores = storeId
      ? await prisma.temuStore.findMany({
          where: { id: storeId },
          include: {
            company: { select: { id: true, name: true } },
          },
        })
      : await prisma.temuStore.findMany({
          where: { isActive: true },
          include: {
            company: { select: { id: true, name: true } },
          },
        });

    if (stores.length === 0) {
      return NextResponse.json(
        { error: "Nu exista magazine Temu configurate" },
        { status: 400 }
      );
    }

    const totalResult = {
      success: true,
      synced: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Sync each store
    for (const store of stores) {
      try {
        const result = await syncTemuOrdersForStore(
          {
            id: store.id,
            name: store.name,
            appKey: store.appKey,
            appSecret: store.appSecret,
            accessToken: store.accessToken,
            companyId: store.companyId,
            region: store.region,
            company: store.company,
          },
          {
            startTime: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          }
        );

        totalResult.synced += result.synced;
        totalResult.created += result.created;
        totalResult.updated += result.updated;
        totalResult.errors.push(...result.errors);
      } catch (storeError: unknown) {
        const msg = storeError instanceof Error ? storeError.message : "Unknown error";
        totalResult.errors.push(`${store.name}: ${msg}`);
      }
    }

    if (totalResult.errors.length > 0 && totalResult.synced === 0) {
      totalResult.success = false;
    }

    return NextResponse.json(totalResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Temu Orders] Error syncing orders:", message);
    return NextResponse.json(
      { success: false, error: "Eroare la sincronizarea comenzilor Temu" },
      { status: 500 }
    );
  }
}
