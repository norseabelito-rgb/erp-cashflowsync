import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logPaymentReceived } from "@/lib/activity-log";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { amount, method } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Suma trebuie să fie mai mare decât 0" },
        { status: 400 }
      );
    }

    // Găsește factura
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: { store: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost găsită" },
        { status: 404 }
      );
    }

    if (invoice.status !== "issued") {
      return NextResponse.json(
        { success: false, error: "Doar facturile emise pot fi marcate ca plătite" },
        { status: 400 }
      );
    }

    if (!invoice.invoiceNumber) {
      return NextResponse.json(
        { success: false, error: "Factura nu are număr valid" },
        { status: 400 }
      );
    }

    // Calculează noul status de plată
    const totalPrice = Number(invoice.order.totalPrice);
    const previousPaid = Number(invoice.paidAmount || 0);
    const newPaidAmount = previousPaid + amount;

    let newPaymentStatus = "unpaid";
    if (newPaidAmount >= totalPrice) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    }

    // Actualizează factura în baza de date
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: newPaymentStatus,
        paidAmount: String(newPaidAmount),
        paidAt: newPaymentStatus === "paid" ? new Date() : invoice.paidAt,
      },
    });

    // Loghează activitatea
    await logPaymentReceived({
      orderId: invoice.orderId,
      orderNumber: invoice.order.shopifyOrderNumber,
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceSeries: invoice.invoiceSeriesName || '',
      amount,
      method,
    });

    // Construiește mesajul de răspuns
    const message = `Plata de ${amount} RON a fost înregistrată.`;

    return NextResponse.json({
      success: true,
      message,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("Eroare la înregistrarea plății:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la înregistrarea plății" },
      { status: 500 }
    );
  }
}
