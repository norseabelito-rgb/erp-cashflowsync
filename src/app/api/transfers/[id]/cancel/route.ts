import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, hasWarehouseAccess } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// POST - Anulare transfer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCancel = await hasPermission(session.user.id, "transfers.cancel");
    if (!canCancel) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Obține transferul
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferul nu a fost găsit" }, { status: 404 });
    }

    if (transfer.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Nu poți anula un transfer deja completat" },
        { status: 400 }
      );
    }

    if (transfer.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Transferul este deja anulat" },
        { status: 400 }
      );
    }

    // Verifică accesul la depozitul sursă
    const hasAccess = await hasWarehouseAccess(session.user.id, transfer.fromWarehouseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Nu ai acces la depozitul sursă" }, { status: 403 });
    }

    // Anulează transferul
    const cancelledTransfer = await prisma.warehouseTransfer.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      include: {
        fromWarehouse: {
          select: { id: true, code: true, name: true },
        },
        toWarehouse: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transfer: cancelledTransfer,
    });
  } catch (error) {
    console.error("Error cancelling transfer:", error);
    return NextResponse.json(
      { error: "Eroare la anularea transferului" },
      { status: 500 }
    );
  }
}
