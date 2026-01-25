import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

interface OrderTransferStatus {
  orderId: string;
  orderNumber: string;
  hasUnfinishedTransfer: boolean;
  transferNumber?: string;
  transferStatus?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificam autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Verificam permisiunea
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Specifica cel putin un orderId" },
        { status: 400 }
      );
    }

    // Limitam la 100 comenzi per request
    const limitedIds = orderIds.slice(0, 100);

    const orders = await prisma.order.findMany({
      where: { id: { in: limitedIds } },
      select: {
        id: true,
        shopifyOrderNumber: true,
        requiredTransferId: true,
        requiredTransfer: {
          select: {
            transferNumber: true,
            status: true,
          },
        },
      },
    });

    const results: OrderTransferStatus[] = orders.map((order) => {
      const hasUnfinishedTransfer = !!(
        order.requiredTransferId &&
        order.requiredTransfer &&
        order.requiredTransfer.status !== "COMPLETED"
      );

      return {
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        hasUnfinishedTransfer,
        ...(hasUnfinishedTransfer && order.requiredTransfer
          ? {
              transferNumber: order.requiredTransfer.transferNumber,
              transferStatus: order.requiredTransfer.status,
            }
          : {}),
      };
    });

    // Count how many have unfinished transfers
    const withPendingTransfer = results.filter((r) => r.hasUnfinishedTransfer);

    return NextResponse.json({
      orders: results,
      summary: {
        total: results.length,
        withPendingTransfer: withPendingTransfer.length,
        readyForInvoice: results.length - withPendingTransfer.length,
      },
    });
  } catch (error: any) {
    console.error("Error checking transfers:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la verificarea transferurilor" },
      { status: 500 }
    );
  }
}
