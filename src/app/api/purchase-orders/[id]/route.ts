import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// Using any type until Prisma client is regenerated with new models
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// GET - O singura precomanda
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { id } = await params;

    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
        labels: {
          orderBy: { createdAt: "asc" },
        },
        receptionReports: {
          select: {
            id: true,
            reportNumber: true,
            status: true,
            createdAt: true,
          },
        },
        supplierInvoices: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: unknown) {
    console.error("Error fetching purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la citirea precomenzii";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// PUT - Actualizare precomanda (doar DRAFT)
export async function PUT(
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
    const body = await request.json();
    const {
      supplierId,
      expectedDate,
      notes,
      items,
    } = body;

    // Verificam daca precomanda exista si este DRAFT
    const existing = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: "Doar precomenzile in status DRAFT pot fi modificate",
      }, { status: 400 });
    }

    // Validari
    if (!supplierId) {
      return NextResponse.json({
        success: false,
        error: "Furnizorul este obligatoriu",
      }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Adaugati cel putin un produs",
      }, { status: 400 });
    }

    // Calculam totalurile
    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    if (items && items.length > 0) {
      totalItems = items.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of items as any[]) {
        const qty = Number(item.quantityOrdered) || 0;
        const price = Number(item.unitPrice) || 0;
        totalQuantity += qty;
        totalValue += qty * price;
      }
    }

    // Stergem liniile existente
    await db.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    // Actualizam precomanda
    const order = await db.purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        totalItems,
        totalQuantity,
        totalValue,
        items: items?.length > 0 ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: items.map((item: any) => ({
            inventoryItemId: item.inventoryItemId,
            quantityOrdered: Number(item.quantityOrdered) || 0,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
            totalPrice: item.unitPrice
              ? (Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0)
              : null,
            notes: item.notes || null,
          })),
        } : undefined,
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
    });
  } catch (error: unknown) {
    console.error("Error updating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la actualizarea precomenzii";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// DELETE - Stergere precomanda (doar DRAFT)
export async function DELETE(
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

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: "Doar precomenzile in status DRAFT pot fi sterse",
      }, { status: 400 });
    }

    await db.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Precomanda a fost stearsa",
    });
  } catch (error: unknown) {
    console.error("Error deleting purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la stergerea precomenzii";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
