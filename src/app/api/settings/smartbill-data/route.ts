import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface SmartBillSeries {
  name: string;
  nextNumber: string;
  type: string;
}

interface SmartBillTax {
  name: string;
  percentage: number;
}

export async function POST(request: NextRequest) {
  try {
    // Citim setările din baza de date
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.smartbillEmail || !settings?.smartbillToken || !settings?.smartbillCompanyCif) {
      return NextResponse.json({
        success: false,
        error: "Completează și salvează credențialele SmartBill înainte de a încărca datele",
      });
    }

    const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
    const cif = settings.smartbillCompanyCif;

    // Fetch serii
    console.log("Fetching SmartBill series...");
    const seriesResponse = await fetch(
      `https://ws.smartbill.ro/SBORO/api/series?cif=${encodeURIComponent(cif)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "application/json",
        },
      }
    );

    let series: SmartBillSeries[] = [];
    if (seriesResponse.ok) {
      const seriesData = await seriesResponse.json();
      if (seriesData?.list) {
        series = seriesData.list.map((s: any) => ({
          name: s.name,
          nextNumber: s.nextNumber || "0001",
          type: s.type || "factura",
        }));
      }
    }

    // Fetch cote TVA
    console.log("Fetching SmartBill taxes...");
    const taxesResponse = await fetch(
      `https://ws.smartbill.ro/SBORO/api/tax?cif=${encodeURIComponent(cif)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "application/json",
        },
      }
    );

    let taxes: SmartBillTax[] = [];
    if (taxesResponse.ok) {
      const taxesData = await taxesResponse.json();
      if (taxesData?.taxes) {
        taxes = taxesData.taxes.map((t: any) => ({
          name: t.name || t.taxName,
          percentage: t.percentage || t.taxPercentage || 0,
        }));
      }
    }

    // Fetch gestiuni - încercăm mai multe metode
    console.log("Fetching SmartBill warehouses...");
    let warehouses: string[] = [];
    
    // Metoda 1: Endpoint dedicat pentru gestiuni
    try {
      const warehousesUrl = `https://ws.smartbill.ro/SBORO/api/stocks/warehouse?cif=${encodeURIComponent(cif)}`;
      console.log("Trying warehouses endpoint:", warehousesUrl);
      
      const warehousesResponse = await fetch(warehousesUrl, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "application/json",
        },
      });

      const warehousesText = await warehousesResponse.text();
      console.log("Warehouses response status:", warehousesResponse.status);
      console.log("Warehouses raw response:", warehousesText);
      
      if (warehousesResponse.ok && warehousesText) {
        try {
          const warehousesData = JSON.parse(warehousesText);
          console.log("Warehouses parsed data:", JSON.stringify(warehousesData, null, 2));
          
          // Încercăm toate formatele posibile
          let warehouseList: any[] = [];
          
          if (Array.isArray(warehousesData)) {
            warehouseList = warehousesData;
          } else if (warehousesData?.warehouses && Array.isArray(warehousesData.warehouses)) {
            warehouseList = warehousesData.warehouses;
          } else if (warehousesData?.list && Array.isArray(warehousesData.list)) {
            warehouseList = warehousesData.list;
          }
          
          console.log("Warehouse list to process:", JSON.stringify(warehouseList));
          
          warehouses = warehouseList.map((w: any) => {
            console.log("Processing warehouse item:", JSON.stringify(w));
            if (typeof w === 'string') return w;
            if (w?.warehouseName) return w.warehouseName;
            if (w?.name) return w.name;
            if (w?.warehouse) return w.warehouse;
            // Dacă e obiect cu o singură proprietate string
            const values = Object.values(w).filter(v => typeof v === 'string');
            if (values.length > 0) return values[0] as string;
            return null;
          }).filter((w): w is string => w !== null && w !== '');
          
          console.log("Extracted warehouses:", warehouses);
        } catch (parseError) {
          console.error("Error parsing warehouses JSON:", parseError);
        }
      }
    } catch (e) {
      console.log("Warehouses endpoint error:", e);
    }
    
    // Metoda 2: Dacă nu am găsit gestiuni, încercăm din stocuri
    if (warehouses.length === 0) {
      console.log("No warehouses found, trying stocks endpoint...");
      try {
        const today = new Date().toISOString().split("T")[0];
        const stocksUrl = `https://ws.smartbill.ro/SBORO/api/stocks?cif=${encodeURIComponent(cif)}&date=${today}`;
        console.log("Trying stocks endpoint:", stocksUrl);
        
        const stocksResponse = await fetch(stocksUrl, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Accept": "application/json",
          },
        });

        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          console.log("Stocks response keys:", Object.keys(stocksData));
          
          if (stocksData?.list && Array.isArray(stocksData.list)) {
            const warehouseSet = new Set<string>();
            stocksData.list.forEach((item: any) => {
              // Încercăm multiple câmpuri
              const possibleNames = [
                item.warehouse,
                item.warehouseName,
                item.gestiune,
                item.Warehouse,
                item.WarehouseName
              ];
              
              for (const name of possibleNames) {
                if (name) {
                  if (typeof name === 'string') {
                    warehouseSet.add(name);
                  } else if (typeof name === 'object' && name.warehouseName) {
                    warehouseSet.add(name.warehouseName);
                  }
                }
              }
            });
            warehouses = Array.from(warehouseSet);
            console.log("Warehouses from stocks:", warehouses);
          }
        }
      } catch (e2) {
        console.log("Stocks endpoint error:", e2);
      }
    }
    
    // Metoda 3: Încercăm să citim configurarea companiei
    if (warehouses.length === 0) {
      console.log("Still no warehouses, trying company config...");
      try {
        const configUrl = `https://ws.smartbill.ro/SBORO/api/company?cif=${encodeURIComponent(cif)}`;
        const configResponse = await fetch(configUrl, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Accept": "application/json",
          },
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          console.log("Company config:", JSON.stringify(configData, null, 2));
        }
      } catch (e3) {
        console.log("Company config error:", e3);
      }
    }
    
    console.log("Final warehouses list:", warehouses);

    // Salvăm în cache
    await prisma.settings.update({
      where: { id: "default" },
      data: {
        smartbillSeriesCache: JSON.stringify(series),
        smartbillTaxesCache: JSON.stringify(taxes),
        smartbillWarehousesCache: JSON.stringify(warehouses),
        smartbillCacheUpdated: new Date(),
      },
    });

    console.log(`SmartBill data fetched: ${series.length} series, ${taxes.length} taxes, ${warehouses.length} warehouses`);

    return NextResponse.json({
      success: true,
      data: {
        series,
        taxes,
        warehouses,
      },
      message: `Încărcat: ${series.length} serii, ${taxes.length} cote TVA, ${warehouses.length} gestiuni`,
    });
  } catch (error: any) {
    console.error("SmartBill fetch error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la încărcarea datelor din SmartBill",
    });
  }
}

// GET pentru a citi din cache
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json({
        success: false,
        error: "Setări negăsite",
      });
    }

    let series: SmartBillSeries[] = [];
    let taxes: SmartBillTax[] = [];
    let warehouses: string[] = [];

    if (settings.smartbillSeriesCache) {
      try {
        series = JSON.parse(settings.smartbillSeriesCache);
      } catch (e) {}
    }

    if (settings.smartbillTaxesCache) {
      try {
        taxes = JSON.parse(settings.smartbillTaxesCache);
      } catch (e) {}
    }

    // @ts-ignore - field may not exist yet
    if (settings.smartbillWarehousesCache) {
      try {
        // @ts-ignore
        warehouses = JSON.parse(settings.smartbillWarehousesCache);
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        series,
        taxes,
        warehouses,
        cacheUpdated: settings.smartbillCacheUpdated,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
