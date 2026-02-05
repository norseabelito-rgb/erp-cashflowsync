/**
 * Temu Order Status Mapping
 *
 * Temu uses these statuses for orders (based on API documentation):
 * - PENDING: Order just created, awaiting payment confirmation
 * - PROCESSING: Order is being prepared
 * - SHIPPED: Order has been shipped
 * - DELIVERED: Order has been delivered
 * - CANCELLED: Order has been cancelled
 * - RETURNED: Order has been returned
 * - REFUNDED: Order has been refunded
 *
 * Note: Actual Temu status values may vary - log unknown statuses for adjustment.
 */

// Note: OrderStatus enum may not include all values until Prisma client is regenerated
// Using string type for compatibility during migration
type OrderStatus =
  | "PENDING"
  | "VALIDATED"
  | "VALIDATION_FAILED"
  | "WAIT_TRANSFER"
  | "INVOICE_PENDING"
  | "INVOICE_ERROR"
  | "INVOICED"
  | "PICKING"
  | "PACKED"
  | "AWB_PENDING"
  | "AWB_CREATED"
  | "AWB_ERROR"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type TemuOrderStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PROCESSING"
  | "CONFIRMED"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "RETURN_REQUESTED"
  | "REFUNDED"
  | string; // Allow unknown statuses

export interface TemuStatusInfo {
  value: string;
  label: string;
  labelRo: string;
  description: string;
  descriptionRo: string;
  color: "default" | "primary" | "secondary" | "success" | "warning" | "destructive";
  bgColor: string;
  textColor: string;
  canProcess: boolean;
  canShip: boolean;
  canCancel: boolean;
  canReturn: boolean;
  sortOrder: number;
}

export const TEMU_STATUS_MAP: Record<string, TemuStatusInfo> = {
  PENDING: {
    value: "PENDING",
    label: "Pending",
    labelRo: "In asteptare",
    description: "Order is pending payment or confirmation",
    descriptionRo: "Comanda este in asteptare",
    color: "primary",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    canProcess: true,
    canShip: false,
    canCancel: true,
    canReturn: false,
    sortOrder: 1,
  },
  AWAITING_PAYMENT: {
    value: "AWAITING_PAYMENT",
    label: "Awaiting Payment",
    labelRo: "Asteapta plata",
    description: "Order is awaiting payment confirmation",
    descriptionRo: "Comanda asteapta confirmarea platii",
    color: "warning",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
    canProcess: false,
    canShip: false,
    canCancel: true,
    canReturn: false,
    sortOrder: 2,
  },
  PROCESSING: {
    value: "PROCESSING",
    label: "Processing",
    labelRo: "In procesare",
    description: "Order is being processed and prepared",
    descriptionRo: "Comanda este in curs de procesare si pregatire",
    color: "warning",
    bgColor: "bg-status-warning/10 dark:bg-status-warning/30",
    textColor: "text-status-warning dark:text-status-warning",
    canProcess: true,
    canShip: true,
    canCancel: true,
    canReturn: false,
    sortOrder: 3,
  },
  CONFIRMED: {
    value: "CONFIRMED",
    label: "Confirmed",
    labelRo: "Confirmata",
    description: "Order has been confirmed",
    descriptionRo: "Comanda a fost confirmata",
    color: "secondary",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    canProcess: true,
    canShip: true,
    canCancel: true,
    canReturn: false,
    sortOrder: 4,
  },
  SHIPPED: {
    value: "SHIPPED",
    label: "Shipped",
    labelRo: "Expediata",
    description: "Order has been shipped",
    descriptionRo: "Comanda a fost expediata",
    color: "default",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    textColor: "text-sky-700 dark:text-sky-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 5,
  },
  IN_TRANSIT: {
    value: "IN_TRANSIT",
    label: "In Transit",
    labelRo: "In tranzit",
    description: "Order is in transit to customer",
    descriptionRo: "Comanda este in tranzit catre client",
    color: "default",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-700 dark:text-indigo-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 6,
  },
  DELIVERED: {
    value: "DELIVERED",
    label: "Delivered",
    labelRo: "Livrata",
    description: "Order has been delivered to customer",
    descriptionRo: "Comanda a fost livrata clientului",
    color: "success",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: true,
    sortOrder: 7,
  },
  CANCELLED: {
    value: "CANCELLED",
    label: "Cancelled",
    labelRo: "Anulata",
    description: "Order has been cancelled",
    descriptionRo: "Comanda a fost anulata",
    color: "destructive",
    bgColor: "bg-status-error/10 dark:bg-status-error/30",
    textColor: "text-status-error dark:text-status-error",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 8,
  },
  RETURNED: {
    value: "RETURNED",
    label: "Returned",
    labelRo: "Returnata",
    description: "Order has been returned",
    descriptionRo: "Comanda a fost returnata",
    color: "destructive",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    textColor: "text-rose-700 dark:text-rose-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 9,
  },
  RETURN_REQUESTED: {
    value: "RETURN_REQUESTED",
    label: "Return Requested",
    labelRo: "Retur solicitat",
    description: "Customer has requested a return",
    descriptionRo: "Clientul a solicitat un retur",
    color: "warning",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: true,
    sortOrder: 10,
  },
  REFUNDED: {
    value: "REFUNDED",
    label: "Refunded",
    labelRo: "Rambursat",
    description: "Order has been refunded",
    descriptionRo: "Comanda a fost rambursata",
    color: "destructive",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    textColor: "text-gray-700 dark:text-gray-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 11,
  },
};

