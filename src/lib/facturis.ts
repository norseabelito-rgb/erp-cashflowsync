/**
 * Facturis API Integration - v2.0
 *
 * Client pentru integrarea cu Facturis Online - platformă de facturare.
 * Bazat pe documentația oficială: https://facturis-online.ro/apidoc/
 *
 * API v2.0 folosește JSON și endpoint-ul https://api.facturis-online.ro/api/
 */

// ============================================================================
// CONSTANTE ȘI CONFIGURARE
// ============================================================================

const FACTURIS_API_URL = "https://api.facturis-online.ro/api/";

// Timeout-uri (în milisecunde)
const DEFAULT_TIMEOUT = 30000; // 30 secunde
const PDF_TIMEOUT = 60000; // 60 secunde pentru PDF-uri

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// Coduri de succes Facturis
const SUCCESS_CODE = 2000;

// ============================================================================
// TIPURI ȘI INTERFEȚE
// ============================================================================

export interface FacturisCredentials {
  apiKey: string;
  username: string;
  password: string;
  companyTaxCode: string; // CIF firma emitentă
}

export interface FacturisInvoiceItem {
  facturi_prod_nume: string;        // Denumire produs (obligatoriu)
  facturi_prod_um: string;          // Unitate măsură (obligatoriu) - ex: "buc", "kg"
  facturi_prod_cant: number;        // Cantitate (obligatoriu)
  facturi_prod_pretftva: number;    // Preț unitar fără TVA (obligatoriu)
  facturi_prod_pretctva: number;    // Preț unitar cu TVA
  facturi_prod_val: number;         // Valoare fără TVA (cantitate * pretftva)
  facturi_prod_val_tva: number;     // Valoare TVA
  facturi_prod_val_tot: number;     // Valoare totală cu TVA
  facturi_prod_tva: string;         // Cota TVA ca string (ex: "19%", "9%", "0%")
  facturi_prod_cota_disc?: number;  // Discount % (0-100)
  prod_cod?: string;                // Cod EAN
  prod_sku?: string;                // SKU
  prod_cod1?: string;               // Cod alternativ
}

export interface FacturisClientData {
  facturi_nume_client: string;          // Nume client (obligatoriu)
  facturi_tip_persoana: "fizica" | "juridica"; // Tip persoană (obligatoriu)
  facturi_codf_client?: string;         // CIF/CNP client
  facturi_nrreg_client?: string;        // Nr. Reg. Com. (pentru juridice)
  facturi_sediu_client: string;         // Adresa (obligatoriu)
  facturi_judet_client?: string;        // Județ
  facturi_oras_client?: string;         // Oraș
  facturi_tara_client?: string;         // Țară (default: "Romania")
  facturi_cont_client?: string;         // IBAN
  facturi_banca_client?: string;        // Banca
  facturi_email_client?: string;        // Email
  facturi_telefon_client?: string;      // Telefon
  facturi_clienti_adresa_livrare?: string; // Adresă livrare (dacă diferă)
  facturi_obs_client?: string;          // Observații client
}

export interface FacturisInvoiceData extends FacturisClientData {
  // Header factură
  facturi_data: string;                 // Data factură (DD-MM-YYYY sau YYYY-MM-DD)
  facturi_data_scadenta?: string;       // Data scadență
  facturi_serie: string;                // Seria facturii (obligatoriu)
  facturi_numar: number;                // Numărul facturii (obligatoriu)
  facturi_moneda: string;               // Moneda (RON, EUR, USD)
  facturi_cota_tva: string;             // Cota TVA principală (ex: "19%")
  facturi_status?: string;              // Status document
  facturi_tip?: string;                 // Tip document

  // Opțional
  facturi_punct_de_lucru?: string;      // Punct de lucru
  facturi_gestiune?: string;            // Gestiune/depozit
  facturi_curs_bnr?: number;            // Curs BNR (pentru valută)
  facturi_obs_up?: string;              // Observații generale
  facturi_nume_delegat?: string;        // Delegat
  facturi_act_delegat?: string;         // Act identitate delegat
  facturi_obs_delegat?: string;         // Observații delegat

