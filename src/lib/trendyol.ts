/**
 * Trendyol API Client Library
 * 
 * Base URLs:
 * - Production: https://apigw.trendyol.com
 * - Test/Stage: https://stageapi.trendyol.com
 * 
 * Authentication: Basic Auth (Base64 encode of "API_KEY:API_SECRET")
 */

// ============ TYPES ============

export interface TrendyolConfig {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  isTestMode?: boolean;
}

export interface TrendyolCategory {
  id: number;
  name: string;
  parentId?: number;
  subCategories?: TrendyolCategory[];
}

export interface TrendyolBrand {
  id: number;
  name: string;
}

export interface TrendyolAttribute {
  id: number;
  name: string;
  required: boolean;
  allowCustom: boolean;
  attributeValues?: Array<{
    id: number;
    name: string;
  }>;
}

export interface TrendyolProductCreate {
  barcode: string;
  title: string;
  productMainId: string;  // SKU
  brandId: number;
  categoryId: number;
  quantity: number;
  stockCode: string;
  dimensionalWeight: number;
  description: string;
  currencyType: "EUR" | "TRY" | "USD";
  listPrice: number;
  salePrice: number;
  vatRate: number;  // 0, 1, 8, 10, 18, 20
  cargoCompanyId?: number;
  shipmentAddressId?: number;
  deliveryDuration?: number;
  images: Array<{ url: string }>;
  attributes?: Array<{
    attributeId: number;
    attributeValueId?: number;
    customAttributeValue?: string;
  }>;
}

export interface TrendyolProduct {
  id: string;
  barcode: string;
  title: string;
  productMainId: string;
  brandId: number;
  brandName?: string;
  categoryId: number;
  categoryName?: string;
  quantity: number;
  stockCode: string;
  salePrice: number;
  listPrice: number;
  approved: boolean;
  archived: boolean;
  onSale: boolean;
  rejected?: boolean;
  rejectReasonDetails?: string;
  images?: Array<{ url: string }>;
}

export interface TrendyolOrder {
  id: number;
  orderNumber: string;
  orderDate: number;
  status: string;
  customerId: number;
  shipmentAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    district: string;
    postalCode: string;
    countryCode: string;
    fullName: string;
    fullAddress: string;
  };
  lines: Array<{
    id: number;
    productId: number;
    barcode: string;
    productName: string;
    quantity: number;
    salesCampaignId?: number;
    merchantSku: string;
    productCode: string;
    amount: number;
    price: number;
  }>;
  totalPrice: number;
  currencyCode: string;
  packageHistories?: Array<{
    createdDate: number;
    status: string;
  }>;
}

export interface TrendyolApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  batchRequestId?: string;
}

// ============ CLIENT ============

export class TrendyolClient {
  private config: TrendyolConfig;
  private baseUrl: string;
  private authHeader: string;
  
