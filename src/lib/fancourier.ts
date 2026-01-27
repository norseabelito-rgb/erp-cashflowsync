import axios, { AxiosInstance } from "axios";
import prisma from "./db";

const FANCOURIER_API_URL = "https://api.fancourier.ro";

interface FanCourierToken {
  token: string;
  expiresAt: Date;
}

interface FanCourierConfig {
  username: string;
  password: string;
  clientId: string;
}

// Token cache per company (keyed by clientId to prevent multi-company data leakage)
const tokenCache = new Map<string, FanCourierToken>();

// Helper to generate cache key from credentials
function getTokenCacheKey(clientId: string, username: string): string {
  return `${clientId}:${username}`;
}

export class FanCourierAPI {
  private username: string;
  private password: string;
  private clientId: string;
  private client: AxiosInstance;

  // Constructor care acceptă fie parametri separați, fie un obiect
  constructor(usernameOrConfig: string | FanCourierConfig, password?: string, clientId?: string) {
    if (typeof usernameOrConfig === 'object') {
      this.username = usernameOrConfig.username;
      this.password = usernameOrConfig.password;
      this.clientId = usernameOrConfig.clientId;
    } else {
      this.username = usernameOrConfig;
      this.password = password!;
      this.clientId = clientId!;
    }
    
    this.client = axios.create({
      baseURL: FANCOURIER_API_URL,
      timeout: 30000,
    });
  }

