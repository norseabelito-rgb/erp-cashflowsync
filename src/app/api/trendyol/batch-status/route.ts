import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { checkBatchStatus, updateProductsFromBatchStatus } from "@/lib/trendyol-batch-status";

export const dynamic = 'force-dynamic';

/**
 * GET /api/trendyol/batch-status
 *
 * Checks the status of a Trendyol batch request and returns parsed results
 *
 * Query params:
 * - batchRequestId (required): The batch request ID to check
 * - storeId (optional): TrendyolStore ID for multi-store support
 * - updateProducts (optional): "true" to update MasterProduct records based on results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "trendyol.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const batchRequestId = searchParams.get("batchRequestId");
    const storeId = searchParams.get("storeId") || undefined;
    const updateProducts = searchParams.get("updateProducts") === "true";

    if (!batchRequestId) {
      return NextResponse.json({
        success: false,
        error: "batchRequestId este obligatoriu",
      }, { status: 400 });
    }

    // Check batch status
    const statusResult = await checkBatchStatus(batchRequestId, storeId);

    // Optionally update product records
    let updateResult = null;
    if (updateProducts && statusResult.status !== "IN_PROGRESS") {
      updateResult = await updateProductsFromBatchStatus(batchRequestId, statusResult);
    }

    return NextResponse.json({
      success: true,
      batchRequestId,
      status: statusResult.status,
      totalItems: statusResult.totalItems,
      successCount: statusResult.successCount,
      failedCount: statusResult.failedCount,
      items: statusResult.items,
      errors: statusResult.errors,
      updateResult,
    });

  } catch (error: any) {
    console.error("[Trendyol Batch Status] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la verificarea statusului batch-ului",
    }, { status: 500 });
  }
}
