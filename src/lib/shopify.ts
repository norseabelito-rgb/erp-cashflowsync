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

// Input for creating draft orders (manual orders)
export interface CreateDraftOrderInput {
  lineItems: Array<{
    sku: string;         // SKU for reference (included in Shopify line item but not for inventory)
    title: string;       // Product title displayed on order
    quantity: number;
    price: string;       // Price as string (Shopify format, e.g., "99.00")
  }>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
  note?: string;
  tags?: string[];
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
   * Caută produse în Shopify după SKU (cu paginare completă)
   * Folosește GraphQL pentru căutare eficientă
   */
  async findProductBySku(sku: string): Promise<ShopifyProduct | null> {
    // Folosim GraphQL pentru căutare eficientă după SKU
    const query = `
      {
        products(first: 10, query: "sku:${sku.replace(/"/g, '\\"')}") {
          edges {
            node {
              id
              title
              legacyResourceId
              variants(first: 10) {
                edges {
                  node {
                    id
                    sku
                    legacyResourceId
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.post<{
        data: {
          products: {
            edges: Array<{
              node: {
                id: string;
                title: string;
                legacyResourceId: string;
                variants: {
                  edges: Array<{
                    node: {
                      id: string;
                      sku: string | null;
                      legacyResourceId: string;
                    };
                  }>;
                };
              };
            }>;
          };
        };
      }>("/graphql.json", { query });

      const products = response.data?.data?.products?.edges || [];

      // Verificăm dacă SKU-ul se potrivește exact (GraphQL face fuzzy match)
      for (const { node: product } of products) {
        const matchingVariant = product.variants?.edges?.find(
          ({ node: v }) => v.sku === sku
        );
        if (matchingVariant) {
          // Returnăm în formatul REST API pentru compatibilitate
          return {
            id: parseInt(product.legacyResourceId),
            title: product.title,
            body_html: null,
            vendor: null,
            product_type: null,
            created_at: "",
            updated_at: "",
            published_at: null,
            status: "active",
            tags: "",
            variants: product.variants.edges.map(({ node: v }) => ({
              id: parseInt(v.legacyResourceId),
              product_id: parseInt(product.legacyResourceId),
              title: "",
              price: "0",
              sku: v.sku,
              barcode: null,
              compare_at_price: null,
              inventory_management: null,
              inventory_quantity: 0,
              weight: 0,
              weight_unit: "kg",
            })),
            images: [],
          };
        }
      }

      return null;
    } catch (error) {
      // Fallback la REST API cu paginare dacă GraphQL eșuează
      console.warn("GraphQL search failed, falling back to REST API pagination:", error);
      return this.findProductBySkuREST(sku);
    }
  }

  /**
   * Fallback: Caută produse în Shopify după SKU folosind REST API cu paginare
   */
  private async findProductBySkuREST(sku: string): Promise<ShopifyProduct | null> {
    let pageUrl = `/products.json?fields=id,title,variants&limit=250`;

    while (pageUrl) {
      const response = await this.client.get<{ products: ShopifyProduct[] }>(pageUrl);

      // Căutăm în variante pentru SKU-ul nostru
      for (const product of response.data.products) {
        if (product.variants?.some(v => v.sku === sku)) {
          return product;
        }
      }

      // Verificăm dacă există pagina următoare în Link header
      const linkHeader = response.headers?.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          // Extragem doar path-ul din URL-ul complet
          const nextUrl = new URL(nextMatch[1]);
          pageUrl = nextUrl.pathname + nextUrl.search;
        } else {
          pageUrl = "";
        }
      } else {
        pageUrl = "";
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

  // ==================== DRAFT ORDER MANAGEMENT ====================

  /**
   * Creează un draft order în Shopify pentru comenzi manuale
   *
   * NOTĂ: Folosește custom line items (title + price) în loc de variant_id lookup.
   * - Custom line items NU se leagă de inventarul Shopify
   * - Acceptabil pentru comenzi manuale (telefon/offline) unde stocul se gestionează separat
   * - Evită complexitatea rezoluției SKU -> variant_id (ar necesita query-uri API produse)
   * - Comanda apare în Shopify admin cu totaluri corecte pentru raportare
   */
  async createDraftOrder(input: CreateDraftOrderInput): Promise<{
    id: number;
    name: string;
    invoiceUrl: string;
    lineItems: Array<{ id: number; title: string; quantity: number; price: string }>;
  }> {
    // Use custom line items with title/price (no variant_id lookup)
    const lineItems = input.lineItems.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      sku: item.sku, // Include SKU for reference but not for inventory linkage
    }));

    const response = await this.client.post<{ draft_order: any }>("/draft_orders.json", {
      draft_order: {
        line_items: lineItems,
        customer: {
          first_name: input.customer.firstName,
          last_name: input.customer.lastName,
          email: input.customer.email,
          phone: input.customer.phone,
        },
        shipping_address: {
          first_name: input.shippingAddress.firstName,
          last_name: input.shippingAddress.lastName,
          address1: input.shippingAddress.address1,
          address2: input.shippingAddress.address2 || "",
          city: input.shippingAddress.city,
          province: input.shippingAddress.province,
          country: input.shippingAddress.country || "Romania",
          zip: input.shippingAddress.zip,
          phone: input.shippingAddress.phone,
        },
        note: input.note,
        tags: input.tags?.join(", ") || "manual-erp",
      },
    });

    return {
      id: response.data.draft_order.id,
      name: response.data.draft_order.name,
      invoiceUrl: response.data.draft_order.invoice_url,
      lineItems: response.data.draft_order.line_items.map((li: any) => ({
        id: li.id,
        title: li.title,
        quantity: li.quantity,
        price: li.price,
      })),
    };
  }

  /**
   * Obține detaliile unui draft order pentru a verifica statusul
   */
  async getDraftOrder(draftOrderId: number): Promise<{
    id: number;
    status: string;
    shippingLine: { title: string; price: string } | null;
    totalPrice: string;
  }> {
    const response = await this.client.get<{ draft_order: any }>(
      `/draft_orders/${draftOrderId}.json`
    );

    const draft = response.data.draft_order;
    return {
      id: draft.id,
      status: draft.status,
      shippingLine: draft.shipping_line
        ? { title: draft.shipping_line.title, price: draft.shipping_line.price }
        : null,
      totalPrice: draft.total_price,
    };
  }

  /**
   * Așteaptă ca un draft order să termine calculul (polling)
   * Shopify calculează asincron taxe și shipping - trebuie să așteptăm
   */
  async waitForDraftOrderReady(draftOrderId: number, maxAttempts: number = 5): Promise<boolean> {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const draft = await this.getDraftOrder(draftOrderId);
        console.log(`[Shopify] Draft order ${draftOrderId} status: ${draft.status} (attempt ${attempt})`);

        // "open" means ready, "invoice_sent" also OK
        if (draft.status === "open" || draft.status === "invoice_sent") {
          return true;
        }

        // Wait before next attempt (exponential backoff: 1s, 2s, 3s, 4s, 5s)
        if (attempt < maxAttempts) {
          await delay(attempt * 1000);
        }
      } catch (error) {
        console.warn(`[Shopify] Error checking draft order status (attempt ${attempt}):`, error);
        if (attempt < maxAttempts) {
          await delay(attempt * 1000);
        }
      }
    }

    return false;
  }

  /**
   * Completează un draft order (îl convertește în comandă reală)
   * Include retry logic pentru cazul când Shopify încă calculează
   */
  async completeDraftOrder(draftOrderId: number, paymentPending: boolean = true): Promise<{
    id: number;
    order_number: number;
    name: string;
    totalPrice: string;
  }> {
    const maxRetries = 3;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.put<{ draft_order: any }>(
          `/draft_orders/${draftOrderId}/complete.json?payment_pending=${paymentPending}`,
          {} // Body gol - parametrul e în query string
        );

        const order = response.data.draft_order.order;
        return {
          id: order.id,
          order_number: order.order_number,
          name: order.name,
          totalPrice: order.total_price,
        };
      } catch (error: any) {
        const errorMessage = error.response?.data?.errors || error.response?.data?.error || "";
        const isCalculating =
          typeof errorMessage === "string" && errorMessage.includes("not finished calculating");

        if (isCalculating && attempt < maxRetries) {
          console.log(
            `[Shopify] Draft order still calculating, waiting... (attempt ${attempt}/${maxRetries})`
          );
          await delay(attempt * 2000); // 2s, 4s before retry
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to complete draft order after retries");
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

  // OPTIMIZATION: Batch load all MasterProducts by SKU to avoid N+1 queries
  const skus = shopifyOrder.line_items
    .filter((item) => item.sku)
    .map((item) => item.sku as string);

  const masterProducts = skus.length > 0
    ? await prisma.masterProduct.findMany({
        where: { sku: { in: skus } },
        select: {
          id: true,
          sku: true,
          barcode: true,
          warehouseLocation: true,
          weight: true,
          images: {
            where: { position: 0 },
            select: { url: true },
            take: 1,
          },
        },
      })
    : [];

  // Create a lookup map for fast access
  const masterProductBySku = new Map(masterProducts.map((mp) => [mp.sku, mp]));

  // Pregătim LineItems cu date îmbogățite din MasterProduct (no additional queries)
  const lineItemsData = shopifyOrder.line_items.map((item) => {
    const effectiveSku = item.sku || `SHOPIFY-${item.id}`;
    const masterProduct = item.sku ? masterProductBySku.get(item.sku) : null;

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
  });

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

  // După sync, încercăm să completăm codul poștal din nomenclatorul FanCourier
  // doar pentru comenzi din România care nu au cod poștal valid
  const shippingZip = shopifyOrder.shipping_address?.zip;
  const shippingCountry = shopifyOrder.shipping_address?.country?.toLowerCase();
  const isRomania = shippingCountry && ["romania", "ro", "rou"].some(c => shippingCountry.includes(c));
  const hasValidZip = shippingZip && /^\d{6}$/.test(shippingZip);

  if (isRomania && !hasValidZip && shopifyOrder.shipping_address?.province && shopifyOrder.shipping_address?.city) {
    try {
      const { lookupAndUpdatePostalCode } = await import("./fancourier");

      // Găsim comanda în DB pentru a obține ID-ul
      const order = await prisma.order.findUnique({
        where: {
          shopifyOrderId_storeId: {
            shopifyOrderId: String(shopifyOrder.id),
            storeId,
          },
        },
        select: { id: true },
      });

      if (order) {
        await lookupAndUpdatePostalCode(order.id);
      }
    } catch (error) {
      // Eroarea la lookup postal code nu trebuie să oprească sync-ul
      console.warn(`Nu s-a putut completa codul poștal pentru comanda ${shopifyOrder.name}:`, error);
    }
  }
}
