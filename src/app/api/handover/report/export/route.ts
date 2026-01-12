import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHandoverReport } from "@/lib/handover";
import ExcelJS from "exceljs";

/**
 * GET /api/handover/report/export
 * Exportă raportul în format Excel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canExport = await hasPermission(session.user.id, "handover.report");
    if (!canExport) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a exporta rapoarte" },
        { status: 403 }
      );
    }

    // Parametri
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const storeId = searchParams.get("storeId") || undefined;
    const format = searchParams.get("format") || "xlsx";

    // Parsăm data
    let date: Date;
    if (dateStr) {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return NextResponse.json({
          success: false,
          error: "Data invalidă.",
        });
      }
    } else {
      date = new Date();
    }

    const report = await getHandoverReport(date, storeId);
    const dateFormatted = date.toLocaleDateString("ro-RO");

    // Creăm workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ERP CashFlow";
    workbook.created = new Date();

    // ========== SHEET 1: SUMAR ==========
    const summarySheet = workbook.addWorksheet("Sumar");
    
    // Titlu
    summarySheet.mergeCells("A1:D1");
    summarySheet.getCell("A1").value = `RAPORT PREDARE CURIER - ${dateFormatted}`;
    summarySheet.getCell("A1").font = { bold: true, size: 16 };
    summarySheet.getCell("A1").alignment = { horizontal: "center" };

    // Spațiu
    summarySheet.addRow([]);

    // Statistici
    summarySheet.addRow(["STATISTICI", "", "", ""]);
    summarySheet.getRow(3).font = { bold: true };
    
    summarySheet.addRow(["Total AWB-uri emise:", report.stats.totalIssued]);
    summarySheet.addRow(["Total predate (scanate):", report.stats.totalHandedOver]);
    summarySheet.addRow(["Total nepredate:", report.stats.totalNotHandedOver]);
    summarySheet.addRow(["Predate din zile anterioare:", report.stats.totalFromPrevDays]);
    
    summarySheet.addRow([]);
    summarySheet.addRow(["Procent predare:", 
      report.stats.totalIssued > 0 
        ? `${((report.stats.totalHandedOver / report.stats.totalIssued) * 100).toFixed(1)}%`
        : "N/A"
    ]);

    summarySheet.addRow([]);
    summarySheet.addRow(["Ora finalizare:", 
      report.closedAt ? report.closedAt.toLocaleString("ro-RO") : "Nefinalizat"
    ]);
    summarySheet.addRow(["Finalizat de:", report.closedBy || "-"]);
    summarySheet.addRow(["Tip finalizare:", report.closeType === "auto" ? "Automat" : (report.closeType === "manual" ? "Manual" : "-")]);

    // Ajustăm lățimea coloanelor
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 20;

    // ========== SHEET 2: PREDATE ==========
    const handedOverSheet = workbook.addWorksheet("Predate");
    
    // Header
    handedOverSheet.addRow([
      "#", "AWB", "Comandă", "Magazin", "Destinatar", "Localitate", 
      "Produse", "Scanat la", "Confirmat C0"
    ]);
    handedOverSheet.getRow(1).font = { bold: true };
    handedOverSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    handedOverSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Date
    report.handedOverList.forEach((awb, index) => {
      handedOverSheet.addRow([
        index + 1,
        awb.awbNumber || "-",
        awb.orderNumber,
        awb.storeName,
        awb.recipientName,
        awb.recipientCity,
        awb.products,
        awb.handedOverAt ? awb.handedOverAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "-",
        awb.fanCourierStatusCode === "C0" ? "✓" : "-",
      ]);
    });

    // Ajustăm lățimea coloanelor
    handedOverSheet.getColumn(1).width = 5;
    handedOverSheet.getColumn(2).width = 18;
    handedOverSheet.getColumn(3).width = 12;
    handedOverSheet.getColumn(4).width = 20;
    handedOverSheet.getColumn(5).width = 25;
    handedOverSheet.getColumn(6).width = 15;
    handedOverSheet.getColumn(7).width = 40;
    handedOverSheet.getColumn(8).width = 12;
    handedOverSheet.getColumn(9).width = 12;

    // ========== SHEET 3: NEPREDATE ==========
    const notHandedSheet = workbook.addWorksheet("Nepredate");
    
    // Header
    notHandedSheet.addRow([
      "#", "AWB", "Comandă", "Magazin", "Destinatar", "Localitate", "Produse", "Motiv"
    ]);
    notHandedSheet.getRow(1).font = { bold: true };
    notHandedSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC2626" },
    };
    notHandedSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Date
    report.notHandedOverList.forEach((awb, index) => {
      notHandedSheet.addRow([
        index + 1,
        awb.awbNumber || "-",
        awb.orderNumber,
        awb.storeName,
        awb.recipientName,
        awb.recipientCity,
        awb.products,
        "Nescanat",
      ]);
    });

    // Ajustăm lățimea coloanelor
    notHandedSheet.getColumn(1).width = 5;
    notHandedSheet.getColumn(2).width = 18;
    notHandedSheet.getColumn(3).width = 12;
    notHandedSheet.getColumn(4).width = 20;
    notHandedSheet.getColumn(5).width = 25;
    notHandedSheet.getColumn(6).width = 15;
    notHandedSheet.getColumn(7).width = 40;
    notHandedSheet.getColumn(8).width = 15;

    // ========== SHEET 4: DIN ZILE ANTERIOARE ==========
    if (report.fromPrevDaysList.length > 0) {
      const prevDaysSheet = workbook.addWorksheet("Din zile anterioare");
      
      // Header
      prevDaysSheet.addRow([
        "#", "AWB", "Comandă", "Data emitere", "Zile întârziere", 
        "Destinatar", "Scanat azi la", "Observație"
      ]);
      prevDaysSheet.getRow(1).font = { bold: true };
      prevDaysSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF59E0B" },
      };
      prevDaysSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Date
      report.fromPrevDaysList.forEach((awb, index) => {
        const daysDiff = Math.floor((date.getTime() - awb.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        prevDaysSheet.addRow([
          index + 1,
          awb.awbNumber || "-",
          awb.orderNumber,
          awb.createdAt.toLocaleDateString("ro-RO"),
          `${daysDiff} zile`,
          awb.recipientName,
          awb.handedOverAt ? awb.handedOverAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "-",
          "Fost NEPREDAT",
        ]);
      });

      // Ajustăm lățimea coloanelor
      prevDaysSheet.getColumn(1).width = 5;
      prevDaysSheet.getColumn(2).width = 18;
      prevDaysSheet.getColumn(3).width = 12;
      prevDaysSheet.getColumn(4).width = 15;
      prevDaysSheet.getColumn(5).width = 15;
      prevDaysSheet.getColumn(6).width = 25;
      prevDaysSheet.getColumn(7).width = 15;
      prevDaysSheet.getColumn(8).width = 20;
    }

    // Generăm buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Returnăm fișierul
    const filename = `raport-predare-${date.toISOString().split("T")[0]}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/handover/report/export:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la export" },
      { status: 500 }
    );
  }
}