  // Headere complete pentru a trece de Cloudflare
  private readonly browserHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,ro;q=0.8",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
  };

  constructor(config: TrendyolConfig) {
    this.config = config;
    
    // Trendyol International API URL
    // Production: apigw.trendyol.com (pentru International/Europa)
    // Test: stageapigw.trendyol.com
    this.baseUrl = config.isTestMode 
      ? "https://stageapigw.trendyol.com"
      : "https://apigw.trendyol.com";
    
    // Basic Auth: Base64(apiKey:apiSecret)
    this.authHeader = "Basic " + Buffer.from(
      `${config.apiKey}:${config.apiSecret}`
    ).toString("base64");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<TrendyolApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log("[Trendyol] Request to:", url);
    console.log("[Trendyol] SupplierId:", this.config.supplierId);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.browserHeaders,
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      console.log("[Trendyol] Response status:", response.status, response.statusText);

      const text = await response.text();
      console.log("[Trendyol] Response body (first 500 chars):", text.substring(0, 500));
      
      let data;
      
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { rawResponse: text };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.errors?.[0]?.message || 
                 data?.error || 
                 data?.message ||
                 `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
        batchRequestId: data?.batchRequestId,
      };
    } catch (error: any) {
      console.error("[Trendyol] Fetch error:", error);
      return {
        success: false,
        error: error.message || "Network error",
      };
    }
  }

  // ============ CATEGORIES ============

  async getCategories(storeFrontCode?: string): Promise<TrendyolApiResponse<TrendyolCategory[]>> {
    // Construim URL-ul cu parametri pentru limbă
    const params = new URLSearchParams();
    if (storeFrontCode) params.set("storeFrontCode", storeFrontCode);
    // Încercăm diferiți parametri de limbă
    params.set("lang", "ro");
    params.set("locale", "ro_RO");
    params.set("language", "ro");
    
    const queryString = params.toString();
    const url = `https://apigw.trendyol.com/integration/product/product-categories${queryString ? `?${queryString}` : ""}`;
    
    console.log("[Trendyol] Fetching categories from:", url);
    
    const response = await fetch(url, {
      headers: {
        ...this.browserHeaders,
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      console.log("[Trendyol] Categories raw response:", text.substring(0, 300));
      return { success: false, error: `Failed to fetch categories: ${response.status}` };
    }
    
    if (!response.ok) {
      return { success: false, error: `Failed to fetch categories: ${response.status}` };
    }

    return { success: true, data: data.categories || data };
  }

  async getCategoryAttributes(categoryId: number, storeFrontCode?: string): Promise<TrendyolApiResponse<TrendyolAttribute[]>> {
    let url = `https://apigw.trendyol.com/integration/product/product-categories/${categoryId}/attributes`;
    
    if (storeFrontCode) {
      url += `?storeFrontCode=${storeFrontCode}`;
    }
    
    const response = await fetch(url, {
      headers: {
        ...this.browserHeaders,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      return { success: false, error: `Failed to fetch attributes: ${response.status}` };
    }
    
    if (!response.ok) {
      return { success: false, error: `Failed to fetch attributes: ${response.status}` };
    }

    return { success: true, data: data.categoryAttributes || data };
  }

  // ============ BRANDS (Public - no auth needed) ============

  async getBrands(page: number = 0, size: number = 1000): Promise<TrendyolApiResponse<TrendyolBrand[]>> {
    const response = await fetch(
      `https://apigw.trendyol.com/integration/product/brands?page=${page}&size=${size}`,
      {
        headers: this.browserHeaders,
      }
    );

    let data;
    try {
      data = await response.json();
    } catch {
      return { success: false, error: `Failed to fetch brands: ${response.status}` };
    }
    
    if (!response.ok) {
      return { success: false, error: `Failed to fetch brands: ${response.status}` };
    }

    return { success: true, data: data.brands || data };
  }

  async searchBrands(name: string): Promise<TrendyolApiResponse<TrendyolBrand[]>> {
    const response = await fetch(
      `https://apigw.trendyol.com/integration/product/brands/by-name?name=${encodeURIComponent(name)}`,
      {
        headers: this.browserHeaders,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: "Failed to search brands" };
    }

    // API returns array directly, not {brands: [...]}
    return { success: true, data: Array.isArray(data) ? data : (data.brands || [data]) };
  }

  // ============ SUPPLIER/SELLER INFO ============

  async getSupplierAddresses(): Promise<TrendyolApiResponse<any[]>> {
    // Pentru International se folosește /integration/product/sellers/
    return this.request<any[]>(
      `/integration/product/sellers/${this.config.supplierId}/addresses`
    );
  }

  async getCargoCompanies(): Promise<TrendyolApiResponse<any[]>> {
    return this.request<any[]>(
      `/integration/product/shipment-providers`
    );
  }

  // ============ PRODUCTS ============

  async getProducts(params: {
    page?: number;
    size?: number;
    approved?: boolean;
    barcode?: string;
    stockCode?: string;
    storeFrontCode?: string;  // Codul țării: RO, DE, AE, etc.
  } = {}): Promise<TrendyolApiResponse<{ content: TrendyolProduct[]; totalElements: number }>> {
    const searchParams = new URLSearchParams();
    
    if (params.page !== undefined) searchParams.set("page", params.page.toString());
    if (params.size !== undefined) searchParams.set("size", params.size.toString());
    if (params.approved !== undefined) searchParams.set("approved", params.approved.toString());
    if (params.barcode) searchParams.set("barcode", params.barcode);
    if (params.stockCode) searchParams.set("stockCode", params.stockCode);
    if (params.storeFrontCode) searchParams.set("storeFrontCode", params.storeFrontCode);

    const query = searchParams.toString();
    return this.request<{ content: TrendyolProduct[]; totalElements: number }>(
      `/integration/product/sellers/${this.config.supplierId}/products${query ? `?${query}` : ""}`
    );
  }

  async createProducts(products: TrendyolProductCreate[]): Promise<TrendyolApiResponse<{ batchRequestId: string }>> {
    return this.request<{ batchRequestId: string }>(
      `/integration/product/sellers/${this.config.supplierId}/v2/products`,
      {
        method: "POST",
        body: JSON.stringify({ items: products }),
      }
    );
  }

  async updateProducts(products: TrendyolProductCreate[]): Promise<TrendyolApiResponse<{ batchRequestId: string }>> {
    return this.request<{ batchRequestId: string }>(
      `/integration/product/sellers/${this.config.supplierId}/v2/products`,
      {
        method: "PUT",
        body: JSON.stringify({ items: products }),
      }
    );
  }

  async updatePriceAndInventory(items: Array<{
    barcode: string;
    quantity: number;
    salePrice: number;
    listPrice: number;
  }>): Promise<TrendyolApiResponse<{ batchRequestId: string }>> {
    return this.request<{ batchRequestId: string }>(
      `/integration/product/sellers/${this.config.supplierId}/products/price-and-inventory`,
      {
        method: "POST",
        body: JSON.stringify({ items }),
      }
    );
  }

  async deleteProducts(barcodes: string[]): Promise<TrendyolApiResponse<{ batchRequestId: string }>> {
    return this.request<{ batchRequestId: string }>(
      `/integration/product/sellers/${this.config.supplierId}/products`,
      {
        method: "DELETE",
        body: JSON.stringify({ 
          items: barcodes.map(barcode => ({ barcode }))
        }),
      }
    );
  }

  async getBatchRequestResult(batchRequestId: string): Promise<TrendyolApiResponse<{
    status: string;
    items?: Array<{
      status: string;
      failureReasons?: string[];
    }>;
  }>> {
    return this.request(
      `/integration/product/sellers/${this.config.supplierId}/products/batch-requests/${batchRequestId}`
    );
  }

  // ============ ORDERS ============

  async getOrders(params: {
    page?: number;
    size?: number;
    status?: string;
    startDate?: number;  // Unix timestamp in milliseconds
    endDate?: number;
    orderByField?: string;
    orderByDirection?: "ASC" | "DESC";
  } = {}): Promise<TrendyolApiResponse<{ content: TrendyolOrder[]; totalElements: number }>> {
    const searchParams = new URLSearchParams();
    
    if (params.page !== undefined) searchParams.set("page", params.page.toString());
    if (params.size !== undefined) searchParams.set("size", params.size.toString());
    if (params.status) searchParams.set("status", params.status);
    if (params.startDate) searchParams.set("startDate", params.startDate.toString());
    if (params.endDate) searchParams.set("endDate", params.endDate.toString());
    if (params.orderByField) searchParams.set("orderByField", params.orderByField);
    if (params.orderByDirection) searchParams.set("orderByDirection", params.orderByDirection);

    const query = searchParams.toString();
    return this.request<{ content: TrendyolOrder[]; totalElements: number }>(
      `/integration/product/sellers/${this.config.supplierId}/orders${query ? `?${query}` : ""}`
    );
  }

  async updateTrackingNumber(
    shipmentPackageId: number,
    trackingNumber: string,
    cargoProviderName?: string
  ): Promise<TrendyolApiResponse<void>> {
    return this.request<void>(
      `/integration/product/sellers/${this.config.supplierId}/shipment-packages/${shipmentPackageId}`,
      {
        method: "PUT",
        body: JSON.stringify({ 
          trackingNumber,
          ...(cargoProviderName && { cargoProviderName }),
        }),
      }
    );
  }

  async sendInvoiceLink(
    shipmentPackageId: number,
    invoiceLink: string
  ): Promise<TrendyolApiResponse<void>> {
    return this.request<void>(
      `/integration/product/sellers/${this.config.supplierId}/shipment-packages/${shipmentPackageId}/invoice-link`,
      {
        method: "POST",
        body: JSON.stringify({ invoiceLink }),
      }
    );
  }

  // ============ WEBHOOKS ============

  /**
   * Register a webhook with Trendyol
   * Note: Trendyol International may have different webhook endpoints
   * This implementation follows the standard Trendyol API pattern
   */
  async registerWebhook(
    callbackUrl: string,
    events: string[]
  ): Promise<TrendyolApiResponse<{ webhookId: string }>> {
    return this.request<{ webhookId: string }>(
      `/integration/product/sellers/${this.config.supplierId}/webhooks`,
      {
        method: "POST",
        body: JSON.stringify({
          url: callbackUrl,
          events: events,
          // Active by default
          isActive: true,
        }),
      }
    );
  }

  /**
   * List all registered webhooks for this supplier
   */
  async listWebhooks(): Promise<TrendyolApiResponse<{ webhooks: Array<{ id: string; url: string; events: string[]; isActive: boolean }> }>> {
    return this.request<{ webhooks: Array<{ id: string; url: string; events: string[]; isActive: boolean }> }>(
      `/integration/product/sellers/${this.config.supplierId}/webhooks`
    );
  }

  /**
   * Delete a registered webhook
   */
  async deleteWebhook(webhookId: string): Promise<TrendyolApiResponse<void>> {
    return this.request<void>(
      `/integration/product/sellers/${this.config.supplierId}/webhooks/${webhookId}`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * Update a webhook (enable/disable or change URL)
   */
  async updateWebhook(
    webhookId: string,
    updates: { url?: string; events?: string[]; isActive?: boolean }
  ): Promise<TrendyolApiResponse<void>> {
    return this.request<void>(
      `/integration/product/sellers/${this.config.supplierId}/webhooks/${webhookId}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );
  }

  // ============ TEST CONNECTION ============

  async testConnection(): Promise<TrendyolApiResponse<{ supplierId: string; productCount: number; storeFrontCode?: string; rawResponse?: any }>> {
    // Testăm cu endpoint-ul de produse
    console.log("[Trendyol] Testing connection with products endpoint...");
    
    // Încercăm mai multe storefront codes pentru a găsi produsele
    const storeFrontCodes = ["", "RO", "DE", "BG", "HU", "CZ", "PL", "GR"];
    
    for (const storeFrontCode of storeFrontCodes) {
      console.log(`[Trendyol] Trying storeFrontCode: "${storeFrontCode || '(none)'}"`);
      
      const productsResult = await this.getProducts({ 
        page: 0, 
        size: 1,
        storeFrontCode: storeFrontCode || undefined
      });
      
      if (!productsResult.success) {
        console.log(`[Trendyol] Failed for ${storeFrontCode}: ${productsResult.error}`);
        continue;
      }
      
      const data = productsResult.data as any;
      const productCount = data?.totalElements || 0;
      
      console.log(`[Trendyol] storeFrontCode="${storeFrontCode || '(none)'}": ${productCount} products`);
      
      if (productCount > 0) {
        return {
          success: true,
          data: {
            supplierId: this.config.supplierId,
            productCount,
            storeFrontCode: storeFrontCode || undefined,
            rawResponse: data,
          },
        };
      }
    }
    
    // Dacă nu am găsit produse cu niciun storefront, returnăm rezultatul fără storefront
    const productsResult = await this.getProducts({ page: 0, size: 1 });
    
    if (!productsResult.success) {
      return {
        success: false,
        error: productsResult.error || "Failed to connect to Trendyol API",
      };
    }

    const data = productsResult.data as any;
    
    return {
      success: true,
      data: {
        supplierId: this.config.supplierId,
        productCount: data?.totalElements || 0,
        rawResponse: data,
      },
    };
  }
}

// ============ HELPER FUNCTIONS ============

// Dicționar de traduceri turco-român pentru categorii comune
const turkishToRomanian: Record<string, string> = {
  // Categorii principale
  "Giyim": "Îmbrăcăminte",
  "Ayakkabı": "Încălțăminte",
  "Çanta": "Genți",
  "Aksesuar": "Accesorii",
  "Kozmetik": "Cosmetice",
  "Elektronik": "Electronice",
  "Ev": "Casă",
  "Spor": "Sport",
  "Anne": "Mamă",
  "Bebek": "Bebeluș",
  "Çocuk": "Copii",
  "Süpermarket": "Supermarket",
  "Kitap": "Cărți",
  "Hobi": "Hobby",
  "Oyuncak": "Jucării",
  "Pet Shop": "Pet Shop",
  "Ofis": "Birou",
  "Bahçe": "Grădină",
  "Yapı Market": "Bricolaj",
  "Otomotiv": "Auto",
  "Takı": "Bijuterii",
  "Saat": "Ceasuri",
  "Gözlük": "Ochelari",
  
  // Îmbrăcăminte
  "Kadın": "Femei",
  "Erkek": "Bărbați",
  "Kız": "Fete",
  "Erkek Çocuk": "Băieți",
  "Elbise": "Rochii",
  "Tişört": "Tricouri",
  "Gömlek": "Cămăși",
  "Pantolon": "Pantaloni",
  "Etek": "Fuste",
  "Ceket": "Jachete",
  "Mont": "Geci",
  "Kaban": "Paltoane",
  "Trençkot": "Trenciuri",
  "Yelek": "Veste",
  "Hırka": "Cardigane",
  "Kazak": "Pulovere",
  "Sweatshirt": "Hanorace",
  "Bluz": "Bluze",
  "Tunik": "Tunici",
  "Şort": "Pantaloni scurți",
  "Tayt": "Colanti",
  "Jean": "Blugi",
  "Eşofman": "Trening",
  "Pijama": "Pijamale",
  "İç Giyim": "Lenjerie",
  "Mayo": "Costume baie",
  "Bikini": "Bikini",
  
  // Încălțăminte
  "Bot": "Ghete",
  "Topuklu": "Tocuri",
  "Sneaker": "Sneakers",
  "Sandalet": "Sandale",
  "Terlik": "Papuci",
  "Babet": "Balerini",
  "Loafer": "Mocasini",
  "Oxford": "Oxford",
  "Çizme": "Cizme",
  "Spor Ayakkabı": "Pantofi sport",
  
  // Accesorii
  "Şapka": "Pălării",
  "Bere": "Berete",
  "Atkı": "Eșarfe",
  "Eldiven": "Mănuși",
  "Kemer": "Curele",
  "Cüzdan": "Portofele",
  "Şemsiye": "Umbrele",
  
  // Alte cuvinte comune
  "ve": "și",
  "için": "pentru",
  "ile": "cu",
  "Yeni": "Nou",
  "İndirimli": "Reducere",
  "Popüler": "Popular",
  "Çok Satan": "Bestseller",
};

/**
 * Traduce un text din turcă în română folosind dicționarul
 */
export function translateTurkishToRomanian(text: string): string {
  if (!text) return text;
  
  let translated = text;
  
  // Înlocuim cuvintele din dicționar
  for (const [turkish, romanian] of Object.entries(turkishToRomanian)) {
    // Folosim regex cu word boundaries pentru a evita înlocuiri parțiale
    const regex = new RegExp(`\\b${turkish}\\b`, 'gi');
    translated = translated.replace(regex, romanian);
  }
  
  return translated;
}

export function flattenCategories(categories: TrendyolCategory[], parentPath: string = "", translate: boolean = true): Array<{
  id: number;
  name: string;
  nameOriginal: string;
  fullPath: string;
  fullPathOriginal: string;
  parentId?: number;
}> {
  const result: Array<{ 
    id: number; 
    name: string; 
    nameOriginal: string;
    fullPath: string; 
    fullPathOriginal: string;
    parentId?: number;
  }> = [];

  for (const cat of categories) {
    const nameOriginal = cat.name;
    const name = translate ? translateTurkishToRomanian(cat.name) : cat.name;
    
    const fullPathOriginal = parentPath ? `${parentPath} > ${nameOriginal}` : nameOriginal;
    const fullPathTranslated = translate ? translateTurkishToRomanian(fullPathOriginal) : fullPathOriginal;
    
    result.push({
      id: cat.id,
      name,
      nameOriginal,
      fullPath: fullPathTranslated,
      fullPathOriginal,
      parentId: cat.parentId,
    });

    if (cat.subCategories && cat.subCategories.length > 0) {
      result.push(...flattenCategories(cat.subCategories, fullPathOriginal, translate));
    }
  }

  return result;
}

export function generateBarcode(sku: string): string {
  // Generează un barcode EAN-13 bazat pe SKU
  // Format: 200 (prefix intern) + hash din SKU (9 cifre) + checksum
  const hash = sku.split("").reduce((acc, char) => {
    return ((acc * 31) + char.charCodeAt(0)) % 1000000000;
  }, 0);
  
  const base = "200" + hash.toString().padStart(9, "0");
  
  // Calculează checksum EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return base + checksum;
}

// ============ ORDER SYNC FUNCTIONS ============

import prisma from "./db";
import { normalizeStatus } from "./trendyol-status";

export async function syncTrendyolOrders(options?: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  onProgress?: (current: number, total: number, item: string) => void;
}): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = { synced: 0, created: 0, updated: 0, errors: [] as string[] };

  try {
    const settings = await prisma.settings.findFirst();
    if (!settings?.trendyolSupplierId || !settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
      throw new Error("Trendyol credentials not configured");
    }

    const client = new TrendyolClient({
      supplierId: settings.trendyolSupplierId,
      apiKey: settings.trendyolApiKey,
      apiSecret: settings.trendyolApiSecret,
      isTestMode: settings.trendyolIsTestMode || false,
    });

    const startDate = options?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate || new Date();

    let page = 0;
    let hasMore = true;
    let totalItems = 0;
    let processedItems = 0;

    // First, get total count
    const firstResponse = await client.getOrders({
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      status: options?.status,
      page: 0,
      size: 1,
    });
    totalItems = firstResponse.data?.totalElements || 0;

    while (hasMore) {
      const response = await client.getOrders({
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        status: options?.status,
        page,
        size: 50,
        orderByField: "CreatedDate",
        orderByDirection: "DESC",
      });

      const content = response.data?.content || [];
      const totalPages = Math.ceil((response.data?.totalElements || 0) / 50);

      for (const orderData of content) {
        try {
          processedItems++;
          if (options?.onProgress) {
            options.onProgress(processedItems, totalItems, `Comandă ${orderData.orderNumber}`);
          }

          const wasCreated = await syncSingleTrendyolOrder(orderData);
          if (wasCreated) {
            result.created++;
          } else {
            result.updated++;
          }
          result.synced++;
        } catch (error: any) {
          result.errors.push(`Order ${orderData.orderNumber}: ${error.message}`);
        }
      }

      page++;
      hasMore = page < totalPages;
    }

    console.log(`[Trendyol Sync] Synced ${result.synced} orders (${result.created} created, ${result.updated} updated), ${result.errors.length} errors`);
  } catch (error: any) {
    console.error("[Trendyol Sync] Failed:", error);
    result.errors.push(`Sync failed: ${error.message}`);
  }

  return result;
}

async function syncSingleTrendyolOrder(orderData: any): Promise<boolean> {
  const trendyolOrderId = orderData.shipmentPackageId?.toString() || orderData.id?.toString();
  
  const existing = await prisma.trendyolOrder.findUnique({
    where: { trendyolOrderId },
  });

  const orderPayload = {
    trendyolOrderNumber: orderData.orderNumber,
    orderDate: new Date(orderData.orderDate),
    status: normalizeStatus(orderData.status),
    customerName: orderData.shipmentAddress?.fullName || 
                  `${orderData.customerFirstName || ""} ${orderData.customerLastName || ""}`.trim() ||
                  "Unknown",
    customerEmail: orderData.customerEmail || null,
    customerPhone: null,
    customerAddress: orderData.shipmentAddress?.fullAddress || 
                     orderData.shipmentAddress?.address1 || "",
    customerCity: orderData.shipmentAddress?.city || "",
    customerDistrict: orderData.shipmentAddress?.district || null,
    customerPostalCode: orderData.shipmentAddress?.postalCode || null,
    cargoProviderName: orderData.cargoProviderName || null,
    cargoTrackingNumber: orderData.cargoTrackingNumber || null,
    cargoTrackingLink: orderData.cargoTrackingLink || null,
    totalPrice: orderData.totalPrice || 0,
    currency: orderData.currencyCode || "TRY",
    shipmentPackageId: orderData.shipmentPackageId?.toString() || null,
    lastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.trendyolOrder.update({
      where: { id: existing.id },
      data: orderPayload,
    });
    return false; // Updated
  } else {
    await prisma.trendyolOrder.create({
      data: {
        ...orderPayload,
        trendyolOrderId,
        lineItems: {
          create: (orderData.lines || []).map((line: any) => ({
            trendyolProductId: line.productCode?.toString() || line.barcode,
            barcode: line.barcode,
            title: line.productName || "Unknown Product",
            quantity: line.quantity,
            price: line.price,
            merchantSku: line.merchantSku || null,
            productColor: line.productColor || null,
            productSize: line.productSize || null,
          })),
        },
      },
    });

    // Try to auto-map products
    for (const line of (orderData.lines || [])) {
      await tryAutoMapTrendyolProduct(line);
    }

    return true; // Created
  }
}

async function tryAutoMapTrendyolProduct(line: any): Promise<boolean> {
  const barcode = line.barcode;
  const merchantSku = line.merchantSku;
  const productId = line.productCode?.toString() || barcode;

  const existingMapping = await prisma.trendyolProductMapping.findUnique({
    where: { trendyolProductId: productId },
  });

  if (existingMapping) return true;

  // Try to find by barcode or SKU
  const masterProduct = await prisma.masterProduct.findFirst({
    where: {
      OR: [
        { barcode: barcode },
        { trendyolBarcode: barcode },
        { sku: { equals: barcode, mode: "insensitive" as const } },
        ...(merchantSku ? [{ sku: { equals: merchantSku, mode: "insensitive" as const } }] : []),
      ],
    },
  });

  if (masterProduct) {
    await prisma.trendyolProductMapping.create({
      data: {
        trendyolProductId: productId,
        barcode,
        trendyolTitle: line.productName || "Unknown",
        merchantSku: merchantSku || null,
        localSku: masterProduct.sku,
        masterProductId: masterProduct.id,
        isAutoMapped: true,
      },
    });

    await prisma.trendyolOrderItem.updateMany({
      where: { barcode },
      data: {
        localSku: masterProduct.sku,
        masterProductId: masterProduct.id,
        isMapped: true,
      },
    });

    console.log(`[Trendyol] Auto-mapped ${barcode} → ${masterProduct.sku}`);
    return true;
  }

  return false;
}

export async function getUnmappedTrendyolProducts(): Promise<{
  barcode: string;
  title: string;
  merchantSku: string | null;
  ordersCount: number;
}[]> {
  const unmapped = await prisma.trendyolOrderItem.groupBy({
    by: ["barcode", "title", "merchantSku"],
    where: { isMapped: false },
    _count: { id: true },
  });

  return unmapped.map((item) => ({
    barcode: item.barcode,
    title: item.title,
    merchantSku: item.merchantSku,
    ordersCount: item._count.id,
  }));
}

export async function mapTrendyolProduct(
  barcode: string,
  localSku: string,
  userId?: string
): Promise<void> {
  const masterProduct = await prisma.masterProduct.findFirst({
    where: { sku: { equals: localSku, mode: "insensitive" } },
  });

  if (!masterProduct) {
    throw new Error(`SKU local "${localSku}" nu a fost găsit`);
  }

  const orderItem = await prisma.trendyolOrderItem.findFirst({
    where: { barcode },
  });

  await prisma.trendyolProductMapping.upsert({
    where: { trendyolProductId: barcode },
    create: {
      trendyolProductId: barcode,
      barcode,
      trendyolTitle: orderItem?.title || "Unknown",
      merchantSku: orderItem?.merchantSku || null,
      localSku: masterProduct.sku,
      masterProductId: masterProduct.id,
      isAutoMapped: false,
      mappedBy: userId || null,
    },
    update: {
      localSku: masterProduct.sku,
      masterProductId: masterProduct.id,
      isAutoMapped: false,
      mappedBy: userId || null,
    },
  });

  await prisma.trendyolOrderItem.updateMany({
    where: { barcode },
    data: {
      localSku: masterProduct.sku,
      masterProductId: masterProduct.id,
      isMapped: true,
    },
  });

  console.log(`[Trendyol] Manually mapped ${barcode} → ${masterProduct.sku}`);
}

/**
 * Creates a TrendyolClient from a TrendyolStore record
 * Use this when you have a TrendyolStore from database
 */
export function createTrendyolClientFromStore(store: {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  isTestMode: boolean;
}): TrendyolClient {
  return new TrendyolClient({
    supplierId: store.supplierId,
    apiKey: store.apiKey,
    apiSecret: store.apiSecret,
    isTestMode: store.isTestMode,
  });
}

export async function getTrendyolStats(): Promise<{
  totalOrders: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  unmappedProducts: number;
  totalProducts: number;
  pendingOrders: number;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    unmappedProducts,
    totalProducts,
    pendingOrders,
    revenueToday,
    revenueWeek,
    revenueMonth,
  ] = await Promise.all([
    prisma.trendyolOrder.count(),
    prisma.trendyolOrder.count({ where: { orderDate: { gte: startOfDay } } }),
    prisma.trendyolOrder.count({ where: { orderDate: { gte: startOfWeek } } }),
    prisma.trendyolOrder.count({ where: { orderDate: { gte: startOfMonth } } }),
    prisma.trendyolOrderItem.count({ where: { isMapped: false } }),
    prisma.trendyolProduct.count(),
    prisma.trendyolOrder.count({ where: { status: { in: ["Created", "Picking"] } } }),
    prisma.trendyolOrder.aggregate({
      where: { orderDate: { gte: startOfDay } },
      _sum: { totalPrice: true },
    }),
    prisma.trendyolOrder.aggregate({
      where: { orderDate: { gte: startOfWeek } },
      _sum: { totalPrice: true },
    }),
    prisma.trendyolOrder.aggregate({
      where: { orderDate: { gte: startOfMonth } },
      _sum: { totalPrice: true },
    }),
  ]);

  return {
    totalOrders,
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    unmappedProducts,
    totalProducts,
    pendingOrders,
    revenue: {
      today: Number(revenueToday._sum.totalPrice || 0),
      week: Number(revenueWeek._sum.totalPrice || 0),
      month: Number(revenueMonth._sum.totalPrice || 0),
    },
  };
}
