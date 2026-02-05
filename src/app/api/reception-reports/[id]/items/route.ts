import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ReceptionReportStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

/**
 * GET - Lista linii raport receptie
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

    // Verificam raportul
    const report = await prisma.receptionReport.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    const items = await prisma.receptionReportItem.findMany({
      where: { receptionReportId: id },
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
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Error fetching reception report items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la citirea liniilor raportului",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Batch update linii raport receptie
 * Actualizeaza quantityReceived, verified, observations
 * Calculeaza automat hasDifference si hasDifferences pe raport
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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Lista de articole este obligatorie" },
        { status: 400 }
      );
    }

    // Verificam raportul
    const report = await prisma.receptionReport.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Doar DESCHIS sau IN_COMPLETARE pot fi modificate
    if (
      report.status !== ReceptionReportStatus.DESCHIS &&
      report.status !== ReceptionReportStatus.IN_COMPLETARE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Raportul nu poate fi modificat in status ${report.status}`,
        },
        { status: 400 }
      );
    }

    // Validam liniile si detectam diferentele
    const errors: string[] = [];
    const updatedItems: Array<{
      itemId: string;
      quantityReceived: number | null;
      verified: boolean;
      observations: string | null;
      hasDifference: boolean;
    }> = [];

    for (const item of items) {
      const { itemId, quantityReceived, verified, observations } = item;

      // Gasim linia existenta
      const existingItem = report.items.find((i) => i.id === itemId);
      if (!existingItem) {
        errors.push(`Linia ${itemId} nu a fost gasita in raport`);
        continue;
      }

      // Calculam daca exista diferenta
      let hasDifference = false;
      if (quantityReceived !== null && quantityReceived !== undefined) {
        const expected = Number(existingItem.quantityExpected);
        const received = Number(quantityReceived);
        hasDifference = expected !== received;

        // Daca exista diferenta, observatiile sunt obligatorii
        if (hasDifference && (!observations || observations.trim() === "")) {
          const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: existingItem.inventoryItemId },
            select: { sku: true },
          });
          errors.push(
            `Observatii obligatorii pentru ${inventoryItem?.sku || existingItem.inventoryItemId} (diferenta: asteptat ${expected}, primit ${received})`
          );
        }
      }

      updatedItems.push({
        itemId,
        quantityReceived:
          quantityReceived !== undefined ? quantityReceived : null,
        verified: verified ?? false,
        observations: observations || null,
        hasDifference,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join("; "),
          errors,
        },
        { status: 400 }
      );
    }

    // Actualizam liniile si raportul in tranzactie
    const result = await prisma.$transaction(async (tx) => {
      // Actualizam fiecare linie
      for (const item of updatedItems) {
        await tx.receptionReportItem.update({
          where: { id: item.itemId },
          data: {
            quantityReceived:
              item.quantityReceived !== null
                ? new Decimal(item.quantityReceived)
                : null,
            verified: item.verified,
            observations: item.observations,
            hasDifference: item.hasDifference,
          },
        });
      }

      // Verificam daca exista diferente pe intregul raport
      const allItems = await tx.receptionReportItem.findMany({
        where: { receptionReportId: id },
      });

      const hasDifferences = allItems.some((i) => i.hasDifference);

      // Determinam noul status
      let newStatus = report.status;
      if (report.status === ReceptionReportStatus.DESCHIS) {
        // Daca s-a inceput completarea, trecem in IN_COMPLETARE
        const hasAnyData = allItems.some(
          (i) => i.quantityReceived !== null || i.verified
        );
        if (hasAnyData) {
          newStatus = ReceptionReportStatus.IN_COMPLETARE;
        }
      }

      // Actualizam raportul
      const updatedReport = await tx.receptionReport.update({
        where: { id },
        data: {
          hasDifferences,
          status: newStatus,
        },
        include: {
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
        },
      });

      return updatedReport;
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      hasDifferences: result.hasDifferences,
      status: result.status,
      message: "Liniile au fost actualizate cu succes",
    });
  } catch (error: any) {
    console.error("Error updating reception report items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la actualizarea liniilor raportului",
      },
      { status: 500 }
    );
  }
}
