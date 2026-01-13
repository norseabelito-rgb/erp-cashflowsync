import axios, { AxiosInstance } from "axios";
import prisma from "./db";

interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_shipping_price_set: {
    shop_money: {
      amount: string;
      currency_code: string;
    };
  };
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string | null;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    variant_title: string | null;
    sku: string | null;
    quantity: number;
    price: string;
  }>;
  note: string | null;
  tags: string;
  note_attributes: Array<{
    name: string;
    value: string;
  }>;
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  status: string;
  tags: string;
  variants: Array<{
    id: number;
    product_id: number;
    title: string;
    price: string;
    sku: string | null;
    barcode: string | null;
    compare_at_price: string | null;
    inventory_management: string | null;
    inventory_quantity: number;
    weight: number;
    weight_unit: string;
  }>;
  images: Array<{
    id: number;
    product_id: number;
    position: number;
    src: string;
    alt: string | null;
  }>;
}

export class ShopifyClient {
  private client: AxiosInstance;
  private storeId: string;
  private domain: string;

  constructor(domain: string, accessToken: string, storeId: string) {
    this.domain = domain;
    this.storeId = storeId;
    this.client = axios.create({
      baseURL: `https://${domain}/admin/api/2024-01`,
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Obține comenzile din Shopify
   */
  async getOrders(params?: {
    limit?: number;
    status?: string;
    created_at_min?: string;
    since_id?: string;
  }): Promise<ShopifyOrder[]> {
    const response = await this.client.get<ShopifyOrdersResponse>("/orders.json", {
      params: {
        limit: params?.limit || 50,
        status: params?.status || "any",
        created_at_min: params?.created_at_min,
        since_id: params?.since_id,
      },
    });
    return response.data.orders;
  }

  /**
   * Obține o comandă specifică
   */
  async getOrder(orderId: string): Promise<ShopifyOrder> {
    const response = await this.client.get<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`
    );
    return response.data.order;
  }

  /**
   * Adaugă o notă la comandă
   */
  async addOrderNote(orderId: string, note: string): Promise<void> {
    await this.client.put(`/orders/${orderId}.json`, {
      order: {
        id: orderId,
        note: note,
      },
    });
  }

  /**
   * Adaugă un comentariu la timeline-ul comenzii (note_attributes sau metafield)
   * Format: "[2026-01-13 14:30] user@email.com: Modificare telefon: 0722xxx → 0733xxx"
   */
  async addOrderTimelineNote(orderId: string, note: string): Promise<void> {
    // Obținem comanda curentă pentru a păstra nota existentă
    const order = await this.getOrder(orderId);
    const existingNote = order.note || "";

    // Adăugăm noua notă la începutul notei existente
    const newNote = existingNote
      ? `${note}\n\n---\n\n${existingNote}`
      : note;

    await this.client.put(`/orders/${orderId}.json`, {
      order: {
        id: orderId,
        note: newNote,
      },
    });
  }

  /**
   * Actualizează adresa de livrare și alte date ale comenzii
   */
  async updateOrderAddress(
    orderId: string,
    data: {
      shipping_address?: {
        first_name?: string;
        last_name?: string;
        address1?: string;
        address2?: string;
        city?: string;
        province?: string;
        zip?: string;
        phone?: string;
        country?: string;
      };
      email?: string;
      phone?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      id: orderId,
    };

    if (data.shipping_address) {
      updateData.shipping_address = data.shipping_address;
    }

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.phone) {
      updateData.phone = data.phone;
    }

    await this.client.put(`/orders/${orderId}.json`, {
      order: updateData,
    });
  }

  /**
   * Adaugă tag-uri la comandă
   */
  async addOrderTags(orderId: string, tags: string[]): Promise<void> {
    const order = await this.getOrder(orderId);
    const existingTags = order.tags ? order.tags.split(", ") : [];
    const newTags = [...new Set([...existingTags, ...tags])];
    
    await this.client.put(`/orders/${orderId}.json`, {
      order: {
        id: orderId,
        tags: newTags.join(", "),
      },
    });
  }

  /**
   * Marchează comanda ca având factură emisă (prin tag)
   */
  async markInvoiceIssued(orderId: string, invoiceNumber: string): Promise<void> {
    await this.addOrderTags(orderId, [
      "factura-emisa",
      `factura:${invoiceNumber}`,
    ]);
  }

  /**
   * Marchează comanda ca având AWB emis (prin tag)
   */
  async markAWBIssued(orderId: string, awbNumber: string): Promise<void> {
    await this.addOrderTags(orderId, [
      "awb-emis",
      `awb:${awbNumber}`,
    ]);
  }

  /**
   * Creează un fulfillment pentru comandă
   */
  async createFulfillment(
    orderId: string,
    trackingNumber: string,
    trackingCompany: string = "FanCourier"
  ): Promise<void> {
    // Mai întâi obținem location ID-ul
    const locationsResponse = await this.client.get("/locations.json");
    const locationId = locationsResponse.data.locations[0]?.id;

    if (!locationId) {
      throw new Error("Nu s-a găsit niciun location în Shopify");
    }

    // Creăm fulfillment
    await this.client.post(`/orders/${orderId}/fulfillments.json`, {
      fulfillment: {
        location_id: locationId,
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
        notify_customer: true,
      },
    });
  }

  // ==================== PRODUCT MANAGEMENT ====================

  /**
   * Creează un produs în Shopify
   * NOTĂ: Nu trimitem inventory - produsele sunt configurate să nu urmărească stocul
   */
  async createProduct(productData: {
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    tags?: string[];
    variants?: Array<{
      sku?: string;
      price: string;
      compare_at_price?: string;
      barcode?: string;
      weight?: number;
      weight_unit?: string;
      inventory_management?: null; // null = don't track inventory
    }>;
    images?: Array<{
      src: string;
      position?: number;
      alt?: string;
    }>;
  }): Promise<ShopifyProduct> {
    // Setăm inventory_management la null pentru a nu urmări stocul
    const variants = productData.variants?.map(v => ({
      ...v,
      inventory_management: null,
    })) || [{
      price: "0",
      inventory_management: null,
    }];

    const response = await this.client.post<{ product: ShopifyProduct }>("/products.json", {
      product: {
        ...productData,
        variants,
        status: "active",
      },
    });
    
    return response.data.product;
  }

  /**
   * Actualizează un produs în Shopify
   */
  async updateProduct(
    productId: string,
    productData: {
      title?: string;
      body_html?: string;
      vendor?: string;
      product_type?: string;
      tags?: string[];
      variants?: Array<{
        id?: number;
        sku?: string;
        price?: string;
        compare_at_price?: string;
        barcode?: string;
      }>;
      images?: Array<{
        id?: number;
        src?: string;
        position?: number;
        alt?: string;
      }>;
    }
  ): Promise<ShopifyProduct> {
    const response = await this.client.put<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      {
        product: productData,
      }
    );
    
    return response.data.product;
  }

  /**
   * Obține un produs din Shopify
   */
  async getProduct(productId: string): Promise<ShopifyProduct> {
    const response = await this.client.get<{ product: ShopifyProduct }>(
      `/products/${productId}.json`
    );
    return response.data.product;
  }

  /**
   * Șterge un produs din Shopify
   */
  async deleteProduct(productId: string): Promise<void> {
    await this.client.delete(`/products/${productId}.json`);
  }

  /**
   * Caută produse în Shopify după SKU
   */
  async findProductBySku(sku: string): Promise<ShopifyProduct | null> {
    const response = await this.client.get<{ products: ShopifyProduct[] }>(
      `/products.json`,
      {
        params: {
          fields: "id,title,variants",
          limit: 250,
        },
      }
    );

    // Căutăm în variante pentru SKU-ul nostru
    for (const product of response.data.products) {
      if (product.variants?.some(v => v.sku === sku)) {
        return product;
      }
    }
    return null;
  }

  /**
   * Adaugă imagini la un produs
   */
  async addProductImages(
    productId: string,
    images: Array<{ src: string; position?: number; alt?: string }>
  ): Promise<void> {
    for (const image of images) {
      await this.client.post(`/products/${productId}/images.json`, {
        image,
      });
    }
  }
}

/**
 * Creează un client Shopify pentru un magazin
 */
export async function createShopifyClient(storeId: string): Promise<ShopifyClient> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    throw new Error(`Magazinul cu ID ${storeId} nu a fost găsit`);
  }

  if (!store.isActive) {
    throw new Error(`Magazinul ${store.name} nu este activ`);
  }

  return new ShopifyClient(store.shopifyDomain, store.accessToken, store.id);
}

/**
 * Sincronizează comenzile din toate magazinele active
 */
export async function syncAllStoresOrders(): Promise<{
  synced: number;
  errors: string[];
}> {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
  });

  let totalSynced = 0;
  const errors: string[] = [];

  for (const store of stores) {
    try {
      const client = new ShopifyClient(
        store.shopifyDomain,
        store.accessToken,
        store.id
      );

      // Obținem ultima comandă sincronizată pentru acest magazin
      const lastOrder = await prisma.order.findFirst({
        where: { storeId: store.id },
        orderBy: { shopifyCreatedAt: "desc" },
      });

      const orders = await client.getOrders({
        limit: 250,
        created_at_min: lastOrder
          ? new Date(lastOrder.shopifyCreatedAt.getTime() - 60000).toISOString()
          : undefined,
      });

      for (const shopifyOrder of orders) {
        try {
          await syncSingleOrder(shopifyOrder, store.id);
          totalSynced++;
        } catch (error) {
          errors.push(
            `Eroare la sincronizarea comenzii ${shopifyOrder.name} din ${store.name}: ${error}`
          );
        }
      }
    } catch (error) {
      errors.push(`Eroare la sincronizarea magazinului ${store.name}: ${error}`);
    }
  }

  return { synced: totalSynced, errors };
}

/**
 * Sincronizează o singură comandă din Shopify
 */
export async function syncSingleOrder(
  shopifyOrder: ShopifyOrder,
  storeId: string
): Promise<void> {
  const { validateOrder } = await import("./validators");

  const customerPhone =
    shopifyOrder.shipping_address?.phone ||
    shopifyOrder.customer?.phone ||
    shopifyOrder.phone;

  // Validăm comanda
  const validation = validateOrder({
    customerPhone,
    shippingAddress1: shopifyOrder.shipping_address?.address1,
    shippingAddress2: shopifyOrder.shipping_address?.address2,
    shippingCity: shopifyOrder.shipping_address?.city,
    shippingProvince: shopifyOrder.shipping_address?.province,
    shippingCountry: shopifyOrder.shipping_address?.country,
    shippingZip: shopifyOrder.shipping_address?.zip,
  });

  // Determinăm statusul
  let status: "PENDING" | "VALIDATED" | "VALIDATION_FAILED" = "PENDING";
  if (validation.isFullyValid) {
    status = "VALIDATED";
  } else if (!validation.phone.isValid || !validation.address.isValid) {
    status = "VALIDATION_FAILED";
  }

  // Pregătim LineItems cu date îmbogățite din MasterProduct
  const lineItemsData = await Promise.all(
    shopifyOrder.line_items.map(async (item) => {
      // Căutăm MasterProduct după SKU pentru a prelua barcode, location, etc.
      let masterProduct = null;
      const effectiveSku = item.sku || `SHOPIFY-${item.id}`;
      
      if (item.sku) {
        masterProduct = await prisma.masterProduct.findUnique({
          where: { sku: item.sku },
          select: {
            id: true,
            barcode: true,
            warehouseLocation: true,
            weight: true,
            images: {
              where: { position: 0 },
              select: { url: true },
              take: 1,
            },
          },
        });
      }

      return {
        shopifyLineItemId: String(item.id),
        title: item.title,
        variantTitle: item.variant_title,
        sku: effectiveSku,
        quantity: item.quantity,
        price: parseFloat(item.price),
        // Date îmbogățite din MasterProduct (dacă există)
        barcode: masterProduct?.barcode || null,
        location: masterProduct?.warehouseLocation || null,
        weight: masterProduct?.weight || null,
        imageUrl: masterProduct?.images?.[0]?.url || null,
        masterProductId: masterProduct?.id || null,
      };
    })
  );

  // Verificăm dacă comanda există deja
  const existingOrder = await prisma.order.findUnique({
    where: {
      shopifyOrderId_storeId: {
        shopifyOrderId: String(shopifyOrder.id),
        storeId,
      },
    },
    select: { id: true },
  });

  if (existingOrder) {
    // UPDATE: Actualizăm comanda și ștergem/recreăm LineItems
    await prisma.$transaction(async (tx) => {
      // Ștergem LineItems existente
      await tx.lineItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      // Actualizăm comanda
      await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          customerEmail: shopifyOrder.email || shopifyOrder.customer?.email,
          customerPhone,
          customerFirstName:
            shopifyOrder.shipping_address?.first_name ||
            shopifyOrder.customer?.first_name,
          customerLastName:
            shopifyOrder.shipping_address?.last_name ||
            shopifyOrder.customer?.last_name,
          shippingAddress1: shopifyOrder.shipping_address?.address1,
          shippingAddress2: shopifyOrder.shipping_address?.address2,
          shippingCity: shopifyOrder.shipping_address?.city,
          shippingProvince: shopifyOrder.shipping_address?.province,
          shippingCountry: shopifyOrder.shipping_address?.country,
          shippingZip: shopifyOrder.shipping_address?.zip,
          totalPrice: parseFloat(shopifyOrder.total_price),
          subtotalPrice: parseFloat(shopifyOrder.subtotal_price),
          totalShipping: parseFloat(
            shopifyOrder.total_shipping_price_set?.shop_money?.amount || "0"
          ),
          totalTax: parseFloat(shopifyOrder.total_tax),
          currency: shopifyOrder.currency,
          financialStatus: shopifyOrder.financial_status,
          fulfillmentStatus: shopifyOrder.fulfillment_status,
          phoneValidation: validation.phone.isValid ? "PASSED" : "FAILED",
          phoneValidationMsg: validation.phone.message,
          addressValidation: validation.address.isValid ? "PASSED" : "FAILED",
          addressValidationMsg: validation.address.message,
          shopifyUpdatedAt: new Date(shopifyOrder.updated_at),
          rawData: shopifyOrder as any,
        },
      });

      // Recreăm LineItems cu date îmbogățite
      await tx.lineItem.createMany({
        data: lineItemsData.map((item) => ({
          ...item,
          orderId: existingOrder.id,
        })),
      });
    });
  } else {
    // CREATE: Creăm comanda nouă cu LineItems
    await prisma.order.create({
      data: {
        shopifyOrderId: String(shopifyOrder.id),
        shopifyOrderNumber: shopifyOrder.name,
        storeId,
        customerEmail: shopifyOrder.email || shopifyOrder.customer?.email,
        customerPhone,
        customerFirstName:
          shopifyOrder.shipping_address?.first_name ||
          shopifyOrder.customer?.first_name,
        customerLastName:
          shopifyOrder.shipping_address?.last_name ||
          shopifyOrder.customer?.last_name,
        shippingAddress1: shopifyOrder.shipping_address?.address1,
        shippingAddress2: shopifyOrder.shipping_address?.address2,
        shippingCity: shopifyOrder.shipping_address?.city,
        shippingProvince: shopifyOrder.shipping_address?.province,
        shippingCountry: shopifyOrder.shipping_address?.country,
        shippingZip: shopifyOrder.shipping_address?.zip,
        totalPrice: parseFloat(shopifyOrder.total_price),
        subtotalPrice: parseFloat(shopifyOrder.subtotal_price),
        totalShipping: parseFloat(
          shopifyOrder.total_shipping_price_set?.shop_money?.amount || "0"
        ),
        totalTax: parseFloat(shopifyOrder.total_tax),
        currency: shopifyOrder.currency,
        status,
        financialStatus: shopifyOrder.financial_status,
        fulfillmentStatus: shopifyOrder.fulfillment_status,
        phoneValidation: validation.phone.isValid ? "PASSED" : "FAILED",
        phoneValidationMsg: validation.phone.message,
        addressValidation: validation.address.isValid ? "PASSED" : "FAILED",
        addressValidationMsg: validation.address.message,
        shopifyCreatedAt: new Date(shopifyOrder.created_at),
        shopifyUpdatedAt: new Date(shopifyOrder.updated_at),
        rawData: shopifyOrder as any,
        lineItems: {
          create: lineItemsData,
        },
      },
    });
  }
}
