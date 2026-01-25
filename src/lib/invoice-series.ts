import prisma from "@/lib/db";

/**
 * Extract the numeric portion from a formatted invoice number.
 * Handles formats like "CFG000123" -> 123, "FA-000001" -> 1
 * @param invoiceNumber - The formatted invoice number string
 * @param prefix - The series prefix to remove
 * @returns The extracted number or null if parsing fails
 */
function extractNumberFromInvoice(invoiceNumber: string, prefix: string): number | null {
  // Remove the prefix (case insensitive)
  const withoutPrefix = invoiceNumber.replace(new RegExp(`^${prefix}`, 'i'), '');

  // Remove any separator characters (-, _, etc.)
  const numericPart = withoutPrefix.replace(/^[-_]/, '');

  // Parse the number (parseInt handles leading zeros)
  const parsed = parseInt(numericPart, 10);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Get the next invoice number for a series and increment the counter
 * Uses atomic transaction to prevent race conditions
 * Handles edge cases idempotently:
 * - Negative or zero currentNumber
 * - currentNumber below startNumber
 * - Gap detection (currentNumber behind last issued invoice)
 * @param seriesId - The ID of the invoice series
 * @returns Object with prefix, number and formatted string, or null if series not found/inactive
 */
export async function getNextInvoiceNumber(seriesId: string): Promise<{
  prefix: string;
  number: number;
  formatted: string;
  seriesId: string;
  padding: number;
  oblioSeries: string | null;
  correctionApplied: boolean;
  correctionMessage: string | null;
} | null> {
  // Use transaction for atomic increment
  const result = await prisma.$transaction(async (tx) => {
    const series = await tx.invoiceSeries.findUnique({
      where: { id: seriesId },
    });

    if (!series || !series.isActive) {
      return null;
    }

    let currentNumber = series.currentNumber;
    let correctionApplied = false;
    const corrections: string[] = [];

    // === EDGE CASE 1: Negative or zero ===
    // Legacy data might have invalid currentNumber
    if (currentNumber < 1) {
      const newNumber = Math.max(1, series.startNumber || 1);
      corrections.push(`Numar negativ/zero corectat: ${currentNumber} -> ${newNumber}`);
      currentNumber = newNumber;
      correctionApplied = true;
    }

    // === EDGE CASE 2: Below startNumber ===
    // currentNumber should never be below the configured startNumber
    if (currentNumber < series.startNumber) {
      corrections.push(`Sub startNumber corectat: ${currentNumber} -> ${series.startNumber}`);
      currentNumber = series.startNumber;
      correctionApplied = true;
    }

    // === EDGE CASE 3: Detect gaps by checking last issued invoice ===
    // If currentNumber is behind or equal to the last issued invoice,
    // we need to jump ahead to avoid collisions
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        seriesId: series.id,
        // Only consider invoices that have been numbered (not drafts)
        invoiceNumber: { not: null }
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true }
    });

    if (lastInvoice && lastInvoice.invoiceNumber !== null) {
      // Parse the invoice number from the formatted string (e.g., "CFG000123" -> 123)
      // The invoiceNumber field stores the formatted string, we need to extract the numeric part
      const lastNumber = extractNumberFromInvoice(lastInvoice.invoiceNumber, series.prefix);

      if (lastNumber !== null && lastNumber >= currentNumber) {
        const newNumber = lastNumber + 1;
        corrections.push(`Gap detectat - ultima factura ${lastNumber}, corectat: ${currentNumber} -> ${newNumber}`);
        currentNumber = newNumber;
        correctionApplied = true;
      }
    }

    // Build correction message for logging/return
    const correctionMessage = correctionApplied
      ? `Auto-corectie seria ${series.prefix}: ${corrections.join('; ')}`
      : null;

    // Only update DB if correction was needed (idempotent)
    if (correctionApplied) {
      await tx.invoiceSeries.update({
        where: { id: seriesId },
        data: { currentNumber: currentNumber },
      });
      console.log(`[InvoiceSeries] ${correctionMessage}`);
    }

    const padding = series.numberPadding || 6;

    // Increment the number for the next invoice
    await tx.invoiceSeries.update({
      where: { id: seriesId },
      data: { currentNumber: currentNumber + 1 },
    });

    return {
      prefix: series.prefix,
      number: currentNumber,
      formatted: `${series.prefix}${currentNumber.toString().padStart(padding, "0")}`,
      seriesId: series.id,
      padding,
      oblioSeries: series.oblioSeries,
      correctionApplied,
      correctionMessage,
    };
  });

  return result;
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
 * Falls back to company series, then default series
 * @param storeId - The store ID
 * @returns The series for the store or the default series
 */
