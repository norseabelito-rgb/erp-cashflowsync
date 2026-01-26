import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/ids
 * Returnează toate ID-urile produselor (pentru selecție bulk)
 * Acceptă aceleași filtre ca și endpoint-ul principal de produse
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const channelId = searchParams.get("channelId");

    // Construiește where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (channelId) {
      where.channels = {
        some: {
          channelId: channelId,
        },
      };
    }

    // Obține doar ID-urile (foarte eficient)
    const products = await prisma.masterProduct.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    const ids = products.map((p) => p.id);

    return NextResponse.json({
      success: true,
      ids,
      total: ids.length,
    });
  } catch (error: any) {
    console.error("Error fetching product IDs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
