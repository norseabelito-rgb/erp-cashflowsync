import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  generateSettlementPreview,
  calculateSettlementFromOrders,
} from "@/lib/intercompany-service";

/**
 * GET /api/intercompany/preview - Preview decontare pentru o firma (all eligible orders)
 *
 * Query params:
 * - companyId (required): Secondary company ID
 * - periodStart (optional): Start of period (ISO date)
 * - periodEnd (optional): End of period (ISO date)
 *
 * Returns SettlementPreviewExtended with:
 * - warnings array for products without costPrice
 * - per-order costTotal and paymentType
 * - all orders pre-selected (selected: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "intercompany.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza decontarile" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const periodStartStr = searchParams.get("periodStart");
    const periodEndStr = searchParams.get("periodEnd");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId este obligatoriu" },
        { status: 400 }
      );
    }

    const periodStart = periodStartStr ? new Date(periodStartStr) : undefined;
    const periodEnd = periodEndStr ? new Date(periodEndStr) : undefined;

    const preview = await generateSettlementPreview(companyId, periodStart, periodEnd);

    if (!preview) {
      return NextResponse.json({
        success: true,
        preview: null,
        message: "Nu exista comenzi eligibile pentru decontare",
      });
    }

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: unknown) {
    console.error("[Intercompany Preview GET] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/intercompany/preview - Generate preview for selected orders
 *
 * Body:
 * - companyId (required): Secondary company ID
 * - orderIds (required): Array of order IDs to include in settlement
 *
 * Returns SettlementPreviewExtended calculated from selected orders only
 * Uses acquisition price (costPrice) from InventoryItem, not order prices
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "intercompany.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza decontarile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyId, orderIds } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId este obligatoriu" },
        { status: 400 }
      );
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "orderIds este obligatoriu si trebuie sa contina cel putin o comanda",
        },
        { status: 400 }
      );
    }

    const preview = await calculateSettlementFromOrders(companyId, orderIds);

    if (!preview) {
      return NextResponse.json(
        { success: false, error: "Nu s-a putut genera preview-ul pentru comenzile selectate" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: unknown) {
    console.error("[Intercompany Preview POST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la generarea preview-ului";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
