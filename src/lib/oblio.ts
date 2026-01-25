/**
 * Oblio API Client
 *
 * Client pentru integrarea cu Oblio.eu - program de facturare online.
 * Documentație: https://www.oblio.eu/api
 *
 * Autentificare: OAuth 2.0 cu email (client_id) și secret token (client_secret)
 */

// ============================================================================
// CONSTANTE
// ============================================================================

const OBLIO_API_URL = "https://www.oblio.eu/api";
const TOKEN_URL = `${OBLIO_API_URL}/authorize/token`;
const DEFAULT_TIMEOUT = 30000; // 30 secunde
const MAX_RETRIES = 2;

// ============================================================================
// TIPURI ȘI INTERFEȚE
// ============================================================================

export interface OblioCredentials {
  email: string; // client_id - emailul contului Oblio
  secretToken: string; // client_secret - token din Setări > Date Cont
  cif: string; // CIF-ul firmei pentru care se emit facturi
}

export interface OblioInvoiceItem {
  name: string; // Denumire produs
  code?: string; // Cod/SKU produs
  description?: string; // Descriere
  price: number; // Preț unitar (fără TVA dacă isTaxIncluded=false)
  measuringUnit: string; // Unitate de măsură (buc, kg, etc)
  currency: string; // Moneda (RON, EUR, etc)
  vatName: string; // Denumire cotă TVA (ex: "Normala")
  vatPercentage: number; // Procent TVA (ex: 19)
  vatIncluded: boolean; // Prețul include TVA?
  quantity: number; // Cantitate
  productType?: string; // Tip produs (Piese, Servicii, etc)
}

export interface OblioInvoiceData {
  // Informații firmă
  cif: string; // CIF-ul firmei emitente
  seriesName: string; // Seria de facturare

  // Informații client
  client: {
    cif?: string; // CIF client (pentru PJ)
    name: string; // Nume client
    rc?: string; // Reg. Com. (pentru PJ)
    code?: string; // Cod intern client
    address?: string; // Adresă
    state?: string; // Județ
    city?: string; // Oraș
    country?: string; // Țară
    iban?: string; // IBAN
    bank?: string; // Bancă
    email?: string; // Email
    phone?: string; // Telefon
    contact?: string; // Persoană contact
    isTaxPayer?: boolean; // Plătitor TVA?
    save?: boolean; // Salvează clientul în nomenclator?
  };

  // Date document
  issueDate?: string; // Data emiterii (YYYY-MM-DD)
  dueDate?: string; // Data scadenței (YYYY-MM-DD)
  deliveryDate?: string; // Data livrării (YYYY-MM-DD)
  collectDate?: string; // Data încasării (YYYY-MM-DD)

  // Detalii
  language?: string; // Limba documentului (RO, EN)
  precision?: number; // Precizie zecimale (default 2)
  currency?: string; // Moneda (RON, EUR)
  exchangeRate?: number; // Curs valutar

  // Produse
  products: OblioInvoiceItem[];

  // Observații
  mentions?: string; // Mențiuni pe factură
  observations?: string; // Observații
  reference?: { // Referință document
    type?: string; // Tip (Comanda, Contract, etc)
    no?: string; // Număr referință
  };

  // Încasare
  collect?: {
    type?: string; // Tip încasare (Cash, Card, etc)
    documentId?: string; // ID document încasare
  };

  // e-Factura
  useStock?: boolean; // Folosește stocuri?
  sendEInvoice?: boolean; // Trimite la e-Factura SPV?
}

export interface OblioInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceSeries?: string;
  link?: string; // Link pentru vizualizare
  error?: string;
  errorCode?: number;
}

export interface OblioTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface OblioPDFResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfUrl?: string;
  error?: string;
}

// ============================================================================
// ERORI CUSTOM
// ============================================================================

export class OblioError extends Error {
  constructor(
    message: string,
    public code?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "OblioError";
  }
}

export class OblioAuthError extends OblioError {
  constructor(message: string = "Autentificare eșuată la Oblio") {
    super(message, 401, false);
    this.name = "OblioAuthError";
  }
}

export class OblioValidationError extends OblioError {
  constructor(message: string) {
    super(message, 400, false);
    this.name = "OblioValidationError";
  }
}

