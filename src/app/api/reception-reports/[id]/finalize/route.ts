import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  PhotoCategory,
  ReceptionReportStatus,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

/**
 * Genereaza numar NIR: NIR-DD/MM/YYYY-NNNN
 */
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const prefix = `NIR-${day}/${month}/${year}`;

  // Gasim ultimul NIR din aceasta zi
  const lastReceipt = await prisma.goodsReceipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastReceipt) {
    const parts = lastReceipt.receiptNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * POST - Finalizeaza raport receptie si genereaza NIR
 *
 * Validari (V4, V5, V6 din spec):
 * 1. Toate liniile au quantityReceived completat
 * 2. Toate liniile sunt verified = true
 * 3. Liniile cu hasDifference au observations
 * 4. Poze obligatorii: OVERVIEW, ETICHETE, FACTURA
 * 5. Daca exista "deteriora" in observatii, poza DETERIORARI obligatorie
 * 6. supplierInvoiceId setat
 * 7. signatureConfirmed = true
 */
export async function POST(
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

    // Incarcam raportul cu toate relatiile
    const report = await prisma.receptionReport.findUnique({
      where: { id },
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
                costPrice: true,
              },
            },
          },
        },
        photos: true,
        goodsReceipt: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Verificam daca nu este deja finalizat
    if (report.status === ReceptionReportStatus.FINALIZAT) {
      return NextResponse.json(
        {
          success: false,
          error: "Raportul este deja finalizat",
          nirNumber: report.goodsReceipt?.receiptNumber,
        },
        { status: 400 }
      );
    }

    // Verificam daca nu exista deja un NIR pentru acest raport
    if (report.goodsReceipt) {
      return NextResponse.json(
        {
          success: false,
          error: `NIR ${report.goodsReceipt.receiptNumber} a fost deja generat pentru acest raport`,
        },
        { status: 400 }
      );
    }

    // Validam statusul - trebuie sa fie DESCHIS sau IN_COMPLETARE
    if (
      report.status !== ReceptionReportStatus.DESCHIS &&
      report.status !== ReceptionReportStatus.IN_COMPLETARE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Raportul nu poate fi finalizat in status ${report.status}`,
        },
        { status: 400 }
      );
    }

    // ============================================
    // VALIDARI
    // ============================================
    const errors: string[] = [];

    // V1: Toate liniile au quantityReceived completat
    const itemsWithoutQuantity = report.items.filter(
      (item) => item.quantityReceived === null
    );
    if (itemsWithoutQuantity.length > 0) {
      errors.push("Completati cantitatea primita pentru toate produsele");
    }

    // V2: Toate liniile sunt verified = true
    const unverifiedItems = report.items.filter((item) => !item.verified);
    if (unverifiedItems.length > 0) {
      const skus = unverifiedItems
        .map((i) => i.inventoryItem.sku)
        .join(", ");
      errors.push(`Verificati toate liniile. Neverificate: ${skus}`);
    }

    // V3: Liniile cu hasDifference au observations
    const itemsWithDifferenceNoObs = report.items.filter(
      (item) =>
        item.hasDifference && (!item.observations || item.observations.trim() === "")
    );
    if (itemsWithDifferenceNoObs.length > 0) {
      const skus = itemsWithDifferenceNoObs
        .map((i) => i.inventoryItem.sku)
        .join(", ");
      errors.push(`Completati observatii pentru: ${skus}`);
    }

    // V4: Poze obligatorii
    const photoCategories = new Set(report.photos.map((p) => p.category));
    const requiredPhotos: PhotoCategory[] = [
      PhotoCategory.OVERVIEW,
      PhotoCategory.ETICHETE,
      PhotoCategory.FACTURA,
    ];

    for (const required of requiredPhotos) {
      if (!photoCategories.has(required)) {
        const categoryNames: Record<string, string> = {
          OVERVIEW: "overview (general)",
          ETICHETE: "etichete",
          FACTURA: "factura",
        };
        errors.push(`Lipseste poza ${categoryNames[required] || required}`);
      }
    }

    // V5: Daca exista "deteriora" in observatii, poza DETERIORARI obligatorie
    const hasDeteriorationNotes = report.items.some(
      (item) =>
        item.observations &&
        item.observations.toLowerCase().includes("deteriora")
    );
    if (hasDeteriorationNotes && !photoCategories.has(PhotoCategory.DETERIORARI)) {
      errors.push("Exista deteriorari notate - poza obligatorie");
    }

    // V6: supplierInvoiceId setat
    if (!report.supplierInvoiceId) {
      errors.push("Factura furnizor este obligatorie");
    }

    // V7: signatureConfirmed = true
    if (!report.signatureConfirmed) {
      errors.push("Confirmati semnatura gestionar");
    }

    // Daca exista erori, returnam toate
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join(". "),
          errors,
          validationFailed: true,
        },
        { status: 400 }
      );
    }

    // ============================================
    // CREARE NIR IN TRANZACTIE
    // ============================================
    const result = await prisma.$transaction(async (tx) => {
      // Generam numar NIR
      const receiptNumber = await generateReceiptNumber();

      // Calculam totaluri
      let totalItems = report.items.length;
      let totalQuantity = new Decimal(0);
      let totalValue = new Decimal(0);

      const nirItems = report.items.map((item) => {
        const quantity = item.quantityReceived!;
        const unitCost = item.inventoryItem.costPrice || new Decimal(0);
        const itemTotalCost = new Decimal(quantity.toString()).mul(unitCost);

        totalQuantity = totalQuantity.add(quantity);
        totalValue = totalValue.add(itemTotalCost);

        return {
          itemId: item.inventoryItemId,
          quantity,
          unitCost,
          totalCost: itemTotalCost,
          notes: item.observations,
        };
      });

      // Cream NIR (GoodsReceipt)
      const nir = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          supplierId: report.purchaseOrder.supplierId,
          supplierInvoiceId: report.supplierInvoiceId,
          receptionReportId: report.id,
          status: GoodsReceiptStatus.GENERAT,
          hasDifferences: report.hasDifferences,
          totalItems,
          totalQuantity,
          totalValue,
          createdBy: session.user.id,
          createdByName: session.user.name || session.user.email || "Unknown",
          // Document info from supplier invoice
          documentNumber: report.supplierInvoice?.invoiceNumber || null,
          documentDate: report.supplierInvoice?.invoiceDate || null,
        },
      });

      // Cream liniile NIR
      for (const item of nirItems) {
        await tx.goodsReceiptItem.create({
          data: {
            receiptId: nir.id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes,
          },
        });
      }

      // Actualizam raportul de receptie
      await tx.receptionReport.update({
        where: { id },
        data: {
          status: ReceptionReportStatus.FINALIZAT,
          finalizedAt: new Date(),
          finalizedBy: session.user.id,
          finalizedByName: session.user.name || session.user.email || "Unknown",
        },
      });

      // Actualizam statusul precomenzii
      await tx.purchaseOrder.update({
        where: { id: report.purchaseOrderId },
        data: { status: PurchaseOrderStatus.RECEPTIONATA },
      });

      // Returnam NIR-ul creat cu toate detaliile
      return tx.goodsReceipt.findUnique({
        where: { id: nir.id },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
          supplierInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          receptionReport: {
            select: {
              id: true,
              reportNumber: true,
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
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `NIR ${result?.receiptNumber} generat cu succes`,
    });
  } catch (error: any) {
    console.error("Error finalizing reception report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la finalizarea raportului de receptie",
      },
      { status: 500 }
    );
  }
}
