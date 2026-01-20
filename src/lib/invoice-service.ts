/**
 * Invoice Service
 *
 * Serviciu unificat pentru emiterea facturilor.
 * Suportă multiple provideri: Facturis (principal) și SmartBill (legacy).
 * Folosește credențiale per firmă și numerotare locală.
 */

import prisma from "./db";
import { FacturisAPI, orderToFacturisInvoice, createFacturisClient } from "./facturis";
import { getNextInvoiceNumber, getInvoiceSeriesForCompany } from "./invoice-series";

export interface IssueInvoiceResult {
  success: boolean;
  invoiceNumber?: string;
  invoiceSeries?: string;
  companyId?: string;
  companyName?: string;
  error?: string;
}

/**
 * Emite o factură pentru o comandă
 * Folosește firma asociată magazinului pentru credențiale și serii
 */
export async function issueInvoiceForOrder(orderId: string): Promise<IssueInvoiceResult> {
  try {
    // Obținem comanda cu toate relațiile necesare
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: true,
        store: {
          include: {
            company: true,
          },
        },
        invoice: true,
        billingCompany: true,
        requiredTransfer: true,
      },
    });

    if (!order) {
      return { success: false, error: "Comanda nu a fost găsită" };
    }

    // Verifică dacă factura a fost deja emisă
    if (order.invoice?.status === "issued") {
      return {
        success: false,
        error: `Factura a fost deja emisă: ${order.invoice.smartbillSeries}${order.invoice.smartbillNumber}`,
      };
    }

    // VERIFICARE: Transfer necesar închis?
    if (order.requiredTransferId && order.requiredTransfer) {
      if (order.requiredTransfer.status !== "COMPLETED") {
        return {
          success: false,
          error: "Transferul de stoc nu a fost finalizat. Nu se poate emite factura până la închiderea transferului.",
        };
      }
    }

    // Determinăm firma de facturare
    // Prioritate: 1) billingCompany setat explicit, 2) company din store
    const company = order.billingCompany || order.store?.company;

    if (!company) {
      return {
        success: false,
        error: "Comanda nu are o firmă de facturare asociată. Configurează firma pentru magazinul sau setează billingCompany.",
      };
    }

    // Verificăm credențialele Facturis
    if (!company.facturisApiKey || !company.facturisUsername || !company.facturisPassword) {
      return {
        success: false,
        error: `Credențialele Facturis nu sunt configurate pentru firma "${company.name}". Configurează-le în Setări > Firme.`,
      };
    }

    // Obținem seria de facturare pentru această firmă
    const invoiceSeries = await getInvoiceSeriesForCompany(company.id);

    if (!invoiceSeries) {
      return {
        success: false,
        error: `Nu există serie de facturare configurată pentru firma "${company.name}". Adaugă o serie în Setări > Serii Facturare.`,
      };
    }

    // Obținem următorul număr (local, atomic)
    const nextNumber = await getNextInvoiceNumber(invoiceSeries.id);

    if (!nextNumber) {
      return {
        success: false,
        error: "Nu s-a putut obține următorul număr de factură. Seria poate fi inactivă.",
      };
    }

    console.log("\n" + "=".repeat(60));
    console.log("📄 EMITERE FACTURĂ - FACTURIS");
    console.log("=".repeat(60));
    console.log(`📦 Comandă: ${order.shopifyOrderNumber || order.externalOrderNumber || order.id}`);
    console.log(`🏢 Firmă: ${company.name} (${company.code})`);
    console.log(`📑 Serie: ${nextNumber.prefix} | Număr: ${nextNumber.number}`);
    console.log(`📃 Factură: ${nextNumber.formatted}`);
    console.log("=".repeat(60));

    // Creăm clientul Facturis cu credențialele firmei
    const facturis = createFacturisClient(company);

    if (!facturis) {
      return {
        success: false,
        error: "Nu s-a putut crea clientul Facturis.",
      };
    }

    // Construim datele facturii
    const clientName = order.billingCompany
      ? order.billingCompany.name
      : [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";

    const clientAddress = [order.shippingAddress1, order.shippingAddress2]
      .filter(Boolean)
      .join(", ");

    const vatRate = Number(company.defaultVatRate) || 19;

    const invoiceRequest = orderToFacturisInvoice(
      {
        orderNumber: order.shopifyOrderNumber || order.externalOrderNumber || order.id,
        customerName: clientName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: clientAddress,
        shippingCity: order.shippingCity,
        shippingProvince: order.shippingProvince,
        shippingCountry: order.shippingCountry,
        shippingZip: order.shippingZip,
        billingCompany: order.billingCompanyName || null,
        billingVatNumber: order.billingVatNumber || null,
        lineItems: order.lineItems.map((item) => ({
          sku: item.sku,
          title: item.title + (item.variantTitle ? ` - ${item.variantTitle}` : ""),
          quantity: item.quantity,
          price: Number(item.price),
        })),
        totalPrice: Number(order.totalPrice),
      },
      nextNumber.prefix,
      nextNumber.number,
      vatRate
    );

    // Emitem factura în Facturis
    const result = await facturis.createInvoice(invoiceRequest);

    if (!result.success) {
      // Rollback: decrementăm numărul înapoi
      await prisma.invoiceSeries.update({
        where: { id: invoiceSeries.id },
        data: { currentNumber: nextNumber.number },
      });

      return {
        success: false,
        error: result.error || "Eroare la emiterea facturii în Facturis",
      };
    }

    // Obținem PDF-ul (opțional)
    let pdfData: Buffer | null = null;
    if (result.invoiceId) {
      try {
        const pdfResult = await facturis.getInvoicePDF(result.invoiceId);
        if (pdfResult.success && pdfResult.pdfBuffer) {
          pdfData = pdfResult.pdfBuffer;
        }
      } catch (pdfError) {
        console.error("Eroare la obținerea PDF-ului:", pdfError);
      }
    }

    // Determinăm statusul plății
    const isPaid = order.financialStatus === "paid";
    const paymentStatus = isPaid ? "paid" : "unpaid";

    // Salvăm factura în baza de date
    await prisma.invoice.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        companyId: company.id,
        invoiceSeriesId: invoiceSeries.id,
        invoiceProvider: "facturis",
        smartbillNumber: nextNumber.number.toString(),
        smartbillSeries: nextNumber.prefix,
        facturisId: result.invoiceId,
        status: "issued",
        pdfUrl: result.pdfUrl,
        pdfData: pdfData,
        paymentStatus: paymentStatus,
        paidAmount: isPaid ? order.totalPrice : 0,
        paidAt: isPaid ? new Date() : null,
        issuedAt: new Date(),
      },
      update: {
        companyId: company.id,
        invoiceSeriesId: invoiceSeries.id,
        invoiceProvider: "facturis",
        smartbillNumber: nextNumber.number.toString(),
        smartbillSeries: nextNumber.prefix,
        facturisId: result.invoiceId,
        status: "issued",
        pdfUrl: result.pdfUrl,
        pdfData: pdfData,
        paymentStatus: paymentStatus,
        paidAmount: isPaid ? order.totalPrice : 0,
        paidAt: isPaid ? new Date() : null,
        issuedAt: new Date(),
        errorMessage: null,
      },
    });

    // Actualizăm statusul comenzii
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "INVOICED",
        billingCompanyId: company.id,
      },
    });

    // Dacă firma NU e primară → marchează pentru decontare intercompany
    if (!company.isPrimary) {
      await prisma.order.update({
        where: { id: order.id },
        data: { intercompanyStatus: "pending" },
      });
    }

    // Logăm în ActivityLog
    try {
      const { logInvoiceIssued } = await import("./activity-log");
      await logInvoiceIssued({
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber || order.externalOrderNumber || order.id,
        invoiceNumber: nextNumber.number.toString(),
        invoiceSeries: nextNumber.prefix,
        total: Number(order.totalPrice),
      });
    } catch (logError) {
      console.error("Eroare la logare:", logError);
    }

    console.log(`✅ Factură emisă cu succes: ${nextNumber.formatted}`);

    return {
      success: true,
      invoiceNumber: nextNumber.number.toString(),
      invoiceSeries: nextNumber.prefix,
      companyId: company.id,
      companyName: company.name,
    };

  } catch (error: any) {
    console.error("Eroare la emiterea facturii:", error);
    return {
      success: false,
      error: error.message || "Eroare necunoscută la emiterea facturii",
    };
  }
}

