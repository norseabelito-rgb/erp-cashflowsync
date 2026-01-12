import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// POST - Finalizare recepție (adaugă stoc)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { id } = params;

    // Verificăm dacă recepția există și este DRAFT
    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        supplier: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({
        success: false,
        error: "Recepția nu a fost găsită",
      }, { status: 404 });
    }

    if (receipt.status !== "DRAFT") {
      return NextResponse.json({
        success: false,
        error: `Recepția este în status ${receipt.status} și nu poate fi finalizată`,
      }, { status: 400 });
    }

    if (receipt.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Recepția nu are articole",
      }, { status: 400 });
    }

    // Procesăm fiecare articol și adăugăm stocul
    const movements: Array<{
      itemId: string;
      sku: string;
      name: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }> = [];

    for (const lineItem of receipt.items) {
      const item = lineItem.item;
      const quantity = Number(lineItem.quantity);
      const previousStock = Number(item.currentStock);
      const newStock = previousStock + quantity;

      // Actualizăm stocul articolului
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: newStock,
          // Actualizăm și costul dacă e furnizat
          ...(lineItem.unitCost && { costPrice: lineItem.unitCost }),
        },
      });

      // Creăm mișcarea de stoc
      await prisma.inventoryStockMovement.create({
        data: {
          itemId: item.id,
          type: "RECEIPT",
          quantity: quantity,
          previousStock,
          newStock,
          receiptId: receipt.id,
          reason: `Recepție ${receipt.receiptNumber}${receipt.documentNumber ? ` (Fact. ${receipt.documentNumber})` : ""}`,
          userId: session.user.id,
          userName: session.user.name || session.user.email,
        },
      });

      movements.push({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        quantity,
        previousStock,
        newStock,
      });
    }

    // Actualizăm statusul recepției
    const updatedReceipt = await prisma.goodsReceipt.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
        completedByName: session.user.name || session.user.email,
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ RECEPȚIE FINALIZATĂ");
    console.log("=".repeat(60));
    console.log(`📋 NIR: ${receipt.receiptNumber}`);
    console.log(`📄 Factură: ${receipt.documentNumber || "-"}`);
    console.log(`🏢 Furnizor: ${receipt.supplier?.name || "-"}`);
    console.log(`📦 Articole procesate: ${movements.length}`);
    movements.forEach((m) => {
      console.log(`   - ${m.sku}: +${m.quantity} (${m.previousStock} → ${m.newStock})`);
    });
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      data: updatedReceipt,
      movements,
      message: `Recepția ${receipt.receiptNumber} a fost finalizată. ${movements.length} articole actualizate.`,
    });
  } catch (error: any) {
    console.error("Error completing goods receipt:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la finalizarea recepției",
    }, { status: 500 });
  }
}
