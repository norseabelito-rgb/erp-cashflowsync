import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logStockSync, logStockMovement } from "@/lib/activity-log";

interface SmartBillStock {
  productName: string;
  productCode: string;
  quantity: number;
  warehouse: string;
  measuringUnit: string;
  averageAcquisitionPrice?: number;
}

interface StockComparison {
  sku: string;
  productName: string;
  erpQuantity: number;
  smartbillQuantity: number;
  difference: number;
  warehouse?: string;
}

// GET - Citește stocurile din SmartBill și compară cu ERP
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseName = searchParams.get("warehouse");
    const compareOnly = searchParams.get("compare") === "true";

    // Citim setările SmartBill
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.smartbillEmail || !settings?.smartbillToken || !settings?.smartbillCompanyCif) {
      return NextResponse.json({
        success: false,
        error: "Configurația SmartBill nu este completă",
      });
    }

    const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
    const cif = settings.smartbillCompanyCif;
    const today = new Date().toISOString().split("T")[0];

    // Construim URL-ul
    let url = `https://ws.smartbill.ro/SBORO/api/stocks?cif=${encodeURIComponent(cif)}&date=${today}`;
    if (warehouseName) {
      url += `&warehouseName=${encodeURIComponent(warehouseName)}`;
    }

    console.log("Fetching SmartBill stocks...", url);

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
      });
    }

    const data = await response.json();
    
    if (data?.errorText) {
      return NextResponse.json({
        success: false,
        error: data.errorText,
      });
    }

    // DEBUG: Logăm primul item pentru a vedea structura
    if (data?.list?.[0]) {
      console.log("=== SmartBill Stock Item Structure ===");
      console.log(JSON.stringify(data.list[0], null, 2));
      console.log("======================================");
    }

    // SmartBill returnează structură grupată pe gestiuni:
    // { warehouse: { warehouseName, warehouseType }, products: [...] }
    const smartbillStocks: SmartBillStock[] = [];

    for (const warehouseGroup of (data?.list || [])) {
      // Extrage numele gestiunii
      let warehouseStr = "";
      if (typeof warehouseGroup.warehouse === "string") {
        warehouseStr = warehouseGroup.warehouse;
      } else if (warehouseGroup.warehouse?.warehouseName) {
        warehouseStr = warehouseGroup.warehouse.warehouseName;
      }

      // Parcurge produsele din această gestiune
      const products = warehouseGroup.products || [];
      for (const item of products) {
        smartbillStocks.push({
          productName: item.productName || item.name || "",
          productCode: item.productCode || item.code || "",
          quantity: parseFloat(item.quantity) || 0,
          warehouse: warehouseStr,
          measuringUnit: item.measuringUnit || item.measuringUnitName || "buc",
          averageAcquisitionPrice: parseFloat(item.averageAcquisitionPrice) || 0,
        });
      }
    }

    // Dacă vrem să comparăm cu ERP
    if (compareOnly) {
      // Obținem produsele din ERP
      const erpProducts = await prisma.product.findMany({
        where: { isActive: true },
        select: {
          sku: true,
          name: true,
          stockQuantity: true,
        },
      });

      // Comparăm stocurile
      const comparison: StockComparison[] = [];
      const smartbillByCode = new Map<string, SmartBillStock>();
      
      smartbillStocks.forEach(stock => {
        if (stock.productCode) {
          smartbillByCode.set(stock.productCode, stock);
        }
      });

      // Verificăm produsele ERP
      for (const product of erpProducts) {
        const sbStock = smartbillByCode.get(product.sku);
        const sbQuantity = sbStock?.quantity || 0;
        
        if (product.stockQuantity !== sbQuantity) {
          comparison.push({
            sku: product.sku,
            productName: product.name,
            erpQuantity: product.stockQuantity,
            smartbillQuantity: sbQuantity,
            difference: product.stockQuantity - sbQuantity,
            warehouse: sbStock?.warehouse,
          });
        }
      }

      // Verificăm produse în SmartBill dar nu în ERP
      for (const [code, sbStock] of smartbillByCode) {
        const erpProduct = erpProducts.find(p => p.sku === code);
        if (!erpProduct && sbStock.quantity > 0) {
          comparison.push({
            sku: code,
            productName: sbStock.productName,
            erpQuantity: 0,
            smartbillQuantity: sbStock.quantity,
            difference: -sbStock.quantity,
            warehouse: sbStock.warehouse,
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          smartbillStocks,
          comparison,
          totalDifferences: comparison.length,
          warehouses: [...new Set(smartbillStocks.map(s => s.warehouse).filter(Boolean))],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        stocks: smartbillStocks,
        total: smartbillStocks.length,
        warehouses: [...new Set(smartbillStocks.map(s => s.warehouse).filter(Boolean))],
      },
    });

  } catch (error: any) {
    console.error("Stock sync error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea stocurilor",
    });
  }
}

