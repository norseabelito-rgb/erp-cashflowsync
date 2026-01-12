import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/print-client/connect - Conectează aplicația de printare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appToken, printerToken } = body;

    if (!appToken || !printerToken) {
      return NextResponse.json(
        { success: false, error: "Ambele tokenuri sunt obligatorii" },
        { status: 400 }
      );
    }

    // Verificăm tokenurile
    const printer = await prisma.printer.findFirst({
      where: {
        appToken,
        printerToken,
        isActive: true,
      },
    });

    if (!printer) {
      return NextResponse.json(
        { success: false, error: "Tokenuri invalide sau imprimantă inactivă" },
        { status: 401 }
      );
    }

    // Actualizăm statusul conexiunii
    await prisma.printer.update({
      where: { id: printer.id },
      data: {
        isConnected: true,
        lastSeenAt: new Date(),
        lastError: null,
      },
    });

    console.log(`🖨️ Imprimantă conectată: ${printer.name}`);

    return NextResponse.json({
      success: true,
      clientId: printer.id,
      printer: {
        id: printer.id,
        name: printer.name,
        paperSize: printer.paperSize,
        orientation: printer.orientation,
        copies: printer.copies,
      },
      message: "Conectat cu succes",
    });
  } catch (error: any) {
    console.error("Error connecting printer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/print-client/connect - Poll pentru joburi noi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get("appToken");
    const printerToken = searchParams.get("printerToken");

    if (!appToken || !printerToken) {
      return NextResponse.json(
        { success: false, error: "Tokenuri lipsă" },
        { status: 400 }
      );
    }

    // Verificăm tokenurile
    const printer = await prisma.printer.findFirst({
      where: {
        appToken,
        printerToken,
        isActive: true,
      },
    });

    if (!printer) {
      return NextResponse.json(
        { success: false, error: "Tokenuri invalide" },
        { status: 401 }
      );
    }

    // Actualizăm lastSeenAt
    await prisma.printer.update({
      where: { id: printer.id },
      data: {
        isConnected: true,
        lastSeenAt: new Date(),
      },
    });

    // Obținem joburile PENDING pentru această imprimantă
    const pendingJobs = await prisma.printJob.findMany({
      where: {
        printerId: printer.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      jobs: pendingJobs,
      printerSettings: {
        paperSize: printer.paperSize,
        orientation: printer.orientation,
        copies: printer.copies,
      },
    });
  } catch (error: any) {
    console.error("Error polling jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
