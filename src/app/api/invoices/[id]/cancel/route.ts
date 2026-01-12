import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logInvoiceCancelled } from "@/lib/activity-log";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "";

    // Găsim factura
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost găsită" },
        { status: 404 }
      );
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Factura este deja anulată" },
        { status: 400 }
      );
    }

    if (!invoice.smartbillNumber || !invoice.smartbillSeries) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost emisă în SmartBill" },
        { status: 400 }
      );
    }

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

    console.log("\n" + "=".repeat(60));
    console.log("🚫 SMARTBILL - ANULARE FACTURĂ");
    console.log("=".repeat(60));
    console.log(`Factură: ${invoice.smartbillSeries}${invoice.smartbillNumber}`);
    console.log(`Comandă: #${invoice.order.shopifyOrderNumber}`);
    console.log(`Motiv: ${reason || "Nespecificat"}`);
    console.log("=".repeat(60));

    // Anulăm factura în SmartBill (POST /invoice/cancel)
    const cancelResponse = await fetch(
      "https://ws.smartbill.ro/SBORO/api/invoice/cancel",
      {
        method: "PUT",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          companyVatCode: settings.smartbillCompanyCif,
          seriesName: invoice.smartbillSeries,
          number: invoice.smartbillNumber,
        }),
      }
    );

    const cancelData = await cancelResponse.json();
    console.log("SmartBill cancel response:", cancelData);

    if (!cancelResponse.ok || cancelData?.errorText) {
      const errorMsg = cancelData?.errorText || cancelData?.message || `Eroare HTTP ${cancelResponse.status}`;
      console.error("❌ SMARTBILL - EROARE ANULARE:", errorMsg);
      
      return NextResponse.json({
        success: false,
        error: `Eroare SmartBill: ${errorMsg}`,
      });
    }

    // Extragem informațiile despre stornare
    const stornoNumber = cancelData?.number || null;
    const stornoSeries = cancelData?.series || null;

    // Actualizăm factura în baza de date
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || null,
        stornoNumber,
        stornoSeries,
      },
    });

    // Actualizăm statusul comenzii
    await prisma.order.update({
      where: { id: invoice.orderId },
      data: { status: "INVOICE_PENDING" }, // Revine la starea anterioară
    });

    // Logăm activitatea
    await logInvoiceCancelled({
      orderId: invoice.orderId,
      orderNumber: invoice.order.shopifyOrderNumber,
      invoiceNumber: invoice.smartbillNumber,
      invoiceSeries: invoice.smartbillSeries,
      stornoNumber: stornoNumber || undefined,
      stornoSeries: stornoSeries || undefined,
      reason,
    });

    console.log("✅ SMARTBILL - FACTURĂ ANULATĂ");
    if (stornoNumber) {
      console.log(`📄 Stornare emisă: ${stornoSeries}${stornoNumber}`);
    }
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      message: stornoNumber 
        ? `Factura a fost anulată. Stornare emisă: ${stornoSeries}${stornoNumber}`
        : "Factura a fost anulată cu succes",
      invoice: updatedInvoice,
      storno: stornoNumber ? { series: stornoSeries, number: stornoNumber } : null,
    });

  } catch (error: any) {
    console.error("Invoice cancel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la anularea facturii" },
      { status: 500 }
    );
  }
}