// Default status info for unknown statuses
const DEFAULT_STATUS: TemuStatusInfo = {
  value: "Unknown",
  label: "Unknown",
  labelRo: "Necunoscut",
  description: "Unknown order status",
  descriptionRo: "Status necunoscut al comenzii",
  color: "default",
  bgColor: "bg-gray-100 dark:bg-gray-900/30",
  textColor: "text-gray-700 dark:text-gray-300",
  canProcess: false,
  canShip: false,
  canCancel: false,
  canReturn: false,
  sortOrder: 99,
};

/**
 * Get status info for a Temu order status
 */
export function getTemuStatusInfo(status: string): TemuStatusInfo {
  const normalizedStatus = status?.toUpperCase() || "";
  return (
    TEMU_STATUS_MAP[normalizedStatus] || {
      ...DEFAULT_STATUS,
      value: status,
      label: status,
      labelRo: status,
    }
  );
}

/**
 * Get Romanian label for a status
 */
export function getTemuStatusLabel(status: string, lang: "en" | "ro" = "ro"): string {
  const info = getTemuStatusInfo(status);
  return lang === "ro" ? info.labelRo : info.label;
}

/**
 * Get all statuses sorted by order
 */
export function getAllTemuStatuses(): TemuStatusInfo[] {
  return Object.values(TEMU_STATUS_MAP).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get statuses that can be processed (need action)
 */
export function getProcessableStatuses(): string[] {
  return Object.entries(TEMU_STATUS_MAP)
    .filter(([, info]) => info.canProcess)
    .map(([status]) => status);
}

/**
 * Get statuses that indicate an order can be shipped
 */
export function getShippableStatuses(): string[] {
  return Object.entries(TEMU_STATUS_MAP)
    .filter(([, info]) => info.canShip)
    .map(([status]) => status);
}

/**
 * Check if an order can be cancelled based on its status
 */
export function canCancelTemuOrder(status: string): boolean {
  return getTemuStatusInfo(status).canCancel;
}

/**
 * Check if an order can be returned based on its status
 */
export function canReturnTemuOrder(status: string): boolean {
  return getTemuStatusInfo(status).canReturn;
}

/**
 * Map Temu status to internal Order status
 * Maps Temu order statuses to the OrderStatus enum used in the Order table
 */
export function mapTemuToInternalStatus(temuStatus: string): OrderStatus {
  const normalizedStatus = temuStatus?.toUpperCase() || "";

  switch (normalizedStatus) {
    case "PENDING":
    case "AWAITING_PAYMENT":
      return "PENDING";

    case "PROCESSING":
    case "CONFIRMED":
      return "VALIDATED";

    case "SHIPPED":
    case "IN_TRANSIT":
      return "SHIPPED";

    case "DELIVERED":
      return "DELIVERED";

    case "CANCELLED":
      return "CANCELLED";

    case "RETURNED":
    case "RETURN_REQUESTED":
      return "RETURNED";

    case "REFUNDED":
      return "CANCELLED"; // Refunded orders treated as cancelled

    default:
      console.log(
        `[Temu Status] Unknown status: ${temuStatus}, defaulting to PENDING`
      );
      return "PENDING";
  }
}

/**
 * Map internal Order status to Temu status
 * Useful for reverse mapping if needed
 */
export function mapInternalToTemuStatus(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "VALIDATED":
    case "VALIDATION_FAILED":
    case "WAIT_TRANSFER":
      return "PROCESSING";
    case "INVOICE_PENDING":
    case "INVOICE_ERROR":
    case "INVOICED":
      return "PROCESSING";
    case "PICKING":
    case "PACKED":
    case "AWB_PENDING":
    case "AWB_CREATED":
    case "AWB_ERROR":
      return "PROCESSING";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    case "RETURNED":
      return "RETURNED";
    default:
      return "PENDING";
  }
}

/**
 * Normalize a status value to the standard format
 * Handles variations in casing and common formats
 */
export function normalizeTemuStatus(status: string): string {
  if (!status) return "UNKNOWN";

  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, "_");

  // Check if it's a known status
  if (TEMU_STATUS_MAP[normalized]) {
    return normalized;
  }

  // Handle common variations
  const variations: Record<string, string> = {
    AWAITING: "AWAITING_PAYMENT",
    IN_PROGRESS: "PROCESSING",
    TRANSIT: "IN_TRANSIT",
    RETURN: "RETURNED",
    REFUND: "REFUNDED",
  };

  return variations[normalized] || normalized;
}

/**
 * Get badge variant for status
 */
export function getTemuStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  const info = getTemuStatusInfo(status);
  const colorMap: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  > = {
    default: "default",
    primary: "default",
    secondary: "secondary",
    success: "success",
    warning: "warning",
    destructive: "destructive",
  };
  return colorMap[info.color] || "default";
}
