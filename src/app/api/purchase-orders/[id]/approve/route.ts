import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// Using any type until Prisma client is regenerated with new models
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// POST - Aprobare precomanda (DRAFT -> APROBATA)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { id } = await params;

    // Verificam daca precomanda exista
    const existing = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    // Verificam statusul
    if (existing.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: "Doar precomenzile in status DRAFT pot fi aprobate",
      }, { status: 400 });
    }

    // Verificam ca are furnizor
    if (!existing.supplierId) {
      return NextResponse.json({
        success: false,
        error: "Furnizorul este obligatoriu pentru aprobare",
      }, { status: 400 });
    }

    // Verificam ca are cel putin un produs
    if (!existing.items || existing.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Adaugati cel putin un produs pentru aprobare",
      }, { status: 400 });
    }

    // Aprobam precomanda
    const order = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: "APROBATA",
        approvedBy: session.user.id,
        approvedByName: session.user.name || session.user.email || "Unknown",
        approvedAt: new Date(),
      },
      include: {
        supplier: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "Precomanda a fost aprobata",
    });
  } catch (error: unknown) {
    console.error("Error approving purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la aprobarea precomenzii";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
