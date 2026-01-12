import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncAllStoresOrders } from "@/lib/shopify";
import { syncInvoicesFromSmartBill } from "@/lib/smartbill";
import { syncAWBsFromFanCourier } from "@/lib/fancourier";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canSync = await hasPermission(session.user.id, "sync.run");
    if (!canSync) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    console.log("\n" + "=".repeat(70));
    console.log("🔄 SINCRONIZARE COMPLETĂ - START");
    console.log("=".repeat(70));
    console.log(`📅 ${new Date().toLocaleString('ro-RO')}`);
    console.log("=".repeat(70) + "\n");

    // 1. Sincronizare comenzi din Shopify
    console.log("📦 Pas 1: Sincronizare comenzi din Shopify...");
    const shopifyResult = await syncAllStoresOrders();

    // 2. Sincronizare bilaterală facturi din SmartBill
    console.log("\n🧾 Pas 2: Sincronizare bilaterală facturi SmartBill...");
    let invoicesResult = null;
    try {
      invoicesResult = await syncInvoicesFromSmartBill();
    } catch (error: any) {
      console.error("Eroare sincronizare facturi:", error.message);
    }

    // 3. Sincronizare bilaterală AWB-uri din FanCourier
    console.log("\n🚚 Pas 3: Sincronizare bilaterală AWB-uri FanCourier...");
    let awbsResult = null;
    try {
      awbsResult = await syncAWBsFromFanCourier();
    } catch (error: any) {
      console.error("Eroare sincronizare AWB-uri:", error.message);
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ SINCRONIZARE COMPLETĂ - FINALIZATĂ");
    console.log("=".repeat(70));
    console.log(`📦 Comenzi Shopify: ${shopifyResult.synced} sincronizate`);
    if (invoicesResult) {
      console.log(`🧾 Facturi SmartBill: ${invoicesResult.checked} verificate, ${invoicesResult.deleted} modificate`);
    }
    if (awbsResult) {
      console.log(`🚚 AWB-uri FanCourier: ${awbsResult.checked} verificate, ${awbsResult.statusChanges} modificate`);
    }
    console.log("=".repeat(70) + "\n");

    // Combinăm toate modificările
    const bilateralChanges = [];
    if (invoicesResult?.details) {
      bilateralChanges.push(...invoicesResult.details.map(d => ({
        type: 'invoice',
        ...d
      })));
    }
    if (awbsResult?.details) {
      bilateralChanges.push(...awbsResult.details.map(d => ({
        type: 'awb',
        ...d
      })));
    }

    return NextResponse.json({
      ...shopifyResult,
      bilateral: {
        invoices: invoicesResult ? {
          checked: invoicesResult.checked,
          deleted: invoicesResult.deleted,
          errors: invoicesResult.errors,
        } : null,
        awbs: awbsResult ? {
          checked: awbsResult.checked,
          updated: awbsResult.updated,
          statusChanges: awbsResult.statusChanges,
          errors: awbsResult.errors,
        } : null,
        changes: bilateralChanges,
      },
    });
  } catch (error: any) {
    console.error("Error syncing all stores:", error);
    return NextResponse.json(
      { error: `Eroare la sincronizare: ${error.message}` },
      { status: 500 }
    );
  }
}
