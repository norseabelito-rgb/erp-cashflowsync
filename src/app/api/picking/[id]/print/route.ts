import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Funcție pentru a înlocui caracterele românești cu echivalente ASCII
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/[îî]/g, "i")
    .replace(/[ÎÎ]/g, "I")
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/È™/g, "S")
    .replace(/È›/g, "T")
    .replace(/Ä/g, "a")
    .replace(/[^\x00-\x7F]/g, "");
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get("preview") === "true";

    // Fetch picking list cu toate datele
    const pickingList = await prisma.pickingList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [
            { location: "asc" },
            { sku: "asc" },
          ],
        },
        awbs: {
          include: {
            awb: {
              select: {
                awbNumber: true,
                order: {
                  select: {
                    shopifyOrderNumber: true,
                    customerFirstName: true,
                    customerLastName: true,
                    shippingCity: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!pickingList) {
      return NextResponse.json(
        { error: "Picking list nu a fost gasit" },
        { status: 404 }
      );
    }

    // Creează PDF cu pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Dimensiuni pagină A4
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const contentWidth = pageWidth - 2 * margin;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Helper functions
    const truncate = (text: string | null | undefined, maxLength: number) => {
      const sanitized = sanitizeText(text);
      if (!sanitized) return "-";
      return sanitized.length > maxLength ? sanitized.substring(0, maxLength) + "..." : sanitized;
    };

    const formatDate = (date: Date | string | null) => {
      if (!date) return "-";
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        PENDING: "In asteptare",
        IN_PROGRESS: "In procesare",
        COMPLETED: "Finalizat",
        CANCELLED: "Anulat",
      };
      return labels[status] || status;
    };

    // === HEADER - Centrat ===
    const titleText = "PICKING LIST";
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 20);
    page.drawText(titleText, { 
      x: (pageWidth - titleWidth) / 2, 
      y, 
      font: helveticaBold, 
      size: 20, 
      color: rgb(0, 0, 0) 
    });
    y -= 25;

    const codeWidth = helvetica.widthOfTextAtSize(pickingList.code, 14);
    page.drawText(pickingList.code, { 
      x: (pageWidth - codeWidth) / 2, 
      y, 
      font: helvetica, 
      size: 14, 
      color: rgb(0.3, 0.3, 0.3) 
    });
    y -= 15;

    if (pickingList.name) {
      const nameText = truncate(pickingList.name, 60);
      const nameWidth = helvetica.widthOfTextAtSize(nameText, 10);
      page.drawText(nameText, { 
        x: (pageWidth - nameWidth) / 2, 
        y, 
        font: helvetica, 
        size: 10, 
        color: rgb(0.4, 0.4, 0.4) 
      });
      y -= 15;
    }
    y -= 15;

    // === INFO LINE ===
    page.drawText(`Status: ${getStatusLabel(pickingList.status)}`, { x: margin, y, font: helvetica, size: 9 });
    page.drawText(`Produse: ${pickingList.totalItems}`, { x: margin + 150, y, font: helvetica, size: 9 });
    page.drawText(`Bucati: ${pickingList.totalQuantity}`, { x: margin + 280, y, font: helvetica, size: 9 });
    page.drawText(`AWB-uri: ${pickingList.awbs.length}`, { x: margin + 400, y, font: helvetica, size: 9 });
    y -= 25;

    // === BOX CREAT DE ===
    page.drawRectangle({ 
      x: margin, 
      y: y - 35, 
      width: contentWidth, 
      height: 40, 
      color: rgb(0.96, 0.96, 0.96), 
      borderColor: rgb(0.8, 0.8, 0.8), 
      borderWidth: 0.5 
    });
    page.drawText("CREAT DE:", { x: margin + 10, y: y - 15, font: helveticaBold, size: 10 });
    page.drawText(truncate(pickingList.createdByName, 30), { x: margin + 100, y: y - 15, font: helvetica, size: 10 });
    page.drawText(`Data: ${formatDate(pickingList.createdAt)}`, { x: margin + 320, y: y - 15, font: helvetica, size: 9 });
    y -= 50;

    // === BOX PRELUAT DE ===
    const hasStarted = pickingList.startedByName || pickingList.startedAt;
    page.drawRectangle({ 
      x: margin, 
      y: y - 35, 
      width: contentWidth, 
      height: 40, 
      color: hasStarted ? rgb(0.94, 0.97, 1) : rgb(1, 1, 1), 
      borderColor: hasStarted ? rgb(0.23, 0.51, 0.97) : rgb(0.7, 0.7, 0.7), 
      borderWidth: 0.5 
    });
    page.drawText("PRELUAT DE:", { x: margin + 10, y: y - 15, font: helveticaBold, size: 10 });
    if (pickingList.startedByName) {
      page.drawText(truncate(pickingList.startedByName, 30), { x: margin + 100, y: y - 15, font: helvetica, size: 10 });
      page.drawText(`La: ${formatDate(pickingList.startedAt)}`, { x: margin + 320, y: y - 15, font: helvetica, size: 9 });
    } else {
      page.drawText("______________________", { x: margin + 100, y: y - 15, font: helvetica, size: 10 });
      page.drawText("Data: ______________", { x: margin + 320, y: y - 15, font: helvetica, size: 9 });
    }
    y -= 50;

    // === BOX FINALIZAT DE ===
    const hasCompleted = pickingList.completedByName || pickingList.completedAt;
    page.drawRectangle({ 
      x: margin, 
      y: y - 35, 
      width: contentWidth, 
      height: 40, 
      color: hasCompleted ? rgb(0.94, 1, 0.94) : rgb(1, 1, 1), 
      borderColor: hasCompleted ? rgb(0.2, 0.7, 0.2) : rgb(0.7, 0.7, 0.7), 
      borderWidth: 0.5 
    });
    page.drawText("FINALIZAT DE:", { x: margin + 10, y: y - 15, font: helveticaBold, size: 10 });
    if (pickingList.completedByName) {
      page.drawText(truncate(pickingList.completedByName, 30), { x: margin + 100, y: y - 15, font: helvetica, size: 10 });
      page.drawText(`La: ${formatDate(pickingList.completedAt)}`, { x: margin + 320, y: y - 15, font: helvetica, size: 9 });
    } else {
      page.drawText("______________________", { x: margin + 100, y: y - 15, font: helvetica, size: 10 });
      page.drawText("Data: ______________", { x: margin + 320, y: y - 15, font: helvetica, size: 9 });
    }
    y -= 55;

    // === LINIE SEPARATOARE ===
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    y -= 20;

    // === TABEL HEADER ===
    const cols = {
      check: margin,
      location: margin + 25,
      sku: margin + 85,
      title: margin + 180,
      qty: margin + 420,
      picked: margin + 470,
    };

    page.drawRectangle({ 
      x: margin, 
      y: y - 5, 
      width: contentWidth, 
      height: 20, 
      color: rgb(0.9, 0.9, 0.9)
    });
    
    page.drawText("OK", { x: cols.check, y: y, font: helveticaBold, size: 8 });
    page.drawText("Locatie", { x: cols.location, y, font: helveticaBold, size: 8 });
    page.drawText("SKU", { x: cols.sku, y, font: helveticaBold, size: 8 });
    page.drawText("Produs", { x: cols.title, y, font: helveticaBold, size: 8 });
    page.drawText("Nec.", { x: cols.qty, y, font: helveticaBold, size: 8 });
    page.drawText("Ridicat", { x: cols.picked, y, font: helveticaBold, size: 8 });

    y -= 20;

    // === TABEL ROWS ===
    let rowIndex = 0;
    for (const item of pickingList.items) {
      // Verifică dacă mai e loc pe pagină
      if (y < 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
        
        // Header pe pagina nouă
        page.drawText(`Picking List ${pickingList.code} - Pag. ${pdfDoc.getPageCount()}`, { 
          x: margin, y, font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) 
        });
        y -= 25;
        
        // Repetă header tabel
        page.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: rgb(0.9, 0.9, 0.9) });
        page.drawText("OK", { x: cols.check, y, font: helveticaBold, size: 8 });
        page.drawText("Locatie", { x: cols.location, y, font: helveticaBold, size: 8 });
        page.drawText("SKU", { x: cols.sku, y, font: helveticaBold, size: 8 });
        page.drawText("Produs", { x: cols.title, y, font: helveticaBold, size: 8 });
        page.drawText("Nec.", { x: cols.qty, y, font: helveticaBold, size: 8 });
        page.drawText("Ridicat", { x: cols.picked, y, font: helveticaBold, size: 8 });
        y -= 20;
        rowIndex = 0;
      }

      // Alternating row background
      if (rowIndex % 2 === 0) {
        page.drawRectangle({ 
          x: margin, 
          y: y - 3, 
          width: contentWidth, 
          height: 16, 
          color: rgb(0.98, 0.98, 0.98)
        });
      }

      // Checkbox
      page.drawText(item.isComplete ? "[X]" : "[ ]", { x: cols.check, y, font: helvetica, size: 8 });
      
      // Locație
      page.drawText(truncate(item.location, 8), { x: cols.location, y, font: helvetica, size: 8 });
      
      // SKU
      page.drawText(truncate(item.sku, 12), { x: cols.sku, y, font: helvetica, size: 8 });
      
      // Titlu + variant
      const title = item.title + (item.variantTitle ? ` (${item.variantTitle})` : "");
      page.drawText(truncate(title, 40), { x: cols.title, y, font: helvetica, size: 8 });
      
      // Cantitate necesară
      page.drawText(String(item.quantityRequired), { x: cols.qty + 10, y, font: helveticaBold, size: 9 });
      
      // Ridicat
      if (item.isComplete) {
        page.drawText(String(item.quantityPicked), { x: cols.picked + 15, y, font: helvetica, size: 9 });
      } else {
        page.drawText("____", { x: cols.picked + 10, y, font: helvetica, size: 9 });
      }

      y -= 16;
      rowIndex++;
    }

    // === AWB-URI INCLUSE ===
    if (pickingList.awbs.length > 0 && y > 120) {
      y -= 15;
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
      y -= 15;
      
      page.drawText("AWB-uri incluse:", { x: margin, y, font: helveticaBold, size: 9 });
      y -= 15;

      // Calculăm dimensiunile box-ului bazat pe numărul de AWB-uri
      const awbsPerRow = 4;
      const numRows = Math.ceil(pickingList.awbs.length / awbsPerRow);
      const boxHeight = Math.min(numRows * 14 + 10, 80); // Max 80px height
      const colWidth = (contentWidth - 20) / awbsPerRow;
      
      // Desenăm box-ul
      page.drawRectangle({
        x: margin,
        y: y - boxHeight + 5,
        width: contentWidth,
        height: boxHeight,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      // Afișăm AWB-urile în box
      let awbCol = 0;
      let awbY = y - 5;
      
      for (const a of pickingList.awbs) {
        if (awbY < y - boxHeight + 10) break;
        
        const x = margin + 10 + awbCol * colWidth;
        const awbText = a.awb.awbNumber || a.awb.order.shopifyOrderNumber || "-";
        
        page.drawText(awbText, { 
          x, y: awbY, font: helvetica, size: 8, color: rgb(0.2, 0.2, 0.2) 
        });
        
        awbCol++;
        if (awbCol >= awbsPerRow) {
          awbCol = 0;
          awbY -= 14;
        }
      }
      
      y -= boxHeight + 5;
    }

    // === FOOTER ===
    const firstPage = pdfDoc.getPages()[0];
    firstPage.drawText(
      `Generat: ${formatDate(new Date())} | Cash Flow Grup ERP`,
      { x: margin, y: 25, font: helvetica, size: 7, color: rgb(0.5, 0.5, 0.5) }
    );

    // Generează PDF
    const pdfBytes = await pdfDoc.save();

    // Pentru preview în browser vs download
    const disposition = preview ? "inline" : "attachment";

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="picking-${pickingList.code}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
