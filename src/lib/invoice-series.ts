import prisma from "@/lib/db";

/**
 * Get the next invoice number for a series and increment the counter
 * @param seriesId - The ID of the invoice series
 * @returns Object with prefix, number and formatted string, or null if series not found/inactive
 */
export async function getNextInvoiceNumber(seriesId: string): Promise<{
  prefix: string;
  number: number;
  formatted: string;
} | null> {
  const series = await prisma.invoiceSeries.findUnique({
    where: { id: seriesId },
  });

  if (!series || !series.isActive) {
    return null;
  }

  const currentNumber = series.currentNumber;

  // Increment the number for the next invoice
  await prisma.invoiceSeries.update({
    where: { id: seriesId },
    data: { currentNumber: currentNumber + 1 },
  });

  return {
    prefix: series.prefix,
    number: currentNumber,
    formatted: `${series.prefix}${currentNumber.toString().padStart(6, "0")}`,
  };
}

/**
 * Get the default invoice series
 * @returns The default series or null if none set
 */
export async function getDefaultInvoiceSeries() {
  return prisma.invoiceSeries.findFirst({
    where: { isDefault: true, isActive: true },
  });
}

/**
 * Get invoice series by store ID
 * Falls back to default series if store doesn't have one assigned
 * @param storeId - The store ID
 * @returns The series for the store or the default series
 */
export async function getInvoiceSeriesForStore(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { invoiceSeries: true },
  });

  if (store?.invoiceSeries) {
    return store.invoiceSeries;
  }

  return getDefaultInvoiceSeries();
}
