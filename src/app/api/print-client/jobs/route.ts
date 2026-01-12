import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/print-client/jobs - Get pending print jobs for a printer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get("appToken");
    const printerToken = searchParams.get("printerToken");

    console.log(`[PRINT-JOBS] Request received - appToken: ${appToken?.substring(0, 8)}..., printerToken: ${printerToken?.substring(0, 8)}...`);

    if (!appToken || !printerToken) {
      console.log(`[PRINT-JOBS] Missing tokens`);
      return NextResponse.json(
        { success: false, error: "Tokenuri lipsa" },
        { status: 400 }
      );
    }

    // Find the printer by tokens
    const printer = await prisma.printer.findFirst({
      where: {
        appToken,
        printerToken,
        isActive: true,
      },
    });

    if (!printer) {
      console.log(`[PRINT-JOBS] Printer not found for tokens`);
      return NextResponse.json(
        { success: false, error: "Imprimanta negasita sau inactiva" },
        { status: 401 }
      );
    }

    console.log(`[PRINT-JOBS] Found printer: ${printer.name} (${printer.id})`);

    // Update last seen
    await prisma.printer.update({
      where: { id: printer.id },
      data: {
        lastSeenAt: new Date(),
        isConnected: true,
      },
    });

    // Get pending jobs for this printer
    const jobs = await prisma.printJob.findMany({
      where: {
        printerId: printer.id,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10, // Process max 10 jobs at a time
      select: {
        id: true,
        documentId: true,
        documentType: true,
        documentNumber: true,
        orderId: true,
        orderNumber: true,
        createdAt: true,
      },
    });

    console.log(`[PRINT-JOBS] Found ${jobs.length} pending jobs for printer ${printer.name}`);
    if (jobs.length > 0) {
      console.log(`[PRINT-JOBS] Jobs: ${jobs.map(j => `${j.id} (${j.documentType})`).join(', ')}`);
    }

    // Add printer settings to each job for the client
    const jobsWithSettings = jobs.map(job => ({
      ...job,
      paperSize: printer.paperSize,
      orientation: printer.orientation,
      copies: printer.copies,
    }));

    return NextResponse.json({
      success: true,
      jobs: jobsWithSettings,
      printerName: printer.name,
    });
  } catch (error: any) {
    console.error("[PRINT-JOBS] Error fetching print jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare server", details: error.toString() },
      { status: 500 }
    );
  }
}
