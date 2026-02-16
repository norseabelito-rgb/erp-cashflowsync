/**
 * Trendyol Invoice Service
 *
 * Handles sending invoice links to Trendyol after Oblio invoice creation.
 * Also provides retry mechanism for failed sends.
 *
 * Updated to support multiple TrendyolStores.
 */

import { createTrendyolClientFromStore } from "./trendyol";
import prisma from "./db";

interface SendInvoiceResult {
  success: boolean;
  error?: string;
}

/**
 * Sends the invoice link to Trendyol after Oblio invoice creation
 *
 * @param orderId - The local Order ID (not Trendyol order ID)
 * @param invoiceLink - The public URL to the invoice (from Oblio)
 * @returns Result indicating success or error
 */
export async function sendInvoiceToTrendyol(
  orderId: string,
  invoiceLink: string
): Promise<SendInvoiceResult> {
  // 1. Get the TrendyolOrder linked to this Order, including the TrendyolStore
  const trendyolOrder = await prisma.trendyolOrder.findFirst({
    where: { orderId },
    include: {
      order: {
        include: { store: true },
      },
      trendyolStore: true,
    },
  });

  if (!trendyolOrder) {
    // Not a Trendyol order, skip silently (success = true means no action needed)
    return { success: true };
  }

  if (!trendyolOrder.shipmentPackageId) {
    const error = "Missing shipmentPackageId - cannot send invoice to Trendyol";
    console.error(`[Trendyol Invoice] ${error} for order ${trendyolOrder.trendyolOrderNumber}`);

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: error,
        oblioInvoiceLink: invoiceLink,
      },
    });

    return { success: false, error };
  }

  // 2. Get the TrendyolStore for this order
  let store = trendyolOrder.trendyolStore;

  // If no store linked, try to find one (for backward compatibility)
  if (!store) {
    store = await prisma.trendyolStore.findFirst({
      where: { isActive: true },
    });
  }

  if (!store) {
    const error = "No TrendyolStore configured for this order";
    console.error(`[Trendyol Invoice] ${error}`);

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: error,
        oblioInvoiceLink: invoiceLink,
      },
    });

    return { success: false, error };
  }

  // 3. Send invoice link to Trendyol
  const client = createTrendyolClientFromStore(store);

  try {
    console.log(
      `[Trendyol Invoice] Sending invoice link for order ${trendyolOrder.trendyolOrderNumber}, package ${trendyolOrder.shipmentPackageId} (Store: ${store.name})`
    );

    const result = await client.sendInvoiceLink(
      parseInt(trendyolOrder.shipmentPackageId),
      invoiceLink
    );

    if (result.success) {
      // Update TrendyolOrder with success
      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: {
          invoiceSentToTrendyol: true,
          invoiceSentAt: new Date(),
          oblioInvoiceLink: invoiceLink,
          invoiceSendError: null,
        },
      });

      console.log(
        `[Trendyol Invoice] Successfully sent invoice link for order ${trendyolOrder.trendyolOrderNumber}`
      );
      return { success: true };
    } else {
      // Update with error
      const error = result.error || "Unknown error from Trendyol API";

      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: {
          invoiceSendError: error,
          oblioInvoiceLink: invoiceLink,
        },
      });

      console.error(
        `[Trendyol Invoice] Failed to send invoice for order ${trendyolOrder.trendyolOrderNumber}: ${error}`
      );
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[Trendyol Invoice] Exception sending invoice for order ${trendyolOrder.trendyolOrderNumber}:`,
      error
    );

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: errorMsg,
        oblioInvoiceLink: invoiceLink,
      },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Retry sending invoice for orders that failed previously
 * Finds all TrendyolOrders with failed sends and retries them
 *
 * @returns Summary of retry results
 */
export async function retryFailedInvoiceSends(): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: string[];
}> {
  // Find orders that have an invoice link stored but haven't been sent successfully
  const failedOrders = await prisma.trendyolOrder.findMany({
    where: {
      invoiceSentToTrendyol: false,
      invoiceSendError: { not: null },
      oblioInvoiceLink: { not: null },
    },
    include: {
      order: {
        include: { invoices: { where: { status: "issued" }, orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const result = {
    total: failedOrders.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  console.log(`[Trendyol Invoice] Retrying ${failedOrders.length} failed invoice sends`);

  for (const trendyolOrder of failedOrders) {
    if (trendyolOrder.oblioInvoiceLink && trendyolOrder.orderId) {
      const sendResult = await sendInvoiceToTrendyol(
        trendyolOrder.orderId,
        trendyolOrder.oblioInvoiceLink
      );

      if (sendResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push(`Order ${trendyolOrder.trendyolOrderNumber}: ${sendResult.error}`);
      }

      // Small delay between retries to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`[Trendyol Invoice] Retry complete: ${result.success} success, ${result.failed} failed`);

  return result;
}

/**
 * Get list of Trendyol orders with pending/failed invoice sends
 * Useful for UI display
 */
export async function getPendingInvoiceSends(): Promise<{
  pending: number;
  failed: number;
  orders: Array<{
    id: string;
    trendyolOrderNumber: string;
    orderId: string | null;
    invoiceSendError: string | null;
    oblioInvoiceLink: string | null;
    orderDate: Date;
  }>;
}> {
  const orders = await prisma.trendyolOrder.findMany({
    where: {
      invoiceSentToTrendyol: false,
      orderId: { not: null },
      order: {
        invoices: {
          some: {
            status: "issued",
          },
        },
      },
    },
    select: {
      id: true,
      trendyolOrderNumber: true,
      orderId: true,
      invoiceSendError: true,
      oblioInvoiceLink: true,
      orderDate: true,
    },
    orderBy: { orderDate: "desc" },
  });

  const failed = orders.filter((o) => o.invoiceSendError !== null).length;
  const pending = orders.length - failed;

  return {
    pending,
    failed,
    orders,
  };
}
