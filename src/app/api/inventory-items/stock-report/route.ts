import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Raport stoc la o anumită dată
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
    const dateStr = searchParams.get("date");
    const supplierId = searchParams.get("supplierId");
    const isComposite = searchParams.get("isComposite");
    const search = searchParams.get("search");

    // Default to current date if not specified
    const reportDate = dateStr ? new Date(dateStr) : new Date();
    // Set to end of day
    reportDate.setHours(23, 59, 59, 999);

    // Build filter for items
    const itemWhere: any = {
      isActive: true,
    };

    if (supplierId) {
      itemWhere.supplierId = supplierId;
    }

    if (isComposite !== null && isComposite !== undefined && isComposite !== "") {
      itemWhere.isComposite = isComposite === "true";
    }

    if (search) {
      itemWhere.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get all active inventory items
    const items = await prisma.inventoryItem.findMany({
      where: itemWhere,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ sku: "asc" }],
    });

    // Get all movements up to and including the report date
    const movements = await prisma.inventoryStockMovement.findMany({
      where: {
        createdAt: { lte: reportDate },
        itemId: { in: items.map(i => i.id) },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate stock at date for each item
    // We need to find the last movement before/at the date to get the newStock
    // Or calculate from movements
    const stockAtDate = new Map<string, number>();

    // Group movements by item
    const movementsByItem = new Map<string, typeof movements>();
    for (const movement of movements) {
      if (!movementsByItem.has(movement.itemId)) {
        movementsByItem.set(movement.itemId, []);
      }
      movementsByItem.get(movement.itemId)!.push(movement);
    }

    // For each item, find the stock at the given date
    for (const item of items) {
      const itemMovements = movementsByItem.get(item.id) || [];

      if (itemMovements.length === 0) {
        // No movements - stock at date is either current stock (if date is today/future)
        // or 0 if the item was created after the report date
        if (new Date(item.createdAt) <= reportDate) {
          // Item existed but had no movements - could be initial stock
          // We'll use currentStock as approximation if no movements exist
          stockAtDate.set(item.id, Number(item.currentStock));
        } else {
          stockAtDate.set(item.id, 0);
        }
      } else {
        // Find the last movement at or before the report date
        let lastMovement = null;
        for (const movement of itemMovements) {
          if (new Date(movement.createdAt) <= reportDate) {
            lastMovement = movement;
          }
        }

        if (lastMovement) {
          stockAtDate.set(item.id, Number(lastMovement.newStock));
        } else {
          // All movements are after the report date - use 0 or initial
          stockAtDate.set(item.id, 0);
        }
      }
    }

    // Build report data
    const reportData = items.map(item => {
      const stockQty = stockAtDate.get(item.id) || 0;
      const currentStock = Number(item.currentStock);
      const costPrice = item.costPrice ? Number(item.costPrice) : 0;

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        isComposite: item.isComposite,
        supplier: item.supplier,
        costPrice,
        minStock: item.minStock ? Number(item.minStock) : null,
        stockAtDate: stockQty,
        currentStock,
        stockDifference: currentStock - stockQty,
        valueAtDate: stockQty * costPrice,
        currentValue: currentStock * costPrice,
        isBelowMin: item.minStock ? stockQty < Number(item.minStock) : false,
      };
    });

    // Calculate totals
    const totals = reportData.reduce(
      (acc, item) => {
        acc.totalItems++;
        acc.totalValueAtDate += item.valueAtDate;
        acc.totalCurrentValue += item.currentValue;
        if (item.isBelowMin) acc.itemsBelowMin++;
        if (item.stockAtDate === 0) acc.itemsOutOfStock++;
        return acc;
      },
      {
        totalItems: 0,
        totalValueAtDate: 0,
        totalCurrentValue: 0,
        itemsBelowMin: 0,
        itemsOutOfStock: 0,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        reportDate: reportDate.toISOString(),
        items: reportData,
        totals,
      },
    });
  } catch (error: any) {
    console.error("Error generating stock report:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la generarea raportului de stoc",
    }, { status: 500 });
  }
}
