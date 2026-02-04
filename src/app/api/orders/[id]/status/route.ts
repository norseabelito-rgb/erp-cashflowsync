import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// PATCH - Update order's internal status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "orders.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a edita comenzi" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { internalStatusId } = body;

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, shopifyOrderNumber: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Comanda nu exista" },
        { status: 404 }
      );
    }

    // If internalStatusId is provided, verify it exists
    if (internalStatusId !== null && internalStatusId !== undefined) {
      const status = await prisma.internalOrderStatus.findUnique({
        where: { id: internalStatusId },
      });

      if (!status) {
        return NextResponse.json(
          { error: "Statusul intern nu exista" },
          { status: 400 }
        );
      }

      if (!status.isActive) {
        return NextResponse.json(
          { error: "Statusul intern este dezactivat" },
          { status: 400 }
        );
      }
    }

    // Update order with new internal status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        internalStatusId: internalStatusId === "" ? null : internalStatusId ?? null,
      },
      include: {
        internalStatus: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        shopifyOrderNumber: updatedOrder.shopifyOrderNumber,
        internalStatusId: updatedOrder.internalStatusId,
        internalStatus: updatedOrder.internalStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Error updating order status:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Eroare la actualizarea statusului comenzii", details: message },
      { status: 500 }
    );
  }
}
