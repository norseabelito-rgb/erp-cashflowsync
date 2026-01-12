import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { randomBytes } from "crypto";

// GET - Lista imprimantelor
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "printers.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const printers = await prisma.printer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { printJobs: true }
        }
      }
    });

    return NextResponse.json({ success: true, printers });
  } catch (error: any) {
    console.error("Error fetching printers:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Adaugă imprimantă nouă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "printers.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { name, paperSize, orientation, copies, autoPrint, outputFormat } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Numele imprimantei este obligatoriu" },
        { status: 400 }
      );
    }

    // Generăm tokens unice
    const appToken = randomBytes(16).toString("hex");
    const printerToken = randomBytes(16).toString("hex");

    const printer = await prisma.printer.create({
      data: {
        name,
        appToken,
        printerToken,
        paperSize: paperSize || "A6",
        orientation: orientation || "portrait",
        copies: copies || 1,
        autoPrint: autoPrint !== false,
        outputFormat: outputFormat || "PDF",
      },
    });

    return NextResponse.json({
      success: true,
      printer,
      message: "Imprimantă adăugată cu succes",
    });
  } catch (error: any) {
    console.error("Error creating printer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizează imprimantă
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "printers.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, paperSize, orientation, copies, autoPrint, isActive, outputFormat } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul imprimantei este obligatoriu" },
        { status: 400 }
      );
    }

    const printer = await prisma.printer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(paperSize !== undefined && { paperSize }),
        ...(orientation !== undefined && { orientation }),
        ...(copies !== undefined && { copies }),
        ...(autoPrint !== undefined && { autoPrint }),
        ...(isActive !== undefined && { isActive }),
        ...(outputFormat !== undefined && { outputFormat }),
      },
    });

    return NextResponse.json({
      success: true,
      printer,
      message: "Imprimantă actualizată cu succes",
    });
  } catch (error: any) {
    console.error("Error updating printer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge imprimantă
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canDelete = await hasPermission(session.user.id, "printers.delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul imprimantei este obligatoriu" },
        { status: 400 }
      );
    }

    await prisma.printer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Imprimantă ștearsă cu succes",
    });
  } catch (error: any) {
    console.error("Error deleting printer:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
