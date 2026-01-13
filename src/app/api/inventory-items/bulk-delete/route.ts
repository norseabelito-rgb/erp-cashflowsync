import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// POST /api/inventory-items/bulk-delete - Delete multiple inventory items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Lista de ID-uri este obligatorie",
      }, { status: 400 });
    }

    // Check for dependencies on each item
    const itemsWithDeps = await prisma.inventoryItem.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: {
            mappedProducts: true,
            usedInRecipes: true,
          },
        },
      },
    });

    const skipped: Array<{ sku: string; reason: string }> = [];
    const toDelete: string[] = [];

    for (const item of itemsWithDeps) {
      if (item._count.mappedProducts > 0) {
        skipped.push({
          sku: item.sku,
          reason: `Mapat la ${item._count.mappedProducts} produse`,
        });
      } else if (item._count.usedInRecipes > 0) {
        skipped.push({
          sku: item.sku,
          reason: `Folosit în ${item._count.usedInRecipes} rețete`,
        });
      } else {
        toDelete.push(item.id);
      }
    }

    // Delete items that have no dependencies (soft delete - set isActive to false)
    if (toDelete.length > 0) {
      await prisma.inventoryItem.updateMany({
        where: { id: { in: toDelete } },
        data: { isActive: false },
      });
    }

    const deletedCount = toDelete.length;
    const skippedCount = skipped.length;

    let message = `${deletedCount} articole dezactivate`;
    if (skippedCount > 0) {
      message += `, ${skippedCount} omise (au dependențe)`;
    }

    return NextResponse.json({
      success: true,
      message,
      results: {
        deleted: deletedCount,
        skipped: skippedCount,
        skippedItems: skipped,
      },
    });
  } catch (error: unknown) {
    console.error("Error bulk deleting inventory items:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Eroare la ștergere",
    }, { status: 500 });
  }
}