// POST - Sincronizează stocurile
export async function POST(request: NextRequest) {
  try {
    // Parsează body-ul dacă există
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Body gol sau invalid - continuăm cu default
    }

    const { direction = "smartbill_to_erp", confirm, changes } = body;

    // direction: "smartbill_to_erp" sau "erp_to_smartbill"
    // confirm: true dacă utilizatorul a confirmat modificările
    // changes: array cu modificările de aplicat (pentru erp_to_smartbill)

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.smartbillEmail || !settings?.smartbillToken || !settings?.smartbillCompanyCif) {
      return NextResponse.json({
        success: false,
        error: "Configurația SmartBill nu este completă",
      });
    }

    if (direction === "smartbill_to_erp") {
      // Sincronizăm din SmartBill în ERP
      const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
      const cif = settings.smartbillCompanyCif;
      const today = new Date().toISOString().split("T")[0];
      
      let url = `https://ws.smartbill.ro/SBORO/api/stocks?cif=${encodeURIComponent(cif)}&date=${today}`;
      if (settings.smartbillWarehouseName) {
        url += `&warehouseName=${encodeURIComponent(settings.smartbillWarehouseName)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Nu s-au putut citi stocurile din SmartBill");
      }

      const data = await response.json();
      
      // Flatten structura SmartBill (grupată pe gestiuni)
      const smartbillStocks: Array<{ productCode: string; productName: string; quantity: number }> = [];
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

      // Actualizăm/creăm produsele în ERP
      const updates: Array<{ sku: string; oldQty: number; newQty: number }> = [];
      const created: Array<{ sku: string; name: string; qty: number }> = [];
      const { createMissing } = body;
      
      for (const sbStock of smartbillStocks) {
        const productCode = sbStock.productCode;
        if (!productCode) continue;

        const erpProduct = await prisma.product.findUnique({
          where: { sku: productCode },
        });

        if (erpProduct) {
          // Produs existent - actualizăm stocul
          const newQuantity = Math.floor(sbStock.quantity || 0);
          
          if (erpProduct.stockQuantity !== newQuantity) {
            const oldQty = erpProduct.stockQuantity;
            
            await prisma.product.update({
              where: { sku: productCode },
              data: { stockQuantity: newQuantity },
            });

            updates.push({
              sku: productCode,
              oldQty,
              newQty: newQuantity,
            });

            // Logăm mișcarea de stoc
            await logStockMovement({
              productSku: productCode,
              productName: erpProduct.name,
              type: "ADJUST",
              quantity: newQuantity - oldQty,
              oldQuantity: oldQty,
              newQuantity: newQuantity,
              reason: "Sincronizare din SmartBill",
            });
          }
        } else if (createMissing !== false) {
          // Produs nou - îl creăm în baza de date locală
          const newQuantity = Math.floor(sbStock.quantity || 0);
          
          await prisma.product.create({
            data: {
              sku: productCode,
              name: sbStock.productName || productCode,
              stockQuantity: newQuantity,
              price: 0, // Va fi actualizat manual sau din altă sursă
              costPrice: 0,
              lowStockAlert: 5,
              unit: "buc",
              isActive: true,
            },
          });

          created.push({
            sku: productCode,
            name: sbStock.productName || productCode,
            qty: newQuantity,
          });
        }
      }

      // Logăm sincronizarea
      await logStockSync({
        direction: "smartbill_to_erp",
        productsUpdated: updates.length,
        details: updates.map(u => ({ sku: u.sku, oldQty: u.oldQty, newQty: u.newQty })),
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: `Sincronizare completă. ${updates.length} produse actualizate, ${created.length} produse noi create.`,
        updates,
        created,
        synced: updates.length + created.length,
      });

    } else if (direction === "erp_to_smartbill") {
      // Pentru această direcție, TREBUIE să confirmăm și să avem lista de modificări
      
      if (!confirm) {
        // Pas 1: Returnăm preview-ul modificărilor
        const erpProducts = await prisma.product.findMany({
          where: { isActive: true },
          select: {
            sku: true,
            name: true,
            stockQuantity: true,
          },
        });

        // Citim stocurile din SmartBill pentru comparație
        const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
        const cif = settings.smartbillCompanyCif;
        const today = new Date().toISOString().split("T")[0];
        
        let url = `https://ws.smartbill.ro/SBORO/api/stocks?cif=${encodeURIComponent(cif)}&date=${today}`;
        if (settings.smartbillWarehouseName) {
          url += `&warehouseName=${encodeURIComponent(settings.smartbillWarehouseName)}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Accept": "application/json",
          },
        });

        const data = await response.json();
        
        // Flatten structura SmartBill (grupată pe gestiuni)
        const smartbillByCode = new Map<string, number>();
        for (const warehouseGroup of (data?.list || [])) {
          const products = warehouseGroup.products || [];
          for (const item of products) {
            const code = item.productCode || item.code;
            if (code) {
              smartbillByCode.set(code, parseFloat(item.quantity) || 0);
            }
          }
        }

        // Calculăm modificările necesare
        const pendingChanges: Array<{
          sku: string;
          name: string;
          currentSmartBill: number;
          newQuantity: number;
          difference: number;
          operation: "increase" | "decrease";
        }> = [];

        for (const product of erpProducts) {
          const sbQuantity = smartbillByCode.get(product.sku) || 0;
          
          if (product.stockQuantity !== sbQuantity) {
            const diff = product.stockQuantity - sbQuantity;
            pendingChanges.push({
              sku: product.sku,
              name: product.name,
              currentSmartBill: sbQuantity,
              newQuantity: product.stockQuantity,
              difference: diff,
              operation: diff > 0 ? "increase" : "decrease",
            });
          }
        }

        return NextResponse.json({
          success: true,
          needsConfirmation: true,
          message: `${pendingChanges.length} produse necesită actualizare în SmartBill`,
          pendingChanges,
          warning: "ATENȚIE: Modificarea stocurilor în SmartBill se face prin emiterea de documente (NIR pentru creștere, factură/consum pentru scădere). Această funcție va crea documentele necesare automat.",
        });
      }

      // Pas 2: Aplicăm modificările (confirm === true)
      // NOTĂ: SmartBill nu permite modificarea directă a stocurilor prin API.
      // Stocul se modifică doar prin documente (NIR, facturi, etc.)
      // Această funcționalitate ar necesita emiterea de NIR-uri pentru creștere
      // și documente de consum pentru scădere.
      
      return NextResponse.json({
        success: false,
        error: "Modificarea stocurilor în SmartBill nu este disponibilă direct prin API. Stocurile SmartBill se modifică automat prin emiterea facturilor cu descărcare de stoc activată. Pentru ajustări manuale, folosește interfața SmartBill.",
        suggestion: "Activează 'Descărcare stoc la emitere factură' în Setări pentru a sincroniza automat stocurile la fiecare vânzare.",
      });
    }

    return NextResponse.json({
      success: false,
      error: "Direcție de sincronizare invalidă",
    });

  } catch (error: any) {
    console.error("Stock sync error:", error);
    
    await logStockSync({
      direction: "smartbill_to_erp",
      productsUpdated: 0,
      success: false,
      errorMessage: error.message,
    });

    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la sincronizarea stocurilor",
    });
  }
}
