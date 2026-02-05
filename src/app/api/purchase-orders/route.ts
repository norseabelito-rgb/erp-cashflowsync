import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { PurchaseOrderStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// GET - Lista precomenzilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { documentNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      // Handle comma-separated status values
      if (status.includes(",")) {
        const statuses = status.split(",").filter(s =>
          Object.values(PurchaseOrderStatus).includes(s as PurchaseOrderStatus)
        );
        if (statuses.length > 0) {
          where.status = { in: statuses };
        }
      } else {
        where.status = status;
      }
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const skip = (page - 1) * limit;

    // Using any type until Prisma client is regenerated with new models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
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
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
              labels: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    // Statistici
    const stats = await db.purchaseOrder.groupBy({
      by: ["status"],
      _count: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsMap = stats.reduce((acc: Record<string, number>, s: any) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total,
          draft: statsMap.DRAFT || 0,
          aprobata: statsMap.APROBATA || 0,
          inReceptie: statsMap.IN_RECEPTIE || 0,
          receptionata: statsMap.RECEPTIONATA || 0,
          anulata: statsMap.ANULATA || 0,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching purchase orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la citirea precomenzilor";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// POST - Creare precomanda noua
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const body = await request.json();
    const {
      supplierId,
      expectedDate,
      notes,
      items, // Array de { inventoryItemId, quantityOrdered, unitPrice }
    } = body;

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

    // Generam numar document
    const documentNumber = await generateDocumentNumber('PC');

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

    // Using any type until Prisma client is regenerated with new models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;

    // Cream precomanda cu liniile
    const order = await db.purchaseOrder.create({
      data: {
        documentNumber,
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        totalItems,
        totalQuantity,
        totalValue,
        createdBy: session.user.id,
        createdByName: session.user.name || session.user.email || "Unknown",
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
    console.error("Error creating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare la crearea precomenzii";
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
