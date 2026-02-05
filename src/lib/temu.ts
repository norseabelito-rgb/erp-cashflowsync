/**
 * Temu Partner API Client Library
 *
 * Endpoints:
 * - EU: https://openapi-b-eu.temu.com/openapi/router
 * - US: https://openapi-b-us.temu.com/openapi/router
 * - Global (Mexico/Japan): https://openapi-b-global.temu.com/openapi/router
 *
 * Authentication: OAuth + MD5 signature
 * - access_token: 3-month expiry, requires re-authorization
 * - Signature: MD5 hash of sorted params wrapped with appSecret
 */

import * as crypto from "crypto";

// ============ TYPES ============

export interface TemuConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  baseUrl?: string; // Defaults to EU endpoint
}

export interface TemuApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  errorMsg?: string;
}

export interface TemuOrderData {
  orderId: string;
  orderNumber: string;
  orderDate: number; // Unix timestamp in milliseconds
  status: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    country: string;
    postalCode: string;
  };
  totalPrice: number;
  currency: string;
  lines: TemuOrderLine[];
}

export interface TemuOrderLine {
  goodsId: string;
  skuId: string;
  title: string;
  quantity: number;
  price: number;
  variantInfo?: {
    color?: string;
    size?: string;
  };
}

export interface TemuProductData {
  goodsId: string;
  skuId: string;
  title: string;
  price: number;
  stock: number;
  status: string;
  images?: string[];
}

// ============ ENDPOINT MAPPING ============

const TEMU_ENDPOINTS: Record<string, string> = {
  EU: "https://openapi-b-eu.temu.com/openapi/router",
  US: "https://openapi-b-us.temu.com/openapi/router",
  GLOBAL: "https://openapi-b-global.temu.com/openapi/router",
};

// ============ CLIENT ============

export class TemuClient {
  private config: TemuConfig;
  private baseUrl: string;

  constructor(config: TemuConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || TEMU_ENDPOINTS.EU;
  }

  /**
   * Generate MD5 signature for Temu API
   * Process:
   * 1. Sort params alphabetically by key
   * 2. Concatenate key+value pairs (no separators)
   * 3. Wrap with appSecret: ${appSecret}${paramString}${appSecret}
   * 4. MD5 hash and UPPERCASE
   */
  private generateSignature(params: Record<string, string>): string {
    // 1. Sort keys alphabetically and concatenate key+value pairs
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map((key) => `${key}${params[key]}`).join("");

    // 2. Wrap with appSecret on both sides
    const preSign = `${this.config.appSecret}${paramString}${this.config.appSecret}`;

    // 3. MD5 hash and uppercase
    return crypto.createHash("md5").update(preSign).digest("hex").toUpperCase();
  }

  /**
   * Make a signed request to Temu API
   * @param methodType - Temu API method (e.g., "bg.order.list.get")
   * @param data - Request data object
   */
  async request<T>(
    methodType: string,
    data: Record<string, unknown> = {}
  ): Promise<TemuApiResponse<T>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Base parameters required for all requests
    const params: Record<string, string> = {
      type: methodType,
      app_key: this.config.appKey,
      access_token: this.config.accessToken,
      timestamp,
      data_type: "JSON",
      data: JSON.stringify(data),
    };

    // Generate signature and add to params
    params.sign = this.generateSignature(params);

