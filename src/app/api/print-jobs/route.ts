import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Lista joburilor de printare
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const printerId = searchParams.get("printerId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (printerId) where.printerId = printerId;
    if (status) where.status = status;

    const printJobs = await prisma.printJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        printer: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ success: true, printJobs });
  } catch (error: any) {
    console.error("Error fetching print jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Creează un job de printare nou
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      printerId, 
      documentType, 
      documentId, 
      documentNumber,
      orderId,
      orderNumber 
    } = body;

    // Dacă nu e specificat printerId, folosim prima imprimantă activă cu autoPrint
    let targetPrinterId = printerId;
    
    if (!targetPrinterId) {
      const defaultPrinter = await prisma.printer.findFirst({
        where: { isActive: true, autoPrint: true },
        orderBy: { createdAt: "asc" }
      });
      
      if (!defaultPrinter) {
        return NextResponse.json({
          success: false,
          error: "Nu există imprimante configurate pentru printare automată"
        }, { status: 400 });
      }
      
      targetPrinterId = defaultPrinter.id;
    }

    const printJob = await prisma.printJob.create({
      data: {
        printerId: targetPrinterId,
        documentType,
        documentId,
        documentNumber,
        orderId,
        orderNumber,
        status: "PENDING",
      },
      include: {
        printer: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`🖨️ Job de printare creat: ${documentType} ${documentNumber} pe imprimanta ${printJob.printer.name}`);

    return NextResponse.json({
      success: true,
      printJob,
      message: "Job de printare creat cu succes",
    });
  } catch (error: any) {
    console.error("Error creating print job:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Anulează un job de printare
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul jobului este obligatoriu" },
        { status: 400 }
      );
    }

    const printJob = await prisma.printJob.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      printJob,
      message: "Job de printare anulat",
    });
  } catch (error: any) {
    console.error("Error cancelling print job:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
