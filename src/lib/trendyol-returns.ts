/**
 * Trendyol Return Handling
 *
 * Handles return notifications from Trendyol webhook
 * and manual return processing.
 */

import prisma from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

interface TrendyolReturnResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  message: string;
}

/**
 * Handle return notification from Trendyol webhook
 */
export async function handleTrendyolReturn(
  trendyolOrderId: string,
  returnReason?: string
): Promise<TrendyolReturnResult> {
  try {
    // 1. Find the TrendyolOrder and linked Order
    const trendyolOrder = await prisma.trendyolOrder.findFirst({
      where: {
        OR: [
          { trendyolOrderId },
          { trendyolOrderNumber: trendyolOrderId },
          { shipmentPackageId: trendyolOrderId },
        ],
      },
      include: { order: true },
    });

    if (!trendyolOrder) {
      console.warn(`[Trendyol Return] Order not found: ${trendyolOrderId}`);
      return {
        success: false,
        message: `Order not found: ${trendyolOrderId}`,
      };
    }

    // 2. Update TrendyolOrder status
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        status: "Returned",
        lastSyncedAt: new Date(),
      },
    });

    // 3. Update Order status if linked
    if (trendyolOrder.order) {
      await prisma.order.update({
        where: { id: trendyolOrder.order.id },
        data: {
          status: "RETURNED",
        },
      });
    }

    // 4. Log activity for audit
    await logActivity({
      entityType: "TRENDYOL_ORDER",
      entityId: trendyolOrder.id,
      action: "UPDATE",
      description: `Trendyol order marked as returned${returnReason ? `: ${returnReason}` : ""}`,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      success: true,
      source: "trendyol_webhook",
    });

    console.log(
      `[Trendyol Return] Order ${trendyolOrder.trendyolOrderNumber} marked as returned`
    );

    return {
      success: true,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      message: "Order marked as returned",
    };
  } catch (error: any) {
    console.error(`[Trendyol Return] Error handling return:`, error);
    return {
      success: false,
      message: error.message || "Error processing return",
    };
  }
}

/**
 * Handle cancellation notification from Trendyol webhook
 */
export async function handleTrendyolCancellation(
  trendyolOrderId: string,
  cancellationReason?: string
): Promise<TrendyolReturnResult> {
  try {
    // 1. Find the TrendyolOrder and linked Order
    const trendyolOrder = await prisma.trendyolOrder.findFirst({
      where: {
        OR: [
          { trendyolOrderId },
          { trendyolOrderNumber: trendyolOrderId },
          { shipmentPackageId: trendyolOrderId },
        ],
      },
      include: { order: true },
    });

    if (!trendyolOrder) {
      console.warn(`[Trendyol Cancel] Order not found: ${trendyolOrderId}`);
      return {
        success: false,
        message: `Order not found: ${trendyolOrderId}`,
      };
    }

    // 2. Update TrendyolOrder status
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        status: "Cancelled",
        lastSyncedAt: new Date(),
      },
    });

    // 3. Update Order status if linked
    if (trendyolOrder.order) {
      await prisma.order.update({
        where: { id: trendyolOrder.order.id },
        data: {
          status: "CANCELLED",
        },
      });
    }

    // 4. Log activity for audit
    await logActivity({
      entityType: "TRENDYOL_ORDER",
      entityId: trendyolOrder.id,
      action: "UPDATE",
      description: `Trendyol order cancelled${cancellationReason ? `: ${cancellationReason}` : ""}`,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      success: true,
      source: "trendyol_webhook",
    });

    console.log(
      `[Trendyol Cancel] Order ${trendyolOrder.trendyolOrderNumber} cancelled`
    );

    return {
      success: true,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      message: "Order cancelled",
    };
  } catch (error: any) {
    console.error(`[Trendyol Cancel] Error handling cancellation:`, error);
    return {
      success: false,
      message: error.message || "Error processing cancellation",
    };
  }
}

/**
 * Mark order as delivered via Trendyol webhook
 */
export async function markOrderDelivered(
  trendyolOrderId: string,
  trackingNumber?: string
): Promise<TrendyolReturnResult> {
  try {
    // 1. Find the TrendyolOrder and linked Order
    const trendyolOrder = await prisma.trendyolOrder.findFirst({
      where: {
        OR: [
          { trendyolOrderId },
          { trendyolOrderNumber: trendyolOrderId },
          { shipmentPackageId: trendyolOrderId },
        ],
      },
      include: { order: true },
    });

    if (!trendyolOrder) {
      console.warn(`[Trendyol Delivered] Order not found: ${trendyolOrderId}`);
      return {
        success: false,
        message: `Order not found: ${trendyolOrderId}`,
      };
    }

    // 2. Update TrendyolOrder status
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        status: "Delivered",
        cargoTrackingNumber: trackingNumber || trendyolOrder.cargoTrackingNumber,
        lastSyncedAt: new Date(),
      },
    });

    // 3. Update Order status if linked
    if (trendyolOrder.order) {
      await prisma.order.update({
        where: { id: trendyolOrder.order.id },
        data: {
          status: "DELIVERED",
        },
      });
    }

    // 4. Log activity for audit
    await logActivity({
      entityType: "TRENDYOL_ORDER",
      entityId: trendyolOrder.id,
      action: "UPDATE",
      description: `Trendyol order delivered`,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      success: true,
      source: "trendyol_webhook",
    });

    console.log(
      `[Trendyol Delivered] Order ${trendyolOrder.trendyolOrderNumber} marked as delivered`
    );

    return {
      success: true,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      message: "Order marked as delivered",
    };
  } catch (error: any) {
    console.error(`[Trendyol Delivered] Error marking delivered:`, error);
    return {
      success: false,
      message: error.message || "Error processing delivery",
    };
  }
}

/**
 * Update order status from Trendyol webhook
 */
export async function updateOrderStatus(
  trendyolOrderId: string,
  newStatus: string
): Promise<TrendyolReturnResult> {
  try {
    const { normalizeStatus, mapTrendyolToInternalStatus } = await import(
      "@/lib/trendyol-status"
    );

    // 1. Find the TrendyolOrder and linked Order
    const trendyolOrder = await prisma.trendyolOrder.findFirst({
      where: {
        OR: [
          { trendyolOrderId },
          { trendyolOrderNumber: trendyolOrderId },
          { shipmentPackageId: trendyolOrderId },
        ],
      },
      include: { order: true },
    });

    if (!trendyolOrder) {
      console.warn(`[Trendyol Status] Order not found: ${trendyolOrderId}`);
      return {
        success: false,
        message: `Order not found: ${trendyolOrderId}`,
      };
    }

    const normalizedStatus = normalizeStatus(newStatus);

    // 2. Update TrendyolOrder status
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        status: normalizedStatus,
        lastSyncedAt: new Date(),
      },
    });

    // 3. Update Order status if linked
    if (trendyolOrder.order) {
      const mappedStatus = mapTrendyolToInternalStatus(normalizedStatus);
      await prisma.order.update({
        where: { id: trendyolOrder.order.id },
        data: {
          status: mappedStatus as any,
        },
      });
    }

    console.log(
      `[Trendyol Status] Order ${trendyolOrder.trendyolOrderNumber} status updated to ${normalizedStatus}`
    );

    return {
      success: true,
      orderId: trendyolOrder.order?.id,
      orderNumber: trendyolOrder.trendyolOrderNumber,
      message: `Status updated to ${normalizedStatus}`,
    };
  } catch (error: any) {
    console.error(`[Trendyol Status] Error updating status:`, error);
    return {
      success: false,
      message: error.message || "Error updating status",
    };
  }
}
