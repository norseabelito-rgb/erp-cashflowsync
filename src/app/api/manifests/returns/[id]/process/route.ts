import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { processReturnManifestStornare } from "@/lib/manifest/bulk-stornare";

// Disable caching for this route
export const dynamic = "force-dynamic";

/**
 * POST /api/manifests/returns/[id]/process
 * Process a confirmed return manifest - cancel all invoices in Oblio
 *
 * Requires: invoices.cancel permission
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

    // Check permission for invoice cancellation
    const canCancel = await hasPermission(session.user.id, "invoices.cancel");
    if (!canCancel) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a storna facturi" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await processReturnManifestStornare(id, session.user.id);

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
  } catch (error: any) {
    console.error("Error in POST /api/manifests/returns/[id]/process:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
