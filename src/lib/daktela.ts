import prisma from "@/lib/db";

const DAKTELA_BASE_URL = "https://cashflowgroup.daktela.com/api/v6/contacts.json";

interface DaktelaContactData {
  title: string;
  email?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressProvince?: string;
  addressZip?: string;
  addressCountry?: string;
  orderCount: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  customerSource: string;
  orderHistory: string;
  customerNotes?: string;
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export async function buildDaktelaContactFromOrder(
  orderId: string
): Promise<DaktelaContactData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      customerEmail: true,
      customerPhone: true,
      customerFirstName: true,
      customerLastName: true,
      shippingAddress1: true,
      shippingAddress2: true,
      shippingCity: true,
      shippingProvince: true,
      shippingZip: true,
      shippingCountry: true,
      source: true,
    },
  });

  if (!order) return null;

  const email = order.customerEmail?.toLowerCase() || undefined;
  const phone = order.customerPhone || undefined;

  // Aggregate customer data across all their orders (by email or phone)
  const whereConditions: any[] = [];
  if (email) whereConditions.push({ customerEmail: { equals: email, mode: "insensitive" } });
  if (phone) whereConditions.push({ customerPhone: phone });

  if (whereConditions.length === 0) return null;

  const aggregation = await prisma.order.aggregate({
    where: { OR: whereConditions },
    _count: true,
    _sum: { totalPrice: true },
    _min: { shopifyCreatedAt: true },
    _max: { shopifyCreatedAt: true },
  });

  // Get last 5 order numbers
  const recentOrders = await prisma.order.findMany({
    where: { OR: whereConditions },
    select: { shopifyOrderNumber: true },
    orderBy: { shopifyCreatedAt: "desc" },
    take: 5,
  });

  // Get customer notes
  let customerNotes: string | undefined;
  if (email) {
    const noteRecord = await prisma.customerNote.findUnique({
      where: { email },
    });
    if (noteRecord?.note) {
      customerNotes = noteRecord.note;
    }
  }

  const title = [order.customerFirstName, order.customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Necunoscut";

  const addressParts = [order.shippingAddress1, order.shippingAddress2].filter(Boolean);

  return {
    title,
    email,
    phone,
    addressStreet: addressParts.join(", ") || undefined,
    addressCity: order.shippingCity || undefined,
    addressProvince: order.shippingProvince || undefined,
    addressZip: order.shippingZip || undefined,
    addressCountry: order.shippingCountry || undefined,
    orderCount: aggregation._count,
    totalSpent: Number(aggregation._sum.totalPrice || 0),
    firstOrderDate: aggregation._min.shopifyCreatedAt
      ? formatDate(aggregation._min.shopifyCreatedAt)
      : "",
    lastOrderDate: aggregation._max.shopifyCreatedAt
      ? formatDate(aggregation._max.shopifyCreatedAt)
      : "",
    customerSource: order.source || "shopify",
    orderHistory: recentOrders.map((o) => o.shopifyOrderNumber).join(", "),
    customerNotes,
  };
}

export async function syncContactToDaktela(
  data: DaktelaContactData | null
): Promise<void> {
  if (!data) return;

  const accessToken = process.env.DAKTELA_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[Daktela] DAKTELA_ACCESS_TOKEN nu este setat, skip sync");
    return;
  }

  const url = `${DAKTELA_BASE_URL}?accessToken=${encodeURIComponent(accessToken)}`;

  const body = {
    database: "default",
    title: data.title,
    customFields: {
      email: data.email || "",
      phone: data.phone || "",
      address_street: data.addressStreet || "",
      address_city: data.addressCity || "",
      address_province: data.addressProvince || "",
      address_zip: data.addressZip || "",
      address_country: data.addressCountry || "",
      order_count: String(data.orderCount),
      total_spent: String(data.totalSpent),
      first_order_date: data.firstOrderDate || "",
      last_order_date: data.lastOrderDate || "",
      customer_source: data.customerSource,
      order_history: data.orderHistory || "",
      customer_notes: data.customerNotes || "",
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error(
        `[Daktela] Eroare HTTP ${response.status} pentru ${data.title}: ${responseBody}`
      );
      return;
    }

    console.log(`[Daktela] Contact creat: ${data.title} (${data.email || data.phone})`);
  } catch (error) {
    console.error(`[Daktela] Eroare la sincronizarea contactului ${data.title}:`, error);
  }
}
