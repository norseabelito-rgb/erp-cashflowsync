import prisma from "./db";

// ==========================================
// DAKTELA SMS SERVICE
// ==========================================

const DAKTELA_BASE_URL = "https://cashflowgroup.daktela.com/api/v6";
const DAKTELA_ACCESS_TOKEN = "5b2024598f4f573d8162fa2cedd2ea7b78aef84f";
const SMS_QUEUE = "9001";

// TEST MODE - set to true to redirect ALL SMS to TEST_PHONE
const TEST_MODE = false;
const TEST_PHONE = "+40773716325";

const TRACKING_URL = "https://www.fancourier.ro/awb-tracking/?tracking=";

// SMS Templates - CARD (paid online)
const SMS_CARD = {
  ORDER_CREATED:
    "Buna ziua, {client_name}! Comanda dvs. #{order_id} a fost inregistrata si plata a fost confirmata. Veti primi un SMS cand coletul pleaca spre dvs. Va multumim! - {store_name}",
  AWB_CREATED:
    "{client_name}, comanda #{order_id} a fost predata curierului! Livrarea se face in 1-2 zile lucratoare. Urmarire colet: {tracking_link} - {store_name}",
  HANDED_TO_COURIER:
    "{client_name}, coletul dvs. #{order_id} se afla la curier si va fi livrat cat de curand! Va rugam sa raspundeti la telefon cand va suna curierul. Urmarire: {tracking_link} - {store_name}",
  DELIVERED:
    "{client_name}, comanda #{order_id} a fost livrata cu succes! Factura dvs.: {invoice_link} - Va multumim! - {store_name}",
};

// SMS Templates - RAMBURS (cash on delivery)
const SMS_RAMBURS = {
  ORDER_CREATED:
    "Buna ziua, {client_name}! Comanda dvs. #{order_id} a fost inregistrata. Valoare: {total} lei (plata la livrare). Veti primi un SMS cand coletul pleaca spre dvs. Va multumim! - {store_name}",
  AWB_CREATED:
    "{client_name}, comanda #{order_id} a fost predata curierului! Livrarea se face in 1-2 zile lucratoare. Pregatiti suma de {total} lei (numerar exact). Urmarire colet: {tracking_link} - {store_name}",
  HANDED_TO_COURIER:
    "{client_name}, coletul dvs. #{order_id} se afla la curier si va fi livrat cat de curand! Suma de plata: {total} lei. Va rugam sa aveti suma exacta pregatita si sa raspundeti la telefon cand va suna curierul. Urmarire: {tracking_link} - {store_name}",
  DELIVERED:
    "{client_name}, comanda #{order_id} a fost livrata cu succes! Factura dvs.: {invoice_link} - Va multumim! - {store_name}",
};

/**
 * Check if order was paid by card (vs ramburs/cash on delivery)
 */
function isPaidByCard(financialStatus: string | null): boolean {
  return financialStatus === "paid";
}

/**
 * Normalize phone to international format: +40xxxxxxxxx
 * Handles: 07xx, 40xx, 004xxx, +40xx, with spaces/dashes/parens
 */
