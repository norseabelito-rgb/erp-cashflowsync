import prisma from "./db";

// ==========================================
// DAKTELA SMS SERVICE
// ==========================================

const DAKTELA_BASE_URL = "https://cashflowgroup.daktela.com/api/v6";
const DAKTELA_ACCESS_TOKEN = "5b2024598f4f573d8162fa2cedd2ea7b78aef84f";
const SMS_QUEUE = "9001";

// TEST MODE - all SMS go to this number regardless of input
const TEST_MODE = true;
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
};

// SMS Templates - RAMBURS (cash on delivery)
const SMS_RAMBURS = {
  ORDER_CREATED:
    "Buna ziua, {client_name}! Comanda dvs. #{order_id} a fost inregistrata. Valoare: {total} lei (plata la livrare). Veti primi un SMS cand coletul pleaca spre dvs. Va multumim! - {store_name}",
  AWB_CREATED:
    "{client_name}, comanda #{order_id} a fost predata curierului! Livrarea se face in 1-2 zile lucratoare. Pregatiti suma de {total} lei (numerar exact). Urmarire colet: {tracking_link} - {store_name}",
  HANDED_TO_COURIER:
    "{client_name}, coletul dvs. #{order_id} se afla la curier si va fi livrat cat de curand! Suma de plata: {total} lei. Va rugam sa aveti suma exacta pregatita si sa raspundeti la telefon cand va suna curierul. Urmarire: {tracking_link} - {store_name}",
};

/**
 * Check if order was paid by card (vs ramburs/cash on delivery)
 */
function isPaidByCard(financialStatus: string | null): boolean {
  return financialStatus === "paid";
}

/**
 * Send SMS via Daktela Activities API
 * Fire-and-forget pattern - errors are logged, not thrown
 */
export async function sendSMS(phone: string, text: string): Promise<boolean> {
  const targetPhone = TEST_MODE ? TEST_PHONE : phone;

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
      store: { select: { name: true } },
    },
  });

  if (!order) {
    console.error(`[SMS] Order not found: ${orderId}`);
    return;
  }

  const phone = order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(`[SMS] No phone for order ${order.shopifyOrderNumber}, skipping`);
    return;
  }

  const templates = isPaidByCard(order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";

  const text = fillTemplate(templates.ORDER_CREATED, {
    client_name: clientName,
    order_id: order.shopifyOrderNumber || orderId,
    total: Number(order.totalPrice).toFixed(2),
    store_name: order.store?.name || "CashFlow",
  });

  await sendSMS(phone || "", text);
}

/**
 * Send "AWB emis" SMS - called after AWB is successfully created
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
      store: { select: { name: true } },
    },
  });

  if (!order) {
    console.error(`[SMS] Order not found: ${orderId}`);
    return;
  }

  const phone = order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(`[SMS] No phone for order ${order.shopifyOrderNumber}, skipping`);
    return;
  }

  const templates = isPaidByCard(order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || "Client";

  const text = fillTemplate(templates.AWB_CREATED, {
    client_name: clientName,
    order_id: order.shopifyOrderNumber || orderId,
    total: Number(order.totalPrice).toFixed(2),
    tracking_link: `${TRACKING_URL}${awbNumber}`,
    store_name: order.store?.name || "CashFlow",
  });

  await sendSMS(phone || "", text);
}

/**
 * Schedule "Predat la curier" SMS for 14h after handover scan
 * Inserts a ScheduledSMS row - actual sending is done by the cron job
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

  const phone = awb.order.customerPhone;
  if (!phone && !TEST_MODE) {
    console.log(
      `[SMS] No phone for order ${awb.order.shopifyOrderNumber}, skipping schedule`
    );
    return;
  }

  const templates = isPaidByCard(awb.order.financialStatus) ? SMS_CARD : SMS_RAMBURS;
  const clientName = [awb.order.customerFirstName, awb.order.customerLastName].filter(Boolean).join(" ") || "Client";

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
 * Process all due scheduled SMS messages - called by cron job
 */
export async function processScheduledSMS(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date();
  const pending = await prisma.scheduledSMS.findMany({
    where: {
      sentAt: null,
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50, // Process in batches
  });

  console.log(`[SMS CRON] Found ${pending.length} scheduled SMS to send`);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sms of pending) {
    const success = await sendSMS(sms.phone, sms.text);

    if (success) {
      await prisma.scheduledSMS.update({
        where: { id: sms.id },
        data: { sentAt: new Date() },
      });
      sent++;
    } else {
      const errorMsg = `Failed to send SMS ${sms.id} for AWB ${sms.awbNumber}`;
      await prisma.scheduledSMS.update({
        where: { id: sms.id },
        data: { error: errorMsg },
      });
      errors.push(errorMsg);
      failed++;
    }
  }

  console.log(`[SMS CRON] Done: ${sent} sent, ${failed} failed`);
  return { sent, failed, errors };
}
