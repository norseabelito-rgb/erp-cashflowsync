import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logStockSync } from "@/lib/activity-log";

interface StockItem {
  sku: string;
  productName: string;
  quantity: number;
  warehouse?: string;
}

// GET - Citește stocurile din inventarul local
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse");

    // Citim stocurile din inventarul local
    const whereClause: any = {};
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        masterProduct: true,
        warehouse: true,
      },
    });

    const stocks: StockItem[] = inventoryItems.map(item => ({
      sku: item.masterProduct?.sku || item.sku || "N/A",
      productName: item.masterProduct?.name || item.name || "Produs necunoscut",
      quantity: item.quantity,
      warehouse: item.warehouse?.name,
    }));

    return NextResponse.json({
      success: true,
      stocks,
      totalProducts: stocks.length,
      totalQuantity: stocks.reduce((sum, s) => sum + s.quantity, 0),
    });

  } catch (error: any) {
    console.error("Error fetching local stocks:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Sincronizare stocuri (dezactivată - Facturis nu suportă sincronizare stocuri)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { direction } = body;

    // Funcționalitatea de sincronizare cu SmartBill a fost dezactivată
    // Facturis nu oferă API pentru gestionarea stocurilor
    return NextResponse.json({
      success: false,
      error: "Sincronizarea stocurilor cu sistemul extern a fost dezactivată. Folosește gestionarea stocurilor din inventarul local.",
      suggestion: "Gestionează stocurile direct din secțiunea Inventar a aplicației.",
    });

  } catch (error: any) {
    console.error("Error in stock sync:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizare stoc local
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, quantity, warehouseId, reason } = body;

    if (!sku || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "SKU și cantitatea sunt obligatorii" },
        { status: 400 }
      );
    }

    // Găsim produsul în inventar
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { sku },
      include: { masterProduct: true },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: `Produsul cu SKU ${sku} nu a fost găsit în inventar` },
        { status: 404 }
      );
    }

    const oldQuantity = inventoryItem.quantity;
    const newQuantity = quantity;

    // Actualizăm cantitatea
    await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { quantity: newQuantity },
    });

    // Logăm sincronizarea
    await logStockSync({
      direction: "erp_to_external",
      productsUpdated: 1,
      details: [{ sku, oldQty: oldQuantity, newQty: newQuantity }],
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: `Stoc actualizat pentru ${sku}: ${oldQuantity} → ${newQuantity}`,
      oldQuantity,
      newQuantity,
    });

  } catch (error: any) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
