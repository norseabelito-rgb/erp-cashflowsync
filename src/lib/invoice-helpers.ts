/**
 * Invoice Helper Functions
 *
 * Utilities for working with the 1:many Order→Invoice relationship.
 * Used across the codebase to get the "active" invoice from an order's invoices array.
 */

interface InvoiceLike {
  id: string;
  status: string;
  createdAt: Date;
  [key: string]: any;
}

/**
 * Returns the most recent non-cancelled invoice (the "active" one).
 * Priority: issued > pending > error, then by createdAt desc.
 */
export function getActiveInvoice<T extends InvoiceLike>(invoices: T[]): T | null {
  if (!invoices || invoices.length === 0) return null;

  const statusPriority: Record<string, number> = {
    issued: 0,
    pending: 1,
    error: 2,
  };

  const active = invoices
    .filter((inv) => inv.status !== "cancelled")
    .sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return active[0] || null;
}

/**
 * Returns true if any invoice in the array has status "issued".
 */
export function hasIssuedInvoice<T extends InvoiceLike>(invoices: T[]): boolean {
  if (!invoices || invoices.length === 0) return false;
  return invoices.some((inv) => inv.status === "issued");
}
