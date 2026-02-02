/**
 * Shared AWB Status Categorization Module
 *
 * This module provides consistent status categorization logic used by:
 * - Dashboard stats (for "In Tranzit" count)
 * - Tracking page (for status filtering and display)
 *
 * IMPORTANT: Any changes here affect both dashboard and tracking page counts.
 * Ensure both use the same categorization to avoid discrepancies.
 */

/**
 * Status categories for AWB tracking
 * Used to group various carrier-specific statuses into logical buckets
 */
export type StatusCategory =
  | "pending"
  | "in_transit"
  | "delivered"
  | "returned"
  | "cancelled"
  | "deleted"
  | "error"
  | "unknown";

/**
 * Categorize an AWB status string into a logical category
 *
 * This function normalizes various carrier-specific status strings
 * (FanCourier, Cargus, DPD, etc.) into consistent categories.
 *
 * @param status - The raw status string from the carrier
 * @returns The StatusCategory for the given status
 *
 * @example
 * getStatusCategory("In tranzit catre destinatar") // => "in_transit"
 * getStatusCategory("Colet livrat") // => "delivered"
 * getStatusCategory("Retur catre expeditor") // => "returned"
 */
export function getStatusCategory(status: string | null): StatusCategory {
  if (!status) return "pending";

  const s = status.toLowerCase();

  // Deleted statuses (check first - most specific)
  if (s.includes("sters") || s.includes("deleted")) {
    return "deleted";
  }

  // Cancelled statuses
  if (
    s.includes("anulat") ||
    s.includes("cancelled") ||
    s.includes("canceled")
  ) {
    return "cancelled";
  }

  // Return/refusal statuses
  if (s.includes("retur") || s.includes("refuz") || s.includes("return")) {
    return "returned";
  }

  // Delivered statuses
  if (s.includes("livrat") || s.includes("delivered") || s.includes("predat")) {
    return "delivered";
  }

  // In transit statuses (most common carrier terms)
  // Note: "expedit" matches "expediat" which means shipped/dispatched
  if (
    s.includes("tranzit") ||
    s.includes("transit") ||
    s.includes("livrare") ||
    s.includes("preluat") ||
    s.includes("ridicat") ||
    s.includes("sortare") ||
    s.includes("depozit") ||
    s.includes("expedit")
  ) {
    return "in_transit";
  }

  // Pending/waiting statuses
  if (
    s.includes("asteptare") ||
    s.includes("pending") ||
    s.includes("avizat") ||
    s.includes("contact") ||
    s.includes("reprogramat")
  ) {
    return "pending";
  }

  // Error statuses
  if (
    s.includes("eroare") ||
    s.includes("error") ||
    s.includes("gresit") ||
    s.includes("incomplet") ||
    s.includes("nu raspunde")
  ) {
    return "error";
  }

  return "unknown";
}

/**
 * Configuration for category display in UI
 * Provides consistent labels and colors across the application
 */
export const categoryConfig: Record<
  StatusCategory,
  { label: string; color: string }
> = {
  pending: { label: "In asteptare", color: "warning" },
  in_transit: { label: "In tranzit", color: "info" },
  delivered: { label: "Livrat", color: "success" },
  returned: { label: "Returnat", color: "destructive" },
  cancelled: { label: "Anulat", color: "neutral" },
  deleted: { label: "Sters", color: "neutral" },
  error: { label: "Eroare", color: "destructive" },
  unknown: { label: "Necunoscut", color: "default" },
};

/**
 * Get the Prisma OR clause for filtering AWBs by category
 *
 * This is used by dashboard-stats.ts to count AWBs in a specific category
 * using database-level filtering (more efficient than loading all and filtering)
 *
 * @param category - The StatusCategory to filter for
 * @returns Prisma OR clause conditions, or null if no DB filter possible
 */
export function getCategoryFilterConditions(
  category: StatusCategory
): Array<{ currentStatus: { contains: string; mode: "insensitive" } }> | null {
  switch (category) {
    case "in_transit":
      return [
        { currentStatus: { contains: "tranzit", mode: "insensitive" } },
        { currentStatus: { contains: "transit", mode: "insensitive" } },
        { currentStatus: { contains: "livrare", mode: "insensitive" } },
        { currentStatus: { contains: "preluat", mode: "insensitive" } },
        { currentStatus: { contains: "ridicat", mode: "insensitive" } },
        { currentStatus: { contains: "sortare", mode: "insensitive" } },
        { currentStatus: { contains: "depozit", mode: "insensitive" } },
        { currentStatus: { contains: "expedit", mode: "insensitive" } },
      ];
    case "returned":
      return [
        { currentStatus: { contains: "retur", mode: "insensitive" } },
        { currentStatus: { contains: "refuz", mode: "insensitive" } },
        { currentStatus: { contains: "return", mode: "insensitive" } },
      ];
    case "delivered":
      return [
        { currentStatus: { contains: "livrat", mode: "insensitive" } },
        { currentStatus: { contains: "delivered", mode: "insensitive" } },
        { currentStatus: { contains: "predat", mode: "insensitive" } },
      ];
    case "cancelled":
      return [
        { currentStatus: { contains: "anulat", mode: "insensitive" } },
        { currentStatus: { contains: "cancelled", mode: "insensitive" } },
        { currentStatus: { contains: "canceled", mode: "insensitive" } },
      ];
    case "deleted":
      return [
        { currentStatus: { contains: "sters", mode: "insensitive" } },
        { currentStatus: { contains: "deleted", mode: "insensitive" } },
      ];
    case "error":
      return [
        { currentStatus: { contains: "eroare", mode: "insensitive" } },
        { currentStatus: { contains: "error", mode: "insensitive" } },
        { currentStatus: { contains: "gresit", mode: "insensitive" } },
        { currentStatus: { contains: "incomplet", mode: "insensitive" } },
      ];
    default:
      // pending and unknown cannot be reliably filtered at DB level
      return null;
  }
}