/**
 * Verifică dacă o comandă poate fi facturată
 * Returnează motivul dacă nu poate fi facturată
 */
export async function canIssueInvoice(orderId: string): Promise<{
  canIssue: boolean;
  reason?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: {
        include: { company: true },
      },
      invoice: true,
      billingCompany: true,
      requiredTransfer: true,
    },
  });

  if (!order) {
    return { canIssue: false, reason: "Comanda nu a fost găsită" };
  }

  if (order.invoice?.status === "issued") {
    return { canIssue: false, reason: "Factura a fost deja emisă" };
  }

  if (order.requiredTransferId && order.requiredTransfer?.status !== "COMPLETED") {
    return { canIssue: false, reason: "Transferul de stoc nu a fost finalizat" };
  }

  const company = order.billingCompany || order.store?.company;

  if (!company) {
    return { canIssue: false, reason: "Nu există firmă de facturare asociată" };
  }

  if (!company.facturisApiKey || !company.facturisUsername || !company.facturisPassword) {
    return { canIssue: false, reason: `Credențialele Facturis nu sunt configurate pentru ${company.name}` };
  }

  return { canIssue: true };
}

/**
 * Emite facturi pentru mai multe comenzi
 * Returnează rezultate agregate
 */
export async function issueInvoicesForOrders(orderIds: string[]): Promise<{
  issued: number;
  failed: number;
  results: IssueInvoiceResult[];
}> {
  const results: IssueInvoiceResult[] = [];
  let issued = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    const result = await issueInvoiceForOrder(orderId);
    results.push({ ...result, invoiceNumber: result.invoiceNumber || orderId });

    if (result.success) {
      issued++;
    } else {
      failed++;
    }
  }

  return { issued, failed, results };
}
