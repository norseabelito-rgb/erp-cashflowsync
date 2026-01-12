import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getLowStockAlerts, getProductionCapacity } from "@/lib/inventory-stock";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET - Obține alertele de stoc scăzut
 *
 * Query params:
 * - includeComposite: true/false - include și capacitatea de producție pentru articole compuse
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeComposite = searchParams.get("includeComposite") === "true";

    // Obține alertele de stoc scăzut pentru articole individuale
    const lowStockAlerts = await getLowStockAlerts();

    // Grupare pe severitate
    const criticalAlerts = lowStockAlerts.filter(a => a.currentStock === 0);
    const warningAlerts = lowStockAlerts.filter(a => a.currentStock > 0);

    // Dacă vrem și capacitatea de producție pentru compuse
    let compositeAlerts: Array<{
      id: string;
      sku: string;
      name: string;
      canProduce: number;
      hasRecipe: boolean;
      limitingComponent?: {
        id: string;
        sku: string;
        name: string;
        currentStock: number;
        requiredPerUnit: number;
      };
    }> = [];

    if (includeComposite) {
      const compositeItems = await prisma.inventoryItem.findMany({
        where: {
          isActive: true,
          isComposite: true,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          recipeComponents: {
            select: { id: true },
          },
        },
      });

      for (const item of compositeItems) {
        const capacity = await getProductionCapacity(item.id);
        compositeAlerts.push({
          id: item.id,
          sku: item.sku,
          name: item.name,
          canProduce: capacity.canProduce,
          hasRecipe: item.recipeComponents.length > 0,
          limitingComponent: capacity.limitingComponent,
        });
      }

      // Sortăm după capacitate de producție (cele cu 0 primele)
      compositeAlerts.sort((a, b) => a.canProduce - b.canProduce);
    }

    // Statistici
    const stats = {
      totalAlerts: lowStockAlerts.length,
      criticalCount: criticalAlerts.length,
      warningCount: warningAlerts.length,
      compositeWithoutStock: compositeAlerts.filter(c => c.canProduce === 0 && c.hasRecipe).length,
      compositeWithoutRecipe: compositeAlerts.filter(c => !c.hasRecipe).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        alerts: {
          critical: criticalAlerts.map(a => ({
            ...a,
            severity: "critical",
            message: `${a.name} (${a.sku}) - FĂRĂ STOC`,
          })),
          warning: warningAlerts.map(a => ({
            ...a,
            severity: "warning",
            message: `${a.name} (${a.sku}) - stoc scăzut: ${a.currentStock}/${a.minStock} ${a.unit}`,
          })),
        },
        composite: includeComposite ? {
          cannotProduce: compositeAlerts.filter(c => c.canProduce === 0 && c.hasRecipe),
          lowCapacity: compositeAlerts.filter(c => c.canProduce > 0 && c.canProduce <= 5),
          noRecipe: compositeAlerts.filter(c => !c.hasRecipe),
        } : undefined,
        allAlerts: lowStockAlerts,
      },
    });
  } catch (error: any) {
    console.error("Error fetching low stock alerts:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea alertelor de stoc",
    }, { status: 500 });
  }
}
