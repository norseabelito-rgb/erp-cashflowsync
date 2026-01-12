import axios, { AxiosInstance } from "axios";
import prisma from "./db";

interface SmartBillInvoiceItem {
  name: string;
  code?: string;
  measuringUnitName: string;
  quantity: number;
  price: number;
  isTaxIncluded: boolean;
  taxName: string;
  taxPercentage: number;
  saveToDb?: boolean;
  warehouseName?: string; // Numele gestiunii pentru descărcare stoc
  isService?: boolean;
}

interface SmartBillClient {
  name: string;
  vatCode?: string;
  regCom?: string;
  address: string;
  isTaxPayer: boolean;
  city: string;
  county: string;
  country: string;
  email?: string;
  phone?: string;
  saveToDb?: boolean;
}

interface SmartBillInvoiceRequest {
  companyVatCode: string;
  client: SmartBillClient;
  seriesName: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  isDraft: boolean;
  currency: string;
  language: string;
  precision: number;
  products: SmartBillInvoiceItem[];
  mentions?: string;
  observations?: string;
  usePaymentTax?: boolean;
  useEstimateDetails?: boolean;
  useStock?: boolean; // Activează descărcarea din stoc
}

interface SmartBillInvoiceResponse {
  errorText: string;
  message: string;
  number: string;
  series: string;
  url: string;
}

interface SmartBillPDFResponse {
  errorText: string;
  message: string;
  pdfFile: string; // Base64
}

export class SmartBillAPI {
  private client: AxiosInstance;
  private companyVatCode: string;
  private seriesName: string;

