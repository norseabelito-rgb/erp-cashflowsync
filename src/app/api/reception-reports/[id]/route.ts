import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { PurchaseOrderStatus, ReceptionReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET - Detalii raport receptie cu toate relatiile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const report = await prisma.receptionReport.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
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
                    costPrice: true,
                  },
                },
              },
            },
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
                costPrice: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        photos: {
          orderBy: [{ category: "asc" }, { createdAt: "asc" }],
        },
        goodsReceipt: {
          select: {
            id: true,
            receiptNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Error fetching reception report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la citirea raportului de receptie",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Actualizeaza metadata raport receptie
 * Doar pentru status DESCHIS sau IN_COMPLETARE
 * Poate actualiza: supplierInvoiceId, signatureConfirmed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await request.json();
    const { supplierInvoiceId, signatureConfirmed } = body;

    // Verificam raportul
    const existing = await prisma.receptionReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Doar DESCHIS sau IN_COMPLETARE pot fi modificate
    if (
      existing.status !== ReceptionReportStatus.DESCHIS &&
      existing.status !== ReceptionReportStatus.IN_COMPLETARE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Raportul nu poate fi modificat in status ${existing.status}`,
        },
        { status: 400 }
      );
    }

    // Verificam factura furnizor daca se schimba
    if (supplierInvoiceId !== undefined && supplierInvoiceId !== null) {
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

    // Actualizam raportul
    const updateData: any = {};
    if (supplierInvoiceId !== undefined) {
      updateData.supplierInvoiceId = supplierInvoiceId || null;
    }
    if (signatureConfirmed !== undefined) {
      updateData.signatureConfirmed = signatureConfirmed;
    }

    const report = await prisma.receptionReport.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      data: report,
      message: "Raportul a fost actualizat cu succes",
    });
  } catch (error: any) {
    console.error("Error updating reception report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la actualizarea raportului de receptie",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Sterge raport receptie
 * Doar pentru status DESCHIS
 * Reverteste status PO daca nu mai exista alte rapoarte
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Verificam raportul
    const existing = await prisma.receptionReport.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Doar DESCHIS pot fi sterse
    if (existing.status !== ReceptionReportStatus.DESCHIS) {
      return NextResponse.json(
        {
          success: false,
          error: `Doar rapoartele in status DESCHIS pot fi sterse. Status actual: ${existing.status}`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Stergem raportul (cascade sterge items si photos)
      await tx.receptionReport.delete({
        where: { id },
      });

      // Verificam daca mai exista alte rapoarte pentru aceasta precomanda
      const otherReports = await tx.receptionReport.count({
        where: {
          purchaseOrderId: existing.purchaseOrderId,
        },
      });

      // Daca nu mai exista, revertim statusul PO la APROBATA
      if (
        otherReports === 0 &&
        existing.purchaseOrder.status === PurchaseOrderStatus.IN_RECEPTIE
      ) {
        await tx.purchaseOrder.update({
          where: { id: existing.purchaseOrderId },
          data: { status: PurchaseOrderStatus.APROBATA },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Raportul de receptie a fost sters",
    });
  } catch (error: any) {
    console.error("Error deleting reception report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la stergerea raportului de receptie",
      },
      { status: 500 }
    );
  }
}
