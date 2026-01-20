/**
 * Facturis API Integration
 *
 * Client pentru integrarea cu Facturis Online - platformă de facturare.
 * Documentație: https://facturis-online.ro/apidoc/
 */

// Endpoint-uri Facturis
const FACTURIS_API_URL = "https://api.facturis-online.ro/api/";
const FACTURIS_ADD_INVOICE_URL = "https://appv1.facturis-online.ro/facturis/api/add_invoice.php";

export interface FacturisCredentials {
  apiKey: string;
  username: string;
  password: string;
  companyTaxCode: string;  // CIF firma emitentă
}

export interface FacturisInvoiceItem {
  facturi_prod_nume: string;           // Denumire produs
  facturi_prod_cant: number;           // Cantitate
  facturi_prod_pretftva: number;       // Preț fără TVA (unitar)
  facturi_prod_pretctva: number;       // Preț cu TVA (unitar)
  facturi_prod_val_tva: number;        // Valoare TVA (pe linie)
  facturi_prod_tva: string;            // Cota TVA (ex: "19%")
  prod_cod_cautare?: string;           // SKU/Cod produs
  facturi_prod_um?: string;            // Unitate măsură (default: "buc")
  facturi_prod_reducere?: number;      // Discount % (0-100)
}

export interface FacturisClientData {
  facturi_nume_client: string;         // Nume client
  facturi_codf_client?: string;        // CIF client (pentru PJ)
  facturi_tip_persoana: "fizica" | "juridica";
  facturi_sediu_client: string;        // Adresa
  facturi_judet_client: string;        // Județ
  facturi_oras_client: string;         // Oraș
  facturi_tara_client: string;         // Țară (default: "Romania")
  facturi_regcom_client?: string;      // Nr. Reg. Com.
  facturi_banca_client?: string;       // Banca
  facturi_cont_client?: string;        // IBAN
  facturi_email_client?: string;       // Email
  facturi_telefon_client?: string;     // Telefon
}

export interface FacturisInvoiceRequest extends FacturisClientData {
  facturi_data: string;                // Data factură (YYYY-MM-DD)
  facturi_data_scadenta?: string;      // Data scadență
  facturi_serie: string;               // Seria facturii
  facturi_numar: number;               // Numărul facturii
  facturi_moneda: string;              // Moneda (RON, EUR, etc.)
  facturi_cota_tva: string;            // Cota TVA principală
  facturi_status: string;              // Status (Emisa, Proforma, etc.)
  facturi_tip?: string;                // Tip document (factura, proforma, etc.)

  // Produse
  dataProd: FacturisInvoiceItem[];

  // Opțional
  facturi_observatii?: string;         // Observații
  facturi_delegat?: string;            // Delegat
  facturi_delegat_ci?: string;         // CI delegat
  facturi_delegat_auto?: string;       // Auto delegat
  facturi_curs_bnr?: number;           // Curs BNR (pentru valută)
}

export interface FacturisInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceSeries?: string;
  pdfUrl?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

export interface FacturisTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Client Facturis API
 */
export class FacturisAPI {
  private credentials: FacturisCredentials;

  constructor(credentials: FacturisCredentials) {
    this.credentials = credentials;
  }

  /**
   * Testează conexiunea cu Facturis
   */
  async testConnection(): Promise<FacturisTestResult> {
    try {
      // Facturis nu are un endpoint specific de test, dar putem încerca
      // să obținem lista de serii sau să facem o cerere minimă

      const response = await fetch(`${FACTURIS_API_URL}series`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return {
          success: true,
          message: "Conexiune reușită cu Facturis",
        };
      }

      // Verificăm eroarea
      const errorText = await response.text();
      return {
        success: false,
        error: `Eroare la conexiune: ${response.status} - ${errorText}`,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Eroare la testarea conexiunii",
      };
    }
  }

  /**
   * Creează o factură în Facturis
   */
  async createInvoice(data: FacturisInvoiceRequest): Promise<FacturisInvoiceResponse> {
    try {
      // Construim payload-ul pentru Facturis
      const payload = {
        APIkey: this.credentials.apiKey,
        username: this.credentials.username,
        password: this.credentials.password,
        codfiscal: this.credentials.companyTaxCode,
        ...data,
        dataProd: JSON.stringify(data.dataProd),
      };

      const response = await fetch(FACTURIS_ADD_INVOICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload as any).toString(),
      });

      const responseText = await response.text();

