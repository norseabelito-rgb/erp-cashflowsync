import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { TrendyolClient } from "@/lib/trendyol";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trendyol/stores/[id]/test - Test conexiune magazin Trendyol
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Incarcam magazinul
    const store = await prisma.trendyolStore.findUnique({
      where: { id },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Magazinul Trendyol nu a fost gasit" },
        { status: 404 }
      );
    }

    // Testam conexiunea
    const client = new TrendyolClient({
      supplierId: store.supplierId,
      apiKey: store.apiKey,
      apiSecret: store.apiSecret,
      isTestMode: store.isTestMode,
    });

    const startTime = Date.now();

    try {
      // Testam cu un request simplu - lista comenzi (1 rezultat)
      const result = await client.getOrders({ size: 1 });
      const responseTime = Date.now() - startTime;

      console.log(`[TrendyolStore] Test connection for ${store.name}: SUCCESS (${responseTime}ms)`);

      return NextResponse.json({
        success: true,
        message: "Conexiune reusita",
        responseTime,
        details: {
          storeName: store.name,
          supplierId: store.supplierId,
          storeFrontCode: store.storeFrontCode,
          isTestMode: store.isTestMode,
          totalOrders: result.totalElements ?? "N/A",
        },
      });
    } catch (apiError: any) {
      const responseTime = Date.now() - startTime;
      console.error(`[TrendyolStore] Test connection for ${store.name}: FAILED`, apiError.message);

      let errorMessage = "Eroare la conectarea la Trendyol";

      if (apiError.message?.includes("401") || apiError.message?.includes("Unauthorized")) {
        errorMessage = "Credentialele API sunt invalide";
      } else if (apiError.message?.includes("403") || apiError.message?.includes("Forbidden")) {
        errorMessage = "Supplier ID invalid sau acces interzis";
      } else if (apiError.message?.includes("404")) {
        errorMessage = "Supplier ID nu a fost gasit";
      } else if (apiError.message?.includes("timeout") || apiError.message?.includes("ETIMEDOUT")) {
        errorMessage = "Conexiunea a expirat (timeout)";
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        responseTime,
        error: apiError.message,
      });
    }
  } catch (error: any) {
    console.error("[TrendyolStore] Error testing connection:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la testarea conexiunii" },
      { status: 500 }
    );
  }
}
