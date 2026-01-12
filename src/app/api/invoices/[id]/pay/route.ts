import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createSmartBillClient } from "@/lib/smartbill";
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

    if (!invoice.smartbillNumber || !invoice.smartbillSeries) {
      return NextResponse.json(
        { success: false, error: "Factura nu are număr SmartBill valid" },
        { status: 400 }
      );
    }

    // Încearcă să înregistreze plata în SmartBill
    let smartbillPaymentSuccess = false;
    let smartbillError = null;

    try {
      const smartbill = await createSmartBillClient();
      
      // Determină tipul de încasare pentru SmartBill
      const paymentTypeMap: Record<string, string> = {
        cash: "Numerar",
        card: "Card",
        transfer: "Ordin de plata",
        ramburs: "Numerar",
      };
      
      const result = await smartbill.registerPayment({
        invoiceSeries: invoice.smartbillSeries,
        invoiceNumber: invoice.smartbillNumber,
        paymentType: paymentTypeMap[method] || "Numerar",
        value: amount,
        paymentDate: new Date().toISOString().split("T")[0],
      });

      if (result.success) {
        smartbillPaymentSuccess = true;
      } else {
        smartbillError = result.error;
      }
    } catch (err: any) {
      console.error("Eroare la înregistrarea plății în SmartBill:", err);
      smartbillError = err.message;
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
      invoiceNumber: invoice.smartbillNumber,
      invoiceSeries: invoice.smartbillSeries,
      amount,
      method,
    });

    // Construiește mesajul de răspuns
    let message = `Plata de ${amount} RON a fost înregistrată.`;
    if (smartbillPaymentSuccess) {
      message += " Plata a fost sincronizată și în SmartBill.";
    } else if (smartbillError) {
      message += ` ⚠️ Atenție: plata NU a fost înregistrată în SmartBill (${smartbillError}). Verifică manual.`;
    }

    return NextResponse.json({
      success: true,
      message,
      invoice: updatedInvoice,
      smartbillSync: smartbillPaymentSuccess,
      smartbillError,
    });
  } catch (error: any) {
    console.error("Eroare la înregistrarea plății:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la înregistrarea plății" },
      { status: 500 }
    );
  }
}
