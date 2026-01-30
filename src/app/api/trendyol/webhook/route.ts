import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { normalizeStatus, mapTrendyolToInternalStatus } from "@/lib/trendyol-status";
import { syncTrendyolOrderToMainOrder } from "@/lib/trendyol-order-sync";
import {
  handleTrendyolReturn,
  handleTrendyolCancellation,
  markOrderDelivered,
  updateOrderStatus,
} from "@/lib/trendyol-returns";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

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
 * - OrderStatusChanged: Order status updated (Picking, Invoiced, Shipped, Delivered)
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
    [key: string]: unknown;
  };
}

/**
 * POST /api/trendyol/webhook
 *
 * Receives real-time notifications from Trendyol marketplace.
 * Validates HMAC signature and processes events asynchronously.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature validation
    const rawBody = await request.text();
    const signature = request.headers.get("x-trendyol-signature") ||
      request.headers.get("X-Trendyol-Signature") ||
      request.headers.get("x-signature") ||
      "";

    console.log("[Trendyol Webhook] Received webhook request");
    console.log("[Trendyol Webhook] Signature header:", signature ? "present" : "missing");
    console.log("[Trendyol Webhook] Body length:", rawBody.length);

    // Get webhook secret from settings
    const settings = await prisma.settings.findFirst();
    const webhookSecret = settings?.trendyolWebhookSecret;

    // Validate signature if secret is configured
    if (webhookSecret) {
      const isValid = validateTrendyolWebhook(rawBody, signature, webhookSecret);

      if (!isValid) {
        console.warn("[Trendyol Webhook] Invalid signature - rejecting request");
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
      console.log("[Trendyol Webhook] Signature validated successfully");
    } else {
      console.warn("[Trendyol Webhook] No webhook secret configured - processing without validation");
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

    console.log("[Trendyol Webhook] Event type:", event.eventType);
    console.log("[Trendyol Webhook] Event data:", JSON.stringify(event.data, null, 2));

    // Process event based on type
    // Return 200 quickly to acknowledge receipt, then process asynchronously
    const result = await processWebhookEvent(event);

    const duration = Date.now() - startTime;
    console.log(`[Trendyol Webhook] Processed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: "Webhook received and processed",
      eventType: event.eventType,
      processed: result.processed,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Trendyol Webhook] Error processing webhook:", error);

    // Return 200 to prevent Trendyol from retrying
    // Log the error for manual investigation
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Processes different webhook event types
 */
async function processWebhookEvent(event: TrendyolWebhookEvent): Promise<{ processed: boolean; message?: string }> {
  const { eventType, data } = event;

  switch (eventType) {
    case "OrderCreated": {
      // Sync new order to main Order table
      console.log(`[Trendyol Webhook] New order created: ${data.orderNumber}`);

      const settings = await prisma.settings.findFirst();
      if (!settings) {
        return { processed: false, message: "Settings not configured" };
      }

      // Find the TrendyolOrder (should be created by the regular sync job)
      // or this webhook arrived before the sync job
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();

      let trendyolOrder = await prisma.trendyolOrder.findFirst({
        where: shipmentPackageId
          ? { shipmentPackageId }
          : { trendyolOrderNumber: orderNumber },
        include: { lineItems: true },
      });

      if (trendyolOrder) {
        // Sync to main Order table
        try {
          const order = await syncTrendyolOrderToMainOrder(trendyolOrder, settings);
          console.log(`[Trendyol Webhook] Synced order ${orderNumber} to Order ${order.id}`);
          return { processed: true, message: `Order synced: ${order.id}` };
        } catch (syncError: any) {
          console.error(`[Trendyol Webhook] Failed to sync order ${orderNumber}:`, syncError);
          return { processed: false, message: `Sync failed: ${syncError.message}` };
        }
      } else {
        // Order not yet in database - will be synced by regular job
        console.log(`[Trendyol Webhook] Order ${orderNumber} not in database yet, will be synced later`);
        return { processed: true, message: "Order queued for sync" };
      }
    }

    case "OrderStatusChanged": {
      // Update TrendyolOrder status and linked Order
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const newStatus = data.status;

      if (!orderNumber && !shipmentPackageId) {
        console.warn("[Trendyol Webhook] No order identifier in status change event");
        return { processed: false, message: "Missing order identifier" };
      }

      // Find and update the TrendyolOrder with linked Order
      const existingOrder = await prisma.trendyolOrder.findFirst({
        where: shipmentPackageId
          ? { shipmentPackageId }
          : { trendyolOrderNumber: orderNumber },
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
          console.log(`[Trendyol Webhook] Updated order ${orderNumber} status to ${newStatus} (Order: ${mappedStatus})`);
        } else {
          console.log(`[Trendyol Webhook] Updated TrendyolOrder ${orderNumber} status to ${newStatus} (no linked Order)`);
        }

        // Log activity for audit
        await logActivity({
          entityType: "TRENDYOL_ORDER",
          entityId: existingOrder.id,
          action: "UPDATE",
          description: `Trendyol order status changed to ${normalizedStatus}`,
          orderId: existingOrder.order?.id,
          orderNumber: existingOrder.trendyolOrderNumber,
          success: true,
          source: "trendyol_webhook",
        });

        return { processed: true, message: `Status updated to ${newStatus}` };
      }

      console.log(`[Trendyol Webhook] Order ${orderNumber || shipmentPackageId} not found in database`);
      return { processed: false, message: "Order not found" };
    }

    case "OrderCancelled": {
      // Mark order as cancelled using reusable function
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const cancellationReason = data.cancellationReason || data.reason;
      const identifier = shipmentPackageId || orderNumber;

      if (!identifier) {
        return { processed: false, message: "Missing order identifier" };
      }

      const result = await handleTrendyolCancellation(identifier, cancellationReason);
      return { processed: result.success, message: result.message };
    }

    case "OrderReturned": {
      // Mark order as returned using reusable function
      const orderNumber = data.orderNumber;
      const shipmentPackageId = data.shipmentPackageId?.toString();
      const returnReason = data.returnReason || data.reason;
      const identifier = shipmentPackageId || orderNumber;

      if (!identifier) {
        return { processed: false, message: "Missing order identifier" };
      }

      const result = await handleTrendyolReturn(identifier, returnReason);
      return { processed: result.success, message: result.message };
    }

    case "ShipmentDelivered":
    case "OrderDelivered": {
      // Update tracking info and mark as delivered using reusable function
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
 * GET /api/trendyol/webhook
 *
 * Health check endpoint for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Trendyol webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
