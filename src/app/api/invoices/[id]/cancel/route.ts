import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logInvoiceCancelled } from "@/lib/activity-log";
import { createOblioClient } from "@/lib/oblio";

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

    // Obținem firma pentru credențiale
    const company = invoice.company || invoice.order.store?.company;

    if (!company) {
      return NextResponse.json({
        success: false,
        error: "Nu s-a găsit firma asociată facturii",
      });
    }

    if (!company.oblioEmail || !company.oblioSecretToken) {
      return NextResponse.json({
        success: false,
        error: "Configurația Oblio nu este completă pentru această firmă",
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("OBLIO - ANULARE FACTURA");
    console.log("=".repeat(60));
    console.log(`Factura: ${invoice.invoiceSeriesName || ''}${invoice.invoiceNumber || ''}`);
    console.log(`Comanda: #${invoice.order.shopifyOrderNumber}`);
    console.log(`Firma: ${company.name}`);
    console.log(`Motiv: ${reason || "Nespecificat"}`);
    console.log("=".repeat(60));

    // Anulăm factura în Oblio
    const oblioClient = createOblioClient(company);

    // Folosim oblioId dacă există
    const oblioKey = invoice.oblioId;

    if (!oblioKey || !invoice.invoiceSeriesName || !invoice.invoiceNumber) {
      // Dacă nu avem key, anulăm doar local
      console.log("Nu exista ID Oblio, anulam doar local");
    } else if (oblioClient) {
      const cancelResult = await oblioClient.cancelInvoice(invoice.invoiceSeriesName, invoice.invoiceNumber);

      if (!cancelResult.success) {
        console.error("OBLIO - EROARE ANULARE:", cancelResult.error);

        return NextResponse.json({
          success: false,
          error: `Eroare Oblio: ${cancelResult.error}`,
        });
      }

      console.log("Oblio cancel response: success");
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

    console.log("OBLIO - FACTURA ANULATA");
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