  constructor(email: string, token: string, companyVatCode: string, seriesName: string) {
    this.companyVatCode = companyVatCode;
    this.seriesName = seriesName;
    
    // Creăm header-ul de autentificare (Basic Auth)
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    
    this.client = axios.create({
      baseURL: "https://ws.smartbill.ro/SBORO/api",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
  }

  /**
   * Creează o factură în SmartBill
   */
  async createInvoice(data: {
    clientName: string;
    clientAddress: string;
    clientCity: string;
    clientCounty: string;
    clientCountry?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientVatCode?: string;
    items: Array<{
      name: string;
      code?: string;
      quantity: number;
      price: number;
      taxPercentage?: number;
    }>;
    mentions?: string;
    observations?: string;
    isDraft?: boolean;
    issueDate?: string;
    dueDays?: number;              // Număr de zile până la scadență (0 = fără scadență)
    useStock?: boolean;           // Activează descărcarea din stoc
    warehouseName?: string;       // Numele gestiunii din SmartBill
    taxName?: string;             // Numele cotei TVA (ex: "Normala", "19%")
    taxPercent?: number;          // Procentul TVA default
  }): Promise<SmartBillInvoiceResponse & { dueDate?: string }> {
    const today = data.issueDate || new Date().toISOString().split("T")[0];
    
    // Calculăm data scadenței dacă avem zile setate
    let dueDate: string | undefined;
    if (data.dueDays && data.dueDays > 0) {
      const due = new Date(today);
      due.setDate(due.getDate() + data.dueDays);
      dueDate = due.toISOString().split("T")[0];
    }
    
    // Folosim setările TVA primite sau valorile default
    const defaultTaxName = data.taxName || "Normala";
    const defaultTaxPercent = data.taxPercent ?? 21;

    const invoiceData: SmartBillInvoiceRequest = {
      companyVatCode: this.companyVatCode,
      seriesName: this.seriesName,
      issueDate: today,
      dueDate: dueDate,  // Adăugăm scadența
      isDraft: data.isDraft ?? false,
      currency: "RON",
      language: "RO",
      precision: 2,
      useStock: data.useStock ?? false, // Activează descărcarea din stoc SmartBill
      client: {
        name: data.clientName,
        address: data.clientAddress || "-",
        city: data.clientCity || "-",
        county: data.clientCounty || "-",
        country: data.clientCountry || "Romania",
        email: data.clientEmail,
        phone: data.clientPhone,
        vatCode: data.clientVatCode,
        isTaxPayer: false,
        saveToDb: false,
      },
      products: data.items.map((item) => {
        const product: any = {
          name: item.name,
          code: item.code || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          measuringUnitName: "buc",
          quantity: item.quantity,
          price: item.price,
          saveToDb: false,
          isService: false,
          // Parametri TVA - folosim setările din config
          isTaxIncluded: true,
          taxName: defaultTaxName,
          taxPercentage: item.taxPercentage ?? defaultTaxPercent,
        };
        
        // Adaugă warehouseName dacă useStock este activ
        if (data.useStock && data.warehouseName) {
          product.warehouseName = data.warehouseName;
        }
        
        return product;
      }),
      mentions: data.mentions,
      observations: data.observations,
    };

    console.log("\n" + "=".repeat(60));
    console.log("🧾 SMARTBILL - EMITERE FACTURĂ");
    console.log("=".repeat(60));
    console.log("👤 Client:", data.clientName);
    console.log("🏠 Adresă:", `${data.clientAddress}, ${data.clientCity}, ${data.clientCounty}`);
    console.log("📧 Email:", data.clientEmail || "-");
    console.log("📞 Telefon:", data.clientPhone || "-");
    console.log("📅 Scadență:", dueDate ? `${dueDate} (${data.dueDays} zile)` : "Fără scadență");
    console.log("📦 Descărcare stoc:", data.useStock ? `DA (gestiune: ${data.warehouseName})` : "NU");
    console.log("💰 TVA:", `${defaultTaxName} (${defaultTaxPercent}%)`);
    console.log("📝 Produse:", data.items.length);
    data.items.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.name} x${item.quantity} = ${item.price} RON`);
    });
    console.log("-".repeat(60));
    console.log("📤 Payload complet:", JSON.stringify(invoiceData, null, 2));
    console.log("=".repeat(60) + "\n");

    try {
      const response = await this.client.post<SmartBillInvoiceResponse>(
        "/invoice",
        invoiceData
      );

      console.log("\n" + "=".repeat(60));
      console.log("📥 SMARTBILL - RĂSPUNS");
      console.log("=".repeat(60));
      console.log(JSON.stringify(response.data, null, 2));
      console.log("=".repeat(60) + "\n");

      if (response.data.errorText) {
        console.error("❌ SMARTBILL - EROARE:", response.data.errorText);
        throw new Error(response.data.errorText);
      }

      console.log("✅ FACTURĂ EMISĂ CU SUCCES:", response.data.series + response.data.number);
      return { ...response.data, dueDate };
    } catch (error: any) {
      console.error("\n" + "=".repeat(60));
      console.error("❌ SMARTBILL - EROARE LA EMITERE FACTURĂ");
      console.error("=".repeat(60));
      
      const errorMsg = error.response?.data?.errorText || error.message;
      console.error("Mesaj eroare:", errorMsg);
      
      // Explicații pentru erori comune
      if (errorMsg.includes("cota tva") || errorMsg.includes("Cota")) {
        console.error("\n💡 SUGESTII PENTRU EROARE TVA:");
        console.error("   1. Verifică în SmartBill Cloud → Configurare → Cote TVA");
        console.error(`   2. Cota trimisă: "${defaultTaxName}" cu ${defaultTaxPercent}%`);
        console.error("   3. Asigură-te că denumirea cotei TVA din ERP corespunde EXACT cu cea din SmartBill");
        console.error("   4. Mergi în ERP → Setări → Contabilitate → Click 'Încarcă date SmartBill'");
        console.error("   5. Selectează cota TVA corectă din dropdown și salvează");
      }
      
      if (errorMsg.includes("Serie inexistenta") || errorMsg.includes("serie")) {
        console.error("\n💡 SUGESTII PENTRU EROARE SERIE:");
        console.error("   1. Verifică în SmartBill Cloud → Configurare → Serii documente");
        console.error("   2. Asigură-te că seria configurată în ERP există în SmartBill");
      }
      
      if (errorMsg.includes("cod") || errorMsg.includes("produs")) {
        console.error("\n💡 SUGESTII PENTRU EROARE PRODUS:");
        console.error("   1. Verifică în SmartBill Cloud → Configurare → Preferințe generale");
        console.error("   2. Dezactivează 'Folosește cod produs' dacă nu ai nevoie");
      }
      
      console.error("=".repeat(60) + "\n");
      
      if (error.response?.data?.errorText) {
        throw new Error(error.response.data.errorText);
      }
      throw error;
    }
  }

  /**
   * Obține PDF-ul unei facturi
   */
  async getInvoicePDF(series: string, number: string): Promise<Buffer> {
    try {
      const response = await this.client.get<SmartBillPDFResponse>(
        `/invoice/pdf`,
        {
          params: {
            cif: this.companyVatCode,
            seriesname: series,
            number: number,
          },
        }
      );

      if (response.data.errorText) {
        throw new Error(response.data.errorText);
      }

      return Buffer.from(response.data.pdfFile, "base64");
    } catch (error: any) {
      if (error.response?.data?.errorText) {
        throw new Error(error.response.data.errorText);
      }
      throw error;
    }
  }

  /**
   * Verifică statusul unei facturi în SmartBill
   * Returnează: 'exists' | 'deleted' | 'cancelled' | 'unknown'
   */
  async checkInvoiceStatus(series: string, number: string): Promise<{
    exists: boolean;
    status: 'exists' | 'deleted' | 'cancelled' | 'unknown';
    message?: string;
  }> {
    try {
      // Încercăm să obținem PDF-ul - dacă funcționează, factura există
      const response = await this.client.get(
        `/invoice/pdf`,
        {
          params: {
            cif: this.companyVatCode,
            seriesname: series,
            number: number,
          },
        }
      );

      if (response.data.errorText) {
        // Analizăm mesajul de eroare
        const errorText = response.data.errorText.toLowerCase();
        
        if (errorText.includes('anulat') || errorText.includes('cancelled')) {
          return { exists: false, status: 'cancelled', message: 'Factura a fost anulată' };
        }
        if (errorText.includes('nu exista') || errorText.includes('not found') || errorText.includes('stears')) {
          return { exists: false, status: 'deleted', message: 'Factura a fost ștearsă' };
        }
        
        return { exists: false, status: 'unknown', message: response.data.errorText };
      }

      return { exists: true, status: 'exists' };
    } catch (error: any) {
      const errorText = (error.response?.data?.errorText || error.message || '').toLowerCase();
      
      console.log(`SmartBill check invoice ${series}${number}:`, errorText);
      
      if (errorText.includes('anulat') || errorText.includes('cancelled')) {
        return { exists: false, status: 'cancelled', message: 'Factura a fost anulată' };
      }
      if (errorText.includes('nu exista') || errorText.includes('not found') || errorText.includes('stears') || errorText.includes('404')) {
        return { exists: false, status: 'deleted', message: 'Factura a fost ștearsă' };
      }
      
      // Eroare 404 înseamnă că factura nu există
      if (error.response?.status === 404) {
        return { exists: false, status: 'deleted', message: 'Factura nu a fost găsită' };
      }
      
      return { exists: false, status: 'unknown', message: error.message };
    }
  }

  /**
   * Verifică statusul incasării unei facturi
   */
  async getInvoicePaymentStatus(series: string, number: string): Promise<{
    isPaid: boolean;
    paidAmount: number;
    totalAmount: number;
  } | null> {
    try {
      const response = await this.client.get(
        `/invoice/paymentstatus`,
        {
          params: {
            cif: this.companyVatCode,
            seriesname: series,
            number: number,
          },
        }
      );

      if (response.data.errorText) {
        return null;
      }

      return {
        isPaid: response.data.paid || false,
        paidAmount: response.data.paidAmount || 0,
        totalAmount: response.data.totalAmount || 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Șterge o factură
   */
  async deleteInvoice(series: string, number: string): Promise<void> {
    try {
      await this.client.delete("/invoice", {
        params: {
          cif: this.companyVatCode,
          seriesname: series,
          number: number,
        },
      });
    } catch (error: any) {
      if (error.response?.data?.errorText) {
        throw new Error(error.response.data.errorText);
      }
      throw error;
    }
  }

  /**
   * Înregistrează o plată (încasare) pentru o factură
   */
  async registerPayment(params: {
    invoiceSeries: string;
    invoiceNumber: string;
    paymentType: string; // "Numerar", "Card", "Ordin de plata", etc.
    value: number;
    paymentDate: string; // Format: YYYY-MM-DD
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.post("/payment", {
        companyVatCode: this.companyVatCode,
        seriesName: params.invoiceSeries,
        number: params.invoiceNumber,
        type: params.paymentType,
        value: params.value,
        paymentDate: params.paymentDate,
        isCash: params.paymentType === "Numerar",
      });

      if (response.data.errorText) {
        return { success: false, error: response.data.errorText };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Eroare la înregistrarea plății în SmartBill:", error);
      const errorMessage = error.response?.data?.errorText || error.message || "Eroare necunoscută";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obține stocul pentru toate produsele din gestiune
   */
  async getStocks(warehouseName?: string): Promise<{
    success: boolean;
    stocks?: Array<{
      productCode: string;
      productName: string;
      quantity: number;
      warehouseName: string;
    }>;
    error?: string;
  }> {
    try {
      const params: any = {
        cif: this.companyVatCode,
      };
      if (warehouseName) {
        params.warehouseName = warehouseName;
      }

      const response = await this.client.get("/stocks", { params });

      if (response.data.errorText) {
        return { success: false, error: response.data.errorText };
      }

      const stocks = (response.data.list || response.data.stocks || []).map((item: any) => ({
        productCode: item.productCode || item.code || '',
        productName: item.productName || item.name || '',
        quantity: item.quantity || 0,
        warehouseName: item.warehouseName || item.warehouse || warehouseName || '',
      }));

      return { success: true, stocks };
    } catch (error: any) {
      console.error("Eroare la obținerea stocurilor din SmartBill:", error);
      const errorMessage = error.response?.data?.errorText || error.message || "Eroare necunoscută";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Obține rețeta unui produs din SmartBill
   * @param productCode - Codul produsului (SKU)
   * @returns Lista de componente ale rețetei
   */
  async getProductRecipe(productCode: string): Promise<{
    success: boolean;
    hasRecipe: boolean;
    components?: Array<{
      code: string;
      name: string;
      quantity: number;
      measuringUnit: string;
    }>;
    error?: string;
  }> {
    try {
      // SmartBill API pentru rețete: GET /products/recipe
      const response = await this.client.get("/products", {
        params: {
          cif: this.companyVatCode,
          code: productCode,
        },
      });

      const product = response.data;
      
      // Verificăm dacă produsul are rețetă
      if (!product || !product.recipe || product.recipe.length === 0) {
        return { success: true, hasRecipe: false };
      }

      const components = product.recipe.map((comp: any) => ({
        code: comp.code || comp.productCode,
        name: comp.name || comp.productName,
        quantity: comp.quantity || 1,
        measuringUnit: comp.measuringUnitName || "buc",
      }));

      return { success: true, hasRecipe: true, components };
    } catch (error: any) {
      // Dacă produsul nu există sau nu are rețetă, returnăm hasRecipe: false
      if (error.response?.status === 404) {
        return { success: true, hasRecipe: false };
      }
      console.error(`Eroare la obținerea rețetei pentru ${productCode}:`, error);
      return { 
        success: false, 
        hasRecipe: false,
        error: error.response?.data?.errorText || error.message 
      };
    }
  }

  /**
   * Obține rețetele pentru mai multe produse (recursiv pentru rețete multi-nivel)
   * @param productCodes - Lista de coduri produse
   * @param maxDepth - Adâncimea maximă de recursie (default 5)
   */
  async getProductRecipesRecursive(
    productCodes: string[],
    maxDepth: number = 5
  ): Promise<Map<string, {
    hasRecipe: boolean;
    components: Array<{
      code: string;
      name: string;
      quantity: number;
      measuringUnit: string;
      level: number;
      subComponents?: any[];
    }>;
  }>> {
    const result = new Map<string, any>();
    const processedCodes = new Set<string>();

    const processProduct = async (code: string, level: number): Promise<any> => {
      // Evităm bucle infinite și respectăm adâncimea maximă
      if (processedCodes.has(code) || level > maxDepth) {
        return null;
      }
      processedCodes.add(code);

      const recipeResult = await this.getProductRecipe(code);
      
      if (!recipeResult.success || !recipeResult.hasRecipe) {
        return { hasRecipe: false, components: [] };
      }

      const components = [];
      for (const comp of recipeResult.components || []) {
        const subRecipe = await processProduct(comp.code, level + 1);
        components.push({
          ...comp,
          level,
          subComponents: subRecipe?.hasRecipe ? subRecipe.components : undefined,
        });
      }

      return { hasRecipe: true, components };
    };

    for (const code of productCodes) {
      const recipe = await processProduct(code, 0);
      if (recipe) {
        result.set(code, recipe);
      }
    }

    return result;
  }
}

/**
 * Creează un client SmartBill din setările salvate
 */
export async function createSmartBillClient(overrideSeries?: string): Promise<SmartBillAPI> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings?.smartbillEmail || !settings?.smartbillToken) {
    throw new Error(
      "Credențialele SmartBill nu sunt configurate. Accesează Setări pentru a le configura."
    );
  }

  if (!settings.smartbillCompanyCif) {
    throw new Error("CIF-ul companiei nu este configurat în Setări.");
  }

  // Folosim seria specificată, sau cea din setări ca fallback
  const seriesName = overrideSeries || settings.smartbillSeriesName;
  
  if (!seriesName) {
    throw new Error("Seria facturii nu este configurată. Setează o serie în Setări sau asociază o serie magazinului.");
  }

  return new SmartBillAPI(
    settings.smartbillEmail,
    settings.smartbillToken,
    settings.smartbillCompanyCif,
    seriesName
  );
}

/**
 * Determină seria de facturare pentru o comandă
 * Prioritate: Serie store > Serie default din InvoiceSeries > Serie din Settings
 */
export async function getInvoiceSeriesForOrder(order: {
  storeId: string;
  source?: string | null;
}): Promise<string | null> {
  // Dacă comanda e din Trendyol, folosim seria Trendyol
  if (order.source === "TRENDYOL") {
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { trendyolInvoiceSeries: true, smartbillSeriesName: true },
    });
    return settings?.trendyolInvoiceSeries || settings?.smartbillSeriesName || null;
  }

  // Pentru comenzi Shopify, verificăm seria asociată store-ului
  const store = await prisma.store.findUnique({
    where: { id: order.storeId },
    select: {
      invoiceSeries: {
        select: { name: true },
      },
    },
  });

  if (store?.invoiceSeries?.name) {
    return store.invoiceSeries.name;
  }

  // Fallback: seria default din InvoiceSeries
  const defaultSeries = await prisma.invoiceSeries.findFirst({
    where: { isDefault: true, isActive: true },
    select: { name: true },
  });

  if (defaultSeries?.name) {
    return defaultSeries.name;
  }

  // Ultimul fallback: seria din Settings
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: { smartbillSeriesName: true },
  });

  return settings?.smartbillSeriesName || null;
}

/**
 * Obține setările SmartBill pentru stoc și TVA
 */
export async function getSmartBillSettings(): Promise<{
  useStock: boolean;
  warehouseName: string | null;
  taxName: string;
  taxPercent: number;
  dueDays: number;
}> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
    select: {
      smartbillUseStock: true,
      smartbillWarehouseName: true,
      smartbillTaxName: true,
      smartbillTaxPercent: true,
      smartbillDueDays: true,
    },
  });

  // Debug logging
  console.log("\n" + "=".repeat(60));
  console.log("📊 SMARTBILL SETTINGS - CITIRE DIN DB");
  console.log("=".repeat(60));
  console.log("Raw din DB:", JSON.stringify(settings, null, 2));
  console.log("-".repeat(60));

  const result = {
    useStock: settings?.smartbillUseStock ?? false,
    warehouseName: settings?.smartbillWarehouseName ?? null,
    taxName: settings?.smartbillTaxName || "Normala",
    taxPercent: settings?.smartbillTaxPercent ?? 21,
    dueDays: settings?.smartbillDueDays ?? 0,
  };

  console.log("Valori folosite:");
  console.log("  - taxName:", result.taxName, settings?.smartbillTaxName ? "(din DB)" : "(DEFAULT!)");
  console.log("  - taxPercent:", result.taxPercent, settings?.smartbillTaxPercent ? "(din DB)" : "(DEFAULT!)");
  console.log("  - useStock:", result.useStock);
  console.log("  - warehouseName:", result.warehouseName);
  console.log("  - dueDays:", result.dueDays);
  console.log("=".repeat(60) + "\n");

  return result;
}

/**
 * Emite o factură pentru o comandă
 */
export async function issueInvoiceForOrder(orderId: string): Promise<{
  success: boolean;
  invoiceNumber?: string;
  invoiceSeries?: string;
  error?: string;
}> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: true,
        store: true,
        invoice: true,
      },
    });

    if (!order) {
      return { success: false, error: "Comanda nu a fost găsită" };
    }

    if (order.invoice?.status === "issued") {
      return {
        success: false,
        error: `Factura a fost deja emisă: ${order.invoice.smartbillSeries}${order.invoice.smartbillNumber}`,
      };
    }

    // Determinăm seria de facturare pentru acest store/comandă
    const invoiceSeries = await getInvoiceSeriesForOrder({
      storeId: order.storeId,
      source: null,
    });
    
    console.log(`\n📄 SERIE FACTURARE pentru comanda ${order.shopifyOrderNumber}:`);
    console.log(`   Store: ${order.store.name}`);
    console.log(`   Sursă: SHOPIFY`);
    console.log(`   Serie: ${invoiceSeries || "⚠️ NESETAT - se va folosi default din Settings"}`);

    const smartbill = await createSmartBillClient(invoiceSeries || undefined);
    
    // Obținem setările SmartBill (stoc + TVA)
    const sbSettings = await getSmartBillSettings();

    // Construim numele clientului
    const clientName = [order.customerFirstName, order.customerLastName]
      .filter(Boolean)
      .join(" ") || "Client Shopify";

    // Construim adresa
    const clientAddress = [order.shippingAddress1, order.shippingAddress2]
      .filter(Boolean)
      .join(", ");

    console.log("\n📦 SETĂRI SMARTBILL:");
    console.log("   Descărcare stoc:", sbSettings.useStock ? "ACTIVATĂ" : "DEZACTIVATĂ");
    if (sbSettings.useStock) {
      console.log("   Gestiune:", sbSettings.warehouseName || "⚠️ NESETAT!");
    }
    console.log("   TVA:", `${sbSettings.taxName} (${sbSettings.taxPercent}%)`);
    console.log("   Scadență:", sbSettings.dueDays > 0 ? `${sbSettings.dueDays} zile` : "Fără");

    // Emitem factura
    const result = await smartbill.createInvoice({
      clientName,
      clientAddress,
      clientCity: order.shippingCity || "",
      clientCounty: order.shippingProvince || "",
      clientCountry: order.shippingCountry || "Romania",
      clientEmail: order.customerEmail || undefined,
      clientPhone: order.customerPhone || undefined,
      items: order.lineItems.map((item) => ({
        name: item.title + (item.variantTitle ? ` - ${item.variantTitle}` : ""),
        code: item.sku || `SHOPIFY-${item.shopifyLineItemId}`,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      observations: `Comandă Shopify: ${order.shopifyOrderNumber} din ${order.store.name}`,
      dueDays: sbSettings.dueDays,
      useStock: sbSettings.useStock,
      warehouseName: sbSettings.warehouseName || undefined,
      taxName: sbSettings.taxName,
      taxPercent: sbSettings.taxPercent,
    });

    // Obținem PDF-ul facturii
    let pdfData: Buffer | null = null;
    try {
      pdfData = await smartbill.getInvoicePDF(result.series, result.number);
    } catch (pdfError) {
      console.error("Eroare la obținerea PDF-ului:", pdfError);
    }

    // Calculăm data scadenței pentru baza de date
    let dueDate: Date | null = null;
    if (result.dueDate) {
      dueDate = new Date(result.dueDate);
    }

    // Determinăm statusul plății pe baza financialStatus din Shopify
    const isPaid = order.financialStatus === "paid";
    const paymentStatus = isPaid ? "paid" : "unpaid";

    // Salvăm factura în baza de date
    await prisma.invoice.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        smartbillNumber: result.number,
        smartbillSeries: result.series,
        status: "issued",
        pdfUrl: result.url,
        pdfData: pdfData,
        dueDate: dueDate,
        paymentStatus: paymentStatus,
        paidAmount: isPaid ? order.totalPrice : 0,
        paidAt: isPaid ? new Date() : null,
        issuedAt: new Date(),
      },
      update: {
        smartbillNumber: result.number,
        smartbillSeries: result.series,
        status: "issued",
        pdfUrl: result.url,
        pdfData: pdfData,
        dueDate: dueDate,
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
      data: { status: "INVOICED" },
    });

    // Logăm în ActivityLog
    try {
      const { logInvoiceIssued } = await import("./activity-log");
      await logInvoiceIssued({
        orderId: order.id,
        orderNumber: order.shopifyOrderNumber,
        invoiceNumber: result.number,
        invoiceSeries: result.series,
        total: Number(order.totalPrice),
        dueDate: dueDate || undefined,
      });
    } catch (logError) {
      console.error("Eroare la logging:", logError);
    }

    // 🔥 PROCESARE STOC - Scădem stocul produselor vândute
    try {
      const { processStockForOrder, calculateOrderCost, updateDailySales } = await import("./stock");
      const { processInventoryStockForOrder } = await import("./inventory-stock");

      // Obținem factura creată pentru a avea ID-ul
      const invoice = await prisma.invoice.findUnique({
        where: { orderId: order.id },
      });

      if (invoice) {
        // Procesăm descărcarea stocului din vechiul sistem (Product)
        const stockResult = await processStockForOrder(order.id, invoice.id);

        if (stockResult.errors.length > 0) {
          console.warn("⚠️ Avertismente la procesarea stocului (Product):", stockResult.errors);
        }

        // Procesăm descărcarea stocului din noul sistem (InventoryItem)
        const inventoryResult = await processInventoryStockForOrder(order.id, invoice.id);

        if (inventoryResult.errors.length > 0) {
          console.warn("⚠️ Avertismente la procesarea stocului (Inventory):", inventoryResult.errors);
        }

        // Calculăm costul și actualizăm statisticile zilnice
        const orderCost = await calculateOrderCost(order.id);
        const itemsCount = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

        await updateDailySales(new Date(), {
          salesAmount: Number(order.totalPrice),
          invoicesCount: 1,
          itemsCount,
          costAmount: orderCost,
        });

        console.log(`✅ Stoc procesat și statistici actualizate pentru comanda ${order.shopifyOrderNumber}`);
        console.log(`   Product: ${stockResult.processed} mișcări, Inventory: ${inventoryResult.processed} articole`);
      }
    } catch (stockError: any) {
      // Nu oprim emiterea facturii dacă stocul nu poate fi procesat
      console.error("⚠️ Eroare la procesarea stocului (factura a fost emisă):", stockError.message);
    }

    // Actualizăm comanda în Shopify (adăugăm tag)
    try {
      const { createShopifyClient } = await import("./shopify");
      const shopifyClient = await createShopifyClient(order.storeId);
      await shopifyClient.markInvoiceIssued(
        order.shopifyOrderId,
        `${result.series}${result.number}`
      );
    } catch (shopifyError) {
      console.error("Eroare la actualizarea Shopify:", shopifyError);
    }

    return {
      success: true,
      invoiceNumber: result.number,
      invoiceSeries: result.series,
    };
  } catch (error: any) {
    // Salvăm eroarea în baza de date
    await prisma.invoice.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "error",
        errorMessage: error.message,
      },
      update: {
        status: "error",
        errorMessage: error.message,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "INVOICE_ERROR" },
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sincronizare bilaterală - verifică statusul facturilor în SmartBill
 * și actualizează baza de date locală
 */
export async function syncInvoicesFromSmartBill(): Promise<{
  checked: number;
  updated: number;
  deleted: number;
  errors: number;
  details: Array<{
    orderId: string;
    orderNumber: string;
    invoiceNumber: string;
    action: string;
    message: string;
  }>;
}> {
  const result = {
    checked: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
    details: [] as Array<{
      orderId: string;
      orderNumber: string;
      invoiceNumber: string;
      action: string;
      message: string;
    }>,
  };

  console.log("\n" + "=".repeat(60));
  console.log("🔄 SMARTBILL - SINCRONIZARE BILATERALĂ");
  console.log("=".repeat(60));

  try {
    const smartbill = await createSmartBillClient();

    // Obținem toate facturile emise din baza de date
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "issued",
        smartbillNumber: { not: null },
        smartbillSeries: { not: null },
      },
      include: {
        order: true,
      },
    });

    console.log(`📋 Verificăm ${invoices.length} facturi emise...`);

    for (const invoice of invoices) {
      if (!invoice.smartbillSeries || !invoice.smartbillNumber) continue;

      result.checked++;
      const invoiceRef = `${invoice.smartbillSeries}${invoice.smartbillNumber}`;
      const orderNumber = invoice.order?.shopifyOrderNumber || invoice.orderId;

      console.log(`\n  Verificăm factura ${invoiceRef} (Comandă: ${orderNumber})...`);

      try {
        const status = await smartbill.checkInvoiceStatus(
          invoice.smartbillSeries,
          invoice.smartbillNumber
        );

        if (!status.exists) {
          // Factura a fost ștearsă sau anulată în SmartBill
          console.log(`  ❌ Factura ${invoiceRef} - ${status.status}: ${status.message}`);

          // Actualizăm statusul local
          const newStatus = status.status === 'cancelled' ? 'cancelled' : 'deleted';
          
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: newStatus,
              errorMessage: `Factură ${status.status === 'cancelled' ? 'anulată' : 'ștearsă'} în SmartBill la ${new Date().toLocaleString('ro-RO')}`,
            },
          });

          // Actualizăm și statusul comenzii
          if (invoice.orderId) {
            await prisma.order.update({
              where: { id: invoice.orderId },
              data: { status: "PENDING" },
            });
          }

          result.deleted++;
          result.details.push({
            orderId: invoice.orderId,
            orderNumber: orderNumber,
            invoiceNumber: invoiceRef,
            action: status.status === 'cancelled' ? 'ANULATĂ' : 'ȘTEARSĂ',
            message: status.message || 'Factura nu mai există în SmartBill',
          });
        } else {
          console.log(`  ✅ Factura ${invoiceRef} - există în SmartBill`);
        }
      } catch (error: any) {
        console.error(`  ⚠️ Eroare la verificarea ${invoiceRef}:`, error.message);
        result.errors++;
        result.details.push({
          orderId: invoice.orderId,
          orderNumber: orderNumber,
          invoiceNumber: invoiceRef,
          action: 'EROARE',
          message: error.message,
        });
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 REZULTAT SINCRONIZARE:`);
    console.log(`   ✅ Verificate: ${result.checked}`);
    console.log(`   🗑️ Șterse/Anulate: ${result.deleted}`);
    console.log(`   ⚠️ Erori: ${result.errors}`);
    console.log("=".repeat(60) + "\n");

  } catch (error: any) {
    console.error("❌ Eroare la sincronizare:", error.message);
    result.errors++;
  }

  return result;
}
