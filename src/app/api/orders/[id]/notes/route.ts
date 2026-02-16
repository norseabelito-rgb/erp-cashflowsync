import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Comanda nu a fost găsită" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notes: order.notes || "" });
  } catch (error) {
    console.error("Error fetching order notes:", error);
    return NextResponse.json(
      { error: "Eroare la încărcarea notițelor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "orders.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a edita comenzi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json(
        { error: "Câmpul notes trebuie să fie un string" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { notes: notes || null },
      select: { notes: true },
    });

    return NextResponse.json({ notes: order.notes || "" });
  } catch (error) {
    console.error("Error updating order notes:", error);
    return NextResponse.json(
      { error: "Eroare la salvarea notițelor" },
      { status: 500 }
    );
  }
}