  // Produse
  dataProd: FacturisInvoiceItem[];
}

export interface FacturisApiResponse<T = any> {
  success: number;
  result?: T;
  error?: string;
  errorCode?: number;
}

export interface FacturisInvoiceResult {
  msg?: string;
  id?: string;
  facturi_key?: string;
  pdf_url?: string;
}

export interface FacturisInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceKey?: string;
  invoiceNumber?: string;
  invoiceSeries?: string;
  pdfUrl?: string;
  message?: string;
  error?: string;
  errorCode?: number;
  rawResponse?: any;
}

export interface FacturisTestResult {
  success: boolean;
  message?: string;
  error?: string;
  companyName?: string;
}

export interface FacturisSeries {
  id: string;
  name: string;
  prefix: string;
  currentNumber?: number;
}

export interface FacturisInvoiceListItem {
  facturi_key: string;
  facturi_serie: string;
  facturi_serie_numar: string;
  facturi_data: string;
  facturi_nume_client: string;
  facturi_total?: number;
  facturi_status?: string;
}

// ============================================================================
// ERORI CUSTOMIZATE
// ============================================================================

export class FacturisApiError extends Error {
  public readonly code?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, code?: number, isRetryable = false) {
    super(message);
    this.name = "FacturisApiError";
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export class FacturisValidationError extends Error {
  public readonly fields: string[];

  constructor(message: string, fields: string[] = []) {
    super(message);
    this.name = "FacturisValidationError";
    this.fields = fields;
  }
}

export class FacturisAuthError extends Error {
  constructor(message = "Autentificare eșuată. Verifică credențialele Facturis.") {
    super(message);
    this.name = "FacturisAuthError";
  }
}

// ============================================================================
// UTILITĂȚI
// ============================================================================

/**
 * Creează un AbortController cu timeout
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Sleep pentru retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formatează data în formatul acceptat de Facturis (DD-MM-YYYY)
 */
export function formatDateForFacturis(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Rotunjește la 2 zecimale
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Validează credențialele
 */
function validateCredentials(credentials: FacturisCredentials): void {
  const missing: string[] = [];
  if (!credentials.apiKey?.trim()) missing.push("API Key");
  if (!credentials.username?.trim()) missing.push("Username");
  if (!credentials.password?.trim()) missing.push("Password");
  if (!credentials.companyTaxCode?.trim()) missing.push("CIF Firmă");

  if (missing.length > 0) {
    throw new FacturisValidationError(
      `Credențiale incomplete. Lipsesc: ${missing.join(", ")}`,
      missing
    );
  }
}

/**
 * Validează datele facturii
 */
function validateInvoiceData(data: FacturisInvoiceData): void {
  const errors: string[] = [];

  // Validări obligatorii
  if (!data.facturi_serie?.trim()) {
    errors.push("Seria facturii este obligatorie");
  }
  if (!data.facturi_numar || data.facturi_numar <= 0) {
    errors.push("Numărul facturii este obligatoriu și trebuie să fie pozitiv");
  }
  if (!data.facturi_nume_client?.trim()) {
    errors.push("Numele clientului este obligatoriu");
  }
  if (!data.facturi_sediu_client?.trim()) {
    errors.push("Adresa clientului este obligatorie");
  }
  if (!data.facturi_tip_persoana) {
    errors.push("Tipul persoanei (fizica/juridica) este obligatoriu");
  }

  // Validare CIF pentru persoane juridice
  if (data.facturi_tip_persoana === "juridica" && !data.facturi_codf_client?.trim()) {
    errors.push("CIF-ul este obligatoriu pentru persoane juridice");
  }

  // Validare produse
  if (!data.dataProd || data.dataProd.length === 0) {
    errors.push("Factura trebuie să conțină cel puțin un produs");
  } else {
    data.dataProd.forEach((prod, index) => {
      if (!prod.facturi_prod_nume?.trim()) {
        errors.push(`Produsul ${index + 1}: Denumirea este obligatorie`);
      }
      if (!prod.facturi_prod_cant || prod.facturi_prod_cant <= 0) {
        errors.push(`Produsul ${index + 1}: Cantitatea trebuie să fie pozitivă`);
      }
      if (prod.facturi_prod_pretftva === undefined || prod.facturi_prod_pretftva < 0) {
        errors.push(`Produsul ${index + 1}: Prețul fără TVA este invalid`);
      }
    });
  }

  if (errors.length > 0) {
    throw new FacturisValidationError(
      `Validare eșuată:\n- ${errors.join("\n- ")}`,
      errors
    );
  }
}

// ============================================================================
// CLIENT API FACTURIS
// ============================================================================

export class FacturisAPI {
  private credentials: FacturisCredentials;

  constructor(credentials: FacturisCredentials) {
    validateCredentials(credentials);
    this.credentials = credentials;
  }

  /**
   * Construiește payload-ul de autentificare pentru API v2.0
   */
  private buildAuthPayload(method: string, action: string, additionalData?: Record<string, any>): Record<string, any> {
    return {
      APIkey: this.credentials.apiKey,
      u: this.credentials.username,
      p: this.credentials.password,
      c: this.credentials.companyTaxCode,
      met: method,
      act: action,
      ...additionalData,
    };
  }

  /**
   * Execută un request către API cu retry logic
   */
  private async executeRequest<T>(
    payload: Record<string, any>,
    timeoutMs = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES
  ): Promise<FacturisApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const { controller, timeoutId } = createTimeoutController(timeoutMs);

      try {
        const jsonPayload = JSON.stringify(payload);

        const response = await fetch(FACTURIS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: `json=${encodeURIComponent(jsonPayload)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();

        // Încearcă să parseze JSON
        let responseData: FacturisApiResponse<T>;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Răspunsul nu e JSON valid
          throw new FacturisApiError(
            `Răspuns invalid de la Facturis: ${responseText.substring(0, 200)}`,
            undefined,
            true
          );
        }

        // Normalizăm codul de răspuns (poate veni ca string sau number)
        const successCode = Number(responseData.success);

        // Verifică codul de succes
        if (successCode === SUCCESS_CODE) {
          return responseData;
        }

        // Extragem mesajul de eroare (poate fi string sau obiect)
        const errorMessage = typeof responseData.error === "string"
          ? responseData.error
          : responseData.error?.message || responseData.error?.msg || JSON.stringify(responseData.error);

        // Eroare de autentificare (codul 4 este eroare de autentificare în Facturis)
        if (
          successCode === 4 ||
          (typeof errorMessage === "string" && errorMessage.toLowerCase().includes("autentificare"))
        ) {
          throw new FacturisAuthError(
            "Autentificare eșuată. Verifică API Key, Username și Parola să fie corecte pentru contul Facturis."
          );
        }

        // Eroare 1004: Serie de facturare invalidă sau inexistentă
        if (successCode === 1004) {
          console.error("[Facturis] Eroare 1004 - Serie invalidă!");
          console.error(`  - Răspuns complet: ${JSON.stringify(responseData)}`);
          console.error(`  - Mesaj eroare: ${errorMessage}`);
          throw new FacturisApiError(
            `Seria de facturare nu există în Facturis. Verifică că seria configurată în ERP corespunde exact cu cea din contul Facturis (case-sensitive). Eroare: ${errorMessage || "Serie invalidă"}`,
            1004,
            false
          );
        }

        // Alte erori
        throw new FacturisApiError(
          errorMessage || `Eroare Facturis (cod ${successCode})`,
          successCode,
          false
        );

      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Nu face retry pentru erori de autentificare sau validare
        if (error instanceof FacturisAuthError || error instanceof FacturisValidationError) {
          throw error;
        }

        // Verifică dacă e o eroare de timeout sau rețea
        const isNetworkError = error.name === "AbortError" ||
                               error.code === "ECONNRESET" ||
                               error.code === "ETIMEDOUT" ||
                               error.message?.includes("fetch");

        const isRetryable = error instanceof FacturisApiError ? error.isRetryable : isNetworkError;

        if (isRetryable && attempt < retries) {
          console.warn(`[Facturis] Retry ${attempt + 1}/${retries} după eroare: ${error.message}`);
          await sleep(RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new FacturisApiError("Eroare necunoscută");
  }

  /**
   * Testează conexiunea cu Facturis
   * Folosește metoda "Clienti" cu "Get" pentru a verifica autentificarea
   */
  async testConnection(): Promise<FacturisTestResult> {
    try {
      // Încercăm să obținem lista de clienți (limitat la 1)
      const payload = this.buildAuthPayload("Clienti", "Get", {
        limit: 1,
      });

      const response = await this.executeRequest<any[]>(payload);

      return {
        success: true,
        message: "Conexiune reușită cu Facturis",
      };

    } catch (error: any) {
      if (error instanceof FacturisAuthError) {
        return {
          success: false,
          error: "Autentificare eșuată. Verifică API Key, Username și Parola.",
        };
      }

      return {
        success: false,
        error: error.message || "Eroare la testarea conexiunii",
      };
    }
  }

  /**
   * Creează o factură în Facturis
   */
  async createInvoice(data: FacturisInvoiceData): Promise<FacturisInvoiceResponse> {
    try {
      // Validare
      validateInvoiceData(data);

      // Construim payload-ul
      const payload = this.buildAuthPayload("Facturi", "Ins", {
        dataFact: {
          facturi_data: data.facturi_data,
          facturi_data_scadenta: data.facturi_data_scadenta,
          facturi_serie: data.facturi_serie,
          facturi_numar: data.facturi_numar,
          facturi_moneda: data.facturi_moneda || "RON",
          facturi_cota_tva: data.facturi_cota_tva || "19%",
          facturi_status: data.facturi_status || "Emisa",
          facturi_tip: data.facturi_tip || "factura",

          // Client
          facturi_nume_client: data.facturi_nume_client,
          facturi_tip_persoana: data.facturi_tip_persoana,
          facturi_codf_client: data.facturi_codf_client || "",
          facturi_nrreg_client: data.facturi_nrreg_client || "",
          facturi_sediu_client: data.facturi_sediu_client,
          facturi_judet_client: data.facturi_judet_client || "",
          facturi_oras_client: data.facturi_oras_client || "",
          facturi_tara_client: data.facturi_tara_client || "Romania",
          facturi_cont_client: data.facturi_cont_client || "",
          facturi_banca_client: data.facturi_banca_client || "",
          facturi_clienti_adresa_livrare: data.facturi_clienti_adresa_livrare || "",
          facturi_obs_client: data.facturi_obs_client || "",

          // Delegat
          facturi_nume_delegat: data.facturi_nume_delegat || "",
          facturi_act_delegat: data.facturi_act_delegat || "",
          facturi_obs_delegat: data.facturi_obs_delegat || "",

          // Observații
          facturi_obs_up: data.facturi_obs_up || "",

          // Opționale
          ...(data.facturi_punct_de_lucru && { facturi_punct_de_lucru: data.facturi_punct_de_lucru }),
          ...(data.facturi_gestiune && { facturi_gestiune: data.facturi_gestiune }),
          ...(data.facturi_curs_bnr && { facturi_curs_bnr: data.facturi_curs_bnr }),
        },
        dataProd: data.dataProd.map((prod) => ({
          facturi_prod_nume: prod.facturi_prod_nume,
          facturi_prod_um: prod.facturi_prod_um || "buc",
          facturi_prod_cant: prod.facturi_prod_cant,
          facturi_prod_pretftva: prod.facturi_prod_pretftva,
          facturi_prod_pretctva: prod.facturi_prod_pretctva,
          facturi_prod_val: prod.facturi_prod_val,
          facturi_prod_val_tva: prod.facturi_prod_val_tva,
          facturi_prod_val_tot: prod.facturi_prod_val_tot,
          facturi_prod_tva: prod.facturi_prod_tva,
          ...(prod.facturi_prod_cota_disc && { facturi_prod_cota_disc: prod.facturi_prod_cota_disc }),
          ...(prod.prod_cod && { prod_cod: prod.prod_cod }),
          ...(prod.prod_sku && { prod_sku: prod.prod_sku }),
          ...(prod.prod_cod1 && { prod_cod1: prod.prod_cod1 }),
        })),
      });

      // Debug logging pentru erori 1004
      console.log("[Facturis] Request payload pentru factură:");
      console.log(`  - Serie: "${data.facturi_serie}"`);
      console.log(`  - Numar: ${data.facturi_numar}`);
      console.log(`  - Client: ${data.facturi_nume_client}`);
      console.log(`  - API Key: ${this.apiKey?.substring(0, 8)}...`);
      console.log(`  - CIF Firma: ${this.companyCif}`);

      const response = await this.executeRequest<FacturisInvoiceResult>(payload);

      return {
        success: true,
        invoiceId: response.result?.id,
        invoiceKey: response.result?.facturi_key,
        invoiceNumber: data.facturi_numar.toString(),
        invoiceSeries: data.facturi_serie,
        pdfUrl: response.result?.pdf_url,
        message: response.result?.msg || "Factură creată cu succes",
        rawResponse: response,
      };

    } catch (error: any) {
      console.error("[Facturis] Eroare la crearea facturii:", error);

      return {
        success: false,
        error: error.message || "Eroare la emiterea facturii în Facturis",
        errorCode: error instanceof FacturisApiError ? error.code : undefined,
        rawResponse: error,
      };
    }
  }

  /**
   * Obține lista de facturi
   */
  async getInvoices(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    series?: string;
  }): Promise<{
    success: boolean;
    invoices?: FacturisInvoiceListItem[];
    error?: string;
  }> {
    try {
      const payload = this.buildAuthPayload("Facturi", "Get", {
        ...(options?.startDate && { data_start: options.startDate }),
        ...(options?.endDate && { data_end: options.endDate }),
        ...(options?.limit && { limit: options.limit }),
        ...(options?.series && { serie: options.series }),
      });

      const response = await this.executeRequest<FacturisInvoiceListItem[]>(payload);

      return {
        success: true,
        invoices: Array.isArray(response.result) ? response.result : [],
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obține o factură după cheie
   */
  async getInvoice(invoiceKey: string): Promise<{
    success: boolean;
    invoice?: any;
    error?: string;
  }> {
    try {
      const payload = this.buildAuthPayload("Facturi", "Get", {
        facturi_key: invoiceKey,
      });

      const response = await this.executeRequest<any>(payload);

      return {
        success: true,
        invoice: response.result,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obține PDF-ul unei facturi
   * Notă: API-ul Facturis returnează un URL către PDF, nu PDF-ul direct
   */
  async getInvoicePDF(invoiceKey: string): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    pdfUrl?: string;
    error?: string;
  }> {
    try {
      // Mai întâi obținem detaliile facturii pentru URL-ul PDF
      const invoiceResult = await this.getInvoice(invoiceKey);

      if (!invoiceResult.success) {
        return {
          success: false,
          error: invoiceResult.error || "Nu s-a putut obține factura",
        };
      }

      const pdfUrl = invoiceResult.invoice?.pdf_url || invoiceResult.invoice?.pdfUrl;

      if (!pdfUrl) {
        return {
          success: false,
          error: "URL-ul PDF nu este disponibil pentru această factură",
        };
      }

      // Descărcăm PDF-ul
      const { controller, timeoutId } = createTimeoutController(PDF_TIMEOUT);

      try {
        const pdfResponse = await fetch(pdfUrl, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!pdfResponse.ok) {
          return {
            success: false,
            error: `Eroare la descărcarea PDF: HTTP ${pdfResponse.status}`,
            pdfUrl,
          };
        }

        const arrayBuffer = await pdfResponse.arrayBuffer();

        return {
          success: true,
          pdfBuffer: Buffer.from(arrayBuffer),
          pdfUrl,
        };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        return {
          success: false,
          error: `Eroare la descărcarea PDF: ${fetchError.message}`,
          pdfUrl,
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Eroare la obținerea PDF-ului",
      };
    }
  }

  /**
   * Anulează (stornează) o factură
   */
  async cancelInvoice(invoiceKey: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const payload = this.buildAuthPayload("Facturi", "Upd", {
        facturi_key: invoiceKey,
        facturi_status: "Anulata",
      });

      const response = await this.executeRequest<any>(payload);

      return {
        success: true,
        message: response.result?.msg || "Factură anulată cu succes",
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
    series?: FacturisSeries[];
    error?: string;
  }> {
    try {
      // Facturis nu are un endpoint dedicat pentru serii
      // Obținem ultimele facturi pentru a extrage seriile unice
      const payload = this.buildAuthPayload("Facturi", "Get", {
        limit: 100,
      });

      const response = await this.executeRequest<FacturisInvoiceListItem[]>(payload);

      // Extragem seriile unice
      const seriesMap = new Map<string, FacturisSeries>();

      if (Array.isArray(response.result)) {
        for (const invoice of response.result) {
          const seriesName = invoice.facturi_serie;
          if (seriesName && !seriesMap.has(seriesName)) {
            seriesMap.set(seriesName, {
              id: seriesName,
              name: seriesName,
              prefix: seriesName,
              currentNumber: parseInt(invoice.facturi_serie_numar, 10) || 0,
            });
          }
        }
      }

      return {
        success: true,
        series: Array.from(seriesMap.values()),
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obține lista de clienți
   */
  async getClients(options?: {
    search?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    clients?: any[];
    error?: string;
  }> {
    try {
      const payload = this.buildAuthPayload("Clienti", "Get", {
        ...(options?.search && { cautare: options.search }),
        ...(options?.limit && { limit: options.limit }),
      });

      const response = await this.executeRequest<any[]>(payload);

      return {
        success: true,
        clients: Array.isArray(response.result) ? response.result : [],
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Adaugă sau actualizează un client
   */
  async upsertClient(clientData: {
    nume: string;
    tip_persoana: "fizica" | "juridica";
    codf?: string;
    nrreg?: string;
    adresa: string;
    judet?: string;
    oras?: string;
    tara?: string;
    email?: string;
    telefon?: string;
  }): Promise<{
    success: boolean;
    clientId?: string;
    error?: string;
  }> {
    try {
      const payload = this.buildAuthPayload("Clienti", "Ins", {
        clienti_nume: clientData.nume,
        clienti_tip_persoana: clientData.tip_persoana,
        clienti_codf: clientData.codf || "",
        clienti_nrreg: clientData.nrreg || "",
        clienti_sediu: clientData.adresa,
        clienti_judet: clientData.judet || "",
        clienti_oras: clientData.oras || "",
        clienti_tara: clientData.tara || "Romania",
        clienti_email: clientData.email || "",
        clienti_tel: clientData.telefon || "",
      });

      const response = await this.executeRequest<{ id: string }>(payload);

      return {
        success: true,
        clientId: response.result?.id,
      };

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

  try {
    return new FacturisAPI({
      apiKey: company.facturisApiKey,
      username: company.facturisUsername,
      password: company.facturisPassword,
      companyTaxCode: company.facturisCompanyCif || company.cif || "",
    });
  } catch (error) {
    console.error("[Facturis] Eroare la crearea clientului:", error);
    return null;
  }
}

/**
 * Calculează valorile pentru un produs pe baza cantității, prețului și cotei TVA
 */
export function calculateProductValues(
  quantity: number,
  priceWithVat: number,
  vatRatePercent: number
): {
  priceWithoutVat: number;
  priceWithVat: number;
  valueWithoutVat: number;
  vatValue: number;
  totalValue: number;
} {
  const vatMultiplier = 1 + vatRatePercent / 100;
  const priceWithoutVat = round2(priceWithVat / vatMultiplier);
  const valueWithoutVat = round2(priceWithoutVat * quantity);
  const totalValue = round2(priceWithVat * quantity);
  const vatValue = round2(totalValue - valueWithoutVat);

  return {
    priceWithoutVat,
    priceWithVat: round2(priceWithVat),
    valueWithoutVat,
    vatValue,
    totalValue,
  };
}

/**
 * Convertește un item de comandă în format Facturis
 */
export function createFacturisInvoiceItem(
  item: {
    sku?: string | null;
    title: string;
    variantTitle?: string | null;
    quantity: number;
    price: number; // Preț unitar CU TVA
    vatRate?: number; // Cota TVA în procente (default 19)
  }
): FacturisInvoiceItem {
  const vatRate = item.vatRate ?? 19;
  const values = calculateProductValues(item.quantity, item.price, vatRate);

  const productName = item.variantTitle
    ? `${item.title} - ${item.variantTitle}`
    : item.title;

  return {
    facturi_prod_nume: productName,
    facturi_prod_um: "buc",
    facturi_prod_cant: item.quantity,
    facturi_prod_pretftva: values.priceWithoutVat,
    facturi_prod_pretctva: values.priceWithVat,
    facturi_prod_val: values.valueWithoutVat,
    facturi_prod_val_tva: values.vatValue,
    facturi_prod_val_tot: values.totalValue,
    facturi_prod_tva: `${vatRate}%`,
    ...(item.sku && { prod_sku: item.sku }),
  };
}

/**
 * Convertește datele unei comenzi în format Facturis complet
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
    billingRegNumber: string | null;
    lineItems: Array<{
      sku: string | null;
      title: string;
      variantTitle?: string | null;
      quantity: number;
      price: number; // Preț unitar CU TVA
      vatRate?: number; // Cota TVA opțională per produs
    }>;
    totalPrice: number;
    currency?: string;
  },
  series: string,
  number: number,
  defaultVatRate: number = 19
): FacturisInvoiceData {
  // Determinăm dacă e persoană juridică
  const isCompany = !!(order.billingCompany && order.billingVatNumber);

  // Construim adresa
  const addressParts = [order.shippingAddress].filter(Boolean);
  if (order.shippingZip) {
    addressParts.push(order.shippingZip);
  }
  const fullAddress = addressParts.join(", ") || "Nedefinit";

  // Convertim produsele
  const dataProd: FacturisInvoiceItem[] = order.lineItems.map((item) =>
    createFacturisInvoiceItem({
      ...item,
      vatRate: item.vatRate ?? defaultVatRate,
    })
  );

  return {
    // Header
    facturi_data: formatDateForFacturis(new Date()),
    facturi_serie: series,
    facturi_numar: number,
    facturi_moneda: order.currency || "RON",
    facturi_cota_tva: `${defaultVatRate}%`,
    facturi_status: "Emisa",
    facturi_tip: "factura",

    // Client
    facturi_nume_client: isCompany
      ? order.billingCompany!
      : order.customerName || "Client necunoscut",
    facturi_tip_persoana: isCompany ? "juridica" : "fizica",
    facturi_codf_client: isCompany ? order.billingVatNumber! : undefined,
    facturi_nrreg_client: isCompany ? order.billingRegNumber || undefined : undefined,
    facturi_sediu_client: fullAddress,
    facturi_judet_client: order.shippingProvince || "",
    facturi_oras_client: order.shippingCity || "",
    facturi_tara_client: order.shippingCountry || "Romania",
    facturi_email_client: order.customerEmail || undefined,
    facturi_telefon_client: order.customerPhone || undefined,

    // Observații
    facturi_obs_up: `Comandă online: ${order.orderNumber}`,

    // Produse
    dataProd,
  };
}

/**
 * Calculează totalurile pentru o listă de produse Facturis
 */
export function calculateInvoiceTotals(items: FacturisInvoiceItem[]): {
  subtotal: number;
  totalVat: number;
  total: number;
} {
  let subtotal = 0;
  let totalVat = 0;
  let total = 0;

  for (const item of items) {
    subtotal += item.facturi_prod_val;
    totalVat += item.facturi_prod_val_tva;
    total += item.facturi_prod_val_tot;
  }

  return {
    subtotal: round2(subtotal),
    totalVat: round2(totalVat),
    total: round2(total),
  };
}

/**
 * Verifică dacă o companie are credențiale Facturis complete
 */
export function hasFacturisCredentials(company: {
  facturisApiKey: string | null;
  facturisUsername: string | null;
  facturisPassword: string | null;
}): boolean {
  return !!(
    company.facturisApiKey?.trim() &&
    company.facturisUsername?.trim() &&
    company.facturisPassword?.trim()
  );
}
