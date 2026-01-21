/**
 * Invoice Service
 *
 * Serviciu unificat pentru emiterea facturilor.
 * Folosește Facturis pentru emiterea facturilor.
 * Folosește credențiale per firmă și numerotare locală.
 */

import prisma from "./db";
import {
  FacturisAPI,
  FacturisInvoiceData,
  FacturisValidationError,
  FacturisAuthError,
  FacturisApiError,
  createFacturisClient,
  createFacturisInvoiceItem,
  formatDateForFacturis,
  hasFacturisCredentials,
} from "./facturis";
import { getNextInvoiceNumber, getInvoiceSeriesForCompany } from "./invoice-series";

// ============================================================================
// TIPURI ȘI INTERFEȚE
// ============================================================================

export interface IssueInvoiceResult {
  success: boolean;
  invoiceNumber?: string;
  invoiceSeries?: string;
  invoiceKey?: string; // Cheia Facturis pentru referință
  companyId?: string;
  companyName?: string;
  error?: string;
  errorCode?: string;
}

export interface InvoiceCanIssueResult {
  canIssue: boolean;
  reason?: string;
  company?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// UTILITĂȚI PRIVATE
// ============================================================================

/**
 * Formatează numărul facturii afișat
 */
function formatInvoiceNumber(series: string, number: number, padding: number = 6): string {
  return `${series}${String(number).padStart(padding, "0")}`;
}

/**
 * Execută rollback al numărului de factură în caz de eroare
 */
async function rollbackInvoiceNumber(
  invoiceSeriesId: string,
  previousNumber: number
): Promise<boolean> {
  try {
    await prisma.invoiceSeries.update({
      where: { id: invoiceSeriesId },
      data: { currentNumber: previousNumber },
    });
    console.log(`[Invoice] Rollback număr factură: seria ${invoiceSeriesId} -> ${previousNumber}`);
    return true;
  } catch (rollbackError) {
    console.error("[Invoice] Eroare la rollback număr factură:", rollbackError);
    return false;
  }
}

/**
 * Salvează factura în baza de date
 */
async function saveInvoiceToDatabase(params: {
  orderId: string;
  companyId: string;
  invoiceSeriesId: string;
  invoiceNumber: number;
  invoiceSeries: string;
  facturisKey?: string;
  pdfUrl?: string;
  pdfData?: Buffer | null;
  isPaid: boolean;
  totalPrice: number | any; // Decimal from Prisma
}): Promise<void> {
  const paymentStatus = params.isPaid ? "paid" : "unpaid";

  await prisma.invoice.upsert({
    where: { orderId: params.orderId },
    create: {
      orderId: params.orderId,
      companyId: params.companyId,
      invoiceSeriesId: params.invoiceSeriesId,
      invoiceProvider: "facturis",
      invoiceNumber: params.invoiceNumber.toString(),
      invoiceSeriesName: params.invoiceSeries,
      facturisId: params.facturisKey,
      status: "issued",
      pdfUrl: params.pdfUrl || null,
      pdfData: params.pdfData || null,
      paymentStatus: paymentStatus,
      paidAmount: params.isPaid ? params.totalPrice : 0,
      paidAt: params.isPaid ? new Date() : null,
      issuedAt: new Date(),
    },
    update: {
      companyId: params.companyId,
      invoiceSeriesId: params.invoiceSeriesId,
      invoiceProvider: "facturis",
      invoiceNumber: params.invoiceNumber.toString(),
      invoiceSeriesName: params.invoiceSeries,
      facturisId: params.facturisKey,
      status: "issued",
      pdfUrl: params.pdfUrl || null,
      pdfData: params.pdfData || null,
      paymentStatus: paymentStatus,
      paidAmount: params.isPaid ? params.totalPrice : 0,
      paidAt: params.isPaid ? new Date() : null,
      issuedAt: new Date(),
      errorMessage: null,
    },
  });
}

/**
 * Logează emiterea facturii în ActivityLog
 */
async function logInvoiceIssuedActivity(params: {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceSeries: string;
  total: number;
}): Promise<void> {
  try {
    const { logInvoiceIssued } = await import("./activity-log");
    await logInvoiceIssued(params);
  } catch (logError) {
    console.error("[Invoice] Eroare la logare activity:", logError);
  }
}

// ============================================================================
// FUNCȚII PRINCIPALE
// ============================================================================

/**
 * Emite o factură pentru o comandă
 * Folosește firma asociată magazinului pentru credențiale și serii
 */
export async function issueInvoiceForOrder(orderId: string): Promise<IssueInvoiceResult> {
  let invoiceSeriesId: string | null = null;
  let previousNumber: number | null = null;

  try {
    // 1. Obținem comanda cu toate relațiile necesare
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
      return { success: false, error: "Comanda nu a fost găsită", errorCode: "ORDER_NOT_FOUND" };
    }

    // 2. Verifică dacă factura a fost deja emisă
    if (order.invoice?.status === "issued") {
      const existingNumber = order.invoice.invoiceSeriesName && order.invoice.invoiceNumber
        ? `${order.invoice.invoiceSeriesName}${order.invoice.invoiceNumber}`
        : order.invoice.facturisId || "necunoscut";
      return {
        success: false,
        error: `Factura a fost deja emisă: ${existingNumber}`,
        errorCode: "ALREADY_ISSUED",
      };
    }

    // 3. Verificare: Transfer necesar închis?
    if (order.requiredTransferId && order.requiredTransfer) {
      if (order.requiredTransfer.status !== "COMPLETED") {
        return {
          success: false,
          error: "Transferul de stoc nu a fost finalizat. Nu se poate emite factura până la închiderea transferului.",
          errorCode: "TRANSFER_PENDING",
        };
      }
    }

    // 4. Determinăm firma de facturare
    // Prioritate: 1) billingCompany setat explicit, 2) company din store
    const company = order.billingCompany || order.store?.company;

    if (!company) {
      return {
        success: false,
        error: "Comanda nu are o firmă de facturare asociată. Configurează firma pentru magazinul sau setează billingCompany.",
        errorCode: "NO_COMPANY",
      };
    }

    // 5. Verificăm credențialele Facturis
    if (!hasFacturisCredentials(company)) {
      return {
        success: false,
        error: `Credențialele Facturis nu sunt configurate pentru firma "${company.name}". Configurează-le în Setări > Firme.`,
        errorCode: "NO_CREDENTIALS",
      };
    }

    // 6. Obținem seria de facturare pentru această firmă
    const invoiceSeries = await getInvoiceSeriesForCompany(company.id);

    if (!invoiceSeries) {
      return {
        success: false,
        error: `Nu există serie de facturare configurată pentru firma "${company.name}". Adaugă o serie în Setări > Serii Facturare.`,
        errorCode: "NO_SERIES",
      };
    }

    invoiceSeriesId = invoiceSeries.id;

    // 7. Obținem următorul număr (local, atomic)
    const nextNumber = await getNextInvoiceNumber(invoiceSeries.id);

    if (!nextNumber) {
      return {
        success: false,
        error: "Nu s-a putut obține următorul număr de factură. Seria poate fi inactivă.",
        errorCode: "NO_NUMBER",
      };
    }

    // Salvăm numărul anterior pentru rollback
    previousNumber = nextNumber.number - 1;

    const formattedInvoice = formatInvoiceNumber(
      nextNumber.prefix,
      nextNumber.number,
      invoiceSeries.numberPadding
    );

    console.log("\n" + "=".repeat(60));
    console.log("EMITERE FACTURA - FACTURIS");
    console.log("=".repeat(60));
    console.log(`Comanda: ${order.shopifyOrderNumber || order.id}`);
    console.log(`Firma: ${company.name} (${company.code})`);
    console.log(`Serie: ${nextNumber.prefix} | Numar: ${nextNumber.number}`);
    console.log(`Factura: ${formattedInvoice}`);
    console.log("=".repeat(60));

    // 8. Creăm clientul Facturis
    const facturis = createFacturisClient(company);

    if (!facturis) {
      await rollbackInvoiceNumber(invoiceSeries.id, previousNumber);
      return {
        success: false,
        error: "Nu s-a putut crea clientul Facturis. Verifică credențialele.",
        errorCode: "CLIENT_ERROR",
      };
    }

    // 9. Construim datele facturii
    const customerName = order.billingCompany
      ? order.billingCompany.name
      : [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";

    const customerAddress = [order.shippingAddress1, order.shippingAddress2]
      .filter(Boolean)
      .join(", ");

    const vatRate = Number(company.defaultVatRate) || 19;

    // Determinăm dacă e persoană juridică (din billingCompany)
    const isCompany = !!order.billingCompany;
    const billingCompanyName = order.billingCompany?.name || null;
    const billingVatNumber = order.billingCompany?.cif || null;
    const billingRegNumber = order.billingCompany?.regCom || null;

    // Construim datele facturii în format Facturis
    const invoiceData: FacturisInvoiceData = {
      // Header
      facturi_data: formatDateForFacturis(new Date()),
      facturi_serie: nextNumber.prefix,
      facturi_numar: nextNumber.number,
      facturi_moneda: order.currency || "RON",
      facturi_cota_tva: `${vatRate}%`,
      facturi_status: "Emisa",
      facturi_tip: "factura",

      // Client
      facturi_nume_client: isCompany ? billingCompanyName! : customerName,
      facturi_tip_persoana: isCompany ? "juridica" : "fizica",
      facturi_codf_client: isCompany ? billingVatNumber || undefined : undefined,
      facturi_nrreg_client: isCompany ? billingRegNumber || undefined : undefined,
      facturi_sediu_client: customerAddress || "Nedefinit",
      facturi_judet_client: order.shippingProvince || "",
      facturi_oras_client: order.shippingCity || "",
      facturi_tara_client: order.shippingCountry || "Romania",
      facturi_email_client: order.customerEmail || undefined,
      facturi_telefon_client: order.customerPhone || undefined,

      // Observații
      facturi_obs_up: `Comanda online: ${order.shopifyOrderNumber || order.id}`,

      // Produse
      dataProd: order.lineItems.map((item) =>
        createFacturisInvoiceItem({
          sku: item.sku,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          price: Number(item.price),
          vatRate: vatRate,
        })
      ),
    };

    // 10. Emitem factura în Facturis
    const result = await facturis.createInvoice(invoiceData);

    if (!result.success) {
      // Rollback numărul facturii
      await rollbackInvoiceNumber(invoiceSeries.id, previousNumber);

      // Determinăm codul de eroare
      let errorCode = "FACTURIS_ERROR";
      if (result.errorCode) {
        errorCode = `FACTURIS_${result.errorCode}`;
      }

      return {
        success: false,
        error: result.error || "Eroare la emiterea facturii în Facturis",
        errorCode,
      };
    }

    // 11. Obținem PDF-ul (opțional, nu blochează procesul)
    let pdfData: Buffer | null = null;
    const invoiceKey = result.invoiceKey || result.invoiceId;

    if (invoiceKey) {
      try {
        const pdfResult = await facturis.getInvoicePDF(invoiceKey);
        if (pdfResult.success && pdfResult.pdfBuffer) {
          pdfData = pdfResult.pdfBuffer;
          console.log(`[Invoice] PDF descărcat pentru ${formattedInvoice}`);
        }
      } catch (pdfError) {
        console.warn("[Invoice] Nu s-a putut descărca PDF-ul:", pdfError);
        // Continuăm fără PDF
      }
    }

    // 12. Salvăm factura în baza de date
    const isPaid = order.financialStatus === "paid";

    await saveInvoiceToDatabase({
      orderId: order.id,
      companyId: company.id,
      invoiceSeriesId: invoiceSeries.id,
      invoiceNumber: nextNumber.number,
      invoiceSeries: nextNumber.prefix,
      facturisKey: invoiceKey,
      pdfUrl: result.pdfUrl,
      pdfData,
      isPaid,
      totalPrice: order.totalPrice,
    });

    // 13. Actualizăm statusul comenzii
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "INVOICED",
        billingCompanyId: company.id,
      },
    });

    // 14. Dacă firma NU e primară → marchează pentru decontare intercompany
    if (!company.isPrimary) {
      await prisma.order.update({
        where: { id: order.id },
        data: { intercompanyStatus: "pending" },
      });
    }

    // 15. Logăm în ActivityLog
    await logInvoiceIssuedActivity({
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber || order.id,
      invoiceNumber: nextNumber.number.toString(),
      invoiceSeries: nextNumber.prefix,
      total: Number(order.totalPrice),
    });

    console.log(`[Invoice] Factura emisa cu succes: ${formattedInvoice}`);

    return {
      success: true,
      invoiceNumber: nextNumber.number.toString(),
      invoiceSeries: nextNumber.prefix,
      invoiceKey,
      companyId: company.id,
      companyName: company.name,
    };

  } catch (error: any) {
    console.error("[Invoice] Eroare la emiterea facturii:", error);

    // Rollback dacă avem datele necesare
    if (invoiceSeriesId && previousNumber !== null) {
      await rollbackInvoiceNumber(invoiceSeriesId, previousNumber);
    }

    // Determinăm tipul erorii
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = error.message || "Eroare necunoscută la emiterea facturii";

    if (error instanceof FacturisValidationError) {
      errorCode = "VALIDATION_ERROR";
      errorMessage = error.message;
    } else if (error instanceof FacturisAuthError) {
      errorCode = "AUTH_ERROR";
      errorMessage = "Autentificare eșuată la Facturis. Verifică credențialele.";
    } else if (error instanceof FacturisApiError) {
      errorCode = `API_ERROR_${error.code || "UNKNOWN"}`;
    }

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Verifică dacă o comandă poate fi facturată
 * Returnează motivul dacă nu poate fi facturată
 */
export async function canIssueInvoice(orderId: string): Promise<InvoiceCanIssueResult> {
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

  if (!hasFacturisCredentials(company)) {
    return {
      canIssue: false,
      reason: `Credențialele Facturis nu sunt configurate pentru ${company.name}`,
    };
  }

  // Verificăm și seria de facturare
  const invoiceSeries = await getInvoiceSeriesForCompany(company.id);
  if (!invoiceSeries) {
    return {
      canIssue: false,
      reason: `Nu există serie de facturare configurată pentru ${company.name}`,
    };
  }

  return {
    canIssue: true,
    company: {
      id: company.id,
      name: company.name,
    },
  };
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
    try {
      const result = await issueInvoiceForOrder(orderId);
      results.push(result);

      if (result.success) {
        issued++;
      } else {
        failed++;
      }

      // Pauză mică între facturi pentru a nu supraîncărca API-ul
      if (orderIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      failed++;
      results.push({
        success: false,
        error: error.message || "Eroare necunoscută",
        errorCode: "BATCH_ERROR",
      });
    }
  }

  return { issued, failed, results };
}

/**
 * Obține PDF-ul unei facturi existente
 */
export async function getInvoicePDF(orderId: string): Promise<{
  success: boolean;
  pdfBuffer?: Buffer;
  pdfUrl?: string;
  error?: string;
}> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { orderId },
      include: {
        company: true,
      },
    });

    if (!invoice) {
      return { success: false, error: "Factura nu a fost găsită" };
    }

    // Dacă avem PDF stocat local, îl returnăm
    if (invoice.pdfData) {
      return {
        success: true,
        pdfBuffer: Buffer.from(invoice.pdfData),
        pdfUrl: invoice.pdfUrl || undefined,
      };
    }

    // Dacă avem URL, returnăm URL-ul
    if (invoice.pdfUrl) {
      return {
        success: true,
        pdfUrl: invoice.pdfUrl,
      };
    }

    // Încercăm să descărcăm de la Facturis
    if (invoice.facturisId && invoice.company) {
      const facturis = createFacturisClient(invoice.company);
      if (facturis) {
        const pdfResult = await facturis.getInvoicePDF(invoice.facturisId);
        if (pdfResult.success) {
          // Salvăm PDF-ul pentru viitor
          if (pdfResult.pdfBuffer) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                pdfData: pdfResult.pdfBuffer,
                pdfUrl: pdfResult.pdfUrl,
              },
            });
          }

          return {
            success: true,
            pdfBuffer: pdfResult.pdfBuffer,
            pdfUrl: pdfResult.pdfUrl,
          };
        }
      }
    }

    return { success: false, error: "PDF-ul nu este disponibil" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Anulează o factură
 */
export async function cancelInvoice(orderId: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { orderId },
      include: {
        company: true,
      },
    });

    if (!invoice) {
      return { success: false, error: "Factura nu a fost găsită" };
    }

    if (invoice.status === "cancelled") {
      return { success: false, error: "Factura este deja anulată" };
    }

    // Anulăm în Facturis dacă avem cheie
    if (invoice.facturisId && invoice.company) {
      const facturis = createFacturisClient(invoice.company);
      if (facturis) {
        const cancelResult = await facturis.cancelInvoice(invoice.facturisId);
        if (!cancelResult.success) {
          console.warn("[Invoice] Nu s-a putut anula în Facturis:", cancelResult.error);
          // Continuăm cu anularea locală
        }
      }
    }

    // Actualizăm local
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || "Anulată manual",
      },
    });

    // Actualizăm statusul comenzii
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "INVOICE_PENDING",
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
