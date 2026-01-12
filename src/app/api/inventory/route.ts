import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Lista produselor din inventar (pentru dropdown SKU)
export async function GET(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare inventar
    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza inventarul" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const excludeUsed = searchParams.get("excludeUsed") === "true";

    // Construiește where clause
    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Obține produsele din inventar
    const inventoryProducts = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        stockQuantity: true,
        description: true,
      },
      take: 100, // Limitează la 100 pentru performanță
    });

    // Dacă excludeUsed, excludem SKU-urile deja folosite în MasterProduct
    let products = inventoryProducts;
    
    if (excludeUsed) {
      const usedSkus = await prisma.masterProduct.findMany({
        select: { sku: true }
      });
      // Case-insensitive comparison
      const usedSkuSet = new Set(usedSkus.map(p => p.sku.toLowerCase()));
      products = inventoryProducts.filter(p => !usedSkuSet.has(p.sku.toLowerCase()));
    }

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
