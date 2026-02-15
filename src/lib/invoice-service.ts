/**
 * Invoice Service
 *
 * Serviciu unificat pentru emiterea facturilor.
 * Folosește Oblio pentru emiterea facturilor.
 * Folosește credențiale per firmă și numerotare locală.
 */

import prisma from "./db";
import { Prisma } from "@prisma/client";
import {
  OblioAPI,
  OblioInvoiceData,
  OblioValidationError,
  OblioAuthError,
  OblioApiError,
  createOblioClient,
  createOblioInvoiceItem,
  formatDateForOblio,
  hasOblioCredentials,
} from "./oblio";
import { getNextInvoiceNumber, getInvoiceSeriesForCompany } from "./invoice-series";
import { getInvoiceErrorMessage } from "./invoice-errors";
import { processInventoryStockForOrderFromPrimary } from "./inventory-stock";

// Tip pentru transaction client
type PrismaTransactionClient = Prisma.TransactionClient;

// ============================================================================
// TIPURI ȘI INTERFEȚE
// ============================================================================

/**
 * Opțiuni pentru emiterea facturii
 * Permite confirmarea avertismentelor și identificarea utilizatorului
 */
export interface InvoiceOptions {
  acknowledgeTransferWarning?: boolean; // User confirms proceeding despite pending transfer
  warningAcknowledgedBy?: string; // userId or user name who acknowledged
}

/**
 * Informații despre un avertisment care necesită confirmare
 */
export interface InvoiceWarning {
  type: "TRANSFER_PENDING";
  transferNumber: string;
  transferStatus: string;
  message: string;
}

