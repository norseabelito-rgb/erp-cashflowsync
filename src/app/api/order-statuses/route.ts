import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - List all internal order statuses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzi" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const statuses = await prisma.internalOrderStatus.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ statuses });
  } catch (error: unknown) {
    console.error("Error fetching order statuses:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Eroare la incarcarea statusurilor", details: message },
      { status: 500 }
    );
  }
}

// POST - Create new internal order status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "settings.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a modifica setarile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, color, sortOrder } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Numele este obligatoriu" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.internalOrderStatus.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Exista deja un status cu acest nume" },
        { status: 400 }
      );
    }

    const status = await prisma.internalOrderStatus.create({
      data: {
        name: name.trim(),
        color: color || "#6b7280",
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ status }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating order status:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Eroare la crearea statusului", details: message },
      { status: 500 }
    );
  }
}

// PATCH - Update existing internal order status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "settings.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a modifica setarile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, color, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID-ul statusului este obligatoriu" },
        { status: 400 }
      );
    }

    const existing = await prisma.internalOrderStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Statusul nu exista" },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.internalOrderStatus.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Exista deja un status cu acest nume" },
          { status: 400 }
        );
      }
    }

    const status = await prisma.internalOrderStatus.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ status });
  } catch (error: unknown) {
    console.error("Error updating order status:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Eroare la actualizarea statusului", details: message },
      { status: 500 }
    );
  }
}

// DELETE - Delete internal order status
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "settings.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a modifica setarile" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID-ul statusului este obligatoriu" },
        { status: 400 }
      );
    }

    // Check if status exists and has orders
    const existing = await prisma.internalOrderStatus.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Statusul nu exista" },
        { status: 404 }
      );
    }

    if (existing._count.orders > 0) {
      // Soft delete - set isActive to false
      await prisma.internalOrderStatus.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: `Statusul a fost dezactivat (${existing._count.orders} comenzi il folosesc)`,
        deactivated: true,
      });
    }

    // Hard delete if no orders use it
    await prisma.internalOrderStatus.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Statusul a fost sters" });
  } catch (error: unknown) {
    console.error("Error deleting order status:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Eroare la stergerea statusului", details: message },
      { status: 500 }
    );
  }
}
