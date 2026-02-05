import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { generateLabelCode } from "@/lib/document-numbering";

export const dynamic = 'force-dynamic';

// Using any type until Prisma client is regenerated with new models
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// GET - Lista etichete pentru o precomanda
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

    // Verificam daca precomanda exista
    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
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

    // Obtinem etichetele
    const labels = await db.purchaseOrderLabel.findMany({
      where: { purchaseOrderId: id },
      orderBy: { createdAt: "asc" },
    });

    // Mapam etichetele cu informatii suplimentare
    const labelsWithDetails = labels.map((label: {
      id: string;
      labelCode: string;
      printed: boolean;
      printedAt: Date | null;
      printedBy: string | null;
      createdAt: Date;
    }) => ({
      ...label,
      purchaseOrder: {
        documentNumber: order.documentNumber,
        supplier: order.supplier,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        labels: labelsWithDetails,
        purchaseOrder: {
          id: order.id,
          documentNumber: order.documentNumber,
          status: order.status,
          supplier: order.supplier,
          itemCount: order.items.length,
        },
        stats: {
          total: labels.length,
          printed: labels.filter((l: { printed: boolean }) => l.printed).length,
          notPrinted: labels.filter((l: { printed: boolean }) => !l.printed).length,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching labels:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la citirea etichetelor";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// POST - Generare etichete pentru precomanda aprobata
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
    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
          },
        },
        labels: true,
      },
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    // Verificam statusul - doar APROBATA sau IN_RECEPTIE permit generare etichete
    if (order.status !== "APROBATA" && order.status !== "IN_RECEPTIE") {
      return NextResponse.json({
        success: false,
        error: "Etichetele pot fi generate doar pentru precomenzile aprobate sau in receptie",
      }, { status: 400 });
    }

    // Verificam daca exista deja etichete
    if (order.labels && order.labels.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Etichetele au fost deja generate pentru aceasta precomanda",
        existingLabels: order.labels.length,
      }, { status: 400 });
    }

    // Verificam ca are articole
    if (!order.items || order.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu are articole",
      }, { status: 400 });
    }

    // Generam etichete - una pentru fiecare linie de articol
    const labelsToCreate = order.items.map((item: {
      id: string;
      inventoryItemId: string;
      inventoryItem: { sku: string; name: string };
      quantityOrdered: number;
    }) => ({
      purchaseOrderId: id,
      labelCode: generateLabelCode(id),
    }));

    // Cream etichetele in baza de date
    await db.purchaseOrderLabel.createMany({
      data: labelsToCreate,
    });

    // Obtinem etichetele create cu toate detaliile
    const createdLabels = await db.purchaseOrderLabel.findMany({
      where: { purchaseOrderId: id },
      orderBy: { createdAt: "asc" },
    });

    // Combinam etichetele cu informatii despre articole
    const labelsWithItemInfo = createdLabels.map((label: {
      id: string;
      labelCode: string;
      printed: boolean;
      printedAt: Date | null;
      printedBy: string | null;
      createdAt: Date;
    }, index: number) => {
      const item = order.items[index];
      return {
        ...label,
        item: item ? {
          sku: item.inventoryItem?.sku,
          name: item.inventoryItem?.name,
          quantity: item.quantityOrdered,
        } : null,
        purchaseOrder: {
          documentNumber: order.documentNumber,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        labels: labelsWithItemInfo,
        count: createdLabels.length,
      },
      message: `${createdLabels.length} etichete au fost generate`,
    });
  } catch (error: unknown) {
    console.error("Error generating labels:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la generarea etichetelor";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// PUT - Marcare etichete ca printate
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
    const { labelIds } = body;

    if (!labelIds || !Array.isArray(labelIds) || labelIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Specificati cel putin o eticheta",
      }, { status: 400 });
    }

    // Verificam daca precomanda exista
    const order = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        error: "Precomanda nu a fost gasita",
      }, { status: 404 });
    }

    // Actualizam etichetele
    const updateResult = await db.purchaseOrderLabel.updateMany({
      where: {
        id: { in: labelIds },
        purchaseOrderId: id,
        printed: false, // Doar cele neprintate
      },
      data: {
        printed: true,
        printedAt: new Date(),
        printedBy: session.user.id,
      },
    });

    // Obtinem etichetele actualizate
    const updatedLabels = await db.purchaseOrderLabel.findMany({
      where: {
        id: { in: labelIds },
        purchaseOrderId: id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        labels: updatedLabels,
        updated: updateResult.count,
      },
      message: `${updateResult.count} etichete au fost marcate ca printate`,
    });
  } catch (error: unknown) {
    console.error("Error updating labels:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la actualizarea etichetelor";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