      // Parsăm răspunsul
      // Facturis returnează JSON sau text cu rezultatul
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Dacă nu e JSON, verificăm dacă e text de succes/eroare
        if (responseText.includes('SUCCESS') || responseText.includes('OK')) {
          return {
            success: true,
            invoiceNumber: data.facturi_numar.toString(),
            invoiceSeries: data.facturi_serie,
            rawResponse: responseText,
          };
        }
        return {
          success: false,
          error: responseText,
          rawResponse: responseText,
        };
      }

      // Verificăm răspunsul JSON
      if (responseData.status === 'success' || responseData.success === true) {
        return {
          success: true,
          invoiceId: responseData.id || responseData.invoice_id,
          invoiceNumber: responseData.numar || data.facturi_numar.toString(),
          invoiceSeries: responseData.serie || data.facturi_serie,
          pdfUrl: responseData.pdf_url || responseData.pdfUrl,
          rawResponse: responseData,
        };
      }

      return {
        success: false,
        error: responseData.message || responseData.error || "Eroare necunoscută",
        errorCode: responseData.error_code,
        rawResponse: responseData,
      };

    } catch (error: any) {
      console.error("Eroare la crearea facturii Facturis:", error);
      return {
        success: false,
        error: error.message || "Eroare la comunicarea cu Facturis",
      };
    }
  }

  /**
   * Obține PDF-ul unei facturi
   */
  async getInvoicePDF(invoiceId: string): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    error?: string;
  }> {
    try {
      const response = await fetch(`${FACTURIS_API_URL}invoice/${invoiceId}/pdf`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Eroare la descărcarea PDF: ${response.status}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        pdfBuffer: Buffer.from(arrayBuffer),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Eroare la descărcarea PDF",
      };
    }
  }

  /**
   * Anulează o factură
   */
  async cancelInvoice(series: string, number: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${FACTURIS_API_URL}invoice/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          serie: series,
          numar: number,
        }),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Eroare HTTP ${response.status}`,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Eroare la anularea facturii",
      };
    }
  }

  /**
   * Obține lista seriilor de facturi
   */
  async getSeries(): Promise<{
    success: boolean;
    series?: Array<{
      id: string;
      name: string;
      prefix: string;
      currentNumber: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${FACTURIS_API_URL}series`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Eroare HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        series: data.series || data,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Headers pentru request-uri API
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials.apiKey}`,
      'X-API-Key': this.credentials.apiKey,
    };
  }
}

/**
 * Creează un client Facturis din credențialele unei companii
 */
export function createFacturisClient(company: {
  facturisApiKey: string | null;
  facturisUsername: string | null;
  facturisPassword: string | null;
  facturisCompanyCif: string | null;
  cif: string | null;
}): FacturisAPI | null {
  if (!company.facturisApiKey || !company.facturisUsername || !company.facturisPassword) {
    return null;
  }

  return new FacturisAPI({
    apiKey: company.facturisApiKey,
    username: company.facturisUsername,
    password: company.facturisPassword,
    companyTaxCode: company.facturisCompanyCif || company.cif || '',
  });
}

/**
 * Convertește datele unei comenzi în format Facturis
 */
export function orderToFacturisInvoice(
  order: {
    orderNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    shippingAddress: string | null;
    shippingCity: string | null;
    shippingProvince: string | null;
    shippingCountry: string | null;
    shippingZip: string | null;
    billingCompany: string | null;
    billingVatNumber: string | null;
    lineItems: Array<{
      sku: string | null;
      title: string;
      quantity: number;
      price: number; // Preț unitar CU TVA
    }>;
    totalPrice: number;
  },
  series: string,
  number: number,
  vatRate: number = 19
): FacturisInvoiceRequest {
  // Calculăm TVA
  const vatMultiplier = 1 + (vatRate / 100);

  // Produsele
  const dataProd: FacturisInvoiceItem[] = order.lineItems.map(item => {
    const priceWithVat = Number(item.price);
    const priceWithoutVat = priceWithVat / vatMultiplier;
    const vatAmount = (priceWithVat - priceWithoutVat) * item.quantity;

    return {
      facturi_prod_nume: item.title,
      facturi_prod_cant: item.quantity,
      facturi_prod_pretftva: Math.round(priceWithoutVat * 100) / 100,
      facturi_prod_pretctva: Math.round(priceWithVat * 100) / 100,
      facturi_prod_val_tva: Math.round(vatAmount * 100) / 100,
      facturi_prod_tva: `${vatRate}%`,
      prod_cod_cautare: item.sku || undefined,
      facturi_prod_um: "buc",
    };
  });

  // Determinăm dacă e persoană juridică
  const isCompany = !!(order.billingCompany && order.billingVatNumber);

  return {
    facturi_data: new Date().toISOString().split('T')[0],
    facturi_serie: series,
    facturi_numar: number,
    facturi_moneda: "RON",
    facturi_cota_tva: `${vatRate}%`,
    facturi_status: "Emisa",
    facturi_tip: "factura",

    // Client
    facturi_nume_client: isCompany ? order.billingCompany! : (order.customerName || "Client necunoscut"),
    facturi_codf_client: isCompany ? order.billingVatNumber! : undefined,
    facturi_tip_persoana: isCompany ? "juridica" : "fizica",
    facturi_sediu_client: order.shippingAddress || "",
    facturi_judet_client: order.shippingProvince || "",
    facturi_oras_client: order.shippingCity || "",
    facturi_tara_client: order.shippingCountry || "Romania",
    facturi_email_client: order.customerEmail || undefined,
    facturi_telefon_client: order.customerPhone || undefined,

    // Produse
    dataProd,

    // Observații
    facturi_observatii: `Comandă online: ${order.orderNumber}`,
  };
}

/**
 * Calculează totalurile pentru o listă de produse
 */
export function calculateInvoiceTotals(items: FacturisInvoiceItem[]): {
  subtotal: number;
  totalVat: number;
  total: number;
} {
  let subtotal = 0;
  let totalVat = 0;

  for (const item of items) {
    subtotal += item.facturi_prod_pretftva * item.facturi_prod_cant;
    totalVat += item.facturi_prod_val_tva;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    total: Math.round((subtotal + totalVat) * 100) / 100,
  };
}
