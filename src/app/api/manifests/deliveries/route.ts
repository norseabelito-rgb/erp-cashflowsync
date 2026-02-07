import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  fetchDeliveryManifest,
  listDeliveryManifests
} from "@/lib/manifest/delivery-manifest";
import { ManifestStatus } from "@prisma/client";

/**
 * GET /api/manifests/deliveries
 * List delivery manifests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "invoices.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza manifestele" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as ManifestStatus | undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await listDeliveryManifests({ status: status || undefined, limit, offset });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in GET /api/manifests/deliveries:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manifests/deliveries
 * Fetch delivery manifest from FanCourier API
 *
 * Body: { date: string (YYYY-MM-DD), companyId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "invoices.edit");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a genera manifeste" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { date, companyId } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const result = await fetchDeliveryManifest(date, companyId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, skippedCount: result.skippedCount },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      manifestId: result.manifestId,
      itemCount: result.itemCount,
      skippedCount: result.skippedCount
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in POST /api/manifests/deliveries:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