export async function getInvoiceSeriesForStore(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      invoiceSeries: true,
      company: {
        include: {
          invoiceSeries: {
            where: { isActive: true, isDefault: true },
            take: 1,
          },
        },
      },
    },
  });

  // 1. Prima prioritate: seria specifică magazinului
  if (store?.invoiceSeries) {
    return store.invoiceSeries;
  }

  // 2. A doua prioritate: seria default a firmei asociate
  if (store?.company?.invoiceSeries?.[0]) {
    return store.company.invoiceSeries[0];
  }

  // 3. Fallback: seria default globală
  return getDefaultInvoiceSeries();
}

/**
 * Get invoice series for a company
 * @param companyId - The company ID
 * @returns The default active series for this company or null
 */
export async function getInvoiceSeriesForCompany(companyId: string) {
  // Prima dată, căutăm seria default a firmei
  const defaultSeries = await prisma.invoiceSeries.findFirst({
    where: {
      companyId,
      isActive: true,
      isDefault: true,
    },
  });

  if (defaultSeries) {
    return defaultSeries;
  }

  // Dacă nu există serie default, returnăm prima serie activă
  return prisma.invoiceSeries.findFirst({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get all active invoice series for a company
 * @param companyId - The company ID
 * @returns All active series for this company
 */
export async function getAllSeriesForCompany(companyId: string) {
  return prisma.invoiceSeries.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" },
    ],
  });
}

/**
 * Validate that a series belongs to a company
 * @param seriesId - The series ID
 * @param companyId - The company ID
 * @returns true if the series belongs to the company
 */
export async function validateSeriesForCompany(
  seriesId: string,
  companyId: string
): Promise<boolean> {
  const series = await prisma.invoiceSeries.findFirst({
    where: {
      id: seriesId,
      companyId,
      isActive: true,
    },
  });

  return !!series;
}

/**
 * Validate that a series can be assigned to a store
 * Series must belong to the store's company and be active
 * @param seriesId - The series ID to validate
 * @param storeId - The store ID
 * @returns Object with valid boolean and error message if invalid
 */
export async function validateSeriesForStore(
  seriesId: string,
  storeId: string
): Promise<{ valid: boolean; error?: string }> {
  // Get store with its company
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { companyId: true, name: true }
  });

  if (!store) {
    return { valid: false, error: "Magazinul nu a fost gasit" };
  }

  if (!store.companyId) {
    return { valid: false, error: "Magazinul nu are o firma asociata. Seteaza firma inainte de a configura seria." };
  }

  // Verify series exists, belongs to company, and is active
  const series = await prisma.invoiceSeries.findFirst({
    where: {
      id: seriesId,
      companyId: store.companyId,
      isActive: true,
    }
  });

  if (!series) {
    return {
      valid: false,
      error: "Seria selectata nu apartine firmei magazinului sau este inactiva"
    };
  }

  return { valid: true };
}

/**
 * Preview next invoice number without incrementing
 * @param seriesId - The series ID
 * @returns The next number that would be assigned
 */
export async function previewNextNumber(seriesId: string): Promise<{
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

  const padding = series.numberPadding || 6;

  return {
    prefix: series.prefix,
    number: series.currentNumber,
    formatted: `${series.prefix}${series.currentNumber.toString().padStart(padding, "0")}`,
  };
}
