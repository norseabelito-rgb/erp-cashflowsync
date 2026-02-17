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

  const params = new URLSearchParams();
  params.set("accessToken", accessToken);
  params.set("database", "default");
  params.set("title", data.title);
  if (data.email) params.set("customFields[email]", data.email);
  if (data.phone) params.set("customFields[phone]", data.phone);
  if (data.addressStreet) params.set("customFields[address_street]", data.addressStreet);
  if (data.addressCity) params.set("customFields[address_city]", data.addressCity);
  if (data.addressProvince) params.set("customFields[address_province]", data.addressProvince);
  if (data.addressZip) params.set("customFields[address_zip]", data.addressZip);
  if (data.addressCountry) params.set("customFields[address_country]", data.addressCountry);
  params.set("customFields[order_count]", String(data.orderCount));
  params.set("customFields[total_spent]", String(data.totalSpent));
  if (data.firstOrderDate) params.set("customFields[first_order_date]", data.firstOrderDate);
  if (data.lastOrderDate) params.set("customFields[last_order_date]", data.lastOrderDate);
  params.set("customFields[customer_source]", data.customerSource);
  if (data.orderHistory) params.set("customFields[order_history]", data.orderHistory);
  if (data.customerNotes) params.set("customFields[customer_notes]", data.customerNotes);

  const url = `${DAKTELA_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[Daktela] Eroare HTTP ${response.status} pentru ${data.title}: ${body}`
      );
      return;
    }

    console.log(`[Daktela] Contact sincronizat: ${data.title} (${data.email || data.phone})`);
  } catch (error) {
    console.error(`[Daktela] Eroare la sincronizarea contactului ${data.title}:`, error);
  }
}
