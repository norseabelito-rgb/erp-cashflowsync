import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// POST - Setare depozit principal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canSetPrimary = await hasPermission(session.user.id, "warehouses.set_primary");
    if (!canSetPrimary) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = await params;

    // Verifică existența depozitului
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Depozitul nu a fost găsit" }, { status: 404 });
    }

    if (!warehouse.isActive) {
      return NextResponse.json(
        { error: "Nu poți seta un depozit inactiv ca principal" },
        { status: 400 }
      );
    }

    // Transaction: dezactivează isPrimary pentru toate și activează pentru cel nou
    await prisma.$transaction([
      prisma.warehouse.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.warehouse.update({
        where: { id },
        data: { isPrimary: true },
      }),
    ]);

    const updatedWarehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedWarehouse);
  } catch (error) {
    console.error("Error setting primary warehouse:", error);
    return NextResponse.json(
      { error: "Eroare la setarea depozitului principal" },
      { status: 500 }
    );
  }
}
