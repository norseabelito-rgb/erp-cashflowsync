import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createSmartBillClient } from "@/lib/smartbill";

export async function GET(request: NextRequest) {
  try {
    // Obține setările pentru a ști gestiunea
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: {
        smartbillWarehouseName: true,
        smartbillUseStock: true,
      },
    });

    if (!settings?.smartbillUseStock) {
      return NextResponse.json({
        success: false,
        error: "Gestionarea stocurilor nu este activată în setări",
        stocks: [],
      });
    }

    const warehouseName = settings.smartbillWarehouseName;

    if (!warehouseName) {
      return NextResponse.json({
        success: false,
        error: "Gestiunea nu este configurată în setări",
        stocks: [],
      });
    }

    const smartbill = await createSmartBillClient();
    const result = await smartbill.getStocks(warehouseName);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        stocks: [],
      });
    }

    // Calculăm statistici
    const stocks = result.stocks || [];
    const totalProducts = stocks.length;
    const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const outOfStock = stocks.filter(s => s.quantity <= 0).length;
    const lowStock = stocks.filter(s => s.quantity > 0 && s.quantity <= 5).length;

    return NextResponse.json({
      success: true,
      stocks,
      warehouseName,
      stats: {
        totalProducts,
        totalQuantity,
        outOfStock,
        lowStock,
      },
    });
  } catch (error: any) {
    console.error("Error fetching SmartBill stocks:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Eroare la obținerea stocurilor",
        stocks: [],
      },
      { status: 500 }
    );
  }
}
