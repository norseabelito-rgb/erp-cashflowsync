/**
 * Trendyol AWB Tracking Service
 *
 * Sends AWB tracking numbers to Trendyol after local AWB creation.
 * This allows customers to track their packages on Trendyol.
 */

import { TrendyolClient } from "./trendyol";
import prisma from "./db";
import { getTrendyolCargoProvider, getTrackingUrl } from "./trendyol-courier-map";

interface SendTrackingResult {
  success: boolean;
  error?: string;
}

/**
 * Sends AWB tracking number to Trendyol after AWB creation
 *
 * This function should be called after successfully creating an AWB
 * for an order that originated from Trendyol.
 *
 * @param orderId - The local Order ID (not Trendyol order ID)
 * @param awbNumber - The AWB number from FanCourier/Sameday
 * @param carrier - The carrier name (e.g., "fancourier", "sameday")
 * @returns Result indicating success or failure
 */
export async function sendTrackingToTrendyol(
  orderId: string,
  awbNumber: string,
  carrier: string
): Promise<SendTrackingResult> {
  try {
    // 1. Get the TrendyolOrder linked to this Order
    const trendyolOrder = await prisma.trendyolOrder.findFirst({
      where: { orderId },
    });

    if (!trendyolOrder) {
      // Not a Trendyol order, skip silently
      return { success: true };
    }

    if (!trendyolOrder.shipmentPackageId) {
      return {
        success: false,
        error: "Missing shipmentPackageId - cannot send tracking to Trendyol",
      };
    }

    // 2. Get Trendyol settings
    const settings = await prisma.settings.findFirst();
    if (!settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
      return {
        success: false,
        error: "Trendyol API credentials not configured",
      };
    }

    if (!settings.trendyolSupplierId) {
      return {
        success: false,
        error: "Trendyol Supplier ID not configured",
      };
    }

    // 3. Map carrier to Trendyol provider name
    const cargoProviderName = getTrendyolCargoProvider(carrier);
    const trackingUrl = getTrackingUrl(carrier, awbNumber);

    // 4. Send tracking to Trendyol
    const client = new TrendyolClient({
      supplierId: settings.trendyolSupplierId,
      apiKey: settings.trendyolApiKey,
      apiSecret: settings.trendyolApiSecret,
      isTestMode: settings.trendyolIsTestMode ?? false,
    });

    console.log(
      `[Trendyol AWB] Sending tracking for order ${trendyolOrder.trendyolOrderNumber}: ${awbNumber} (${cargoProviderName})`
    );

    const result = await client.updateTrackingNumber(
      parseInt(trendyolOrder.shipmentPackageId),
      awbNumber,
      cargoProviderName
    );

    if (result.success) {
      // Update TrendyolOrder with success
      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: {
          trackingSentToTrendyol: true,
          trackingSentAt: new Date(),
          localAwbNumber: awbNumber,
          localCarrier: carrier,
          cargoTrackingNumber: awbNumber,
          cargoProviderName: cargoProviderName,
          cargoTrackingLink: trackingUrl || null,
          trackingSendError: null,
        },
      });

      console.log(
        `[Trendyol AWB] Tracking sent successfully for order ${trendyolOrder.trendyolOrderNumber}: ${awbNumber}`
      );
      return { success: true };
    } else {
      // Update TrendyolOrder with error
      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: {
          localAwbNumber: awbNumber,
          localCarrier: carrier,
          trackingSendError: result.error || "Unknown error",
        },
      });

      console.error(
        `[Trendyol AWB] Failed to send tracking for order ${trendyolOrder.trendyolOrderNumber}: ${result.error}`
      );
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Try to update TrendyolOrder with error
    try {
      const trendyolOrder = await prisma.trendyolOrder.findFirst({
        where: { orderId },
      });

      if (trendyolOrder) {
        await prisma.trendyolOrder.update({
          where: { id: trendyolOrder.id },
          data: {
            localAwbNumber: awbNumber,
            localCarrier: carrier,
            trackingSendError: errorMsg,
          },
        });
      }
    } catch {
      // Ignore update errors
    }

    console.error(`[Trendyol AWB] Error sending tracking: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Retry sending tracking for an order that previously failed
 *
 * @param orderId - The local Order ID
 * @returns Result indicating success or failure
 */
export async function retrySendTrackingToTrendyol(
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
  // Most AWBs in Romania are FanCourier, adjust as needed
  const carrier = order.awb.serviceType?.toLowerCase().includes("sameday")
    ? "sameday"
    : "fancourier";

  return sendTrackingToTrendyol(orderId, order.awb.awbNumber, carrier);
}