function normalizePhone(phone: string): string | null {
  // Remove spaces, dashes, dots, parentheses
  let clean = phone.replace(/[\s\-\.\(\)]/g, "");

  // 0040... -> +40...
  if (clean.startsWith("0040")) {
    clean = "+" + clean.slice(2);
  }
  // 07xxxxxxxx (10 digits, local Romanian)
  else if (clean.startsWith("0") && clean.length === 10) {
    clean = "+40" + clean.slice(1);
  }
  // 40xxxxxxxxx (without +)
  else if (clean.startsWith("40") && clean.length === 11) {
    clean = "+" + clean;
  }
  // Already has +
  else if (!clean.startsWith("+")) {
    clean = "+" + clean;
  }

  // Basic validation: must be +40 followed by 9 digits
  if (/^\+40\d{9}$/.test(clean)) {
    return clean;
  }

  // Accept any international format that looks valid (non-RO numbers)
  if (/^\+\d{10,15}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Send SMS via Daktela Activities API
 * Fire-and-forget pattern - errors are logged, not thrown
 */
export async function sendSMS(phone: string, text: string): Promise<boolean> {
  const normalized = TEST_MODE ? TEST_PHONE : normalizePhone(phone);
  if (!normalized) {
    console.error(`[SMS] Invalid phone number: "${phone}"`);
    return false;
  }
  const targetPhone = normalized;

  try {
    const url = `${DAKTELA_BASE_URL}/activities.json?accessToken=${DAKTELA_ACCESS_TOKEN}`;

    const body = {
      queue: SMS_QUEUE,
      type: "SMS",
      action: "CLOSE",
      number: targetPhone,
      text,
    };

    console.log(`[SMS] Sending to ${targetPhone}: "${text.substring(0, 80)}..."`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SMS] Daktela API error ${response.status}: ${errorText}`);
      return false;
    }

    console.log(`[SMS] Sent successfully to ${targetPhone}`);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

/**
 * Capitalize first letter of each word: "ion popescu" -> "Ion Popescu"
 */
function capitalizeName(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Replace template variables with actual values
 */
function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Send "Comanda creata" SMS - called after new order is created in Shopify sync
 * Deduplication: checks smsOrderCreatedAt before sending
 */
export async function sendOrderCreatedSMS(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      shopifyOrderNumber: true,
      customerPhone: true,
      customerFirstName: true,
      customerLastName: true,
      financialStatus: true,
      totalPrice: true,
      smsOrderCreatedAt: true,
      store: { select: { name: true } },
    },
  });

  if (!order) {
    console.error(`[SMS] Order not found: ${orderId}`);
    return;
  }

  // Deduplication: skip if already sent
  if (order.smsOrderCreatedAt) {
    console.log(`[SMS] ORDER_CREATED already sent for ${order.shopifyOrderNumber} at ${order.smsOrderCreatedAt.toISOString()}, skipping`);
    return;
  }

  const phone = order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(`[SMS] No phone for order ${order.shopifyOrderNumber}, skipping`);
    return;
  }

  const templates = isPaidByCard(order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientNameRaw = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";
  const clientName = capitalizeName(clientNameRaw);

  const text = fillTemplate(templates.ORDER_CREATED, {
    client_name: clientName,
    order_id: order.shopifyOrderNumber || orderId,
    total: Number(order.totalPrice).toFixed(2),
    store_name: order.store?.name || "CashFlow",
  });

  const success = await sendSMS(phone || "", text);
  if (success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { smsOrderCreatedAt: new Date() },
    });
  }
}

/**
 * Send "AWB emis" SMS - called after AWB is successfully created
 * Deduplication: checks smsAwbCreatedAt before sending
 */
export async function sendAWBCreatedSMS(
  orderId: string,
  awbNumber: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      shopifyOrderNumber: true,
      customerPhone: true,
      customerFirstName: true,
      customerLastName: true,
      financialStatus: true,
      totalPrice: true,
      smsAwbCreatedAt: true,
      store: { select: { name: true } },
    },
  });

  if (!order) {
    console.error(`[SMS] Order not found: ${orderId}`);
    return;
  }

  // Deduplication: skip if already sent
  if (order.smsAwbCreatedAt) {
    console.log(`[SMS] AWB_CREATED already sent for ${order.shopifyOrderNumber} at ${order.smsAwbCreatedAt.toISOString()}, skipping`);
    return;
  }

  const phone = order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(`[SMS] No phone for order ${order.shopifyOrderNumber}, skipping`);
    return;
  }

  const templates = isPaidByCard(order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientNameRaw = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";
  const clientName = capitalizeName(clientNameRaw);

  const text = fillTemplate(templates.AWB_CREATED, {
    client_name: clientName,
    order_id: order.shopifyOrderNumber || orderId,
    total: Number(order.totalPrice).toFixed(2),
    tracking_link: `${TRACKING_URL}${awbNumber}`,
    store_name: order.store?.name || "CashFlow",
  });

  const success = await sendSMS(phone || "", text);
  if (success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { smsAwbCreatedAt: new Date() },
    });
  }
}

/**
 * Schedule "Predat la curier" SMS for 14h after handover scan
 * Inserts a ScheduledSMS row - actual sending is done by the cron job
 * Deduplication: checks if a HANDED_TO_COURIER SMS is already scheduled for this AWB
 */
export async function scheduleHandoverSMS(awbId: string): Promise<void> {
  const awb = await prisma.aWB.findUnique({
    where: { id: awbId },
    select: {
      awbNumber: true,
      order: {
        select: {
          id: true,
          shopifyOrderNumber: true,
          customerPhone: true,
          customerFirstName: true,
          customerLastName: true,
          financialStatus: true,
          totalPrice: true,
          store: { select: { name: true } },
        },
      },
    },
  });

  if (!awb || !awb.order) {
    console.error(`[SMS] AWB not found or no order: ${awbId}`);
    return;
  }

  // Deduplication: check if already scheduled for this AWB
  const existing = await prisma.scheduledSMS.findFirst({
    where: {
      awbNumber: awb.awbNumber,
      type: "HANDED_TO_COURIER",
    },
  });

  if (existing) {
    console.log(`[SMS] HANDED_TO_COURIER already scheduled for AWB ${awb.awbNumber} (id: ${existing.id}), skipping`);
    return;
  }

  const phone = awb.order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(
      `[SMS] No phone for order ${awb.order.shopifyOrderNumber}, skipping schedule`
    );
    return;
  }

  const templates = isPaidByCard(awb.order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientNameRaw = [awb.order.customerFirstName, awb.order.customerLastName].filter(Boolean).join(" ") || "Client";
  const clientName = capitalizeName(clientNameRaw);

  const text = fillTemplate(templates.HANDED_TO_COURIER, {
    client_name: clientName,
    order_id: awb.order.shopifyOrderNumber || awb.order.id,
    total: Number(awb.order.totalPrice).toFixed(2),
    tracking_link: `${TRACKING_URL}${awb.awbNumber}`,
    store_name: awb.order.store?.name || "CashFlow",
  });

  const scheduledAt = new Date(Date.now() + 14 * 60 * 60 * 1000); // now + 14h

  await prisma.scheduledSMS.create({
    data: {
      phone: phone || "",
      text,
      scheduledAt,
      orderId: awb.order.id,
      awbNumber: awb.awbNumber,
      type: "HANDED_TO_COURIER",
    },
  });

  console.log(
    `[SMS] Scheduled HANDED_TO_COURIER for AWB ${awb.awbNumber} at ${scheduledAt.toISOString()}`
  );
}

/**
 * Send "Livrat" SMS with invoice link - called when AWB status becomes DELIVERED
 * Deduplication: checks smsDeliveredAt before sending
 */
export async function sendDeliveredSMS(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      shopifyOrderNumber: true,
      customerPhone: true,
      customerFirstName: true,
      customerLastName: true,
      financialStatus: true,
      smsDeliveredAt: true,
      store: { select: { name: true } },
      invoices: {
        where: { status: "issued", pdfData: { not: null } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!order) {
    console.error(`[SMS] Order not found: ${orderId}`);
    return;
  }

  // Deduplication: skip if already sent
  if (order.smsDeliveredAt) {
    console.log(`[SMS] DELIVERED already sent for ${order.shopifyOrderNumber} at ${order.smsDeliveredAt.toISOString()}, skipping`);
    return;
  }

  if (order.invoices.length === 0) {
    console.log(`[SMS] No invoice for order ${order.shopifyOrderNumber}, skipping delivered SMS`);
    return;
  }

  const phone = order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(`[SMS] No phone for order ${order.shopifyOrderNumber}, skipping`);
    return;
  }

  const templates = isPaidByCard(order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientNameRaw = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";
  const clientName = capitalizeName(clientNameRaw);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  const invoiceLink = `${baseUrl}/api/invoice/view/${order.invoices[0].id}`;

  const text = fillTemplate(templates.DELIVERED, {
    client_name: clientName,
    order_id: order.shopifyOrderNumber || orderId,
    invoice_link: invoiceLink,
    store_name: order.store?.name || "CashFlow",
  });

  const success = await sendSMS(phone || "", text);
  if (success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { smsDeliveredAt: new Date() },
    });
  }
}

/**
 * Process all due scheduled SMS messages - called by cron job
 * Uses atomic UPDATE...RETURNING to prevent duplicate sends from concurrent runs
 */
export async function processScheduledSMS(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();

  // Atomic claim: UPDATE with subquery + FOR UPDATE SKIP LOCKED
  // This prevents two concurrent cron runs from picking up the same records
  const claimed = await prisma.$queryRaw<
    Array<{ id: string; phone: string; text: string; awbNumber: string | null }>
  >`
    UPDATE scheduled_sms
    SET "sentAt" = ${now}
    WHERE id IN (
      SELECT id FROM scheduled_sms
      WHERE "sentAt" IS NULL AND "scheduledAt" <= ${now}
      ORDER BY "scheduledAt" ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, phone, text, "awbNumber"
  `;

  console.log(`[SMS CRON] Claimed ${claimed.length} scheduled SMS to send`);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sms of claimed) {
    const success = await sendSMS(sms.phone, sms.text);

    if (success) {
      sent++;
    } else {
      // Reset sentAt so it can be retried on next run
      const errorMsg = `Failed to send SMS ${sms.id} for AWB ${sms.awbNumber}`;
      await prisma.$executeRaw`
        UPDATE scheduled_sms SET "sentAt" = NULL, "error" = ${errorMsg} WHERE id = ${sms.id}
      `;
      errors.push(errorMsg);
      failed++;
    }
  }

  console.log(`[SMS CRON] Done: ${sent} sent, ${failed} failed`);
  return { sent, failed, errors };
}
