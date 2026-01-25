import prisma from "@/lib/db";

/**
 * Get the next invoice number for a series and increment the counter
 * Uses atomic transaction to prevent race conditions
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
    let correctionMessage: string | null = null;

    // Fix: Ensure currentNumber is at least 1 (fix for legacy data with 0 or negative)
    if (currentNumber < 1) {
      const newNumber = Math.max(1, series.startNumber || 1);
      correctionApplied = true;
      correctionMessage = `Numarul seriei a fost corectat automat de la ${currentNumber} la ${newNumber}`;
      currentNumber = newNumber;

      // Update in database
      await tx.invoiceSeries.update({
        where: { id: seriesId },
        data: { currentNumber: currentNumber },
      });

      console.log(`[InvoiceSeries] Auto-corectie: seria ${series.prefix} de la ${series.currentNumber} la ${currentNumber}`);
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
