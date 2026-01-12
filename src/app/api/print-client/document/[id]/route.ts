import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createFanCourierClient } from "@/lib/fancourier";
import { PDFDocument } from "pdf-lib";

/**
 * Scalează PDF-ul de la A4 la A6 dacă este necesar
 * A4: 595 x 842 points (210 x 297 mm)
 * A6: 298 x 420 points (105 x 148 mm)
 */
async function scalePdfToA6(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    if (pages.length === 0) {
      return pdfBuffer;
    }
    
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // A4 dimensions in points
    const A4_WIDTH = 595;
    const A4_HEIGHT = 842;
    // A6 dimensions in points
    const A6_WIDTH = 298;
    const A6_HEIGHT = 420;
    
    // Verificăm dacă PDF-ul e aproximativ A4 (cu toleranță de 10%)
    const isA4 = Math.abs(width - A4_WIDTH) < 60 && Math.abs(height - A4_HEIGHT) < 85;
    
    if (!isA4) {
      console.log(`📄 PDF is not A4 (${width}x${height}), skipping resize`);
      return pdfBuffer;
    }
    
    console.log(`📄 Resizing PDF from A4 (${width}x${height}) to A6 (${A6_WIDTH}x${A6_HEIGHT})`);
    
    // Creăm un nou document A6
    const newPdfDoc = await PDFDocument.create();
    
    for (let i = 0; i < pages.length; i++) {
      // Copiăm pagina în noul document
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
      
      // Calculăm scala (păstrăm raportul de aspect)
      const scaleX = A6_WIDTH / width;
      const scaleY = A6_HEIGHT / height;
      const scale = Math.min(scaleX, scaleY);
      
      // Setăm dimensiunea paginii la A6
      copiedPage.setSize(A6_WIDTH, A6_HEIGHT);
      
      // Scalăm conținutul și îl centrăm
      copiedPage.scaleContent(scale, scale);
      
      // Centrăm conținutul pe pagina nouă
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const xOffset = (A6_WIDTH - scaledWidth) / 2;
      const yOffset = (A6_HEIGHT - scaledHeight) / 2;
      copiedPage.translateContent(xOffset, yOffset);
      
      newPdfDoc.addPage(copiedPage);
    }
    
    const newPdfBytes = await newPdfDoc.save();
    return Buffer.from(newPdfBytes);
  } catch (error: any) {
    console.error("Error scaling PDF:", error.message);
    // Returnăm PDF-ul original în caz de eroare
    return pdfBuffer;
  }
}

// GET /api/print-client/document/[id] - Obține documentul pentru printare
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get("appToken");
    const printerToken = searchParams.get("printerToken");

    // Verificăm că avem tokenurile
    if (!appToken || !printerToken) {
      return NextResponse.json(
        { success: false, error: "Tokenuri lipsă" },
        { status: 401 }
      );
    }

    // Verificăm tokenurile
    const printer = await prisma.printer.findFirst({
      where: { appToken, printerToken, isActive: true },
    });

    if (!printer) {
      return NextResponse.json(
        { success: false, error: "Tokenuri invalide" },
        { status: 401 }
      );
    }

    // Obținem jobul
    const job = await prisma.printJob.findFirst({
      where: { id, printerId: printer.id },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job negăsit" },
        { status: 404 }
      );
    }

    // În funcție de tipul documentului, generăm PDF-ul
    if (job.documentType === "awb") {
      const fancourier = await createFanCourierClient();
      
      // Folosim outputFormat din setările imprimantei (default PDF dacă nu e setat)
      const useZPL = (printer as any).outputFormat === 'ZPL';
      
      console.log(`🖨️ Generating AWB ${job.documentNumber} for printer ${printer.name} - requested format: ${useZPL ? 'ZPL' : 'PDF'}, paperSize: ${printer.paperSize}`);
      
      let documentBuffer: Buffer | null = null;
      let outputFormat = 'pdf';
      
      // Întotdeauna încercăm PDF pentru stabilitate
      // ZPL poate fi adăugat mai târziu dacă FanCourier îl suportă
      try {
        documentBuffer = await fancourier.printAWB(job.documentNumber || job.documentId, {
          format: printer.paperSize,
          type: 1, // PDF
        });
        outputFormat = 'pdf';
      } catch (awbError: any) {
        console.error(`❌ Error fetching AWB ${job.documentNumber}:`, awbError.message);
      }

      if (!documentBuffer) {
        return NextResponse.json(
          { success: false, error: `Nu s-a putut genera documentul AWB` },
          { status: 500 }
        );
      }

      console.log(`📄 AWB ${job.documentNumber} - format: ${outputFormat}, size: ${documentBuffer.length} bytes`);

      // Dacă imprimanta cere A6, verificăm și scalăm PDF-ul dacă e necesar
      // (FanCourier poate returna A4 chiar dacă cerem A6, dacă AWB-ul nu are opțiunea ePOD)
      if (printer.paperSize === 'A6' && outputFormat === 'pdf') {
        console.log(`🔄 Checking if PDF needs to be scaled to A6...`);
        documentBuffer = await scalePdfToA6(documentBuffer);
        console.log(`📄 After scaling: size: ${documentBuffer.length} bytes`);
      }

      // Returnăm documentul ca base64
      return NextResponse.json({
        success: true,
        document: {
          type: outputFormat,
          data: documentBuffer.toString("base64"),
          filename: `AWB_${job.documentNumber}.${outputFormat}`,
          settings: {
            paperSize: printer.paperSize,
            orientation: printer.orientation,
            copies: printer.copies,
          },
        },
      });
    }

    // PICKING LIST
    if (job.documentType === "picking") {
      // Generăm PDF-ul picking list folosind API-ul existent
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
      const pdfResponse = await fetch(`${baseUrl}/api/picking/${job.documentId}/print`, {
        headers: {
          // Transmitem internal header pentru a ocoli autentificarea
          "X-Internal-Request": "true",
        },
      });

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { success: false, error: "Nu s-a putut genera PDF-ul Picking List" },
          { status: 500 }
        );
      }

      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

      return NextResponse.json({
        success: true,
        document: {
          type: "pdf",
          data: pdfBuffer.toString("base64"),
          filename: `Picking_${job.documentNumber}.pdf`,
          settings: {
            paperSize: "A4", // Picking list e mereu A4
            orientation: "portrait",
            copies: 1,
          },
        },
      });
    }

    // TODO: Adaugă suport pentru alte tipuri de documente (facturi, etc.)
    return NextResponse.json(
      { success: false, error: `Tip document nesuportat: ${job.documentType}` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Error getting print document:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