    console.log(`[Temu] Request to: ${this.baseUrl}`);
    console.log(`[Temu] Method: ${methodType}`);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ERP-CashflowSync/1.0",
        },
        body: new URLSearchParams(params).toString(),
      });

      console.log(`[Temu] Response status: ${response.status}`);

      const text = await response.text();
      console.log(`[Temu] Response body (first 500 chars): ${text.substring(0, 500)}`);

      let result;
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        return {
          success: false,
          error: `Failed to parse response: ${text.substring(0, 200)}`,
        };
      }

      return this.parseResponse<T>(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      console.error("[Temu] Fetch error:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse Temu API response into standardized format
   */
  private parseResponse<T>(result: Record<string, unknown>): TemuApiResponse<T> {
    // Temu API typically returns: { success: true/false, error_code, error_msg, result }
    // or { code: 0, msg: "success", data: {...} }
    if (!result) {
      return {
        success: false,
        error: "Empty response from API",
      };
    }

    // Check for error indicators
    const errorCode =
      result.error_code?.toString() || result.code?.toString() || result.errorCode?.toString();
    const errorMsg =
      (result.error_msg as string) ||
      (result.msg as string) ||
      (result.errorMsg as string) ||
      (result.message as string);

    // Success check - code 0 or success true or no error code
    const isSuccess =
      result.success === true ||
      errorCode === "0" ||
      errorCode === undefined ||
      (result.code === 0 && !result.error_msg);

    if (!isSuccess || (errorCode && errorCode !== "0")) {
      return {
        success: false,
        error: errorMsg || `API error code: ${errorCode}`,
        errorCode: errorCode,
        errorMsg: errorMsg,
      };
    }

    // Extract data from various response formats
    const data = (result.result || result.data || result.response || result) as T;

    return {
      success: true,
      data,
    };
  }

  // ============ ORDER METHODS ============

  /**
   * Get list of orders from Temu
   */
  async getOrders(options: {
    pageNumber?: number;
    pageSize?: number;
    startTime?: number; // Unix timestamp in milliseconds
    endTime?: number;
    status?: string;
  } = {}): Promise<TemuApiResponse<{ orders: TemuOrderData[]; totalCount: number }>> {
    return this.request<{ orders: TemuOrderData[]; totalCount: number }>("bg.order.list.get", {
      page_number: options.pageNumber || 1,
      page_size: options.pageSize || 50,
      ...(options.startTime && { start_time: options.startTime }),
      ...(options.endTime && { end_time: options.endTime }),
      ...(options.status && { status: options.status }),
    });
  }

  /**
   * Get detailed information for a specific order
   */
  async getOrderDetail(orderId: string): Promise<TemuApiResponse<TemuOrderData>> {
    return this.request<TemuOrderData>("bg.order.detail.get", {
      order_id: orderId,
    });
  }

  /**
   * Update tracking information for an order
   */
  async updateTracking(
    orderId: string,
    trackingNumber: string,
    carrierCode: string
  ): Promise<TemuApiResponse<void>> {
    return this.request<void>("bg.shipment.tracking.update", {
      order_id: orderId,
      tracking_number: trackingNumber,
      carrier_code: carrierCode,
    });
  }

  // ============ PRODUCT METHODS ============

  /**
   * Get list of products from Temu
   */
  async getProducts(options: {
    pageNumber?: number;
    pageSize?: number;
    status?: string;
  } = {}): Promise<TemuApiResponse<{ products: TemuProductData[]; totalCount: number }>> {
    return this.request<{ products: TemuProductData[]; totalCount: number }>(
      "bg.local.goods.sku.list.query",
      {
        page_number: options.pageNumber || 1,
        page_size: options.pageSize || 50,
        ...(options.status && { status: options.status }),
      }
    );
  }

  /**
   * Update product stock quantity
   */
  async updateStock(
    items: Array<{ skuId: string; quantity: number }>
  ): Promise<TemuApiResponse<void>> {
    return this.request<void>("bg.local.goods.sku.stock.update", {
      sku_stock_list: items.map((item) => ({
        sku_id: item.skuId,
        stock_num: item.quantity,
      })),
    });
  }

  /**
   * Update product price
   */
  async updatePrice(
    items: Array<{ skuId: string; price: number }>
  ): Promise<TemuApiResponse<void>> {
    return this.request<void>("bg.local.goods.sku.price.update", {
      sku_price_list: items.map((item) => ({
        sku_id: item.skuId,
        sale_price: item.price,
      })),
    });
  }

  // ============ TEST CONNECTION ============

  /**
   * Test the API connection by fetching a minimal data set
   */
  async testConnection(): Promise<
    TemuApiResponse<{ connected: boolean; timestamp: string; region?: string }>
  > {
    try {
      // Try to fetch one order as a connection test
      const result = await this.getOrders({ pageNumber: 1, pageSize: 1 });

      if (result.success) {
        return {
          success: true,
          data: {
            connected: true,
            timestamp: new Date().toISOString(),
            region: this.getRegionFromBaseUrl(),
          },
        };
      }

      return {
        success: false,
        error: result.error || "Connection test failed",
        errorCode: result.errorCode,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Extract region from base URL for informational purposes
   */
  private getRegionFromBaseUrl(): string {
    if (this.baseUrl.includes("-eu.")) return "EU";
    if (this.baseUrl.includes("-us.")) return "US";
    if (this.baseUrl.includes("-global.")) return "GLOBAL";
    return "UNKNOWN";
  }
}

// ============ FACTORY FUNCTION ============

/**
 * Create a TemuClient from a TemuStore database record
 * Maps region to the appropriate endpoint URL
 */
export function createTemuClientFromStore(store: {
  appKey: string;
  appSecret: string;
  accessToken: string;
  region: string;
}): TemuClient {
  const baseUrl = TEMU_ENDPOINTS[store.region] || TEMU_ENDPOINTS.EU;

  return new TemuClient({
    appKey: store.appKey,
    appSecret: store.appSecret,
    accessToken: store.accessToken,
    baseUrl,
  });
}

// ============ CARRIER CODE MAPPING ============

/**
 * Map local carrier names to Temu carrier codes
 * Extend as needed based on Temu's supported carriers
 */
export function mapCarrierToTemuCode(carrier: string): string {
  const carrierMap: Record<string, string> = {
    fancourier: "FANCOURIER",
    sameday: "SAMEDAY",
    dhl: "DHL",
    ups: "UPS",
    fedex: "FEDEX",
    dpd: "DPD",
    gls: "GLS",
  };

  return carrierMap[carrier.toLowerCase()] || carrier.toUpperCase();
}