  /**
   * Obține token de autentificare (valid 24h)
   * Tokens are cached per-company (by clientId+username) to prevent multi-company data leakage
   */
  async getToken(): Promise<string> {
    // Use company-specific cache key to prevent multi-tenant token sharing
    const cacheKey = getTokenCacheKey(this.clientId, this.username);
    const cachedToken = tokenCache.get(cacheKey);

    // Verifică dacă avem token valid în cache pentru această companie
    if (cachedToken && cachedToken.expiresAt > new Date()) {
      console.log(`[FanCourier] Using cached token for clientId=${this.clientId}, username=${this.username}`);
      return cachedToken.token;
    }

    // Trimitem credențialele în body (mai sigur pentru parole cu caractere speciale)
    const loginUrl = `${FANCOURIER_API_URL}/login`;

    console.log(`[FanCourier] Login attempt for clientId=${this.clientId}, username=${this.username}`);
    console.log(`[FanCourier] Password length: ${this.password?.length || 0}, has special chars: ${/[^a-zA-Z0-9]/.test(this.password || '')}`);

    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    const responseText = await response.text();
    console.log(`[FanCourier] Login response status: ${response.status}`);
    console.log(`[FanCourier] Login response body: ${responseText.substring(0, 500)}`);

    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[FanCourier] Failed to parse response as JSON`);
    }

    if (!response.ok) {
      throw new Error(data?.message || `Eroare autentificare FanCourier: ${response.status}`);
    }
    const token = data?.data?.token;

    if (!token) {
      throw new Error("Nu s-a putut obține token de la FanCourier");
    }

    console.log(`[FanCourier] Token obtained successfully for clientId=${this.clientId}`);

    // Cache token pentru 23 ore pentru această companie specifică
    tokenCache.set(cacheKey, {
      token,
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
    });

    return token;
  }

  /**
   * Face request autentificat
   */
  private async authRequest(method: string, endpoint: string, data?: any, params?: any) {
    const token = await this.getToken();
    
    const config: any = {
      method,
      url: endpoint,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      params,
    };

    if (data) {
      config.data = data;
    }

    return this.client.request(config);
  }

  /**
   * Testează conexiunea la API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getToken();
      
      // Verificăm și că clientId-ul e valid
      const response = await this.authRequest("GET", "/reports/services");
      
      if (response.data.status === "success") {
        return { success: true };
      }
      
      return { success: false, error: "Nu s-au putut obține serviciile" };
    } catch (error: any) {
      console.error("FanCourier test error:", error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || "Credențiale invalide" 
      };
    }
  }

  /**
   * Obține lista de servicii disponibile
   */
  async getServices(): Promise<any[]> {
    try {
      const response = await this.authRequest("GET", "/reports/services");
      return response.data.data || [];
    } catch (error) {
      console.error("Error getting services:", error);
      return [];
    }
  }

  /**
   * Traduce și explică erorile FanCourier
   */
  private translateFanCourierError(field: string, messages: string[]): string {
    const fieldTranslations: Record<string, string> = {
      'locality': 'Localitate',
      'county': 'Județ',
      'street': 'Stradă',
      'streetNo': 'Număr stradă',
      'phone': 'Telefon',
      'name': 'Nume destinatar',
      'email': 'Email',
      'weight': 'Greutate',
      'service': 'Serviciu',
      'packages': 'Colete',
      'dimensions': 'Dimensiuni',
      'cod': 'Ramburs',
      'payment': 'Plată',
      'zipCode': 'Cod poștal',
    };

    const errorExplanations: Record<string, string> = {
      'Locality is invalid': 'Localitatea nu există în nomenclatorul FanCourier. RECOMANDARE: Verifică ortografia sau folosește o localitate din lista oficială FanCourier.',
      'County is invalid': 'Județul nu există în nomenclatorul FanCourier. RECOMANDARE: Folosește denumirea oficială (ex: "București" nu "Bucuresti", "Cluj" nu "CJ").',
      'Phone is invalid': 'Numărul de telefon este invalid. RECOMANDARE: Folosește formatul 07XXXXXXXX (10 cifre, fără spații sau caractere speciale).',
      'Street is required': 'Strada este obligatorie. RECOMANDARE: Completează adresa cu numele străzii.',
      'Name is required': 'Numele destinatarului este obligatoriu.',
      'Weight must be greater than 0': 'Greutatea trebuie să fie mai mare decât 0.',
      'Service is invalid': 'Serviciul selectat nu este valid. RECOMANDARE: Folosește unul din: Standard, Cont Colector, RedCode, Express Loco.',
    };

    const fieldName = fieldTranslations[field] || field;
    const explanations = messages.map(msg => {
      const explanation = errorExplanations[msg];
      if (explanation) {
        return `${msg} - ${explanation}`;
      }
      return msg;
    });

    return `❌ ${fieldName}: ${explanations.join('; ')}`;
  }

  /**
   * Parsează și formatează erorile din răspunsul FanCourier
   */
  private parseAWBErrors(errors: any): string {
    if (!errors) return 'Eroare necunoscută la generarea AWB';
    
    if (typeof errors === 'string') {
      return errors;
    }
    
    if (Array.isArray(errors)) {
      return errors.join(', ');
    }
    
    if (typeof errors === 'object') {
      const errorMessages: string[] = [];
      for (const [field, messages] of Object.entries(errors)) {
        const msgArray = Array.isArray(messages) ? messages : [String(messages)];
        errorMessages.push(this.translateFanCourierError(field, msgArray as string[]));
      }
      return errorMessages.join('\n');
    }
    
    return 'Eroare necunoscută la generarea AWB';
  }

  /**
   * Creează un AWB intern
   */
  async createAWB(data: {
    recipientName: string;
    recipientPhone: string;
    recipientEmail?: string;
    recipientCounty: string;
    recipientCity: string;
    recipientStreet: string;
    recipientStreetNo?: string;
    recipientZipCode?: string;
    service?: string;
    payment?: "sender" | "recipient";
    parcels?: number;
    envelopes?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    content?: string;
    cod?: number;
    declaredValue?: number;
    observation?: string;
    costCenter?: string;
    options?: string[];
  }): Promise<{ success: boolean; awb?: string; error?: string }> {
    try {
      // Normalizează numărul de telefon (elimină spații și convertește +40/0040 la 0)
      const normalizePhone = (phone: string | undefined): string => {
        if (!phone) return '';
        // Elimină spații, cratime și paranteze
        let normalized = phone.replace(/[\s\-\(\)]/g, '');
        // Convertește +40 la 0
        if (normalized.startsWith('+40')) {
          normalized = '0' + normalized.substring(3);
        }
        // Convertește 0040 la 0
        if (normalized.startsWith('0040')) {
          normalized = '0' + normalized.substring(4);
        }
        return normalized;
      };

      // Normalizează telefonul destinatarului
      const normalizedPhone = normalizePhone(data.recipientPhone);
      
      // Validări locale înainte de a trimite la API
      const localErrors: string[] = [];
      
      if (!data.recipientName || data.recipientName.trim().length < 2) {
        localErrors.push('❌ Nume destinatar: Numele trebuie să aibă minim 2 caractere.');
      }
      
      // Validăm telefonul normalizat - acceptă orice număr românesc valid de 10 cifre
      // Include: 07X (mobile), 02X (București), 03X (fix), 04X (mobile VoIP), 05X (servicii speciale)
      if (!normalizedPhone || !/^0[2-7]\d{8}$/.test(normalizedPhone)) {
        localErrors.push('❌ Telefon: Formatul corect este 0XXXXXXXXX (10 cifre). Valoare primită: "' + data.recipientPhone + '" → normalizat: "' + normalizedPhone + '"');
      }
      
      if (!data.recipientCounty || data.recipientCounty.trim().length < 2) {
        localErrors.push('❌ Județ: Județul este obligatoriu. Valoare primită: "' + data.recipientCounty + '"');
      }
      
      if (!data.recipientCity || data.recipientCity.trim().length < 2) {
        localErrors.push('❌ Localitate: Localitatea este obligatorie. Valoare primită: "' + data.recipientCity + '"');
      }
      
      if (!data.recipientStreet || data.recipientStreet.trim().length < 2) {
        localErrors.push('❌ Stradă: Strada este obligatorie. Valoare primită: "' + data.recipientStreet + '"');
      }
      
      if (localErrors.length > 0) {
        const errorMsg = '🚫 VALIDARE LOCALĂ EȘUATĂ:\n' + localErrors.join('\n');
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      const payload = {
        clientId: parseInt(this.clientId),
        shipments: [
          {
            info: {
              service: data.service || "Standard",
              bank: "",
              bankAccount: "",
              packages: {
                parcel: data.parcels || 1,
                envelopes: data.envelopes || 0,
              },
              weight: data.weight || 1,
              cod: data.cod || 0,
              declaredValue: data.declaredValue || 0,
              payment: data.payment || "recipient",
              refund: null,
              returnPayment: null,
              observation: data.observation || "",
              content: data.content || "Colet",
              dimensions: {
                length: data.length || 1,
                height: data.height || 1,
                width: data.width || 1,
              },
              costCenter: data.costCenter || "",
              options: data.options || [],
            },
            recipient: {
              name: data.recipientName.trim(),
              phone: normalizedPhone, // Folosim telefonul normalizat (07XXXXXXXX)
              email: data.recipientEmail || "",
              address: {
                county: data.recipientCounty.trim(),
                locality: data.recipientCity.trim(),
                street: data.recipientStreet.trim(),
                streetNo: data.recipientStreetNo || "",
                zipCode: data.recipientZipCode || "",
              },
            },
          },
        ],
      };

      console.log("\n" + "=".repeat(60));
      console.log("📦 FANCOURIER - CREARE AWB");
      console.log("=".repeat(60));
      console.log("📍 Destinatar:", data.recipientName);
      console.log("📞 Telefon:", data.recipientPhone);
      console.log("🏠 Adresă:", `${data.recipientStreet}, ${data.recipientCity}, ${data.recipientCounty}`);
      console.log("📦 Serviciu:", data.service || "Standard");
      console.log("⚖️ Greutate:", data.weight || 1, "kg");
      console.log("💰 Ramburs:", data.cod || 0, "RON");
      console.log("-".repeat(60));
      console.log("📤 Payload complet:", JSON.stringify(payload, null, 2));
      console.log("=".repeat(60) + "\n");

      const response = await this.authRequest("POST", "/intern-awb", payload);

      console.log("\n" + "=".repeat(60));
      console.log("📥 FANCOURIER - RĂSPUNS");
      console.log("=".repeat(60));
      console.log(JSON.stringify(response.data, null, 2));
      console.log("=".repeat(60) + "\n");

      // Răspunsul poate fi în response.data.data sau response.data.response
      const responseData = response.data.data?.[0] || response.data.response?.[0];

      if (responseData?.awbNumber) {
        console.log("✅ AWB GENERAT CU SUCCES:", responseData.awbNumber);
        return { success: true, awb: responseData.awbNumber.toString() };
      }

      // Parsează erorile
      const errorMsg = this.parseAWBErrors(responseData?.errors);
      
      console.error("\n" + "=".repeat(60));
      console.error("❌ FANCOURIER - EROARE LA GENERARE AWB");
      console.error("=".repeat(60));
      console.error(errorMsg);
      console.error("\n💡 SUGESTII:");
      console.error("   1. Verifică dacă localitatea există în nomenclatorul FanCourier");
      console.error("   2. Accesează https://www.fancourier.ro pentru lista de localități");
      console.error("   3. Asigură-te că județul și localitatea se potrivesc");
      console.error("   4. Verifică formatul numărului de telefon (07XXXXXXXX)");
      console.error("=".repeat(60) + "\n");
      
      return { success: false, error: errorMsg };
    } catch (error: any) {
      console.error("\n" + "=".repeat(60));
      console.error("💥 FANCOURIER - EXCEPȚIE");
      console.error("=".repeat(60));
      console.error("Mesaj:", error.message);
      console.error("Răspuns API:", error.response?.data);
      console.error("=".repeat(60) + "\n");
      
      const responseData = error.response?.data?.data?.[0] || error.response?.data?.response?.[0];
      const errorMsg = this.parseAWBErrors(responseData?.errors) || error.message;
      
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Tracking AWB
   */
  async trackAWB(awbNumber: string): Promise<{
    success: boolean;
    status?: string;
    events?: Array<{ id: string; name: string; location: string; date: string }>;
    error?: string;
  }> {
    try {
      const response = await this.authRequest("GET", "/reports/awb/tracking", null, {
        clientId: this.clientId,
        "awb[]": awbNumber,
        language: "ro",
      });

      if (response.data.status === "success" && response.data.data?.[0]) {
        const trackingData = response.data.data[0];
        const events = trackingData.events || [];
        const lastEvent = events.length > 0 ? events[events.length - 1] : null;

        return {
          success: true,
          status: lastEvent?.name || "Necunoscut",
          events: events.map((e: any) => ({
            id: e.id,
            name: e.name,
            location: e.location,
            date: e.date,
          })),
        };
      }

      return { success: false, error: "AWB negăsit" };
    } catch (error: any) {
      console.error("FanCourier tracking error:", error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Printare AWB (returnează PDF sau ZPL)
   * @param awbNumber - Numărul AWB-ului
   * @param options - Opțiuni de printare
   *   - format: "A4" | "A6" | "A5" | "half_A4" | "half_A5" (default: "A6")
   *   - type: 1=PDF, 2=HTML, 3=ZPL (default: 1)
   */
  async printAWB(
    awbNumber: string, 
    options?: { format?: string; type?: number }
  ): Promise<Buffer | null> {
    try {
      const token = await this.getToken();
      const format = options?.format || "A6";
      const type = options?.type || 1; // 1 = PDF
      
      console.log(`📄 Requesting AWB ${awbNumber} label - format: ${format}, type: ${type === 3 ? 'ZPL' : 'PDF'}`);
      
      // FanCourier API pentru etichete
      // Documentație oficială: format poate fi: A4, A5, A6 (A6 doar cu ePOD/opțiunea X)
      const response = await axios.get(`${FANCOURIER_API_URL}/awb/label`, {
        params: {
          clientId: this.clientId,
          "awbs[]": awbNumber,
          pdf: type,
          format: format, // Corect: 'format' nu 'page' conform doc FanCourier
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "arraybuffer",
      });

      // Verificăm dacă răspunsul este valid
      if (!response.data || response.data.byteLength === 0) {
        console.error(`📄 AWB ${awbNumber} - empty response from FanCourier`);
        return null;
      }

      // Verificăm dacă răspunsul e un JSON cu eroare (uneori FanCourier returnează JSON în loc de PDF)
      try {
        const textResponse = Buffer.from(response.data).toString('utf8');
        if (textResponse.startsWith('{') && textResponse.includes('error')) {
          const jsonError = JSON.parse(textResponse);
          console.error(`📄 AWB ${awbNumber} - FanCourier error:`, jsonError);
          return null;
        }
      } catch (e) {
        // Nu e JSON, e bine - continuăm
      }

      console.log(`📄 AWB ${awbNumber} received - type: ${type === 3 ? 'ZPL' : 'PDF'}, size: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error(`Error printing AWB ${awbNumber}:`, error.message);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data: ${Buffer.from(error.response.data || '').toString('utf8').substring(0, 500)}`);
      }
      return null;
    }
  }

  /**
   * Șterge AWB
   */
  async deleteAWB(awbNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.authRequest("DELETE", "/awb", null, {
        clientId: this.clientId,
        awb: awbNumber,
      });

      if (response.data.status === "success") {
        return { success: true };
      }

      return { success: false, error: response.data.message || "Eroare la ștergere" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obține detalii AWB din borderou (pentru o anumită dată)
   * Endpoint: /reports/awb
   */
  async getAWBFromBorderou(awbNumber: string, date: string): Promise<{
    success: boolean;
    found: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await this.authRequest("GET", "/reports/awb", null, {
        clientId: this.clientId,
        date: date,
        perPage: 100,
        page: 1,
      });

      if (response.data.status === "success" && response.data.data) {
        const awbData = response.data.data.find((item: any) => 
          String(item.info?.awbNumber) === String(awbNumber)
        );
        
        if (awbData) {
          return {
            success: true,
            found: true,
            data: awbData,
          };
        }
      }

      return {
        success: true,
        found: false,
      };
    } catch (error: any) {
      console.error(`Eroare la getAWBFromBorderou pentru ${awbNumber}:`, error.message);
      return {
        success: false,
        found: false,
        error: error.message,
      };
    }
  }

  /**
   * Normalizează textul pentru API FanCourier
   * Elimină diacritice și normalizează spațiile
   * FanCourier API pare să accepte doar caractere ASCII
   */
  private normalizeForAPI(text: string): string {
    return text
      .replace(/[ăâ]/gi, (m) => m.toLowerCase() === m ? 'a' : 'A')
      .replace(/[î]/gi, (m) => m.toLowerCase() === m ? 'i' : 'I')
      .replace(/[șş]/gi, (m) => m.toLowerCase() === m ? 's' : 'S')
      .replace(/[țţ]/gi, (m) => m.toLowerCase() === m ? 't' : 'T')
      .replace(/sectorul\s*/gi, 'Sector ')
      .trim();
  }

  /**
   * Obține lista de străzi din nomenclatorul FanCourier
   * Returnează străzi cu coduri poștale pentru un județ și/sau localitate
   */
  async getStreets(params?: {
    county?: string;
    locality?: string;
    page?: number;
    perPage?: number;
  }): Promise<{
    success: boolean;
    data?: Array<{
      judet: string;
      localitate: string;
      strada: string;
      de_la: string;
      pana_la: string;
      paritate: string;
      cod_postal: string;
      tip: string;
      cod_cartare: string;
      numar_depozite: string;
    }>;
    error?: string;
  }> {
    try {
      const queryParams: Record<string, string | number> = {};
      // Normalizăm parametrii pentru API (elimină diacritice)
      if (params?.county) queryParams.county = this.normalizeForAPI(params.county);
      if (params?.locality) queryParams.locality = this.normalizeForAPI(params.locality);
      // Adăugăm paginare (default 1000 per pagină)
      queryParams.page = params?.page || 1;
      queryParams.perPage = params?.perPage || 1000;

      console.log(`[FanCourier API] getStreets request:`, queryParams);

      const response = await this.authRequest("GET", "/reports/streets", null, queryParams);

      // Log raw response pentru debugging
      console.log(`[FanCourier API] getStreets raw response status:`, response.data.status);
      console.log(`[FanCourier API] getStreets raw response keys:`, Object.keys(response.data));
      if (response.data.data) {
        console.log(`[FanCourier API] getStreets data length:`, response.data.data.length);
        if (response.data.data.length > 0) {
          console.log(`[FanCourier API] getStreets sample item:`, JSON.stringify(response.data.data[0]));
        }
      } else {
        console.log(`[FanCourier API] getStreets full response:`, JSON.stringify(response.data).substring(0, 500));
      }

      if (response.data.status === "success") {
        const rawData = response.data.data || [];
        const streetCount = rawData.length;

        if (streetCount === 0) {
          console.log(`[FanCourier API] getStreets(county="${queryParams.county}", locality="${queryParams.locality}"): 0 streets returned`);
        }

        // Transformăm răspunsul API în structura noastră
        // API returnează: { street, locality, county, details: [{ zipCode, fromNo, toNo }] }
        // Noi avem nevoie de: { strada, localitate, judet, cod_postal }
        const transformedData = rawData.map((item: any) => {
          // Extragem primul cod poștal din details (sau primul disponibil)
          const firstDetail = item.details?.[0];
          const zipCode = firstDetail?.zipCode || '';

          return {
            judet: item.county || '',
            localitate: item.locality || '',
            strada: item.street || '',
            tip: item.type || '',
            cod_postal: zipCode,
            // Păstrăm și detaliile originale pentru cazuri speciale
            de_la: firstDetail?.fromNo || '',
            pana_la: firstDetail?.toNo || '',
            paritate: firstDetail?.parityNo || '',
            cod_cartare: firstDetail?.routingCode || '',
            numar_depozite: '',
          };
        });

        return {
          success: true,
          data: transformedData,
        };
      }

      console.log(`[FanCourier API] getStreets failed: ${response.data.message || 'Unknown error'}`, response.data);
      return {
        success: false,
        error: response.data.message || "Eroare la obținerea străzilor",
      };
    } catch (error: any) {
      console.error("[FanCourier API] getStreets exception:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Obține lista de localități din nomenclatorul FanCourier pentru un județ
   * Folosește endpoint-ul dedicat /reports/localities
   */
  async getLocalities(params: {
    county: string;
  }): Promise<{
    success: boolean;
    data?: Array<{
      judet: string;
      localitate: string;
      agentie?: string;
      km?: string;
      cod_rutare?: string;
      id_localitate_fan?: string;
    }>;
    error?: string;
  }> {
    try {
      // Normalizăm județul pentru API (elimină diacritice)
      const normalizedCounty = this.normalizeForAPI(params.county);

      const response = await this.authRequest("GET", "/reports/localities", null, {
        county: normalizedCounty,
      });

      if (response.data.status === "success" && response.data.data) {
        const rawLocalities = response.data.data;

        // Debug: log first item structure to understand API response format
        if (rawLocalities.length > 0) {
          console.log(`[FanCourier API] getLocalities sample item:`, JSON.stringify(rawLocalities[0]));
        }

        // Mapăm răspunsul API la structura noastră
        // FanCourier API poate returna proprietăți în engleză sau română
        const localities = rawLocalities.map((item: any) => ({
          judet: item.judet || item.county || normalizedCounty,
          localitate: item.localitate || item.locality || item.name || '',
          agentie: item.agentie || item.agency,
          km: item.km,
          cod_rutare: item.cod_rutare || item.routingCode,
          id_localitate_fan: item.id_localitate_fan || item.id || item.fanId,
        }));

        console.log(`[FanCourier API] getLocalities(county="${normalizedCounty}"): ${localities.length} localities found`);
        return {
          success: true,
          data: localities,
        };
      }

      console.log(`[FanCourier API] getLocalities failed:`, response.data);
      return {
        success: false,
        error: response.data.message || "Eroare la obținerea localităților",
      };
    } catch (error: any) {
      console.error("[FanCourier API] getLocalities exception:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Găsește codul poștal pentru o adresă dată
   * Caută în nomenclatorul FanCourier pe baza județului, localității și străzii
   */
  async findPostalCode(params: {
    county: string;
    locality: string;
    street?: string;
  }): Promise<{
    success: boolean;
    postalCode?: string;
    matchedStreet?: string;
    matchedLocality?: string;
    error?: string;
  }> {
    // Helper pentru normalizare text (elimină diacritice, lowercase)
    const normalize = (s: string) => s
      .toLowerCase()
      .trim()
      .replace(/[ăâ]/g, 'a')
      .replace(/[î]/g, 'i')
      .replace(/[șş]/g, 's')
      .replace(/[țţ]/g, 't')
      .replace(/sectorul\s*/gi, 'sector ')
      .replace(/\s+/g, ' ');

    try {
      // Handling special pentru București - sectoarele nu sunt localități separate în API
      let effectiveLocality = params.locality;
      let effectiveCounty = params.county;

      const normalizedLocality = normalize(params.locality);
      const normalizedCounty = normalize(params.county);

      // Dacă e București (sector sau oraș), căutăm doar "Bucuresti"
      if (normalizedCounty.includes('bucuresti') ||
          normalizedLocality.includes('sector') ||
          normalizedLocality.includes('bucuresti')) {
        effectiveCounty = 'Bucuresti';
        effectiveLocality = 'Bucuresti';
        console.log(`[FanCourier] București detected, querying as: ${effectiveCounty}/${effectiveLocality}`);
      }

      // Încercăm mai întâi lookup direct
      let streetsResult = await this.getStreets({
        county: effectiveCounty,
        locality: effectiveLocality,
      });

      // Dacă nu găsim, încercăm să găsim localitatea în nomenclator
      if (!streetsResult.success || !streetsResult.data?.length) {
        console.log(`[FanCourier] Direct lookup failed for "${effectiveLocality}, ${effectiveCounty}". Trying locality search...`);

        // Obținem toate localitățile din județ
        const localitiesResult = await this.getLocalities({ county: effectiveCounty });

        if (localitiesResult.success && localitiesResult.data?.length) {
          const normalizedInput = normalize(effectiveLocality);

          // Căutăm cea mai bună potrivire
          let bestMatch: { localitate: string; score: number } | null = null;

          for (const loc of localitiesResult.data) {
            // Null safety: skip entries without localitate
            if (!loc.localitate) continue;

            const normalizedLoc = normalize(loc.localitate);

            // Potrivire exactă normalizată
            if (normalizedLoc === normalizedInput) {
              bestMatch = { localitate: loc.localitate, score: 1 };
              break;
            }

            // Potrivire parțială (unul conține pe celălalt)
            if (normalizedLoc.includes(normalizedInput) || normalizedInput.includes(normalizedLoc)) {
              const score = Math.min(normalizedLoc.length, normalizedInput.length) /
                           Math.max(normalizedLoc.length, normalizedInput.length);
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { localitate: loc.localitate, score };
              }
            }
          }

          if (bestMatch && bestMatch.score >= 0.5) {
            console.log(`[FanCourier] Found locality match: "${effectiveLocality}" → "${bestMatch.localitate}" (score: ${bestMatch.score.toFixed(2)})`);

            // Reîncercăm cu numele găsit
            streetsResult = await this.getStreets({
              county: effectiveCounty,
              locality: bestMatch.localitate,
            });

            if (streetsResult.success && streetsResult.data?.length) {
              // Continuăm cu localitate găsită
              params = { ...params, locality: bestMatch.localitate };
            }
          } else {
            console.log(`[FanCourier] No locality match found for "${effectiveLocality}" in ${effectiveCounty} (${localitiesResult.data.length} localities checked)`);
          }
        }
      }

      if (!streetsResult.success || !streetsResult.data?.length) {
        return {
          success: false,
          error: streetsResult.error || "Nu s-au găsit străzi pentru această localitate",
        };
      }

      const streets = streetsResult.data;

      // Dacă avem stradă, încercăm să o găsim exact sau parțial
      if (params.street) {
        const normalizedStreet = params.street.toLowerCase().trim();

        // Căutare exactă (cu null safety)
        let match = streets.find(s =>
          s.strada && s.strada.toLowerCase().trim() === normalizedStreet
        );

        // Căutare parțială dacă nu găsim exact
        if (!match) {
          match = streets.find(s =>
            s.strada && (
              normalizedStreet.includes(s.strada.toLowerCase().trim()) ||
              s.strada.toLowerCase().trim().includes(normalizedStreet)
            )
          );
        }

        // Căutare prin cuvinte cheie
        if (!match) {
          const streetWords = normalizedStreet.split(/[\s,.-]+/).filter(w => w.length > 2);
          match = streets.find(s => {
            if (!s.strada) return false;
            const sWords = s.strada.toLowerCase().split(/[\s,.-]+/);
            return streetWords.some(w => sWords.some(sw => sw.includes(w) || w.includes(sw)));
          });
        }

        if (match && match.cod_postal) {
          return {
            success: true,
            postalCode: match.cod_postal,
            matchedStreet: match.strada,
          };
        }
      }

      // Dacă nu găsim strada sau nu avem stradă, returnăm primul cod poștal disponibil
      // (de obicei localitățile mici au un singur cod poștal)
      const firstWithPostalCode = streets.find(s => s.cod_postal && s.cod_postal.trim());
      if (firstWithPostalCode) {
        return {
          success: true,
          postalCode: firstWithPostalCode.cod_postal,
          matchedStreet: params.street ? undefined : firstWithPostalCode.strada,
        };
      }

      return {
        success: false,
        error: "Nu s-a găsit cod poștal pentru această adresă",
      };
    } catch (error: any) {
      console.error("Error finding postal code:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Creează un client FanCourier din setările salvate
 */
export async function createFanCourierClient(): Promise<FanCourierAPI> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings?.fancourierUsername || !settings?.fancourierPassword) {
    throw new Error("Credențialele FanCourier nu sunt configurate");
  }

  if (!settings?.fancourierClientId) {
    throw new Error("Client ID FanCourier nu este configurat");
  }

  return new FanCourierAPI(
    settings.fancourierUsername,
    settings.fancourierPassword,
    settings.fancourierClientId
  );
}

/**
 * Creează un AWB pentru o comandă
 */
export async function createAWBForOrder(
  orderId: string,
  options?: {
    serviceType?: string;
    paymentType?: string;
    weight?: number;
    packages?: number;
    cashOnDelivery?: number;
    observations?: string;
  }
): Promise<{ success: boolean; awbNumber?: string; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        store: true, 
        awb: true,
        lineItems: true, // Include produsele pentru observații
      },
    });

    if (!order) {
      return { success: false, error: "Comanda nu a fost găsită" };
    }

    // Verificăm dacă AWB-ul existent poate fi înlocuit
    if (order.awb?.awbNumber) {
      const currentStatus = order.awb.currentStatus?.toLowerCase() || '';
      
      // Permitem crearea unui nou AWB dacă cel vechi e:
      // - șters
      // - anulat
      // - are eroare
      const canCreateNew = 
        order.awb.errorMessage ||
        currentStatus.includes('șters') ||
        currentStatus.includes('sters') ||
        currentStatus.includes('deleted') ||
        currentStatus.includes('anulat') ||
        currentStatus.includes('cancelled') ||
        currentStatus.includes('canceled');
        
      if (!canCreateNew) {
        return { success: false, error: `AWB-ul a fost deja creat: ${order.awb.awbNumber}. Dacă dorești să creezi unul nou, trebuie să anulezi mai întâi AWB-ul existent.` };
      }
      
      // Ștergem vechiul AWB pentru a face loc celui nou
      await prisma.aWB.delete({
        where: { id: order.awb.id },
      });
    }

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    
    if (!settings?.fancourierClientId) {
      return { success: false, error: "Client ID FanCourier nu este configurat în Setări" };
    }

    const fancourier = await createFanCourierClient();

    // Determinăm suma ramburs
    let cod = options?.cashOnDelivery;
    const paymentType = options?.paymentType || settings?.defaultPaymentType || "destinatar";
    
    // Verificăm dacă e ramburs (destinatar = ramburs)
    const isRamburs = paymentType === "destinatar" || paymentType === "recipient";
    
    if (cod === undefined && isRamburs) {
      cod = Math.round(Number(order.totalPrice) * 100) / 100;
    }

    // Determinăm serviciul (Cont Colector dacă e ramburs și serviciul nu e deja Cont Colector)
    let service = options?.serviceType || settings?.defaultServiceType || "Standard";
    if (cod && cod > 0 && !service.toLowerCase().includes("colector")) {
      service = "Cont Colector";
    }

    // Construim observațiile cu lista de produse
    let observations = options?.observations || "";
    
    if (order.lineItems && order.lineItems.length > 0) {
      // Construim lista de produse: "2x Produs A, 1x Produs B"
      const productList = order.lineItems.map(item => {
        let productName = item.title;
        // Adăugăm varianta dacă există (ex: "Tricou - Roșu/XL")
        if (item.variantTitle && item.variantTitle !== "Default Title") {
          productName += ` - ${item.variantTitle}`;
        }
        return `${item.quantity}x ${productName}`;
      }).join(", ");
      
      // FanCourier are limită la observații (~200 caractere), trunchiăm dacă e necesar
      const maxObsLength = 200;
      let productsObs = `Produse: ${productList}`;
      
      if (productsObs.length > maxObsLength) {
        productsObs = productsObs.substring(0, maxObsLength - 3) + "...";
      }
      
      // Combinăm cu observațiile existente
      if (observations) {
        observations = `${observations} | ${productsObs}`;
      } else {
        observations = productsObs;
      }
    }

    const result = await fancourier.createAWB({
      recipientName: [order.customerFirstName, order.customerLastName].filter(Boolean).join(" "),
      recipientPhone: order.customerPhone || "",
      recipientEmail: order.customerEmail || undefined,
      recipientCounty: order.shippingProvince || "",
      recipientCity: order.shippingCity || "",
      recipientStreet: order.shippingAddress1 || "",
      recipientStreetNo: "",
      recipientZipCode: order.shippingZip || undefined,
      service,
      payment: isRamburs ? "recipient" : "sender",
      parcels: options?.packages || settings?.defaultPackages || 1,
      weight: options?.weight || Number(settings?.defaultWeight) || 1,
      content: `Comandă ${order.shopifyOrderNumber}`,
      cod: cod || 0,
      declaredValue: Math.round(Number(order.totalPrice) * 100) / 100,
      observation: observations, // Include produsele din comandă
      costCenter: order.store.name,
      options: ["X"], // ePOD - permite etichetă A6 pregătită de expeditor
    });

    if (!result.success || !result.awb) {
      await prisma.aWB.upsert({
        where: { orderId },
        create: { orderId, currentStatus: "error", errorMessage: result.error || "Eroare necunoscută" },
        update: { currentStatus: "error", errorMessage: result.error || "Eroare necunoscută" },
      });
      await prisma.order.update({ where: { id: orderId }, data: { status: "AWB_ERROR" } });
      return { success: false, error: result.error };
    }

    await prisma.aWB.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        awbNumber: result.awb,
        serviceType: service,
        paymentType,
        weight: options?.weight || Number(settings?.defaultWeight) || 1,
        packages: options?.packages || settings?.defaultPackages || 1,
        cashOnDelivery: cod,
        declaredValue: Number(order.totalPrice),
        observations: options?.observations,
        currentStatus: "created",
        currentStatusDate: new Date(),
        statusHistory: { create: { status: "AWB creat", statusDate: new Date(), description: `AWB ${result.awb} generat cu succes` } },
      },
      update: { awbNumber: result.awb, currentStatus: "created", currentStatusDate: new Date(), errorMessage: null },
    });

    await prisma.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });

    // Actualizăm în Shopify
    try {
      const { createShopifyClient } = await import("./shopify");
      const shopifyClient = await createShopifyClient(order.storeId);
      await shopifyClient.markAWBIssued(order.shopifyOrderId, result.awb);
    } catch (shopifyError) {
      console.error("Eroare la actualizarea Shopify:", shopifyError);
    }

    // Auto-print: Creăm job de printare dacă există imprimante cu autoPrint
    try {
      const autoPrintPrinter = await prisma.printer.findFirst({
        where: { isActive: true, autoPrint: true },
        orderBy: { createdAt: "asc" },
      });

      if (autoPrintPrinter) {
        await prisma.printJob.create({
          data: {
            printerId: autoPrintPrinter.id,
            documentType: "awb",
            documentId: result.awb,
            documentNumber: result.awb,
            orderId: order.id,
            orderNumber: order.shopifyOrderNumber,
            status: "PENDING",
          },
        });
        console.log(`🖨️ Job de printare creat automat pentru AWB ${result.awb}`);
      }
    } catch (printError) {
      console.error("Eroare la crearea job-ului de printare:", printError);
      // Nu returnăm eroare - AWB-ul a fost creat cu succes
    }

    return { success: true, awbNumber: result.awb };
  } catch (error: any) {
    console.error("createAWBForOrder error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizează statusul tuturor AWB-urilor active
 */
export async function updateAllAWBStatuses(): Promise<{ updated: number; errors: string[] }> {
  const awbs = await prisma.aWB.findMany({
    where: {
      awbNumber: { not: null },
      currentStatus: { notIn: ["Livrat", "Retur", "S2", "S43"] },
    },
    include: { order: true },
  });

  let updated = 0;
  const errors: string[] = [];

  if (awbs.length === 0) {
    return { updated: 0, errors: [] };
  }

  try {
    const fancourier = await createFanCourierClient();

    // OPTIMIZATION: Preload all existing status history to avoid N+1 queries
    const awbIds = awbs.map((a) => a.id);
    const existingHistory = await prisma.aWBStatusHistory.findMany({
      where: { awbId: { in: awbIds } },
      select: { awbId: true, status: true, statusDate: true },
    });

    // Create a Set for O(1) lookup of existing events
    const existingEventsSet = new Set(
      existingHistory.map((h) => `${h.awbId}|${h.status}|${h.statusDate.getTime()}`)
    );

    for (const awb of awbs) {
      if (!awb.awbNumber) continue;

      try {
        const tracking = await fancourier.trackAWB(awb.awbNumber);

        if (!tracking.success || !tracking.events) {
          errors.push(`AWB ${awb.awbNumber}: ${tracking.error}`);
          continue;
        }

        // Salvăm evenimentele noi (using preloaded data for existence check)
        for (const event of tracking.events) {
          const eventDate = new Date(event.date);
          const eventKey = `${awb.id}|${event.name}|${eventDate.getTime()}`;

          if (!existingEventsSet.has(eventKey)) {
            await prisma.aWBStatusHistory.create({
              data: {
                awbId: awb.id,
                status: event.name,
                statusDate: eventDate,
                location: event.location,
                description: `${event.id}: ${event.name}`,
              },
            });
            // Add to set to prevent duplicate insertions in same run
            existingEventsSet.add(eventKey);
          }
        }

        // Actualizăm statusul curent
        const lastEvent = tracking.events[tracking.events.length - 1];
        if (lastEvent) {
          await prisma.aWB.update({
            where: { id: awb.id },
            data: { 
              currentStatus: lastEvent.name, 
              currentStatusDate: new Date(lastEvent.date) 
            },
          });

          // Actualizăm statusul comenzii și flag-ul isCollected pentru COD
          if (lastEvent.id === "S2") { // Livrat
            await prisma.order.update({ where: { id: awb.orderId }, data: { status: "DELIVERED" } });

            // Setăm isCollected = true pentru comenzile cu ramburs (COD)
            // Acest flag este necesar pentru decontarea intercompany
            if (awb.cashOnDelivery && Number(awb.cashOnDelivery) > 0) {
              await prisma.aWB.update({
                where: { id: awb.id },
                data: { isCollected: true },
              });
            }
          } else if (lastEvent.id === "S43" || lastEvent.id === "S6") { // Retur sau Refuz
            await prisma.order.update({ where: { id: awb.orderId }, data: { status: "RETURNED" } });
          }
        }

        updated++;
      } catch (error: any) {
        errors.push(`AWB ${awb.awbNumber}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Eroare generală: ${error.message}`);
  }

  return { updated, errors };
}

/**
 * Mapare statusuri FanCourier la statusuri interne
 * Conform documentației oficiale FanCourier API v2.0
 */
const FANCOURIER_STATUS_MAP: Record<string, { orderStatus: string; description: string }> = {
  // Anulări
  "A0": { orderStatus: "CANCELLED", description: "AWB anulat" },
  "A1": { orderStatus: "CANCELLED", description: "AWB anulat de expeditor" },
  "A2": { orderStatus: "CANCELLED", description: "AWB anulat de destinatar" },
  "A3": { orderStatus: "CANCELLED", description: "AWB anulat de FanCourier" },
  "A4": { orderStatus: "CANCELLED", description: "AWB șters" },
  
  // Ridicare
  "C0": { orderStatus: "SHIPPED", description: "Expediție ridicată" },
  "C1": { orderStatus: "SHIPPED", description: "Expediție preluată spre livrare" },
  
  // Tranzit și depozit
  "H0": { orderStatus: "SHIPPED", description: "În tranzit spre depozitul de destinație" },
  "H1": { orderStatus: "SHIPPED", description: "Descărcată în depozitul de destinație" },
  "H2": { orderStatus: "SHIPPED", description: "În tranzit" },
  "H3": { orderStatus: "SHIPPED", description: "Sortată pe bandă" },
  "H4": { orderStatus: "SHIPPED", description: "Sortată pe bandă" },
  "H10": { orderStatus: "SHIPPED", description: "În tranzit spre depozitul de destinație" },
  "H11": { orderStatus: "SHIPPED", description: "Descărcată în depozitul de destinație" },
  "H12": { orderStatus: "SHIPPED", description: "În depozit" },
  "H13": { orderStatus: "SHIPPED", description: "În depozit" },
  "H15": { orderStatus: "SHIPPED", description: "În depozit" },
  "H17": { orderStatus: "SHIPPED", description: "În depozitul de destinație" },
  
  // Livrare
  "S1": { orderStatus: "SHIPPED", description: "În livrare" },
  "S2": { orderStatus: "DELIVERED", description: "Livrat" },
  "S8": { orderStatus: "SHIPPED", description: "Livrare din sediul FAN Courier" },
  "S35": { orderStatus: "SHIPPED", description: "Retrimis în livrare" },
  "S46": { orderStatus: "SHIPPED", description: "Predat punct livrare" },
  "S47": { orderStatus: "SHIPPED", description: "Predat partener extern" },
  
  // Avizări și așteptări
  "S3": { orderStatus: "SHIPPED", description: "Avizat" },
  "S11": { orderStatus: "SHIPPED", description: "Avizat și trimis SMS" },
  "S12": { orderStatus: "SHIPPED", description: "Contactat; livrare ulterioară" },
  "S21": { orderStatus: "SHIPPED", description: "Avizat, lipsă persoană de contact" },
  "S22": { orderStatus: "SHIPPED", description: "Avizat, nu are bani de ramburs" },
  "S24": { orderStatus: "SHIPPED", description: "Avizat, nu are împuternicire/CI" },
  
  // Probleme adresă
  "S4": { orderStatus: "SHIPPED", description: "Adresă incompletă" },
  "S5": { orderStatus: "SHIPPED", description: "Adresă greșită, destinatar mutat" },
  "S9": { orderStatus: "SHIPPED", description: "Redirecționat" },
  "S10": { orderStatus: "SHIPPED", description: "Adresă greșită, fără telefon" },
  "S14": { orderStatus: "SHIPPED", description: "Restricții acces la adresă" },
  "S19": { orderStatus: "SHIPPED", description: "Adresă incompletă - trimis SMS" },
  "S20": { orderStatus: "SHIPPED", description: "Adresă incompletă, fără telefon" },
  "S25": { orderStatus: "SHIPPED", description: "Adresă greșită - trimis SMS" },
  "S27": { orderStatus: "SHIPPED", description: "Adresă greșită, nr telefon greșit" },
  "S28": { orderStatus: "SHIPPED", description: "Adresă incompletă, nr telefon greșit" },
  "S30": { orderStatus: "SHIPPED", description: "Nu răspunde la telefon" },
  "S42": { orderStatus: "SHIPPED", description: "Adresă greșită" },
  
  // Refuzuri și retururi
  "S6": { orderStatus: "RETURNED", description: "Refuz primire" },
  "S7": { orderStatus: "RETURNED", description: "Refuz plată transport" },
  "S15": { orderStatus: "RETURNED", description: "Refuz predare ramburs" },
  "S16": { orderStatus: "RETURNED", description: "Retur la termen" },
  "S33": { orderStatus: "RETURNED", description: "Retur solicitat" },
  "S43": { orderStatus: "RETURNED", description: "Retur" },
  "S50": { orderStatus: "RETURNED", description: "Refuz confirmare" },
  
  // Alte statusuri
  "S37": { orderStatus: "SHIPPED", description: "Despăgubit" },
  "S38": { orderStatus: "AWB_ERROR", description: "AWB neexpediat" },
  "S49": { orderStatus: "SHIPPED", description: "Activitate suspendată" },
};

/**
 * Sincronizare bilaterală - verifică statusul AWB-urilor în FanCourier
 * și actualizează baza de date locală
 * 
 * Bazat pe documentația oficială FanCourier API v2.0:
 * - Folosește /reports/awb/tracking pentru a obține evenimentele
 * - Interpretează corect toate statusurile (C0, C1, H*, S*)
 */
export async function syncAWBsFromFanCourier(): Promise<{
  checked: number;
  updated: number;
  statusChanges: number;
  errors: number;
  details: Array<{
    orderId: string;
    orderNumber: string;
    awbNumber: string;
    action: string;
    message: string;
  }>;
}> {
  const result = {
    checked: 0,
    updated: 0,
    statusChanges: 0,
    errors: 0,
    details: [] as Array<{
      orderId: string;
      orderNumber: string;
      awbNumber: string;
      action: string;
      message: string;
    }>,
  };

  console.log("\n" + "=".repeat(60));
  console.log("🔄 FANCOURIER - SINCRONIZARE BILATERALĂ");
  console.log("=".repeat(60));

  try {
    const fancourier = await createFanCourierClient();

    // Obținem toate AWB-urile active din baza de date
    // Excludem doar cele care sunt deja livrate sau returnate (statusuri finale)
    const awbs = await prisma.aWB.findMany({
      where: {
        awbNumber: { not: null },
      },
      include: {
        order: true,
      },
    });

    console.log(`📋 Verificăm ${awbs.length} AWB-uri...`);

    for (const awb of awbs) {
      if (!awb.awbNumber) continue;

      result.checked++;
      const orderNumber = awb.order?.shopifyOrderNumber || awb.orderId;

      console.log(`\n  📦 AWB ${awb.awbNumber} (Comandă: ${orderNumber})`);
      console.log(`     Status curent în DB: ${awb.currentStatus || 'N/A'}`);

      try {
        // Folosim endpoint-ul de tracking conform documentației
        const tracking = await fancourier.trackAWB(awb.awbNumber);

        console.log(`     Tracking response: success=${tracking.success}, events=${tracking.events?.length || 0}`);

        if (!tracking.success) {
          // Eroare la tracking - poate fi temporară sau AWB-ul nu există
          console.log(`     ⚠️ Eroare tracking: ${tracking.error}`);
          
          // NU marcăm automat ca șters - doar loghăm eroarea
          // AWB-ul poate să nu aibă încă evenimente sau poate fi o eroare temporară
          result.errors++;
          result.details.push({
            orderId: awb.orderId,
            orderNumber: orderNumber,
            awbNumber: awb.awbNumber,
            action: 'EROARE_TRACKING',
            message: tracking.error || 'Nu s-a putut obține tracking',
          });
          continue;
        }

        // Verificăm dacă avem evenimente
        if (!tracking.events || tracking.events.length === 0) {
          console.log(`     ℹ️ Fără evenimente încă (AWB nou sau în așteptare)`);
          
          // AWB-ul există dar nu are evenimente încă - e normal pentru AWB-uri noi
          if (awb.currentStatus !== 'pending' && awb.currentStatus !== 'created') {
            // Actualizăm doar dacă statusul era diferit
            await prisma.aWB.update({
              where: { id: awb.id },
              data: {
                currentStatus: 'În așteptare ridicare',
                errorMessage: null,
              },
            });
          }
          continue;
        }

        // Avem evenimente - procesăm
        const lastEvent = tracking.events[tracking.events.length - 1];
        const oldStatus = awb.currentStatus;

        console.log(`     📍 Ultimul eveniment: ${lastEvent.id} - ${lastEvent.name} (${lastEvent.date})`);

        // Salvăm toate evenimentele noi în istoric
        for (const event of tracking.events) {
          const eventDate = new Date(event.date);

          const existingEvent = await prisma.aWBStatusHistory.findFirst({
            where: { 
              awbId: awb.id, 
              status: event.name, 
              statusDate: eventDate 
            },
          });

          if (!existingEvent) {
            await prisma.aWBStatusHistory.create({
              data: {
                awbId: awb.id,
                status: event.name,
                statusDate: eventDate,
                location: event.location,
                description: `${event.id}: ${event.name}`,
              },
            });
          }
        }

        // Obținem descrierea detaliată a statusului din legendă
        const statusInfo = FANCOURIER_STATUS_MAP[lastEvent.id];
        
        // Actualizăm statusul curent al AWB-ului + câmpuri noi pentru legendă
        const awbUpdateData: any = {
          currentStatus: lastEvent.name,
          currentStatusDate: new Date(lastEvent.date),
          errorMessage: null,
          // Câmpuri noi pentru afișare cu hover
          fanCourierStatusCode: lastEvent.id,
          fanCourierStatusName: lastEvent.name,
          fanCourierStatusDesc: statusInfo?.description || lastEvent.name,
        };
        
        // Detectăm C0 (ridicare) fără scanare internă
        // C0 și C1 sunt statusuri de ridicare
        if ((lastEvent.id === "C0" || lastEvent.id === "C1") && !awb.handedOverAt) {
          // AWB-ul a fost ridicat de curier dar nu a fost scanat de noi
          awbUpdateData.hasC0WithoutScan = true;
          awbUpdateData.c0ReceivedAt = new Date(lastEvent.date);
          console.log(`     ⚠️ ALERTĂ: C0 primit fără scanare internă!`);
        }
        
        await prisma.aWB.update({
          where: { id: awb.id },
          data: awbUpdateData,
        });

        // Determinăm statusul comenzii bazat pe maparea FanCourier
        const statusMapping = FANCOURIER_STATUS_MAP[lastEvent.id];
        let newOrderStatus = awb.order?.status;

        if (statusMapping) {
          // Folosim maparea predefinită
          if (statusMapping.orderStatus === "DELIVERED") {
            newOrderStatus = "DELIVERED";
          } else if (statusMapping.orderStatus === "RETURNED") {
            newOrderStatus = "RETURNED";
          } else if (statusMapping.orderStatus === "CANCELLED") {
            newOrderStatus = "CANCELLED";
            // Marcăm și AWB-ul ca anulat
            await prisma.aWB.update({
              where: { id: awb.id },
              data: {
                currentStatus: `ANULAT: ${lastEvent.name}`,
                currentStatusDate: new Date(lastEvent.date),
              },
            });
          } else if (statusMapping.orderStatus === "AWB_ERROR") {
            newOrderStatus = "AWB_ERROR";
          } else {
            newOrderStatus = "SHIPPED";
          }
        } else {
          // Fallback pentru statusuri necunoscute
          if (lastEvent.id.startsWith("S2")) {
            newOrderStatus = "DELIVERED";
          } else if (lastEvent.id.startsWith("A")) {
            newOrderStatus = "CANCELLED";
          } else if (lastEvent.id.startsWith("H") || lastEvent.id.startsWith("C") || lastEvent.id.startsWith("S")) {
            newOrderStatus = "SHIPPED";
          }
        }

        // Actualizăm statusul comenzii dacă s-a schimbat
        if (newOrderStatus && newOrderStatus !== awb.order?.status) {
          await prisma.order.update({
            where: { id: awb.orderId },
            data: { status: newOrderStatus },
          });
          console.log(`     📋 Status comandă: ${awb.order?.status} → ${newOrderStatus}`);
        }

        // Verificăm dacă s-a schimbat statusul AWB-ului
        if (oldStatus !== lastEvent.name) {
          result.statusChanges++;
          console.log(`     ✅ Status AWB: ${oldStatus || 'N/A'} → ${lastEvent.name}`);
          result.details.push({
            orderId: awb.orderId,
            orderNumber: orderNumber,
            awbNumber: awb.awbNumber,
            action: 'ACTUALIZAT',
            message: `${oldStatus || 'N/A'} → ${lastEvent.name}`,
          });
        } else {
          console.log(`     ✅ Status neschimbat: ${lastEvent.name}`);
        }

        result.updated++;
      } catch (error: any) {
        console.error(`     ❌ Eroare: ${error.message}`);
        result.errors++;
        result.details.push({
          orderId: awb.orderId,
          orderNumber: orderNumber,
          awbNumber: awb.awbNumber,
          action: 'EROARE',
          message: error.message,
        });
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT SINCRONIZARE AWB-URI:`);
    console.log(`   ✅ Verificate: ${result.checked}`);
    console.log(`   🔄 Actualizate: ${result.updated}`);
    console.log(`   📦 Schimbări status: ${result.statusChanges}`);
    console.log(`   ⚠️ Erori: ${result.errors}`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Eroare la sincronizare AWB-uri:", error.message);
    result.errors++;
  }

