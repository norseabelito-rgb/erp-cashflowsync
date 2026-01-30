import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { normalizeStatus, mapTrendyolToInternalStatus } from "@/lib/trendyol-status";
import { syncTrendyolOrderToMainOrder } from "@/lib/trendyol-order-sync";
import {
  handleTrendyolReturn,
  handleTrendyolCancellation,
  markOrderDelivered,
} from "@/lib/trendyol-returns";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ storeId: string }>;
}

/**
 * Validates Trendyol webhook signature using HMAC-SHA256
 * Uses timing-safe comparison to prevent timing attacks
 */
function validateTrendyolWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error("[Trendyol Webhook] Signature validation error:", error);
    return false;
  }
}

/**
 * Trendyol Webhook Event Types:
 * - OrderCreated: New order created
 * - OrderStatusChanged: Order status updated
 * - OrderCancelled: Order was cancelled
 * - OrderReturned: Order was returned
 */
interface TrendyolWebhookEvent {
  eventType: string;
  timestamp: number;
  data: {
    orderNumber?: string;
    shipmentPackageId?: number;
    status?: string;
    previousStatus?: string;
    trackingNumber?: string;
    cargoProviderName?: string;
    cancellationReason?: string;
    returnReason?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

/**
 * POST /api/trendyol/webhook/[storeId]
 *
 * Receives real-time notifications from Trendyol marketplace.
 * Each store has its own webhook URL with unique secret.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { storeId } = await params;

  console.log(`[Trendyol Webhook] Received for store: ${storeId}`);

  try {
    // Load the TrendyolStore
    const store = await prisma.trendyolStore.findUnique({
      where: { id: storeId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!store) {
      console.warn(`[Trendyol Webhook] Store not found: ${storeId}`);
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    if (!store.isActive) {
      console.warn(`[Trendyol Webhook] Store inactive: ${store.name}`);
      return NextResponse.json(
        { success: false, error: "Store is inactive" },
        { status: 400 }
      );
    }

    // Get raw body for signature validation
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-trendyol-signature") ||
      request.headers.get("X-Trendyol-Signature") ||
      request.headers.get("x-signature") ||
      "";

    console.log(`[Trendyol Webhook] Store: ${store.name}`);
    console.log(`[Trendyol Webhook] Signature header: ${signature ? "present" : "missing"}`);
    console.log(`[Trendyol Webhook] Body length: ${rawBody.length}`);

    // Validate signature
    if (store.webhookSecret) {
      const isValid = validateTrendyolWebhook(rawBody, signature, store.webhookSecret);

      if (!isValid) {
        console.warn(`[Trendyol Webhook] Invalid signature for store ${store.name} - rejecting`);
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
      console.log(`[Trendyol Webhook] Signature validated for ${store.name}`);
    } else {
      console.warn(`[Trendyol Webhook] No webhook secret for store ${store.name} - processing anyway`);
    }

    // Parse webhook payload
    let event: TrendyolWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[Trendyol Webhook] Failed to parse payload:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    console.log(`[Trendyol Webhook] Event type: ${event.eventType}`);
    console.log(`[Trendyol Webhook] Event data:`, JSON.stringify(event.data, null, 2));

    // Process event with store context
    const result = await processWebhookEvent(event, store);

    const duration = Date.now() - startTime;
    console.log(`[Trendyol Webhook] Processed in ${duration}ms for ${store.name}`);

    return NextResponse.json({
      success: true,
      message: "Webhook received and processed",
      eventType: event.eventType,
      processed: result.processed,
      store: store.name,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Trendyol Webhook] Error processing webhook:", error);

    // Return 200 to prevent Trendyol from retrying
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Processes different webhook event types with store context
 */
async function processWebhookEvent(
  event: TrendyolWebhookEvent,
  store: {
    id: string;
    name: string;
    supplierId: string;
    company: { id: string; name: string } | null;
  }
): Promise<{ processed: boolean; message?: string }> {
  const { eventType, data } = event;

  switch (eventType) {
    case "OrderCreated": {
      // Sync new order to main Order table
      console.log(`[Trendyol Webhook] New order created: ${data.orderNumber} for store ${store.name}`);

      // Load settings (for invoice series, etc.)
      const settings = await prisma.settings.findFirst();
      if (!settings) {
        return { processed: false, message: "Settings not configured" };
      }

      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();

      // Find TrendyolOrder associated with this store
      let trendyolOrder = await prisma.trendyolOrder.findFirst({
        where: {
          ...(shipmentPackageId
            ? { shipmentPackageId }
            : { trendyolOrderNumber: orderNumber }),
          trendyolStoreId: store.id,
        },
        include: { lineItems: true },
      });

      if (trendyolOrder) {
        try {
          const order = await syncTrendyolOrderToMainOrder(trendyolOrder, settings);
          console.log(`[Trendyol Webhook] Synced order ${orderNumber} to Order ${order.id}`);
          return { processed: true, message: `Order synced: ${order.id}` };
        } catch (syncError: any) {
          console.error(`[Trendyol Webhook] Failed to sync order ${orderNumber}:`, syncError);
          return { processed: false, message: `Sync failed: ${syncError.message}` };
        }
      } else {
        console.log(`[Trendyol Webhook] Order ${orderNumber} not in database yet for ${store.name}`);
        return { processed: true, message: "Order queued for sync" };
      }
    }

    case "OrderStatusChanged": {
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const newStatus = data.status;

      if (!orderNumber && !shipmentPackageId) {
        console.warn("[Trendyol Webhook] No order identifier in status change event");
        return { processed: false, message: "Missing order identifier" };
      }

      // Find TrendyolOrder for this store
      const existingOrder = await prisma.trendyolOrder.findFirst({
        where: {
          ...(shipmentPackageId
            ? { shipmentPackageId }
            : { trendyolOrderNumber: orderNumber }),
          trendyolStoreId: store.id,
        },
        include: { order: true },
      });

      if (existingOrder && newStatus) {
        const normalizedStatus = normalizeStatus(newStatus);

        // Update TrendyolOrder status
        await prisma.trendyolOrder.update({
          where: { id: existingOrder.id },
          data: {
            status: normalizedStatus,
            lastSyncedAt: new Date(),
          },
        });

        // Update linked Order status if exists
        if (existingOrder.order) {
          const mappedStatus = mapTrendyolToInternalStatus(normalizedStatus);
          await prisma.order.update({
            where: { id: existingOrder.order.id },
            data: {
              status: mappedStatus as any,
            },
          });
          console.log(`[Trendyol Webhook] Updated order ${orderNumber} status to ${newStatus} (Store: ${store.name})`);
        }

        // Log activity
        await logActivity({
          entityType: "TRENDYOL_ORDER",
          entityId: existingOrder.id,
          action: "UPDATE",
          description: `Trendyol order status changed to ${normalizedStatus} (Store: ${store.name})`,
          orderId: existingOrder.order?.id,
          orderNumber: existingOrder.trendyolOrderNumber,
          success: true,
          source: "trendyol_webhook",
        });

        return { processed: true, message: `Status updated to ${newStatus}` };
      }

      console.log(`[Trendyol Webhook] Order ${orderNumber || shipmentPackageId} not found for store ${store.name}`);
      return { processed: false, message: "Order not found" };
    }

    case "OrderCancelled": {
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const cancellationReason = (data.cancellationReason || data.reason) as string | undefined;
      const identifier = shipmentPackageId || orderNumber;

      if (!identifier) {
        return { processed: false, message: "Missing order identifier" };
      }

      const result = await handleTrendyolCancellation(identifier, cancellationReason);
      return { processed: result.success, message: result.message };
    }

    case "OrderReturned": {
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const returnReason = (data.returnReason || data.reason) as string | undefined;
      const identifier = shipmentPackageId || orderNumber;

      if (!identifier) {
        return { processed: false, message: "Missing order identifier" };
      }

      const result = await handleTrendyolReturn(identifier, returnReason);
      return { processed: result.success, message: result.message };
    }

    case "ShipmentDelivered":
    case "OrderDelivered": {
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const orderNumber = data.orderNumber;
      const trackingNumber = data.trackingNumber;
      const identifier = shipmentPackageId || orderNumber;

      if (!identifier) {
        return { processed: false, message: "Missing order identifier" };
      }

      const result = await markOrderDelivered(identifier, trackingNumber);
      return { processed: result.success, message: result.message };
    }

    default: {
      console.log(`[Trendyol Webhook] Unknown event type: ${eventType}`);
      return { processed: false, message: `Unknown event type: ${eventType}` };
    }
  }
}

/**
 * GET /api/trendyol/webhook/[storeId]
 *
 * Health check endpoint for webhook verification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { storeId } = await params;

  const store = await prisma.trendyolStore.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, isActive: true },
  });

  if (!store) {
    return NextResponse.json(
      { success: false, error: "Store not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Trendyol webhook endpoint is active",
    store: store.name,
    isActive: store.isActive,
    timestamp: new Date().toISOString(),
  });
}
