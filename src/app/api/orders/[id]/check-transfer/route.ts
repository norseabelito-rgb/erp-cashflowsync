import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

interface TransferCheckResponse {
  orderId: string;
  orderNumber: string;
  hasUnfinishedTransfer: boolean;
  transfer?: {
    id: string;
    transferNumber: string;
    status: string;
    createdAt: string;
  };
  message?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Verificam autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Verificam permisiunea de vizualizare comenzi (sau facturi)
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzi" },
        { status: 403 }
      );
    }

    // Obtinem comanda cu informatii despre transfer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        shopifyOrderNumber: true,
        requiredTransferId: true,
        requiredTransfer: {
          select: {
            id: true,
            transferNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Comanda nu a fost gasita" },
        { status: 404 }
      );
    }

    // Determinam daca are transfer nefinalizat
    const hasUnfinishedTransfer = !!(
      order.requiredTransferId &&
      order.requiredTransfer &&
      order.requiredTransfer.status !== "COMPLETED"
    );

    const response: TransferCheckResponse = {
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      hasUnfinishedTransfer,
    };

    if (hasUnfinishedTransfer && order.requiredTransfer) {
      response.transfer = {
        id: order.requiredTransfer.id,
        transferNumber: order.requiredTransfer.transferNumber,
        status: order.requiredTransfer.status,
        createdAt: order.requiredTransfer.createdAt.toISOString(),
      };
      response.message = `Atentie! Transferul #${order.requiredTransfer.transferNumber} nu e finalizat. Risc de eroare la facturare.`;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error checking transfer status:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la verificarea transferului" },
      { status: 500 }
    );
  }
}
