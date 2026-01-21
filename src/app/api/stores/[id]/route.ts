import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

async function updateStore(
  request: NextRequest,
  storeId: string
) {
  try {
    const body = await request.json();
    const { name, shopifyDomain, accessToken, isActive, companyId } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (shopifyDomain !== undefined) updateData.shopifyDomain = shopifyDomain;
    if (accessToken) updateData.accessToken = accessToken;
    if (isActive !== undefined) updateData.isActive = isActive;
    // companyId poate fi null pentru a dezasocia
    if (companyId !== undefined) updateData.companyId = companyId;

    const store = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ store, success: true });
  } catch (error: any) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Eroare la actualizarea magazinului", success: false },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateStore(request, params.id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateStore(request, params.id);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ștergem toate datele asociate
    await prisma.$transaction([
      prisma.aWBStatusHistory.deleteMany({
        where: { awb: { order: { storeId: params.id } } },
      }),
      prisma.aWB.deleteMany({
        where: { order: { storeId: params.id } },
      }),
      prisma.invoice.deleteMany({
        where: { order: { storeId: params.id } },
      }),
      prisma.lineItem.deleteMany({
        where: { order: { storeId: params.id } },
      }),
      prisma.order.deleteMany({
        where: { storeId: params.id },
      }),
      prisma.store.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Eroare la ștergerea magazinului" },
      { status: 500 }
    );
  }
}
