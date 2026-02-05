import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { syncTemuOrdersForStore, syncAllTemuOrdersToMain } from "@/lib/temu-order-sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/temu/sync - Sincronizare comenzi Temu
 *
 * Body params:
 * - storeId: ID magazin Temu (optional - sync specific store or all)
 * - startDate: data start pentru sync (optional, default: ultimele 7 zile)
 * - endDate: data sfarsit pentru sync (optional, default: acum)
 * - syncUnlinked: doar sincronizeaza TemuOrders existente care nu au Order (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Permission check - requires orders.create or orders.edit
    const canCreate = await hasPermission(session.user.id, "orders.create");
    const canEdit = await hasPermission(session.user.id, "orders.edit");
    if (!canCreate && !canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a sincroniza comenzile" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { storeId, startDate, endDate, syncUnlinked } = body;

    // If syncUnlinked=true, only sync existing TemuOrders without Order
    if (syncUnlinked) {
      const result = await syncAllTemuOrdersToMain();
      return NextResponse.json({
        success: true,
        message: `Sincronizare completata: ${result.synced} comenzi (${result.created} create, ${result.updated} actualizate)`,
        results: [result],
      });
    }

    // Get stores to sync
    const stores = await prisma.temuStore.findMany({
      where: {
        isActive: true,
        ...(storeId ? { id: storeId } : {}),
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

    if (stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Niciun magazin Temu activ configurat",
        results: [],
      });
    }

    // Default date range: last 7 days
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    const syncStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const syncEndDate = endDate ? new Date(endDate) : new Date();

    const results = [];
    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];

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
            startTime: syncStartDate,
            endTime: syncEndDate,
          }
        );

        results.push({
          storeId: store.id,
          storeName: store.name,
          ...result,
        });

        totalSynced += result.synced;
        totalCreated += result.created;
        totalUpdated += result.updated;
        allErrors.push(...result.errors.map((e) => `${store.name}: ${e}`));
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.push({
          storeId: store.id,
          storeName: store.name,
          synced: 0,
          created: 0,
          updated: 0,
          errors: [errorMsg],
        });
        allErrors.push(`${store.name}: ${errorMsg}`);
      }
    }

    // Log sync activity
    console.log(
      `[Temu Sync] User ${session.user.id} synced: ${totalSynced} orders (${totalCreated} created, ${totalUpdated} updated), ${allErrors.length} errors`
    );

    return NextResponse.json({
      success: true,
      message: `Sincronizare completata: ${totalSynced} comenzi din ${stores.length} magazine`,
      summary: {
        stores: stores.length,
        synced: totalSynced,
        created: totalCreated,
        updated: totalUpdated,
        errors: allErrors.length,
      },
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Temu Sync] Error:", message);
    return NextResponse.json(
      { success: false, error: "Eroare la sincronizarea comenzilor Temu" },
      { status: 500 }
    );
  }
}
