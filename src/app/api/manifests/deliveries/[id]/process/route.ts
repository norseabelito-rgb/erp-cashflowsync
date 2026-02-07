import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { processDeliveryManifestPayment } from "@/lib/manifest/bulk-payment";

/**
 * POST /api/manifests/deliveries/[id]/process
 * Process a confirmed delivery manifest - mark all invoices as paid
 *
 * Body: { collectType?: string } - Payment type (default: "Ramburs")
 * Requires: invoices.edit permission
 * Precondition: Manifest must be in CONFIRMED status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission for invoice editing
    const canEdit = await hasPermission(session.user.id, "invoices.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a marca facturi ca platite" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const collectType = body.collectType || "Ramburs";

    const result = await processDeliveryManifestPayment(id, session.user.id, collectType);

    if (!result.success && result.totalProcessed === 0) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors[0]?.error || "Processing failed"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      totalProcessed: result.totalProcessed,
      successCount: result.successCount,
      errorCount: result.errorCount,
      skippedCount: result.skippedCount,
      errors: result.errors
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in POST /api/manifests/deliveries/[id]/process:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
