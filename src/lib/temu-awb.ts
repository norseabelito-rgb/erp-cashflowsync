/**
 * Temu AWB Tracking Service
 *
 * Sends AWB tracking numbers to Temu after local AWB creation.
 * This allows customers to track their packages on Temu.
 *
 * Follows the pattern established by trendyol-awb.ts
 */

import prisma from "@/lib/db";
import { createTemuClientFromStore, mapCarrierToTemuCode } from "@/lib/temu";

interface SendTrackingResult {
  success: boolean;
  error?: string;
}

/**
 * Sends AWB tracking number to Temu after AWB creation
 *
 * This function should be called after successfully creating an AWB
 * for an order that originated from Temu.
 *
 * @param orderId - The local Order ID (not Temu order ID)
 * @param awbNumber - The AWB number from FanCourier/Sameday
 * @param carrier - The carrier name (e.g., "fancourier", "sameday")
 * @returns Result indicating success or failure
 */
export async function sendTrackingToTemu(
  orderId: string,
  awbNumber: string,
  carrier: string = "fancourier"
): Promise<SendTrackingResult> {
  try {
    // 1. Get the TemuOrder linked to this Order, including TemuStore
    const temuOrder = await prisma.temuOrder.findFirst({
      where: { orderId },
      include: {
        temuStore: true,
      },
    });

    if (!temuOrder) {
      // Not a Temu order, skip silently
      return { success: true };
    }

    // 2. Get the TemuStore for this order
    let store = temuOrder.temuStore;

    // If no store linked, try to find one (for backward compatibility)
    if (!store) {
      store = await prisma.temuStore.findFirst({
        where: { isActive: true },
      });
    }

    if (!store) {
      console.log(`[Temu AWB] No TemuStore configured for order ${orderId}`);
      return { success: true }; // Non-blocking - don't fail AWB creation
    }

    // 3. Check if tracking was already sent
    if (temuOrder.trackingSentToTemu) {
      console.log(
        `[Temu AWB] Tracking already sent for ${temuOrder.temuOrderNumber}`
      );
      return { success: true };
    }

    // 4. Map carrier to Temu carrier code
    const carrierCode = mapCarrierToTemuCode(carrier);

    console.log(
      `[Temu AWB] Sending tracking for order ${temuOrder.temuOrderNumber}: ${awbNumber} (${carrierCode}) [Store: ${store.name}]`
    );

    // 5. Send tracking to Temu
    const client = createTemuClientFromStore(store);

    const result = await client.updateTracking(
      temuOrder.temuOrderId,
      awbNumber,
      carrierCode
    );

    if (result.success) {
      // Update TemuOrder with success
      await prisma.temuOrder.update({
        where: { id: temuOrder.id },
        data: {
          trackingSentToTemu: true,
          trackingSentAt: new Date(),
          trackingSendError: null,
        },
      });

      console.log(
        `[Temu AWB] Tracking sent successfully for order ${temuOrder.temuOrderNumber}: ${awbNumber}`
      );
      return { success: true };
    } else {
      // Update TemuOrder with error
      const errorMsg = result.error || "Unknown error";
      await prisma.temuOrder.update({
        where: { id: temuOrder.id },
        data: {
          trackingSendError: errorMsg,
        },
      });

      console.error(
        `[Temu AWB] Failed to send tracking for order ${temuOrder.temuOrderNumber}: ${errorMsg}`
      );
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Try to update TemuOrder with error
    try {
      const temuOrder = await prisma.temuOrder.findFirst({
        where: { orderId },
      });

      if (temuOrder) {
        await prisma.temuOrder.update({
          where: { id: temuOrder.id },
          data: {
            trackingSendError: errorMsg,
          },
        });
      }
    } catch {
      // Ignore update errors - main operation already failed
    }

    console.error(`[Temu AWB] Error sending tracking: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Retry sending tracking for an order that previously failed
 *
 * @param orderId - The local Order ID
 * @returns Result indicating success or failure
 */
export async function retrySendTrackingToTemu(
  orderId: string
): Promise<SendTrackingResult> {
  // Get the order with AWB info
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { awb: true },
  });

  if (!order?.awb?.awbNumber) {
    return {
      success: false,
      error: "No AWB found for this order",
    };
  }

  // Determine carrier from AWB data or default to FanCourier
  const carrier = order.awb.serviceType?.toLowerCase().includes("sameday")
    ? "sameday"
    : "fancourier";

  return sendTrackingToTemu(orderId, order.awb.awbNumber, carrier);
}

/**
 * Retry sending tracking for all failed Temu orders
 *
 * @returns Summary of retry results
 */
export async function retryFailedTemuTrackingSends(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const result = { retried: 0, succeeded: 0, failed: 0 };

  // Find orders with tracking errors that have AWB
  const failedOrders = await prisma.temuOrder.findMany({
    where: {
      trackingSentToTemu: false,
      trackingSendError: { not: null },
      order: {
        awb: { awbNumber: { not: null } },
      },
    },
    include: {
      order: { include: { awb: true } },
      temuStore: true,
    },
    take: 50, // Limit batch size
  });

  for (const temuOrder of failedOrders) {
    if (!temuOrder.order?.awb?.awbNumber) continue;

    result.retried++;

    // Determine carrier from AWB data or default to FanCourier
    const carrier = temuOrder.order.awb.serviceType
      ?.toLowerCase()
      .includes("sameday")
      ? "sameday"
      : "fancourier";

    const sendResult = await sendTrackingToTemu(
      temuOrder.orderId!,
      temuOrder.order.awb.awbNumber,
      carrier
    );

    if (sendResult.success) {
      result.succeeded++;
    } else {
      result.failed++;
    }
  }

  return result;
}
