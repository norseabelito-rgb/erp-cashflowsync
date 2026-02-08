import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getReturnManifest, updateManifestStatus } from "@/lib/manifest/return-manifest";
import { ManifestStatus } from "@prisma/client";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/manifests/returns/[id]
 * Get a specific return manifest with all items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "handover.scan");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza manifestul" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const manifest = await getReturnManifest(id);

    if (!manifest) {
      return NextResponse.json(
        { error: "Manifestul nu a fost gasit" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: manifest
    });
  } catch (error: any) {
    console.error("Error in GET /api/manifests/returns/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manifests/returns/[id]
 * Update manifest status (workflow transitions)
 *
 * Body: { status: ManifestStatus }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Different permissions for different status transitions
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(ManifestStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Validate permission based on status transition
    const requiredPermission = status === ManifestStatus.CONFIRMED
      ? "invoices.cancel" // Office verification
      : "handover.scan";

    const hasAccess = await hasPermission(session.user.id, requiredPermission);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Nu ai permisiunea pentru aceasta operatie" },
        { status: 403 }
      );
    }

    const result = await updateManifestStatus(id, status, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in PATCH /api/manifests/returns/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
