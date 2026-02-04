import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/db";
import ExcelJS from "exceljs";

/**
 * GET /api/returns/export
 * Exportă retururile în format Excel
 *
 * Query params:
 * - startDate: Data de început (YYYY-MM-DD)
 * - endDate: Data de sfârșit (YYYY-MM-DD)
 * - date: Data specifică (YYYY-MM-DD) - alternativă la interval
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canExport = await hasPermission(session.user.id, "handover.scan");
    if (!canExport) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a exporta retururi" },
        { status: 403 }
      );
    }

    // Parametri
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Determinăm intervalul de date
    let startDate: Date;
    let endDate: Date;

    if (dateStr) {
      // O singură zi specificată
      startDate = new Date(dateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateStr);
      endDate.setHours(23, 59, 59, 999);
    } else if (startDateStr && endDateStr) {
      // Interval specificat
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: ultima lună
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // Validare date
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: "Date invalide",
      }, { status: 400 });
    }

    // Query retururile din perioada specificată
    const returns = await prisma.returnAWB.findMany({
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        originalAwb: true,
        order: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            customerFirstName: true,
            customerLastName: true,
            totalPrice: true,
            shippingCity: true,
          },
        },
      },
      orderBy: {
        scannedAt: "desc",
      },
    });

    // Query mișcările de stoc pentru retururi
    const returnIds = returns.map(r => r.id);
    const stockMovements = returnIds.length > 0
      ? await prisma.stockMovement.findMany({
          where: {
            reference: {
              in: returnIds.map(id => `RETUR-${id}`),
            },
          },
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        })
      : [];

    // Grupăm mișcările de stoc per retur
    const movementsByReturn = new Map<string, typeof stockMovements>();
    for (const movement of stockMovements) {
      const returnId = movement.reference?.replace("RETUR-", "") || "";
      if (!movementsByReturn.has(returnId)) {
        movementsByReturn.set(returnId, []);
      }
      movementsByReturn.get(returnId)!.push(movement);
    }

    // Creăm workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ERP CashFlow";
    workbook.created = new Date();

    // ========== SHEET 1: SUMAR ==========
    const summarySheet = workbook.addWorksheet("Sumar");

    const startFormatted = startDate.toLocaleDateString("ro-RO");
    const endFormatted = endDate.toLocaleDateString("ro-RO");
    const periodText = startFormatted === endFormatted
      ? startFormatted
      : `${startFormatted} - ${endFormatted}`;

    // Titlu
    summarySheet.mergeCells("A1:D1");
    summarySheet.getCell("A1").value = `RAPORT RETURURI - ${periodText}`;
    summarySheet.getCell("A1").font = { bold: true, size: 16 };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    summarySheet.addRow([]);

    // Statistici
    const totalReturns = returns.length;
    const mappedReturns = returns.filter(r => r.orderId).length;
    const unmappedReturns = returns.filter(r => !r.orderId).length;
    const stockReturnedCount = returns.filter(r => r.status === "stock_returned").length;
    const totalStockMovements = stockMovements.length;
    const totalValue = returns.reduce((sum, r) => {
      return sum + (r.order?.totalPrice ? parseFloat(r.order.totalPrice.toString()) : 0);
    }, 0);

    summarySheet.addRow(["STATISTICI", "", "", ""]);
    summarySheet.getRow(3).font = { bold: true };

    summarySheet.addRow(["Total retururi scanate:", totalReturns]);
    summarySheet.addRow(["Mapate la comenzi:", mappedReturns]);
    summarySheet.addRow(["Nemapate:", unmappedReturns]);
    summarySheet.addRow(["Cu stoc readăugat:", stockReturnedCount]);
    summarySheet.addRow(["Total mișcări de stoc:", totalStockMovements]);
    summarySheet.addRow([]);
    summarySheet.addRow(["Valoare totală comenzi:", `${totalValue.toFixed(2)} RON`]);

    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 20;

    // ========== SHEET 2: RETURURI ==========
    const returnsSheet = workbook.addWorksheet("Retururi");

    // Header
    returnsSheet.addRow([
      "#", "AWB Retur", "AWB Original", "Comandă", "Client", "Oraș",
      "Valoare", "Status", "Scanat la", "Scanat de", "Mapat la", "Mapat de", "Note"
    ]);
    const headerRow = returnsSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };

    // Date
    returns.forEach((ret, index) => {
      const statusLabel = {
        received: "Recepționat",
        processed: "Procesat",
        stock_returned: "Stoc readăugat",
      }[ret.status] || ret.status;

      returnsSheet.addRow([
        index + 1,
        ret.returnAwbNumber,
        ret.originalAwb?.awbNumber || "-",
        ret.order?.shopifyOrderNumber || "-",
        ret.order ? `${ret.order.customerFirstName} ${ret.order.customerLastName}` : "-",
        ret.order?.shippingCity || "-",
        ret.order?.totalPrice ? `${parseFloat(ret.order.totalPrice.toString()).toFixed(2)} RON` : "-",
        statusLabel,
        ret.scannedAt.toLocaleString("ro-RO"),
        ret.scannedByName || "-",
        ret.processedAt ? ret.processedAt.toLocaleString("ro-RO") : "-",
        ret.processedByName || "-",
        ret.notes || "-",
      ]);

      // Highlight nemapate
      if (!ret.orderId) {
        const row = returnsSheet.getRow(index + 2);
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" }, // Yellow background
        };
      }
    });

    // Ajustăm lățimea coloanelor
    returnsSheet.getColumn(1).width = 5;
    returnsSheet.getColumn(2).width = 18;
    returnsSheet.getColumn(3).width = 18;
    returnsSheet.getColumn(4).width = 12;
    returnsSheet.getColumn(5).width = 25;
    returnsSheet.getColumn(6).width = 15;
    returnsSheet.getColumn(7).width = 12;
    returnsSheet.getColumn(8).width = 15;
    returnsSheet.getColumn(9).width = 18;
    returnsSheet.getColumn(10).width = 15;
    returnsSheet.getColumn(11).width = 18;
    returnsSheet.getColumn(12).width = 15;
    returnsSheet.getColumn(13).width = 30;

    // ========== SHEET 3: MIȘCĂRI DE STOC ==========
    if (stockMovements.length > 0) {
      const stockSheet = workbook.addWorksheet("Mișcări de stoc");

      // Header
      stockSheet.addRow([
        "#", "SKU", "Produs", "Cantitate", "Stoc anterior", "Stoc nou",
        "Retur ID", "Comandă", "Data"
      ]);
      const stockHeaderRow = stockSheet.getRow(1);
      stockHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      stockHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF22C55E" },
      };

      // Date - sortate pe dată
      const sortedMovements = [...stockMovements].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      sortedMovements.forEach((mov, index) => {
        const returnId = mov.reference?.replace("RETUR-", "") || "";
        const ret = returns.find(r => r.id === returnId);

        stockSheet.addRow([
          index + 1,
          mov.product?.sku || "-",
          mov.product?.name || "-",
          `+${mov.quantity}`,
          mov.previousStock,
          mov.newStock,
          returnId.substring(0, 8) + "...",
          ret?.order?.shopifyOrderNumber || "-",
          mov.createdAt.toLocaleString("ro-RO"),
        ]);
      });

      stockSheet.getColumn(1).width = 5;
      stockSheet.getColumn(2).width = 15;
      stockSheet.getColumn(3).width = 35;
      stockSheet.getColumn(4).width = 12;
      stockSheet.getColumn(5).width = 12;
      stockSheet.getColumn(6).width = 12;
      stockSheet.getColumn(7).width = 12;
      stockSheet.getColumn(8).width = 12;
      stockSheet.getColumn(9).width = 18;
    }

    // Generăm buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Returnăm fișierul
    const filenameDate = startFormatted === endFormatted
      ? startDate.toISOString().split("T")[0]
      : `${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
    const filename = `raport-retururi-${filenameDate}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/returns/export:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la export" },
      { status: 500 }
    );
  }
}