export class OblioApiError extends OblioError {
  constructor(message: string, code?: number, isRetryable: boolean = false) {
    super(message, code, isRetryable);
    this.name = "OblioApiError";
  }
}

// ============================================================================
// CLASA PRINCIPALĂ
// ============================================================================

export class OblioAPI {
  private credentials: OblioCredentials;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(credentials: OblioCredentials) {
    this.credentials = credentials;
  }

  /**
   * Obține token de acces OAuth 2.0
   */
  private async getAccessToken(): Promise<string> {
    // Verifică dacă avem token valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    console.log("[Oblio] Obținere token de acces...");

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.credentials.email,
        client_secret: this.credentials.secretToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Oblio] Eroare la obținere token:", errorText);
      throw new OblioAuthError(
        "Autentificare eșuată. Verifică email-ul și token-ul secret din Oblio."
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new OblioAuthError("Nu s-a primit token de acces de la Oblio.");
    }

    this.accessToken = data.access_token;
    // Token-ul expiră în 3600 secunde (1 oră)
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    console.log("[Oblio] Token obținut cu succes");
    return this.accessToken;
  }

  /**
   * Execută request autentificat către API
   */
  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any,
    retries = MAX_RETRIES
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${OBLIO_API_URL}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== "GET") {
      options.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData: any;

        try {
          responseData = JSON.parse(responseText);
        } catch {
          throw new OblioApiError(
            `Răspuns invalid de la Oblio: ${responseText.substring(0, 200)}`
          );
        }

        // Verifică răspunsul
        if (!response.ok) {
          const errorMessage =
            responseData.statusMessage ||
            responseData.error ||
            responseData.message ||
            "Eroare necunoscută";

          // Eroare de autentificare
          if (response.status === 401) {
            this.accessToken = null; // Resetează token-ul
            throw new OblioAuthError(errorMessage);
          }

          // Eroare de validare
          if (response.status === 400) {
            throw new OblioValidationError(errorMessage);
          }

          throw new OblioApiError(errorMessage, response.status);
        }

        return responseData as T;
      } catch (error: any) {
        lastError = error;

        // Nu reîncercăm erorile de autentificare sau validare
        if (
          error instanceof OblioAuthError ||
          error instanceof OblioValidationError
        ) {
          throw error;
        }

        // Reîncercăm pentru erori de rețea
        if (attempt < retries) {
          console.log(
            `[Oblio] Retry ${attempt + 1}/${retries} pentru ${endpoint}`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new OblioApiError("Eroare necunoscută la Oblio");
  }

  /**
   * Testează conexiunea cu Oblio
   */
  async testConnection(): Promise<OblioTestResult> {
    try {
      console.log("[Oblio] Test conexiune cu:");
      console.log(`  - Email: ${this.credentials.email}`);
      console.log(`  - CIF: ${this.credentials.cif}`);

      // Încercăm să obținem nomenclatorul de serii
      const response = await this.request<any>(
        "GET",
        `/nomenclature/series?cif=${encodeURIComponent(this.credentials.cif)}`
      );

      console.log("[Oblio] Conexiune reușită!");
      return {
        success: true,
        message: "Conexiune reușită cu Oblio",
      };
    } catch (error: any) {
      console.error("[Oblio] Eroare la test conexiune:", error.message);

      if (error instanceof OblioAuthError) {
        return {
          success: false,
          error:
            "Autentificare eșuată. Verifică email-ul și token-ul secret din Setări > Date Cont în Oblio.",
        };
      }

      return {
        success: false,
        error: error.message || "Eroare la conexiunea cu Oblio",
      };
    }
  }

  /**
   * Obține seriile de facturare disponibile
   */
  async getInvoiceSeries(): Promise<{ name: string; type: string }[]> {
    const response = await this.request<{ data: any[] }>(
      "GET",
      `/nomenclature/series?cif=${encodeURIComponent(this.credentials.cif)}`
    );

    return (response.data || []).map((s: any) => ({
      name: s.name,
      type: s.type,
    }));
  }

  /**
   * Creează o factură în Oblio
   */
  async createInvoice(data: OblioInvoiceData): Promise<OblioInvoiceResponse> {
    try {
      // Validare minimă
      if (!data.seriesName) {
        throw new OblioValidationError("Seria de facturare este obligatorie");
      }
      if (!data.client?.name) {
        throw new OblioValidationError("Numele clientului este obligatoriu");
      }
      if (!data.products || data.products.length === 0) {
        throw new OblioValidationError("Factura trebuie să aibă cel puțin un produs");
      }

      console.log("[Oblio] Creare factură:");
      console.log(`  - Serie: "${data.seriesName}"`);
      console.log(`  - Client: ${data.client.name}`);
      console.log(`  - Produse: ${data.products.length}`);
      console.log(`  - CIF Firmă: ${data.cif}`);

      const response = await this.request<any>("POST", "/docs/invoice", data);

      console.log("[Oblio] Răspuns:", JSON.stringify(response));

      if (response.data) {
        return {
          success: true,
          invoiceId: response.data.seriesName + response.data.number,
          invoiceNumber: response.data.number?.toString(),
          invoiceSeries: response.data.seriesName,
          link: response.data.link,
        };
      }

      return {
        success: false,
        error: response.statusMessage || "Eroare la crearea facturii",
        errorCode: response.status,
      };
    } catch (error: any) {
      console.error("[Oblio] Eroare la crearea facturii:", error);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  /**
   * Obține PDF-ul unei facturi
   */
  async getInvoicePDF(
    seriesName: string,
    number: string
  ): Promise<OblioPDFResult> {
    try {
      const response = await this.request<any>(
        "GET",
        `/docs/invoice?cif=${encodeURIComponent(this.credentials.cif)}&seriesName=${encodeURIComponent(seriesName)}&number=${encodeURIComponent(number)}`
      );

      if (response.data?.link) {
        // Descărcăm PDF-ul
        const pdfResponse = await fetch(response.data.link);
        if (pdfResponse.ok) {
          const arrayBuffer = await pdfResponse.arrayBuffer();
          return {
            success: true,
            pdfBuffer: Buffer.from(arrayBuffer),
            pdfUrl: response.data.link,
          };
        }
      }

      return {
        success: false,
        error: "PDF-ul nu este disponibil",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Anulează o factură (stornare)
   */
  async cancelInvoice(
    seriesName: string,
    number: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request<any>("PUT", "/docs/invoice/cancel", {
        cif: this.credentials.cif,
        seriesName,
        number,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Trimite factura la e-Factura SPV
   */
  async sendToEInvoice(
    seriesName: string,
    number: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request<any>("POST", "/docs/einvoice", {
        cif: this.credentials.cif,
        seriesName,
        number,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// FUNCȚII HELPER
// ============================================================================

/**
 * Verifică dacă o firmă are credențiale Oblio configurate
 */
export function hasOblioCredentials(company: any): boolean {
  return !!(
    company?.oblioEmail?.trim() &&
    company?.oblioSecretToken?.trim()
  );
}

/**
 * Creează un client Oblio pentru o firmă
 */
export function createOblioClient(company: any): OblioAPI | null {
  if (!hasOblioCredentials(company)) {
    return null;
  }

  return new OblioAPI({
    email: company.oblioEmail,
    secretToken: company.oblioSecretToken,
    cif: company.oblioCif || company.cif || "",
  });
}

/**
 * Formatează data pentru Oblio (YYYY-MM-DD)
 */
export function formatDateForOblio(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Creează un item de factură pentru Oblio
 */
export function createOblioInvoiceItem(params: {
  sku?: string | null;
  title: string;
  variantTitle?: string | null;
  quantity: number;
  price: number; // Preț cu TVA inclus
  vatRate: number;
  currency?: string;
}): OblioInvoiceItem {
  const name = params.variantTitle
    ? `${params.title} - ${params.variantTitle}`
    : params.title;

  return {
    name: name.substring(0, 200), // Max 200 caractere
    code: params.sku || undefined,
    price: params.price,
    measuringUnit: "buc",
    currency: params.currency || "RON",
    vatName: params.vatRate === 19 ? "Normala" : `${params.vatRate}%`,
    vatPercentage: params.vatRate,
    vatIncluded: true, // Prețul include TVA
    quantity: params.quantity,
    productType: "Piese",
  };
}

/**
 * Validează credențialele Oblio
 */
export function validateOblioCredentials(credentials: Partial<OblioCredentials>): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!credentials.email?.trim()) missing.push("Email");
  if (!credentials.secretToken?.trim()) missing.push("Token Secret");

  return {
    valid: missing.length === 0,
    missing,
  };
}
