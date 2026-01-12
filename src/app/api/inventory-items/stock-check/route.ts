import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  checkInventoryItemStock,
  checkOrderStock,
  checkOrderStockByProducts,
} from "@/lib/inventory-stock";

export const dynamic = 'force-dynamic';

/**
 * POST - Verifică disponibilitatea stocului
 *
 * Body pentru verificare articole:
 * { items: [{ inventoryItemId: string, quantity: number }] }
 *
 * Body pentru verificare comandă:
 * { orderId: string }
 *
 * Body pentru verificare singur articol:
 * { itemId: string, quantity: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { items, orderId, itemId, quantity } = body;

    // Verificare pentru o comandă existentă
    if (orderId) {
      const result = await checkOrderStockByProducts(orderId);

      return NextResponse.json({
        success: true,
        data: {
          canFulfill: result.canFulfill,
          totalItems: result.results.length,
          insufficientCount: result.insufficientItems.length,
          unmappedCount: result.unmappedProducts.length,
          results: result.results,
          insufficientItems: result.insufficientItems,
          unmappedProducts: result.unmappedProducts,
          alerts: result.insufficientItems.map(item => ({
            type: "insufficient_stock",
            severity: "error",
            message: `Stoc insuficient pentru ${item.name} (${item.sku}): necesar ${item.requestedQuantity}, disponibil ${item.availableQuantity}`,
            item,
          })),
        },
      });
    }

    // Verificare pentru mai multe articole
    if (items && Array.isArray(items)) {
      const result = await checkOrderStock(items);

      return NextResponse.json({
        success: true,
        data: {
          canFulfill: result.canFulfill,
          totalItems: result.results.length,
          insufficientCount: result.insufficientItems.length,
          results: result.results,
          insufficientItems: result.insufficientItems,
          alerts: result.insufficientItems.map(item => ({
            type: "insufficient_stock",
            severity: "error",
            message: `Stoc insuficient pentru ${item.name} (${item.sku}): necesar ${item.requestedQuantity}, disponibil ${item.availableQuantity}`,
            item,
          })),
        },
      });
    }

    // Verificare pentru un singur articol
    if (itemId && quantity !== undefined) {
      const result = await checkInventoryItemStock(itemId, quantity);

      return NextResponse.json({
        success: true,
        data: {
          canFulfill: result.canFulfill,
          result,
          alerts: !result.canFulfill
            ? [
                {
                  type: "insufficient_stock",
                  severity: "error",
                  message: result.isComposite && !result.hasRecipe
                    ? `Articolul compus ${result.name} nu are rețetă definită`
                    : `Stoc insuficient pentru ${result.name} (${result.sku}): necesar ${result.requestedQuantity}, disponibil ${result.availableQuantity}`,
                  insufficientComponents: result.insufficientComponents,
                },
              ]
            : [],
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "Trebuie să specifici items, orderId sau itemId + quantity",
    }, { status: 400 });

  } catch (error: any) {
    console.error("Error checking stock:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la verificarea stocului",
    }, { status: 500 });
  }
}
