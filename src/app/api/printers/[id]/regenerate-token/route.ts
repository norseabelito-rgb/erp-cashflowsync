import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";

// POST - Regenerează tokens pentru o imprimantă
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tokenType } = body; // "app" | "printer" | "both"

    const updateData: any = {};

    if (tokenType === "app" || tokenType === "both") {
      updateData.appToken = randomBytes(16).toString("hex");
    }

    if (tokenType === "printer" || tokenType === "both") {
      updateData.printerToken = randomBytes(16).toString("hex");
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Specifică tipul de token: app, printer sau both" },
        { status: 400 }
      );
    }

    // Resetează și conexiunea dacă regenerăm tokenurile
    updateData.isConnected = false;
    updateData.lastSeenAt = null;

    const printer = await prisma.printer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      printer,
      message: "Tokenuri regenerate cu succes. Reconectează aplicația de printare.",
    });
  } catch (error: any) {
    console.error("Error regenerating tokens:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
