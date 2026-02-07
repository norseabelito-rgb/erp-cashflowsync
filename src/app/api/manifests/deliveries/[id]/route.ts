import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDeliveryManifest } from "@/lib/manifest/delivery-manifest";
import prisma from "@/lib/db";
import { ManifestStatus, ManifestType } from "@prisma/client";

/**
 * GET /api/manifests/deliveries/[id]
 * Get specific delivery manifest
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

    const canView = await hasPermission(session.user.id, "invoices.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza manifestul" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const manifest = await getDeliveryManifest(id);

    if (!manifest) {
      return NextResponse.json(
        { error: "Manifestul nu a fost gasit" },
        { status: 404 }
      );
    }

    // Verify it's a DELIVERY manifest
    if (manifest.type !== ManifestType.DELIVERY) {
      return NextResponse.json(
        { error: "Manifestul nu este de tip livrare" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: manifest
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in GET /api/manifests/deliveries/[id]:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manifests/deliveries/[id]
 * Update delivery manifest status
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

    const canEdit = await hasPermission(session.user.id, "invoices.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea pentru aceasta operatie" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(ManifestStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify manifest exists and is a DELIVERY manifest
    const existing = await prisma.courierManifest.findUnique({
      where: { id },
      select: { type: true }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Manifestul nu a fost gasit" },
        { status: 404 }
      );
    }

    if (existing.type !== ManifestType.DELIVERY) {
      return NextResponse.json(
        { error: "Manifestul nu este de tip livrare" },
        { status: 400 }
      );
    }

    const updateData: {
      status: ManifestStatus;
      confirmedAt?: Date;
      confirmedById?: string;
      processedAt?: Date;
    } = { status };

    if (status === ManifestStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
      updateData.confirmedById = session.user.id;
    }

    if (status === ManifestStatus.PROCESSED) {
      updateData.processedAt = new Date();
    }

    await prisma.courierManifest.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in PATCH /api/manifests/deliveries/[id]:", error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
