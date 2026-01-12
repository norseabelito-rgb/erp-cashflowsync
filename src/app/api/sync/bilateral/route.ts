import { NextRequest, NextResponse } from "next/server";
import { syncInvoicesFromSmartBill } from "@/lib/smartbill";
import { syncAWBsFromFanCourier } from "@/lib/fancourier";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type } = body; // 'invoices', 'awbs', 'all'

    const results: {
      invoices?: any;
      awbs?: any;
    } = {};

    console.log("\n" + "=".repeat(70));
    console.log("🔄 SINCRONIZARE BILATERALĂ - START");
    console.log("=".repeat(70));
    console.log(`📅 ${new Date().toLocaleString('ro-RO')}`);
    console.log(`📋 Tip: ${type || 'all'}`);
    console.log("=".repeat(70) + "\n");

    // Sincronizare facturi SmartBill
    if (!type || type === 'invoices' || type === 'all') {
      try {
        results.invoices = await syncInvoicesFromSmartBill();
      } catch (error: any) {
        console.error("Eroare sincronizare facturi:", error.message);
        results.invoices = { error: error.message };
      }
    }

    // Sincronizare AWB-uri FanCourier
    if (!type || type === 'awbs' || type === 'all') {
      try {
        results.awbs = await syncAWBsFromFanCourier();
      } catch (error: any) {
        console.error("Eroare sincronizare AWB-uri:", error.message);
        results.awbs = { error: error.message };
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ SINCRONIZARE BILATERALĂ - FINALIZATĂ");
    console.log("=".repeat(70) + "\n");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Eroare sincronizare bilaterală:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Folosește POST pentru a iniția sincronizarea bilaterală",
    options: {
      type: "'invoices' | 'awbs' | 'all'",
    },
  });
}
