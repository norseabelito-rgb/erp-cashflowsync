import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission, getUserWarehouses } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista depozitelor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "warehouses.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const includeStock = searchParams.get("includeStock") === "true";

    // Obține depozitele la care utilizatorul are acces
    const userWarehouseIds = await getUserWarehouses(session.user.id);

    const where: any = {
      id: { in: userWarehouseIds },
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: {
            stockLevels: true,
            stockMovements: true,
            goodsReceipts: true,
          },
        },
        ...(includeStock && {
          stockLevels: {
            select: {
              currentStock: true,
            },
          },
        }),
      },
      orderBy: [
        { isPrimary: "desc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Calculează stocul total per depozit dacă cerut
    const warehousesWithTotals = warehouses.map(warehouse => {
      const totalStock = includeStock && warehouse.stockLevels
        ? warehouse.stockLevels.reduce((sum, sl) => sum + Number(sl.currentStock), 0)
        : undefined;

      const { stockLevels, ...rest } = warehouse as any;
      return {
        ...rest,
        totalStock,
      };
    });

    return NextResponse.json({ warehouses: warehousesWithTotals });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea depozitelor" },
      { status: 500 }
    );
  }
}

// POST - Creare depozit nou
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "warehouses.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, address, isPrimary } = body;

    // Validări
    if (!code || !name) {
      return NextResponse.json(
        { error: "Codul și numele sunt obligatorii" },
        { status: 400 }
      );
    }

    // Verifică dacă codul există deja
    const existingCode = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Un depozit cu acest cod există deja" },
        { status: 400 }
      );
    }

    // Dacă e setat ca principal, verifică permisiunea
    if (isPrimary) {
      const canSetPrimary = await hasPermission(session.user.id, "warehouses.set_primary");
      if (!canSetPrimary) {
        return NextResponse.json(
          { error: "Nu ai permisiunea de a seta depozitul principal" },
          { status: 403 }
        );
      }

      // Dezactivează isPrimary pentru toate celelalte depozite
      await prisma.warehouse.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Determină sortOrder
    const lastWarehouse = await prisma.warehouse.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (lastWarehouse?.sortOrder ?? -1) + 1;

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name,
        description,
        address,
        isPrimary: isPrimary || false,
        sortOrder,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      { error: "Eroare la crearea depozitului" },
      { status: 500 }
    );
  }
}
