import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// PATCH /api/print-client/job/[id] - Actualizează statusul unui job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { appToken, printerToken, status, errorMessage } = body;

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

    // Verificăm că jobul aparține acestei imprimante
    const job = await prisma.printJob.findFirst({
      where: { id, printerId: printer.id },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job negăsit" },
        { status: 404 }
      );
    }

    // Actualizăm statusul
    const updateData: any = {
      status,
      attempts: { increment: 1 },
    };

    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
      console.log(`✅ Print job completat: ${job.documentType} ${job.documentNumber}`);
    } else if (status === "FAILED") {
      updateData.errorMessage = errorMessage || "Eroare necunoscută";
      console.log(`❌ Print job eșuat: ${job.documentType} ${job.documentNumber} - ${errorMessage}`);
      
      // Dacă mai sunt încercări rămase, punem înapoi în PENDING
      if (job.attempts < job.maxAttempts - 1) {
        updateData.status = "PENDING";
      }
    } else if (status === "PRINTING") {
      console.log(`🖨️ Se printează: ${job.documentType} ${job.documentNumber}`);
    }

    const updatedJob = await prisma.printJob.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Error updating print job:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