  return result;
}

/**
 * Caută și actualizează codul poștal pentru o comandă
 * Folosește nomenclatorul FanCourier pentru a găsi codul poștal
 */
export async function lookupAndUpdatePostalCode(orderId: string): Promise<{
  success: boolean;
  postalCode?: string;
  updated?: boolean;
  error?: string;
}> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        shippingProvince: true,
        shippingCity: true,
        shippingAddress1: true,
        shippingAddress2: true,
        shippingZip: true,
        shippingCountry: true,
        customerPhone: true,
        phoneValidation: true,
        status: true,
      },
    });

    if (!order) {
      return { success: false, error: "Comanda nu a fost găsită" };
    }

    // Skip dacă deja are cod poștal valid
    if (order.shippingZip && /^\d{6}$/.test(order.shippingZip)) {
      return { success: true, postalCode: order.shippingZip, updated: false };
    }

    // Skip dacă nu e în România
    const country = order.shippingCountry?.toLowerCase();
    if (country && !["romania", "ro", "rou", "România"].some(c => country.includes(c.toLowerCase()))) {
      return { success: false, error: "Comanda nu este în România" };
    }

    // Skip dacă nu avem datele necesare
    if (!order.shippingProvince || !order.shippingCity) {
      return { success: false, error: "Lipsesc județul sau localitatea" };
    }

    // Normalizăm datele pentru București
    // Shopify trimite uneori province="Sector X" și city="București"
    // FanCourier vrea county="București" și locality="Sector X"
    let county = order.shippingProvince;
    let locality = order.shippingCity;

    const bucharestVariants = ["bucurești", "bucharest", "bucuresti", "buc"];
    const provinceLower = order.shippingProvince.toLowerCase();
    const cityLower = order.shippingCity.toLowerCase();

    // Detectăm dacă e București
    const provinceIsSector = /^sector\s*\d$/i.test(order.shippingProvince);
    const cityIsBucharest = bucharestVariants.some(v => cityLower.includes(v));
    const provinceIsBucharest = bucharestVariants.some(v => provinceLower.includes(v));
    const cityIsSector = /^sector\s*\d$/i.test(order.shippingCity);

    if (provinceIsSector && cityIsBucharest) {
      // Shopify: province="Sector 5", city="București" → FanCourier: county="București", locality="Sector 5"
      county = "București";
      locality = order.shippingProvince; // Sectorul devine localitatea
    } else if (provinceIsBucharest && cityIsSector) {
      // Shopify: province="București", city="Sector 5" → OK, doar normalizăm
      county = "București";
      locality = order.shippingCity;
    } else if (provinceIsBucharest && cityIsBucharest) {
      // Ambele sunt București - căutăm sectorul în adresă
      county = "București";
      const sectorMatch = order.shippingAddress1?.match(/sector\s*(\d)/i);
      if (sectorMatch) {
        locality = `Sector ${sectorMatch[1]}`;
      } else {
        locality = "Sector 1"; // Default
      }
    }

    const client = await createFanCourierClient();
    const result = await client.findPostalCode({
      county,
      locality,
      street: order.shippingAddress1 || undefined,
    });

    if (result.success && result.postalCode) {
      // Import validators pentru re-validare
      const { validateOrder } = await import("./validators");

      // Re-validăm comanda cu noul cod poștal
      const validation = validateOrder({
        customerPhone: order.customerPhone,
        shippingAddress1: order.shippingAddress1,
        shippingAddress2: order.shippingAddress2,
        shippingCity: order.shippingCity,
        shippingProvince: order.shippingProvince,
        shippingCountry: order.shippingCountry,
        shippingZip: result.postalCode, // Folosim noul cod poștal
      });

      // Determinăm noul status
      let newStatus = order.status;
      if (validation.isFullyValid && order.status === "VALIDATION_FAILED") {
        newStatus = "VALIDATED";
      } else if (!validation.isFullyValid && order.status === "PENDING") {
        newStatus = "VALIDATION_FAILED";
      }

      // Actualizăm comanda cu codul poștal și validarea refăcută
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shippingZip: result.postalCode,
          addressValidation: validation.address.isValid ? "PASSED" : "FAILED",
          addressValidationMsg: validation.address.message,
          status: newStatus,
        },
      });

      return {
        success: true,
        postalCode: result.postalCode,
        updated: true,
      };
    }

    return {
      success: false,
      error: result.error || "Nu s-a găsit cod poștal",
    };
  } catch (error: any) {
    console.error(`Eroare la lookup postal code pentru ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Populează codurile poștale pentru mai multe comenzi
 * Folosit pentru backfill-ul comenzilor existente
 */
export async function backfillPostalCodes(options?: {
  limit?: number;
  onlyMissing?: boolean;
}): Promise<{
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  details: Array<{
    orderId: string;
    orderNumber: string;
    status: "updated" | "skipped" | "error";
    postalCode?: string;
    error?: string;
  }>;
}> {
  const limit = options?.limit || 500;
  const onlyMissing = options?.onlyMissing !== false;

  const result = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{
      orderId: string;
      orderNumber: string;
      status: "updated" | "skipped" | "error";
      postalCode?: string;
      error?: string;
    }>,
  };

  try {
    console.log("=".repeat(60));
    console.log("📮 BACKFILL CODURI POȘTALE DIN NOMENCLATOR FANCOURIER");
    console.log("=".repeat(60));

    // Test API connection first
    const client = await createFanCourierClient();
    console.log("✅ FanCourier client creat cu succes");

    // Test cu un oraș cunoscut (București, Sector 1)
    const testResult = await client.getStreets({ county: "București", locality: "Sector 1" });
    if (testResult.success && testResult.data && testResult.data.length > 0) {
      console.log(`✅ API FanCourier funcționează - test București Sector 1: ${testResult.data.length} străzi găsite`);
    } else {
      console.log(`⚠️ API FanCourier test eșuat pentru București Sector 1:`, testResult.error || `${testResult.data?.length || 0} străzi`);
    }

    // Construim where clause
    const whereClause: any = {
      shippingCountry: { in: ["Romania", "RO", "România", "romania"] },
      shippingProvince: { not: null },
      shippingCity: { not: null },
    };

    if (onlyMissing) {
      whereClause.OR = [
        { shippingZip: null },
        { shippingZip: "" },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        shopifyOrderNumber: true,
        shippingProvince: true,
        shippingCity: true,
        shippingAddress1: true,
        shippingAddress2: true,
        shippingZip: true,
        shippingCountry: true,
        customerPhone: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Import validators pentru re-validare
    const { validateOrder } = await import("./validators");

    result.total = orders.length;
    console.log(`\n📋 Se procesează ${orders.length} comenzi...\n`);

    if (orders.length === 0) {
      console.log("✅ Nu există comenzi de procesat (toate au cod poștal)");
      return result;
    }

    // Cache pentru a evita apeluri repetate pentru aceeași localitate
    const postalCodeCache = new Map<string, string | null>();

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderNumber = order.shopifyOrderNumber || order.id;

      // Skip dacă deja are cod poștal valid
      if (order.shippingZip && /^\d{6}$/.test(order.shippingZip)) {
        result.skipped++;
        result.details.push({
          orderId: order.id,
          orderNumber,
          status: "skipped",
          postalCode: order.shippingZip,
        });
        continue;
      }

      // Normalizăm datele pentru București
      let county = order.shippingProvince!;
      let locality = order.shippingCity!;

      const bucharestVariants = ["bucurești", "bucharest", "bucuresti", "buc"];
      const provinceLower = order.shippingProvince!.toLowerCase();
      const cityLower = order.shippingCity!.toLowerCase();

      const provinceIsSector = /^sector\s*\d$/i.test(order.shippingProvince!);
      const cityIsBucharest = bucharestVariants.some(v => cityLower.includes(v));
      const provinceIsBucharest = bucharestVariants.some(v => provinceLower.includes(v));
      const cityIsSector = /^sector\s*\d$/i.test(order.shippingCity!);

      if (provinceIsSector && cityIsBucharest) {
        county = "București";
        locality = order.shippingProvince!;
      } else if (provinceIsBucharest && cityIsSector) {
        county = "București";
        locality = order.shippingCity!;
      } else if (provinceIsBucharest && cityIsBucharest) {
        county = "București";
        const sectorMatch = order.shippingAddress1?.match(/sector\s*(\d)/i);
        locality = sectorMatch ? `Sector ${sectorMatch[1]}` : "Sector 1";
      }

      // Construim cheia de cache cu datele normalizate
      const cacheKey = `${county}|${locality}`.toLowerCase();

      let postalCode: string | null = null;

      // Verificăm cache
      if (postalCodeCache.has(cacheKey)) {
        postalCode = postalCodeCache.get(cacheKey) || null;
      } else {
        // Căutăm în FanCourier
        try {
          const lookupResult = await client.findPostalCode({
            county,
            locality,
            street: order.shippingAddress1 || undefined,
          });

          if (lookupResult.success && lookupResult.postalCode) {
            postalCode = lookupResult.postalCode;
          }

          // Salvăm în cache (chiar și null pentru a evita apeluri repetate)
          postalCodeCache.set(cacheKey, postalCode);
        } catch (err: any) {
          console.error(`   ❌ Eroare la lookup pentru ${orderNumber}: ${err.message}`);
        }
      }

      if (postalCode) {
        // Re-validăm comanda cu noul cod poștal
        const validation = validateOrder({
          customerPhone: order.customerPhone,
          shippingAddress1: order.shippingAddress1,
          shippingAddress2: order.shippingAddress2,
          shippingCity: order.shippingCity,
          shippingProvince: order.shippingProvince,
          shippingCountry: order.shippingCountry,
          shippingZip: postalCode,
        });

        // Determinăm noul status
        let newStatus = order.status;
        if (validation.isFullyValid && order.status === "VALIDATION_FAILED") {
          newStatus = "VALIDATED";
        } else if (!validation.isFullyValid && order.status === "PENDING") {
          newStatus = "VALIDATION_FAILED";
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            shippingZip: postalCode,
            addressValidation: validation.address.isValid ? "PASSED" : "FAILED",
            addressValidationMsg: validation.address.message,
            status: newStatus,
          },
        });

        result.updated++;
        result.details.push({
          orderId: order.id,
          orderNumber,
          status: "updated",
          postalCode,
        });
        console.log(`✅ [${i + 1}/${orders.length}] ${orderNumber}: ${postalCode}${newStatus !== order.status ? ` (status: ${newStatus})` : ''}`);
      } else {
        result.errors++;
        result.details.push({
          orderId: order.id,
          orderNumber,
          status: "error",
          error: "Nu s-a găsit cod poștal",
        });
        console.log(`❌ [${i + 1}/${orders.length}] ${orderNumber}: Nu s-a găsit cod poștal pentru ${order.shippingCity}, ${order.shippingProvince}`);
      }

      // Mică pauză pentru a nu supraîncărca API-ul
      if (i > 0 && i % 50 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT BACKFILL CODURI POȘTALE:`);
    console.log(`   📋 Total procesate: ${result.total}`);
    console.log(`   ✅ Actualizate: ${result.updated}`);
    console.log(`   ⏭️ Sărite (aveau deja): ${result.skipped}`);
    console.log(`   ❌ Erori/Negăsite: ${result.errors}`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Eroare la backfill postal codes:", error.message);
    result.errors++;
  }

  return result;
}

// Alias pentru compatibilitate
export { FanCourierAPI as FanCourierClient };
