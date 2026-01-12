import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Detalii recepție
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = params;

    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                currentStock: true,
                costPrice: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({
        success: false,
        error: "Recepția nu a fost găsită",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: receipt,
    });
  } catch (error: any) {
    console.error("Error fetching goods receipt:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea recepției",
    }, { status: 500 });
  }
}
