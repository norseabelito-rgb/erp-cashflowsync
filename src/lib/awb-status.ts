/**
 * Shared AWB Status Categorization Module
 *
 * This module provides consistent status categorization logic used by:
 * - Dashboard stats (for "In Tranzit" count)
 * - Tracking page (for status filtering and display)
 *
 * IMPORTANT: Any changes here affect both dashboard and tracking page counts.
 * Ensure both use the same categorization to avoid discrepancies.
 *
 * ENHANCED (Phase 07.5): Now uses code-based lookup from FANCOURIER_STATUSES
 * for reliable categorization, with string matching fallback for legacy data.
 */

import { FANCOURIER_STATUSES, type FanCourierStatus } from "./fancourier-statuses";

// Prisma client - lazy import to avoid circular deps and allow mocking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaClient: any = null;
async function getPrisma() {
  if (!prismaClient) {
    const { default: prisma } = await import("./db");
    prismaClient = prisma;
  }
  return prismaClient;
}

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
 * Map FanCourier categories to our StatusCategory
 * This ensures consistent categorization across the application
 */
function mapFanCourierCategory(fcStatus: FanCourierStatus): StatusCategory {
  switch (fcStatus.category) {
    case "pickup":
      // Ridcare (C0, C1) = start of transit
      return "in_transit";
    case "transit":
      // H* codes = in transit between depots
      return "in_transit";
    case "delivery":
      // S1 (in livrare) still in transit, S2 (livrat) is final
      if (fcStatus.isFinal && fcStatus.internalStatus === "DELIVERED") {
        return "delivered";
      }
      return "in_transit";
    case "notice":
      // Avizat statuses = waiting for action (pending)
      return "pending";
    case "problem":
      // Address issues are errors requiring intervention
      return "error";
    case "return":
      // All return/refusal statuses
      return "returned";
    case "cancel":
      // A0-A4 are all cancellations (including A4 "deleted from borderou")
      return "cancelled";
    case "other":
      // S37 (despagubit), S38 (neexpediat), S49 (suspendat)
      if (fcStatus.isFinal) {
        return "error";
      }
      return "pending";
    default:
      return "unknown";
  }
}

/**
 * Categorize an AWB by status code (preferred method)
 *
 * Uses the comprehensive FANCOURIER_STATUSES mapping for reliable categorization.
 * Unknown codes return "unknown" and should be logged for admin review.
 *
 * @param statusCode - The FanCourier status code (e.g., "S2", "H4", "A4")
 * @returns The StatusCategory for the given code
 *
 * @example
 * getStatusCategoryByCode("S2")  // => "delivered"
 * getStatusCategoryByCode("H4")  // => "in_transit"
 * getStatusCategoryByCode("A4")  // => "cancelled" (not "deleted")
 * getStatusCategoryByCode("S6")  // => "returned"
 */
export function getStatusCategoryByCode(statusCode: string | null): StatusCategory {
  if (!statusCode) return "pending";

  const fcStatus = FANCOURIER_STATUSES[statusCode];
  if (!fcStatus) {
    return "unknown";
  }

  return mapFanCourierCategory(fcStatus);
}

/**
 * Categorize an AWB status string into a logical category
 *
 * This function normalizes various carrier-specific status strings
 * (FanCourier, Cargus, DPD, etc.) into consistent categories.
 *
 * ENHANCED: Now accepts optional statusCode for direct lookup.
 * Falls back to string matching only for legacy data without codes.
 *
 * @param status - The raw status string from the carrier
 * @param statusCode - Optional FanCourier status code for direct lookup
 * @returns The StatusCategory for the given status
 *
 * @example
 * getStatusCategory("In tranzit catre destinatar") // => "in_transit"
 * getStatusCategory("Colet livrat", "S2") // => "delivered" (via code lookup)
 * getStatusCategory("Retur catre expeditor") // => "returned"
 */
export function getStatusCategory(
  status: string | null,
  statusCode?: string | null
): StatusCategory {
  // PRIORITY 1: Use code-based lookup if statusCode is provided
  if (statusCode) {
    const codeCategory = getStatusCategoryByCode(statusCode);
    if (codeCategory !== "unknown") {
      return codeCategory;
    }
    // Code was unknown, fall through to string matching as backup
  }

  // PRIORITY 2: String-based matching (legacy fallback)
  if (!status) return "pending";

  const s = status.toLowerCase();

  // Note: "deleted" category removed - A4 (sters) is now categorized as "cancelled"
  // This matches FanCourier's own categorization where A4 is in the "cancel" category

  // Cancelled statuses (including "sters" which is A4 - deleted from borderou)
  if (
    s.includes("anulat") ||
    s.includes("cancelled") ||
    s.includes("canceled") ||
    s.includes("sters") ||
    s.includes("deleted")
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
  deleted: { label: "Sters", color: "neutral" }, // Kept for backward compat, maps to cancelled
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
      // Now includes "sters" (A4 - deleted from borderou is a cancellation type)
      return [
        { currentStatus: { contains: "anulat", mode: "insensitive" } },
        { currentStatus: { contains: "cancelled", mode: "insensitive" } },
        { currentStatus: { contains: "canceled", mode: "insensitive" } },
        { currentStatus: { contains: "sters", mode: "insensitive" } },
        { currentStatus: { contains: "deleted", mode: "insensitive" } },
      ];
    case "deleted":
      // For backward compat - but now treated same as cancelled
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

/**
 * Log an unknown FanCourier status code for admin review
 *
 * This function is fire-and-forget (async, non-blocking) to avoid
 * slowing down status lookups. Uses upsert to increment seenCount
 * if the status code has been seen before.
 *
 * @param statusCode - The unknown FanCourier status code
 * @param statusName - Optional: The name FanCourier returned with this code
 * @param awbNumber - Optional: Sample AWB number for debugging
 */
export function logUnknownStatus(
  statusCode: string,
  statusName?: string,
  awbNumber?: string
): void {
  // Fire-and-forget: don't await, catch errors silently
  getPrisma()
    .then((prisma) => {
      // Use dynamic property access since UnknownAWBStatus model may not be
      // available in Prisma client until regenerated after migration
      const unknownAWBStatus = (prisma as Record<string, unknown>)["unknownAWBStatus"];
      if (!unknownAWBStatus || typeof unknownAWBStatus !== "object") {
        console.warn("[awb-status] UnknownAWBStatus model not available - run prisma generate after migration");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (unknownAWBStatus as any).upsert({
        where: { statusCode },
        create: {
          statusCode,
          statusName: statusName || null,
          sampleAwbNumber: awbNumber || null,
          seenCount: 1,
        },
        update: {
          lastSeenAt: new Date(),
          seenCount: { increment: 1 },
          // Update statusName and sampleAwbNumber if provided
          ...(statusName && { statusName }),
          ...(awbNumber && { sampleAwbNumber: awbNumber }),
        },
      });
    })
    .catch((error) => {
      // Log to console but don't throw - this is non-critical
      console.error("[awb-status] Failed to log unknown status:", statusCode, error);
    });
}

/**
 * Check if a status code is known in FANCOURIER_STATUSES
 * Useful for determining if we should log it as unknown
 */
export function isKnownStatusCode(statusCode: string): boolean {
  return statusCode in FANCOURIER_STATUSES;
}
