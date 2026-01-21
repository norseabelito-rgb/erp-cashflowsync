import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logInvoiceCancelled } from "@/lib/activity-log";
import { createFacturisClient } from "@/lib/facturis";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "";

    // Găsim factura cu toate relațiile necesare
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            store: {
              include: {
                company: true,
              },
            },
          },
        },
        company: true,
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

    if (!invoice.invoiceNumber) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost emisă în Facturis" },
        { status: 400 }
      );
    }

    // Obținem firma pentru credențiale
    const company = invoice.company || invoice.order.store?.company;

    if (!company) {
      return NextResponse.json({
        success: false,
        error: "Nu s-a găsit firma asociată facturii",
      });
    }

    if (!company.facturisApiKey || !company.facturisUsername || !company.facturisPassword) {
      return NextResponse.json({
        success: false,
        error: "Configurația Facturis nu este completă pentru această firmă",
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🚫 FACTURIS - ANULARE FACTURĂ");
    console.log("=".repeat(60));
    console.log(`Factură: ${invoice.invoiceSeriesName || ''}${invoice.invoiceNumber || ''}`);
    console.log(`Comandă: #${invoice.order.shopifyOrderNumber}`);
    console.log(`Firma: ${company.name}`);
    console.log(`Motiv: ${reason || "Nespecificat"}`);
    console.log("=".repeat(60));

    // Anulăm factura în Facturis
    const facturisClient = createFacturisClient(company);

    // Folosim facturisId dacă există
    const facturisKey = invoice.facturisId;

    if (!facturisKey) {
      // Dacă nu avem key, anulăm doar local
      console.log("⚠️ Nu există ID Facturis, anulăm doar local");
    } else {
      const cancelResult = await facturisClient.cancelInvoice(facturisKey);

      if (!cancelResult.success) {
        console.error("❌ FACTURIS - EROARE ANULARE:", cancelResult.error);

        return NextResponse.json({
          success: false,
          error: `Eroare Facturis: ${cancelResult.error}`,
        });
      }

      console.log("✅ Facturis cancel response:", cancelResult.message);
    }

    // Actualizăm factura în baza de date
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || null,
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
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceSeries: invoice.invoiceSeriesName || '',
      reason,
    });

    console.log("✅ FACTURIS - FACTURĂ ANULATĂ");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      message: "Factura a fost anulată cu succes",
      invoice: updatedInvoice,
    });

  } catch (error: any) {
    console.error("Invoice cancel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la anularea facturii" },
      { status: 500 }
    );
  }
}
