import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { parseDeliveryManifestCSV } from "@/lib/manifest/delivery-manifest";

/**
 * POST /api/manifests/deliveries/upload
 * Upload CSV for manual delivery manifest creation
 *
 * Body: FormData with 'file' (CSV) and 'date' (YYYY-MM-DD)
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
        { error: "Nu ai permisiunea de a incarca manifeste" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const date = formData.get("date") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "CSV file is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    const result = await parseDeliveryManifestCSV(csvContent, date);

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
    console.error("Error in POST /api/manifests/deliveries/upload:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
