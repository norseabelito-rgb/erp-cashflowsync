import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Debug endpoint pentru a verifica setările SmartBill
 * GET /api/settings/smartbill-debug
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: {
        smartbillEmail: true,
        smartbillToken: true,
        smartbillCompanyCif: true,
        smartbillSeriesName: true,
        smartbillWarehouseName: true,
        smartbillUseStock: true,
        smartbillTaxName: true,
        smartbillTaxPercent: true,
        smartbillDueDays: true,
        smartbillSeriesCache: true,
        smartbillTaxesCache: true,
        // @ts-ignore
        smartbillWarehousesCache: true,
        smartbillCacheUpdated: true,
      },
    });

    if (!settings) {
      return NextResponse.json({
        error: "Setări negăsite",
      });
    }

    // Parse cache data
    let seriesCache = null;
    let taxesCache = null;
    let warehousesCache = null;

    try {
      if (settings.smartbillSeriesCache) {
        seriesCache = JSON.parse(settings.smartbillSeriesCache);
      }
    } catch (e) {}

    try {
      if (settings.smartbillTaxesCache) {
        taxesCache = JSON.parse(settings.smartbillTaxesCache);
      }
    } catch (e) {}

    try {
      // @ts-ignore
      if (settings.smartbillWarehousesCache) {
        // @ts-ignore
        warehousesCache = JSON.parse(settings.smartbillWarehousesCache);
      }
    } catch (e) {}

    return NextResponse.json({
      message: "SmartBill Settings Debug",
      timestamp: new Date().toISOString(),
      
      // Credențiale (mascate)
      credentials: {
        email: settings.smartbillEmail || "NOT SET",
        token: settings.smartbillToken ? "SET (hidden)" : "NOT SET",
        cif: settings.smartbillCompanyCif || "NOT SET",
      },
      
      // Setări active pentru facturare
      invoiceSettings: {
        seriesName: settings.smartbillSeriesName || "NOT SET",
        taxName: settings.smartbillTaxName || "NOT SET (default: Normala)",
        taxPercent: settings.smartbillTaxPercent ?? "NOT SET (default: 19)",
        dueDays: settings.smartbillDueDays ?? 0,
        useStock: settings.smartbillUseStock ?? false,
        warehouseName: settings.smartbillWarehouseName || "NOT SET",
      },
      
      // Cache din SmartBill API
      cache: {
        lastUpdated: settings.smartbillCacheUpdated || "NEVER",
        series: seriesCache,
        taxes: taxesCache,
        warehouses: warehousesCache,
      },
      
      // Analiză probleme potențiale
      potentialIssues: checkIssues(settings, taxesCache),
    });
  } catch (error: any) {
    console.error("SmartBill debug error:", error);
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}

function checkIssues(settings: any, taxesCache: any): string[] {
  const issues: string[] = [];
  
  // Check if taxName matches any tax in cache
  if (settings.smartbillTaxName && taxesCache && Array.isArray(taxesCache)) {
    const matchingTax = taxesCache.find(
      (t: any) => t.name === settings.smartbillTaxName
    );
    
    if (!matchingTax) {
      issues.push(
        `⚠️ Cota TVA "${settings.smartbillTaxName}" nu există în cache! ` +
        `Cote disponibile: ${taxesCache.map((t: any) => t.name).join(", ")}`
      );
    } else if (matchingTax.percentage !== settings.smartbillTaxPercent) {
      issues.push(
        `⚠️ Procent TVA inconsistent! Setat: ${settings.smartbillTaxPercent}%, ` +
        `dar cota "${settings.smartbillTaxName}" are ${matchingTax.percentage}%`
      );
    }
  }
  
  // Check if taxPercent is valid
  if (settings.smartbillTaxPercent && ![0, 5, 9, 19].includes(settings.smartbillTaxPercent)) {
    issues.push(
      `⚠️ Procent TVA neobișnuit: ${settings.smartbillTaxPercent}%. ` +
      `În România, cotele standard sunt: 0%, 5%, 9%, 19%`
    );
  }
  
  // Check if cache is stale
  if (!settings.smartbillCacheUpdated) {
    issues.push("⚠️ Cache-ul SmartBill nu a fost niciodată încărcat. Click 'Încarcă date SmartBill' în Setări.");
  } else {
    const cacheAge = Date.now() - new Date(settings.smartbillCacheUpdated).getTime();
    const daysOld = Math.floor(cacheAge / (1000 * 60 * 60 * 24));
    if (daysOld > 7) {
      issues.push(`⚠️ Cache-ul SmartBill e vechi de ${daysOld} zile. Recomandăm reîncărcarea.`);
    }
  }
  
  // Check if series is set
  if (!settings.smartbillSeriesName) {
    issues.push("⚠️ Seria de facturare nu este setată!");
  }
  
  if (issues.length === 0) {
    issues.push("✅ Nu s-au detectat probleme în configurație.");
  }
  
  return issues;
}
