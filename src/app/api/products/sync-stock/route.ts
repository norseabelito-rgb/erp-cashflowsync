import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

interface SmartBillStock {
  productCode: string;
  productName: string;
  quantity: number;
}

// POST - Sincronizare stocuri din SmartBill în MasterProduct
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

    // Citim setările SmartBill
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.smartbillEmail || !settings?.smartbillToken || !settings?.smartbillCompanyCif) {
      return NextResponse.json({
        success: false,
        error: "Configurația SmartBill nu este completă",
      }, { status: 400 });
    }

    const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
    const cif = settings.smartbillCompanyCif;
    const today = new Date().toISOString().split("T")[0];

    // Construim URL-ul
    let url = `https://ws.smartbill.ro/SBORO/api/stocks?cif=${encodeURIComponent(cif)}&date=${today}`;
    if (settings.smartbillWarehouseName) {
      url += `&warehouseName=${encodeURIComponent(settings.smartbillWarehouseName)}`;
    }

    console.log("Fetching SmartBill stocks for MasterProduct sync...");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData?.errorText || `Eroare HTTP ${response.status}`,
      }, { status: 500 });
    }

    const data = await response.json();

    if (data?.errorText) {
      return NextResponse.json({
        success: false,
        error: data.errorText,
      }, { status: 500 });
    }

    // Flatten structura SmartBill (grupată pe gestiuni)
    const smartbillStocks: SmartBillStock[] = [];
    for (const warehouseGroup of (data?.list || [])) {
      const products = warehouseGroup.products || [];
      for (const item of products) {
        smartbillStocks.push({
          productCode: item.productCode || item.code || "",
          productName: item.productName || item.name || "",
          quantity: parseFloat(item.quantity) || 0,
        });
      }
    }

    // Obține toate MasterProduct-urile
    const masterProducts = await prisma.masterProduct.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, stock: true },
    });

    // Creează map pentru lookup rapid
    const smartbillByCode = new Map<string, number>();
    for (const stock of smartbillStocks) {
      if (stock.productCode) {
        // Adaugă sau sumează dacă același cod apare în mai multe gestiuni
        const current = smartbillByCode.get(stock.productCode) || 0;
        smartbillByCode.set(stock.productCode, current + stock.quantity);
      }
    }

    // Actualizează stocurile
    const updates: Array<{ sku: string; oldStock: number; newStock: number }> = [];
    const notFound: string[] = [];

    for (const product of masterProducts) {
      const newStock = smartbillByCode.get(product.sku);
      
      if (newStock !== undefined) {
        const oldStock = product.stock;
        const roundedNewStock = Math.floor(newStock);

        if (oldStock !== roundedNewStock) {
          await prisma.masterProduct.update({
            where: { id: product.id },
            data: { 
              stock: roundedNewStock,
              stockLastSyncedAt: new Date(),
            },
          });

          updates.push({
            sku: product.sku,
            oldStock,
            newStock: roundedNewStock,
          });
        }
      } else {
        // Produsul nu a fost găsit în SmartBill
        notFound.push(product.sku);
      }
    }

    console.log(`Stock sync complete: ${updates.length} updated, ${notFound.length} not found in SmartBill`);

    return NextResponse.json({
      success: true,
      message: `Sincronizare completă: ${updates.length} produse actualizate`,
      results: {
        updated: updates.length,
        notFoundInSmartBill: notFound.length,
        updates: updates.slice(0, 50), // Primele 50 pentru afișare
        totalSmartBillProducts: smartbillStocks.length,
      },
    });

  } catch (error: any) {
    console.error("Stock sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
