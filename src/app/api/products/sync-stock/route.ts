import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { logStockSync } from "@/lib/activity-log";

// POST - Sincronizare stocuri în MasterProduct din inventarul local
// Nota: Funcționalitatea de sincronizare din SmartBill a fost dezactivată
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "products.edit");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Citim toate produsele master și stocurile lor din inventar
    const masterProducts = await prisma.masterProduct.findMany({
      where: { isActive: true },
      include: {
        inventoryItems: {
          select: {
            quantity: true,
            warehouseId: true,
          },
        },
      },
    });

    const updates: Array<{ sku: string; oldStock: number; newStock: number }> = [];
    const notFound: string[] = [];

    for (const product of masterProducts) {
      // Calculăm stocul total din toate depozitele
      const totalStock = product.inventoryItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // Dacă stocul calculat diferă de cel salvat, actualizăm
      if (totalStock !== product.stock) {
        await prisma.masterProduct.update({
          where: { id: product.id },
          data: { stock: totalStock },
        });

        updates.push({
          sku: product.sku,
          oldStock: product.stock,
          newStock: totalStock,
        });
      }

      // Produse fără stoc în inventar
      if (product.inventoryItems.length === 0) {
        notFound.push(product.sku);
      }
    }

    // Logăm sincronizarea dacă au fost modificări
    if (updates.length > 0) {
      await logStockSync({
        direction: "smartbill_to_erp", // Păstrăm pentru compatibilitate cu log-urile existente
        productsUpdated: updates.length,
        details: updates.map(u => ({
          sku: u.sku,
          oldQty: u.oldStock,
          newQty: u.newStock,
        })),
        success: true,
      });
    }

    console.log(`Stock sync complete: ${updates.length} updated, ${notFound.length} without inventory items`);

    return NextResponse.json({
      success: true,
      message: `Sincronizare completă: ${updates.length} produse actualizate`,
      data: {
        totalProducts: masterProducts.length,
        updatedProducts: updates.length,
        productsWithoutInventory: notFound.length,
        updates: updates.slice(0, 100), // Limităm la 100 pentru răspuns
      },
    });

  } catch (error: any) {
    console.error("Error syncing stocks:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Info despre sincronizarea stocurilor
export async function GET() {
  return NextResponse.json({
    message: "Endpoint pentru sincronizarea stocurilor între MasterProduct și InventoryItem",
    note: "Sincronizarea cu sisteme externe a fost dezactivată. Stocurile se gestionează local din inventar.",
    usage: "POST pentru a sincroniza stocurile MasterProduct cu totalul din InventoryItem",
  });
}
