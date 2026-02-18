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

// SMS Templates
const SMS_TEMPLATES = {
  ORDER_CREATED: "Comanda {orderNumber} a fost inregistrata. Multumim!",
  AWB_CREATED:
    "Comanda {orderNumber} - AWB {awbNumber} a fost emis. Urmariti coletul: https://www.fancourier.ro/awb-tracking/?tracking={awbNumber}",
  HANDED_TO_COURIER:
    "Comanda {orderNumber} a fost predata curierului. AWB: {awbNumber}",
};

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

    console.log(`[SMS] Sending to ${targetPhone}: "${text.substring(0, 50)}..."`);

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
 * Replace template variables like {orderNumber} with actual values
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

  const text = fillTemplate(SMS_TEMPLATES.ORDER_CREATED, {
    orderNumber: order.shopifyOrderNumber || orderId,
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

  const text = fillTemplate(SMS_TEMPLATES.AWB_CREATED, {
    orderNumber: order.shopifyOrderNumber || orderId,
    awbNumber,
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

  const text = fillTemplate(SMS_TEMPLATES.HANDED_TO_COURIER, {
    orderNumber: awb.order.shopifyOrderNumber || awb.order.id,
    awbNumber: awb.awbNumber,
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
