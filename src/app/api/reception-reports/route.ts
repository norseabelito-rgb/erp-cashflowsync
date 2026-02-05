import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { PurchaseOrderStatus, ReceptionReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Genereaza numar PV: PV-DD/MM/YYYY-NNNN
 */
async function generateReportNumber(): Promise<string> {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const prefix = `PV-${day}/${month}/${year}`;

  // Gasim ultimul PV din aceasta zi
  const lastReport = await prisma.receptionReport.findFirst({
    where: {
      reportNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      reportNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastReport) {
    const parts = lastReport.reportNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * GET - Lista rapoarte receptie
 * Filter by: status, purchaseOrderId, warehouseUserId
 * Search by: reportNumber, purchaseOrder.documentNumber
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as ReceptionReportStatus | null;
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const warehouseUserId = searchParams.get("warehouseUserId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (search) {
      where.OR = [
        { reportNumber: { contains: search, mode: "insensitive" } },
        {
          purchaseOrder: {
            documentNumber: { contains: search, mode: "insensitive" },
          },
        },
        {
          purchaseOrder: {
            supplier: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (warehouseUserId) {
      where.warehouseUserId = warehouseUserId;
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.receptionReport.findMany({
        where,
        include: {
          purchaseOrder: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplierInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          _count: {
            select: {
              items: true,
              photos: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.receptionReport.count({ where }),
    ]);

    // Statistici per status
    const stats = await prisma.receptionReport.groupBy({
      by: ["status"],
      _count: true,
    });

    const statsMap = stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total,
          deschis: statsMap.DESCHIS || 0,
          inCompletare: statsMap.IN_COMPLETARE || 0,
          finalizat: statsMap.FINALIZAT || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching reception reports:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la citirea rapoartelor de receptie",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Creeaza raport receptie din precomanda
 * Auto-copiaza liniile din PurchaseOrderItem in ReceptionReportItem
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { purchaseOrderId, supplierInvoiceId } = body;

    if (!purchaseOrderId) {
      return NextResponse.json(
        { success: false, error: "ID-ul precomenzii este obligatoriu" },
        { status: 400 }
      );
    }

    // Verificam precomanda
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
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
        supplier: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, error: "Precomanda nu a fost gasita" },
        { status: 404 }
      );
    }

    // Status valid: APROBATA sau IN_RECEPTIE
    if (
      purchaseOrder.status !== PurchaseOrderStatus.APROBATA &&
      purchaseOrder.status !== PurchaseOrderStatus.IN_RECEPTIE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Precomanda trebuie sa fie in status APROBATA sau IN_RECEPTIE. Status actual: ${purchaseOrder.status}`,
        },
        { status: 400 }
      );
    }

    // Verificam daca nu exista deja un raport deschis pentru aceasta precomanda
    const existingOpenReport = await prisma.receptionReport.findFirst({
      where: {
        purchaseOrderId,
        status: {
          in: [ReceptionReportStatus.DESCHIS, ReceptionReportStatus.IN_COMPLETARE],
        },
      },
    });

    if (existingOpenReport) {
      return NextResponse.json(
        {
          success: false,
          error: `Exista deja un raport de receptie deschis pentru aceasta precomanda: ${existingOpenReport.reportNumber}`,
        },
        { status: 400 }
      );
    }

    // Verificam factura furnizor daca este specificata
    if (supplierInvoiceId) {
      const supplierInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: supplierInvoiceId },
      });
      if (!supplierInvoice) {
        return NextResponse.json(
          { success: false, error: "Factura furnizor nu a fost gasita" },
          { status: 404 }
        );
      }
    }

    // Generam numar raport
    const reportNumber = await generateReportNumber();

    // Cream raportul cu liniile copiate din precomanda
    const report = await prisma.$transaction(async (tx) => {
      // Cream raportul
      const newReport = await tx.receptionReport.create({
        data: {
          reportNumber,
          purchaseOrderId,
          supplierInvoiceId: supplierInvoiceId || null,
          warehouseUserId: session.user.id,
          warehouseUserName: session.user.name || session.user.email || "Unknown",
          status: ReceptionReportStatus.DESCHIS,
          hasDifferences: false,
          items: {
            create: purchaseOrder.items.map((item) => ({
              inventoryItemId: item.inventoryItemId,
              quantityExpected: item.quantityOrdered,
              quantityReceived: null,
              verified: false,
              hasDifference: false,
            })),
          },
        },
        include: {
          purchaseOrder: {
            include: {
              supplier: true,
            },
          },
          supplierInvoice: true,
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
          photos: true,
        },
      });

      // Update PO status to IN_RECEPTIE daca era APROBATA
      if (purchaseOrder.status === PurchaseOrderStatus.APROBATA) {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: PurchaseOrderStatus.IN_RECEPTIE },
        });
      }

      return newReport;
    });

    return NextResponse.json({
      success: true,
      data: report,
      message: `Raport de receptie ${reportNumber} creat cu succes`,
    });
  } catch (error: any) {
    console.error("Error creating reception report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la crearea raportului de receptie",
      },
      { status: 500 }
    );
  }
}