export interface IssueInvoiceResult {
  success: boolean;
  needsConfirmation?: boolean; // Indicates warning needs user acknowledgment before proceeding
  warning?: InvoiceWarning; // Details about the warning requiring confirmation
  invoiceNumber?: string;
  invoiceSeries?: string;
  invoiceKey?: string; // Cheia Oblio pentru referință (serie + număr)
  companyId?: string;
  companyName?: string;
  seriesSource?: "oblio_direct" | "store" | "company_default" | "trendyol_store" | "temu_store"; // Indicates which series source was used
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
 * @param params - Parametrii facturii
 * @param tx - Optional transaction client pentru operații atomice
 */
async function saveInvoiceToDatabase(
  params: {
    orderId: string;
    companyId: string;
    invoiceSeriesId: string;
    invoiceNumber: number;
    invoiceSeries: string;
    oblioKey?: string;
    pdfUrl?: string;
    pdfData?: Buffer | null;
    isPaid: boolean;
    totalPrice: number | any; // Decimal from Prisma
  },
  tx?: PrismaTransactionClient
): Promise<void> {
  const db = tx || prisma;
  const paymentStatus = params.isPaid ? "paid" : "unpaid";

  await db.invoice.upsert({
    where: { orderId: params.orderId },
    create: {
      orderId: params.orderId,
      companyId: params.companyId,
      invoiceSeriesId: params.invoiceSeriesId,
      invoiceProvider: "oblio",
      invoiceNumber: params.invoiceNumber.toString(),
      invoiceSeriesName: params.invoiceSeries,
      oblioId: params.oblioKey,
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
      invoiceProvider: "oblio",
      invoiceNumber: params.invoiceNumber.toString(),
      invoiceSeriesName: params.invoiceSeries,
      oblioId: params.oblioKey,
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

/**
 * Salvează o încercare eșuată de emitere factură pentru retry ulterior
 */
async function saveFailedInvoiceAttempt(params: {
  orderId: string;
  errorCode: string;
  errorMessage: string;
  storeId?: string | null;
  storeName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  seriesId?: string | null;
  seriesName?: string | null;
}): Promise<void> {
  try {
    // Verificăm dacă există deja o încercare pending pentru această comandă
    const existingAttempt = await prisma.failedInvoiceAttempt.findFirst({
      where: {
        orderId: params.orderId,
        status: "pending",
      },
    });

    if (existingAttempt) {
      // Actualizăm încercarea existentă
      await prisma.failedInvoiceAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          errorCode: params.errorCode,
          errorMessage: params.errorMessage,
          attemptNumber: { increment: 1 },
          retriedAt: new Date(),
        },
      });
      console.log(`[Invoice] Actualizat încercare eșuată existentă pentru comanda ${params.orderId}`);
    } else {
      // Creăm o încercare nouă
      await prisma.failedInvoiceAttempt.create({
        data: {
          orderId: params.orderId,
          errorCode: params.errorCode,
          errorMessage: params.errorMessage,
          storeId: params.storeId,
          storeName: params.storeName,
          companyId: params.companyId,
          companyName: params.companyName,
          seriesId: params.seriesId,
          seriesName: params.seriesName,
          status: "pending",
          attemptNumber: 1,
        },
      });
      console.log(`[Invoice] Salvat încercare eșuată pentru comanda ${params.orderId}: ${params.errorCode}`);
    }
  } catch (saveError) {
    console.error("[Invoice] Eroare la salvarea încercării eșuate:", saveError);
    // Nu aruncăm eroarea - salvarea eșecului nu trebuie să blocheze fluxul
  }
}

// ============================================================================
// FUNCȚII PRINCIPALE
// ============================================================================

/**
 * Emite o factură pentru o comandă
 * Folosește firma asociată magazinului pentru credențiale și serii
 *
 * @param orderId - ID-ul comenzii
 * @param options - Opțiuni opționale pentru gestionarea avertismentelor
 * @returns Rezultatul emiterii sau warning dacă necesită confirmare
 */
export async function issueInvoiceForOrder(
  orderId: string,
  options?: InvoiceOptions
): Promise<IssueInvoiceResult> {
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
            invoiceSeries: true,
          },
          // Include oblioSeriesName direct
        },
        invoice: true,
        billingCompany: true,
        requiredTransfer: true,
      },
    });

    // Type assertion pentru a include oblioSeriesName (adăugat recent la schema)
    const storeWithOblio = order?.store as typeof order.store & { oblioSeriesName?: string | null };

    if (!order) {
      return { success: false, error: getInvoiceErrorMessage("ORDER_NOT_FOUND"), errorCode: "ORDER_NOT_FOUND" };
    }

    // 2. Verifică dacă factura a fost deja emisă
    if (order.invoice?.status === "issued") {
      const existingNumber = order.invoice.invoiceSeriesName && order.invoice.invoiceNumber
        ? `${order.invoice.invoiceSeriesName}${order.invoice.invoiceNumber}`
        : order.invoice.oblioId || "necunoscut";
      return {
        success: false,
        error: getInvoiceErrorMessage("ALREADY_ISSUED", `Factura a fost deja emisa: ${existingNumber}`),
        errorCode: "ALREADY_ISSUED",
      };
    }

    // 3. Verificare: Transfer necesar închis?
    // Dacă transferul nu e finalizat, returnăm warning (nu blocare hard)
    // Utilizatorul poate confirma pentru a continua
    if (order.requiredTransferId && order.requiredTransfer) {
      if (order.requiredTransfer.status !== "COMPLETED") {
        const transferNumber = order.requiredTransfer.transferNumber || order.requiredTransferId;
        const transferStatus = order.requiredTransfer.status;

        // Dacă utilizatorul NU a confirmat, returnăm warning
        if (!options?.acknowledgeTransferWarning) {
          return {
            success: false,
            needsConfirmation: true,
            warning: {
              type: "TRANSFER_PENDING",
              transferNumber,
              transferStatus,
              message: `Atenție! Transferul #${transferNumber} nu e finalizat. Risc de eroare la facturare.`,
            },
            errorCode: "TRANSFER_PENDING",
          };
        }

        // Utilizatorul a confirmat - log override și continuăm
        // Import dinamic pentru a evita circular dependencies
        const { logWarningOverride } = await import("./activity-log");
        await logWarningOverride({
          orderId,
          orderNumber: order.shopifyOrderNumber || orderId,
          warningType: "TRANSFER_PENDING",
          warningDetails: {
            transferId: order.requiredTransferId,
            transferNumber,
            transferStatus,
          },
          acknowledgedBy: options.warningAcknowledgedBy || "unknown",
        });
        console.log(`[Invoice] Warning override: transfer ${transferNumber} nefinalizat, utilizator a confirmat`);
      }
    }

    // 4. Determinăm firma de facturare
    // Prioritate: 1) billingCompany setat explicit, 2) company din store
    const company = order.billingCompany || order.store?.company;

    if (!company) {
      return {
        success: false,
        error: getInvoiceErrorMessage("NO_COMPANY"),
        errorCode: "NO_COMPANY",
      };
    }

    // 5. Verificăm credențialele Oblio
    if (!hasOblioCredentials(company)) {
      return {
        success: false,
        error: getInvoiceErrorMessage("NO_CREDENTIALS"),
        errorCode: "NO_CREDENTIALS",
      };
    }

    // 5a. Verificăm CIF-ul pentru Oblio
    const oblioCif = company.oblioCif || company.cif;
    if (!oblioCif) {
      return {
        success: false,
        error: getInvoiceErrorMessage("NO_OBLIO_CIF"),
        errorCode: "NO_OBLIO_CIF",
      };
    }

    // 5b. Verificăm dacă comanda are produse
    if (!order.lineItems || order.lineItems.length === 0) {
      return {
        success: false,
        error: getInvoiceErrorMessage("NO_LINE_ITEMS"),
        errorCode: "NO_LINE_ITEMS",
      };
    }

    // 5c. Validăm fiecare produs
    for (const item of order.lineItems) {
      if (item.quantity <= 0) {
        return {
          success: false,
          error: getInvoiceErrorMessage("INVALID_ITEM_QUANTITY", `Produsul "${item.title}" are cantitate invalida (${item.quantity}).`),
          errorCode: "INVALID_ITEM_QUANTITY",
        };
      }
      if (Number(item.price) < 0) {
        return {
          success: false,
          error: getInvoiceErrorMessage("INVALID_ITEM_PRICE", `Produsul "${item.title}" are pret negativ (${item.price}).`),
          errorCode: "INVALID_ITEM_PRICE",
        };
      }
    }

    // 6. Determinăm seria de facturare
    // PRIORITATE: 1) oblioSeriesName din store (nou - serie direct din Oblio)
    //             2) invoiceSeries din store (legacy)
    //             3) invoiceSeries default din company (legacy)

    let oblioSeriesName: string;
    let invoiceSeries: any = null;
    let seriesSource: "oblio_direct" | "store" | "company_default" | "trendyol_store" | "temu_store" = "company_default";
    let useOblioNumbering = false; // Dacă e true, Oblio generează numărul

    // Variable to store TrendyolOrder for logging
    let trendyolOrder: { trendyolStore: { invoiceSeriesName: string | null; name: string } | null } | null = null;

    // Variable to store TemuOrder for logging
    let temuOrder: { temuStore: { invoiceSeriesName: string | null; name: string } | null } | null = null;

    // Priority 0a: TemuStore invoice series (for Temu orders)
    if (order.source === "temu") {
      temuOrder = await prisma.temuOrder.findFirst({
        where: { orderId: order.id },
        include: { temuStore: true },
      });

      if (temuOrder?.temuStore?.invoiceSeriesName) {
        oblioSeriesName = temuOrder.temuStore.invoiceSeriesName;
        seriesSource = "temu_store";
        useOblioNumbering = true;
        console.log(`[Invoice] Folosesc seria TemuStore: ${oblioSeriesName} (${temuOrder.temuStore.name})`);
      }
    }

    // Priority 0b: TrendyolStore invoice series (for Trendyol orders)
    if (order.source === "trendyol") {
      trendyolOrder = await prisma.trendyolOrder.findFirst({
        where: { orderId: order.id },
        include: { trendyolStore: true },
      });

      if (trendyolOrder?.trendyolStore?.invoiceSeriesName) {
        oblioSeriesName = trendyolOrder.trendyolStore.invoiceSeriesName;
        seriesSource = "trendyol_store";
        useOblioNumbering = true;
        console.log(`[Invoice] Folosesc seria TrendyolStore: ${oblioSeriesName} (${trendyolOrder.trendyolStore.name})`);
      }
    }

    // Priority 1: Serie Oblio configurată direct pe store (NOU - recomandat)
    if (!oblioSeriesName && storeWithOblio?.oblioSeriesName) {
      oblioSeriesName = storeWithOblio.oblioSeriesName;
      seriesSource = "oblio_direct";
      useOblioNumbering = true; // Oblio va genera numărul automat
      console.log(`[Invoice] Folosesc seria Oblio directă: ${oblioSeriesName}`);
    }
    // Priority 2: Store-specific series (legacy - serie locală cu sync Oblio)
    else if (order.store?.invoiceSeries && order.store.invoiceSeries.isActive) {
      invoiceSeries = order.store.invoiceSeries;
      oblioSeriesName = invoiceSeries.oblioSeries || invoiceSeries.prefix;
      seriesSource = "store";
      console.log(`[Invoice] Folosesc seria magazinului: ${invoiceSeries.prefix} (${invoiceSeries.name})`);
    }
    // Priority 3: Company default series (legacy)
    else if (company) {
      invoiceSeries = await getInvoiceSeriesForCompany(company.id);
      if (invoiceSeries) {
        oblioSeriesName = invoiceSeries.oblioSeries || invoiceSeries.prefix;
        seriesSource = "company_default";
        console.log(`[Invoice] Folosesc seria default a firmei: ${invoiceSeries.prefix} (${invoiceSeries.name})`);
      }
    }

    // Verificăm că avem o serie configurată
    if (!oblioSeriesName!) {
      const storeName = order.store?.name || "necunoscut";
      return {
        success: false,
        error: getInvoiceErrorMessage("NO_SERIES",
          `Magazinul "${storeName}" nu are serie de facturare configurata. Mergi la Setari > Serii Facturare si selecteaza o serie Oblio.`),
        errorCode: "NO_SERIES",
      };
    }

    if (invoiceSeries) {
      invoiceSeriesId = invoiceSeries.id;
    }

    // 7. Obținem numărul local doar dacă NU folosim numerotarea Oblio
    let nextNumber: { number: number; prefix: string; oblioSeries: string | null } | null = null;
    let formattedInvoice = "";

    if (!useOblioNumbering && invoiceSeries) {
      nextNumber = await getNextInvoiceNumber(invoiceSeries.id);

      if (!nextNumber) {
        return {
          success: false,
          error: getInvoiceErrorMessage("NO_NUMBER"),
          errorCode: "NO_NUMBER",
        };
      }

      // Salvăm numărul anterior pentru rollback
      previousNumber = nextNumber.number - 1;

      formattedInvoice = formatInvoiceNumber(
        nextNumber.prefix,
        nextNumber.number,
        invoiceSeries.numberPadding
      );
    } else {
      // Când folosim Oblio direct, numărul va fi generat de Oblio
      formattedInvoice = `${oblioSeriesName}[auto]`;
    }

    console.log("\n" + "=".repeat(60));
    console.log("EMITERE FACTURA - OBLIO");
    console.log("=".repeat(60));
    console.log(`Comanda: ${order.shopifyOrderNumber || order.id}`);
    console.log(`Firma: ${company.name} (${company.code})`);
    if (useOblioNumbering) {
      console.log(`Serie Oblio (direct): ${oblioSeriesName}`);
      console.log(`Numerotare: Gestionata de Oblio`);
    } else {
      console.log(`Serie locală: ${nextNumber?.prefix} | Numar: ${nextNumber?.number}`);
      console.log(`Serie Oblio: ${oblioSeriesName}`);
      console.log(`Factura: ${formattedInvoice}`);
    }
    console.log(`Sursa serie: ${seriesSource}${
      seriesSource === "trendyol_store" && trendyolOrder?.trendyolStore?.name ? ` (${trendyolOrder.trendyolStore.name})` :
      seriesSource === "temu_store" && temuOrder?.temuStore?.name ? ` (${temuOrder.temuStore.name})` : ""
    }`);
    console.log("=".repeat(60));

    // 8. Creăm clientul Oblio
    const oblio = createOblioClient(company);

    if (!oblio) {
      // Rollback doar dacă avem serie locală
      if (invoiceSeriesId && previousNumber !== null) {
        await rollbackInvoiceNumber(invoiceSeriesId, previousNumber);
      }
      return {
        success: false,
        error: getInvoiceErrorMessage("CLIENT_ERROR"),
        errorCode: "CLIENT_ERROR",
      };
    }

    // 9. Construim datele facturii
    // billingCompany e B2B real DOAR daca e diferit de company-ul emitent (store's company)
    const isRealB2B = !!order.billingCompany && order.billingCompany.id !== order.store?.companyId;

    const customerName = isRealB2B
      ? order.billingCompany!.name
      : [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";

    const customerAddress = [order.shippingAddress1, order.shippingAddress2]
      .filter(Boolean)
      .join(", ");

    const vatRate = Number(company.defaultVatRate) || 19;

    // Determinăm dacă e persoană juridică (din billingCompany)
    const isCompany = isRealB2B;
    const billingCompanyName = order.billingCompany?.name || null;
    const billingVatNumber = order.billingCompany?.cif || null;
    const billingRegNumber = order.billingCompany?.regCom || null;

    // Construim datele facturii în format Oblio
    const invoiceData: OblioInvoiceData = {
      // Informații firmă
      cif: oblioCif,
      seriesName: oblioSeriesName,

      // Client
      client: {
        name: isCompany ? billingCompanyName! : customerName,
        cif: isCompany ? billingVatNumber || undefined : undefined,
        rc: isCompany ? billingRegNumber || undefined : undefined,
        address: customerAddress || "Nedefinit",
        state: order.shippingProvince || "",
        city: order.shippingCity || "",
        country: order.shippingCountry || "Romania",
        email: order.customerEmail || undefined,
        phone: order.customerPhone || undefined,
        isTaxPayer: isCompany,
        save: true, // Salvează clientul în nomenclator
      },

      // Date document
      issueDate: formatDateForOblio(new Date()),
      currency: order.currency || "RON",
      language: "RO",

      // Observații
      mentions: `Comanda online: ${order.shopifyOrderNumber || order.id}`,

      // Produse
      products: order.lineItems.map((item) =>
        createOblioInvoiceItem({
          sku: item.sku,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          price: Number(item.price),
          vatRate: vatRate,
        })
      ),
    };

    // 10. Emitem factura în Oblio
    const result = await oblio.createInvoice(invoiceData);

    if (!result.success) {
      // Rollback numărul facturii doar dacă avem serie locală
      if (invoiceSeriesId && previousNumber !== null) {
        await rollbackInvoiceNumber(invoiceSeriesId, previousNumber);
      }

      // Determinăm codul de eroare
      let errorCode = "OBLIO_ERROR";
      if (result.errorCode) {
        errorCode = `OBLIO_${result.errorCode}`;
      }

      const errorMessage = result.error || "Eroare la emiterea facturii în Oblio";

      // Salvăm încercarea eșuată pentru retry
      await saveFailedInvoiceAttempt({
        orderId: order.id,
        errorCode,
        errorMessage,
        storeId: order.store?.id,
        storeName: order.store?.name,
        companyId: company.id,
        companyName: company.name,
        seriesId: invoiceSeriesId,
        seriesName: invoiceSeries ? `${invoiceSeries.prefix} - ${invoiceSeries.name}` : oblioSeriesName,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }

    // 11. Obținem PDF-ul (opțional, nu blochează procesul)
    let pdfData: Buffer | null = null;
    const invoiceKey = result.invoiceId; // În Oblio: serie + număr

    if (result.invoiceSeries && result.invoiceNumber) {
      try {
        const pdfResult = await oblio.getInvoicePDF(result.invoiceSeries, result.invoiceNumber);
        if (pdfResult.success && pdfResult.pdfBuffer) {
          pdfData = pdfResult.pdfBuffer;
          console.log(`[Invoice] PDF descărcat pentru ${formattedInvoice}`);
        }
      } catch (pdfError) {
        console.warn("[Invoice] Nu s-a putut descărca PDF-ul:", pdfError);
        // Continuăm fără PDF
      }
    }

    // 12. Salvăm factura și actualizăm comanda în tranzacție atomică
    const isPaid = order.financialStatus === "paid";

    // Folosim datele de la Oblio când avem numerotare automată, sau cele locale
    const finalInvoiceNumber = useOblioNumbering
      ? parseInt(result.invoiceNumber || "0", 10)
      : nextNumber?.number || 0;
    const finalInvoiceSeries = useOblioNumbering
      ? (result.invoiceSeries || oblioSeriesName)
      : (nextNumber?.prefix || oblioSeriesName);

    await prisma.$transaction(async (tx) => {
      // Salvăm factura în baza de date
      await saveInvoiceToDatabase({
        orderId: order.id,
        companyId: company.id,
        invoiceSeriesId: invoiceSeriesId, // Poate fi null dacă folosim Oblio direct
        invoiceNumber: finalInvoiceNumber,
        invoiceSeries: finalInvoiceSeries,
        oblioKey: invoiceKey,
        pdfUrl: result.link,
        pdfData,
        isPaid,
        totalPrice: order.totalPrice,
      }, tx);

      // Actualizăm statusul comenzii
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "INVOICED",
          billingCompanyId: company.id,
        },
      });

      // Dacă firma NU e primară → marchează pentru decontare intercompany
      if (!company.isPrimary) {
        await tx.order.update({
          where: { id: order.id },
          data: { intercompanyStatus: "pending" },
        });
      }
    });

    // 13. Logăm în ActivityLog (outside transaction - non-critical)
    await logInvoiceIssuedActivity({
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber || order.id,
      invoiceNumber: finalInvoiceNumber.toString(),
      invoiceSeries: finalInvoiceSeries,
      total: Number(order.totalPrice),
    });

    const finalFormattedInvoice = `${finalInvoiceSeries}${String(finalInvoiceNumber).padStart(6, "0")}`;
    console.log(`[Invoice] Factura emisa cu succes: ${finalFormattedInvoice}`);

    // 14. Descărcăm stocul pentru comandă (outside transaction - non-blocking)
    // Obținem invoice ID pentru a-l lega de mișcările de stoc
    const savedInvoice = await prisma.invoice.findUnique({
      where: { orderId: order.id },
      select: { id: true },
    });

    if (savedInvoice) {
      try {
        const stockResult = await processInventoryStockForOrderFromPrimary(order.id, savedInvoice.id);
        if (stockResult.success) {
          console.log(`[Invoice] Stoc descarcat (InventoryItem): ${stockResult.processed} articole, ${stockResult.skipped} sarite`);
          if (stockResult.warehouseName) {
            console.log(`[Invoice] Depozit: ${stockResult.warehouseName}`);
          }
        } else {
          console.warn(`[Invoice] Erori la descarcarea stocului: ${stockResult.errors.join(", ")}`);
        }
      } catch (stockError) {
        // Non-blocking - factura a fost emisa cu succes, stocul poate fi corectat manual
        console.error("[Invoice] Eroare la descarcarea stocului:", stockError);
      }
    }

    // 15. Send invoice link to Trendyol (non-blocking, for Trendyol orders only)
    if (order.source === "trendyol") {
      const invoiceLink = result.link || `https://oblio.eu/facturi/${finalInvoiceSeries}${finalInvoiceNumber}`;
      // Dynamic import to avoid circular dependencies
      import("./trendyol-invoice").then(({ sendInvoiceToTrendyol }) => {
        sendInvoiceToTrendyol(order.id, invoiceLink).catch(err => {
          console.error("[Trendyol] Failed to send invoice link:", err);
          // Non-blocking - invoice was created successfully regardless
        });
      }).catch(err => {
        console.error("[Trendyol] Failed to load trendyol-invoice module:", err);
      });
    }

    return {
      success: true,
      invoiceNumber: finalInvoiceNumber.toString(),
      invoiceSeries: finalInvoiceSeries,
      invoiceKey,
      companyId: company.id,
      companyName: company.name,
      seriesSource,
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

    if (error instanceof OblioValidationError) {
      errorCode = "VALIDATION_ERROR";
      errorMessage = error.message;
    } else if (error instanceof OblioAuthError) {
      errorCode = "AUTH_ERROR";
      errorMessage = "Autentificare eșuată la Oblio. Verifică credențialele.";
    } else if (error instanceof OblioApiError) {
      errorCode = `API_ERROR_${error.code || "UNKNOWN"}`;
    }

    // Salvăm încercarea eșuată pentru retry (dacă e eroare Oblio)
    if (error instanceof OblioApiError || error instanceof OblioAuthError) {
      await saveFailedInvoiceAttempt({
        orderId,
        errorCode,
        errorMessage,
      });
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
      lineItems: true,
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

  // Verificăm dacă comanda are produse
  if (!order.lineItems || order.lineItems.length === 0) {
    return { canIssue: false, reason: "Comanda nu are produse" };
  }

  const company = order.billingCompany || order.store?.company;

  if (!company) {
    return { canIssue: false, reason: "Nu există firmă de facturare asociată" };
  }

  if (!hasOblioCredentials(company)) {
    return {
      canIssue: false,
      reason: `Credențialele Oblio nu sunt configurate pentru ${company.name}`,
    };
  }

  // Verificăm CIF-ul pentru Oblio
  const oblioCif = company.oblioCif || company.cif;
  if (!oblioCif) {
    return {
      canIssue: false,
      reason: `CIF-ul Oblio nu este configurat pentru ${company.name}`,
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

    // Încercăm să descărcăm de la Oblio
    if (invoice.oblioId && invoice.company && invoice.invoiceSeriesName && invoice.invoiceNumber) {
      const oblio = createOblioClient(invoice.company);
      if (oblio) {
        const pdfResult = await oblio.getInvoicePDF(invoice.invoiceSeriesName, invoice.invoiceNumber);
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

    // Stornare în Oblio (emite factură inversă)
    if (invoice.oblioId && invoice.company && invoice.invoiceSeriesName && invoice.invoiceNumber) {
      const oblio = createOblioClient(invoice.company);
      if (oblio) {
        const stornoResult = await oblio.stornoInvoice(invoice.invoiceSeriesName, invoice.invoiceNumber);
        if (!stornoResult.success) {
          console.warn("[Invoice] Nu s-a putut storna în Oblio:", stornoResult.error);
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
