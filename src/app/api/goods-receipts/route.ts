import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { GoodsReceiptStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// Generare număr NIR
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Găsim ultimul NIR din această lună
  const lastReceipt = await prisma.goodsReceipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: `NIR-${year}${month}`,
      },
    },
    orderBy: {
      receiptNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastReceipt) {
    const lastNum = parseInt(lastReceipt.receiptNumber.split("-")[2]);
    nextNumber = lastNum + 1;
  }

  return `NIR-${year}${month}-${String(nextNumber).padStart(4, "0")}`;
}

// GET - Lista recepțiilor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: "insensitive" } },
        { documentNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      // Handle comma-separated status values
      if (status.includes(",")) {
        const statuses = status.split(",").filter(s =>
          Object.values(GoodsReceiptStatus).includes(s as GoodsReceiptStatus)
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

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
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
              item: {
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
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);

    // Statistici
    const stats = await prisma.goodsReceipt.groupBy({
      by: ["status"],
      _count: true,
    });

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        receipts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total,
          draft: statsMap.DRAFT || 0,
          completed: statsMap.COMPLETED || 0,
          cancelled: statsMap.CANCELLED || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching goods receipts:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea recepțiilor",
    }, { status: 500 });
  }
}

// POST - Creare recepție nouă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const {
      supplierId,
      documentNumber,
      documentDate,
      notes,
      items, // Array de { itemId, quantity, unitCost, lotNumber }
    } = body;

    // Generăm număr NIR
    const receiptNumber = await generateReceiptNumber();

    // Calculăm totalurile
    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    if (items && items.length > 0) {
      totalItems = items.length;
      for (const item of items) {
        totalQuantity += Number(item.quantity) || 0;
        totalValue += (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
      }
    }

    // Creăm recepția cu liniile
    const receipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber,
        supplierId: supplierId || null,
        documentNumber,
        documentDate: documentDate ? new Date(documentDate) : null,
        notes,
        totalItems,
        totalQuantity,
        totalValue,
        createdBy: session.user.id,
        createdByName: session.user.name || session.user.email,
        items: items?.length > 0 ? {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitCost: item.unitCost || null,
            totalCost: (Number(item.quantity) || 0) * (Number(item.unitCost) || 0) || null,
            lotNumber: item.lotNumber || null,
            notes: item.notes || null,
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: receipt,
    });
  } catch (error: any) {
    console.error("Error creating goods receipt:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la crearea recepției",
    }, { status: 500 });
  }
}

// PUT - Actualizare recepție (doar DRAFT)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      supplierId,
      documentNumber,
      documentDate,
      notes,
      items,
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul recepției este obligatoriu",
      }, { status: 400 });
    }

    // Verificăm dacă recepția există și este DRAFT
    const existing = await prisma.goodsReceipt.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Recepția nu a fost găsită",
      }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: "Doar recepțiile în status DRAFT pot fi modificate",
      }, { status: 400 });
    }

    // Calculăm totalurile
    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    if (items && items.length > 0) {
      totalItems = items.length;
      for (const item of items) {
        totalQuantity += Number(item.quantity) || 0;
        totalValue += (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
      }
    }

    // Ștergem liniile existente
    await prisma.goodsReceiptItem.deleteMany({
      where: { receiptId: id },
    });

    // Actualizăm recepția
    const receipt = await prisma.goodsReceipt.update({
      where: { id },
      data: {
        supplierId: supplierId || null,
        documentNumber,
        documentDate: documentDate ? new Date(documentDate) : null,
        notes,
        totalItems,
        totalQuantity,
        totalValue,
        items: items?.length > 0 ? {
          create: items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitCost: item.unitCost || null,
            totalCost: (Number(item.quantity) || 0) * (Number(item.unitCost) || 0) || null,
            lotNumber: item.lotNumber || null,
            notes: item.notes || null,
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: receipt,
    });
  } catch (error: any) {
    console.error("Error updating goods receipt:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la actualizarea recepției",
    }, { status: 500 });
  }
}

// DELETE - Ștergere recepție (doar DRAFT)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul recepției este obligatoriu",
      }, { status: 400 });
    }

    const existing = await prisma.goodsReceipt.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: "Recepția nu a fost găsită",
      }, { status: 404 });
    }

    if (existing.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: "Doar recepțiile în status DRAFT pot fi șterse",
      }, { status: 400 });
    }

    await prisma.goodsReceipt.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Recepția a fost ștearsă",
    });
  } catch (error: any) {
    console.error("Error deleting goods receipt:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la ștergerea recepției",
    }, { status: 500 });
  }
}
