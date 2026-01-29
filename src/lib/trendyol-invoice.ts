/**
 * Trendyol Invoice Service
 *
 * Handles sending invoice links to Trendyol after Oblio invoice creation.
 * Also provides retry mechanism for failed sends.
 */

import { TrendyolClient } from "./trendyol";
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
  // 1. Get the TrendyolOrder linked to this Order
  const trendyolOrder = await prisma.trendyolOrder.findFirst({
    where: { orderId },
    include: {
      order: {
        include: { store: true }
      }
    }
  });

  if (!trendyolOrder) {
    // Not a Trendyol order, skip silently (success = true means no action needed)
    return { success: true };
  }

  if (!trendyolOrder.shipmentPackageId) {
    const error = "Missing shipmentPackageId - cannot send invoice to Trendyol";
    console.error(`[Trendyol Invoice] ${error} for order ${trendyolOrder.trendyolOrderNumber}`);

    // Store the error for visibility
    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: error,
        oblioInvoiceLink: invoiceLink  // Store link even if send failed
      }
    });

    return { success: false, error };
  }

  // 2. Get Trendyol settings
  const settings = await prisma.settings.findFirst();
  if (!settings?.trendyolApiKey || !settings?.trendyolApiSecret) {
    const error = "Trendyol API credentials not configured";
    console.error(`[Trendyol Invoice] ${error}`);

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: error,
        oblioInvoiceLink: invoiceLink
      }
    });

    return { success: false, error };
  }

  if (!settings.trendyolSupplierId) {
    const error = "Trendyol Supplier ID not configured";
    console.error(`[Trendyol Invoice] ${error}`);

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: error,
        oblioInvoiceLink: invoiceLink
      }
    });

    return { success: false, error };
  }

  // 3. Send invoice link to Trendyol
  const client = new TrendyolClient({
    supplierId: settings.trendyolSupplierId,
    apiKey: settings.trendyolApiKey,
    apiSecret: settings.trendyolApiSecret,
    isTestMode: settings.trendyolIsTestMode ?? false
  });

  try {
    console.log(`[Trendyol Invoice] Sending invoice link for order ${trendyolOrder.trendyolOrderNumber}, package ${trendyolOrder.shipmentPackageId}`);

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
          invoiceSendError: null  // Clear any previous error
        }
      });

      console.log(`[Trendyol Invoice] Successfully sent invoice link for order ${trendyolOrder.trendyolOrderNumber}`);
      return { success: true };
    } else {
      // Update with error
      const error = result.error || "Unknown error from Trendyol API";

      await prisma.trendyolOrder.update({
        where: { id: trendyolOrder.id },
        data: {
          invoiceSendError: error,
          oblioInvoiceLink: invoiceLink
        }
      });

      console.error(`[Trendyol Invoice] Failed to send invoice for order ${trendyolOrder.trendyolOrderNumber}: ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    console.error(`[Trendyol Invoice] Exception sending invoice for order ${trendyolOrder.trendyolOrderNumber}:`, error);

    await prisma.trendyolOrder.update({
      where: { id: trendyolOrder.id },
      data: {
        invoiceSendError: errorMsg,
        oblioInvoiceLink: invoiceLink
      }
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
      oblioInvoiceLink: { not: null }  // Has link but failed to send
    },
    include: {
      order: {
        include: { invoice: true }
      }
    }
  });

  const result = {
    total: failedOrders.length,
    success: 0,
    failed: 0,
    errors: [] as string[]
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
      await new Promise(resolve => setTimeout(resolve, 200));
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
      orderId: { not: null },  // Must have a local order linked
      order: {
        invoice: {
          status: "issued"  // Only orders with issued invoices
        }
      }
    },
    select: {
      id: true,
      trendyolOrderNumber: true,
      orderId: true,
      invoiceSendError: true,
      oblioInvoiceLink: true,
      orderDate: true
    },
    orderBy: { orderDate: 'desc' }
  });

  const failed = orders.filter(o => o.invoiceSendError !== null).length;
  const pending = orders.length - failed;

  return {
    pending,
    failed,
    orders
  };
}
