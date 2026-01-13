/**
 * Trendyol Order Status Mapping
 *
 * Trendyol uses these statuses for orders:
 * - Created: Order just created
 * - Picking: Order is being picked
 * - Invoiced: Invoice created
 * - Shipped: Order shipped
 * - Delivered: Order delivered
 * - Cancelled: Order cancelled
 * - UnDelivered: Delivery failed
 * - Returned: Order returned
 * - Repack: Order being repacked
 */

export type TrendyolOrderStatus =
  | "Created"
  | "Picking"
  | "Invoiced"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "UnDelivered"
  | "Returned"
  | "Repack"
  | "UnSupplied"
  | "AtCargoSupplied";

export interface StatusInfo {
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

export const TRENDYOL_STATUS_MAP: Record<string, StatusInfo> = {
  Created: {
    value: "Created",
    label: "Created",
    labelRo: "Creată",
    description: "Order has been created and is waiting for processing",
    descriptionRo: "Comanda a fost creată și așteaptă procesarea",
    color: "primary",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    canProcess: true,
    canShip: false,
    canCancel: true,
    canReturn: false,
    sortOrder: 1,
  },
  Picking: {
    value: "Picking",
    label: "Picking",
    labelRo: "În pregătire",
    description: "Order is being picked from warehouse",
    descriptionRo: "Comanda este în curs de pregătire în depozit",
    color: "warning",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    canProcess: true,
    canShip: true,
    canCancel: true,
    canReturn: false,
    sortOrder: 2,
  },
  Invoiced: {
    value: "Invoiced",
    label: "Invoiced",
    labelRo: "Facturată",
    description: "Invoice has been created for this order",
    descriptionRo: "Factura a fost emisă pentru această comandă",
    color: "secondary",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-300",
    canProcess: true,
    canShip: true,
    canCancel: true,
    canReturn: false,
    sortOrder: 3,
  },
  AtCargoSupplied: {
    value: "AtCargoSupplied",
    label: "At Cargo",
    labelRo: "La curier",
    description: "Order has been handed over to cargo provider",
    descriptionRo: "Comanda a fost predată curierului",
    color: "secondary",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-700 dark:text-indigo-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 4,
  },
  Shipped: {
    value: "Shipped",
    label: "Shipped",
    labelRo: "Expediată",
    description: "Order has been shipped",
    descriptionRo: "Comanda a fost expediată",
    color: "default",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    textColor: "text-sky-700 dark:text-sky-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 5,
  },
  Delivered: {
    value: "Delivered",
    label: "Delivered",
    labelRo: "Livrată",
    description: "Order has been delivered to customer",
    descriptionRo: "Comanda a fost livrată clientului",
    color: "success",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: true,
    sortOrder: 6,
  },
  UnDelivered: {
    value: "UnDelivered",
    label: "Undelivered",
    labelRo: "Nelivrată",
    description: "Delivery attempt failed",
    descriptionRo: "Livrarea a eșuat",
    color: "warning",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
    canProcess: false,
    canShip: true,
    canCancel: true,
    canReturn: true,
    sortOrder: 7,
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
    labelRo: "Anulată",
    description: "Order has been cancelled",
    descriptionRo: "Comanda a fost anulată",
    color: "destructive",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 8,
  },
  Returned: {
    value: "Returned",
    label: "Returned",
    labelRo: "Returnată",
    description: "Order has been returned",
    descriptionRo: "Comanda a fost returnată",
    color: "destructive",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    textColor: "text-rose-700 dark:text-rose-300",
    canProcess: false,
    canShip: false,
    canCancel: false,
    canReturn: false,
    sortOrder: 9,
  },
  Repack: {
    value: "Repack",
    label: "Repack",
    labelRo: "Reîmpachetare",
    description: "Order is being repacked",
    descriptionRo: "Comanda este în curs de reîmpachetare",
    color: "warning",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
    canProcess: true,
    canShip: true,
    canCancel: true,
    canReturn: false,
    sortOrder: 10,
  },
  UnSupplied: {
    value: "UnSupplied",
    label: "Unsupplied",
    labelRo: "Neaprovizionată",
    description: "Order could not be supplied",
    descriptionRo: "Comanda nu a putut fi aprovizionată",
    color: "destructive",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    textColor: "text-gray-700 dark:text-gray-300",
    canProcess: false,
    canShip: false,
    canCancel: true,
    canReturn: false,
    sortOrder: 11,
  },
};

// Default status info for unknown statuses
const DEFAULT_STATUS: StatusInfo = {
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
 * Get status info for a Trendyol order status
 */
export function getTrendyolStatusInfo(status: string): StatusInfo {
  return TRENDYOL_STATUS_MAP[status] || { ...DEFAULT_STATUS, value: status, label: status, labelRo: status };
}

/**
 * Get Romanian label for a status
 */
export function getTrendyolStatusLabel(status: string, lang: "en" | "ro" = "ro"): string {
  const info = getTrendyolStatusInfo(status);
  return lang === "ro" ? info.labelRo : info.label;
}

/**
 * Get all statuses sorted by order
 */
export function getAllTrendyolStatuses(): StatusInfo[] {
  return Object.values(TRENDYOL_STATUS_MAP).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get statuses that can be processed (need action)
 */
export function getProcessableStatuses(): string[] {
  return Object.entries(TRENDYOL_STATUS_MAP)
    .filter(([, info]) => info.canProcess)
    .map(([status]) => status);
}

/**
 * Get statuses that indicate an order can be shipped
 */
export function getShippableStatuses(): string[] {
  return Object.entries(TRENDYOL_STATUS_MAP)
    .filter(([, info]) => info.canShip)
    .map(([status]) => status);
}

/**
 * Check if an order can be cancelled based on its status
 */
export function canCancelOrder(status: string): boolean {
  return getTrendyolStatusInfo(status).canCancel;
}

/**
 * Check if an order can be returned based on its status
 */
export function canReturnOrder(status: string): boolean {
  return getTrendyolStatusInfo(status).canReturn;
}

/**
 * Normalize a status value to the standard format
 * Handles variations in casing and common typos
 */
export function normalizeStatus(status: string): string {
  if (!status) return "Unknown";

  const normalized = status.trim();

  // Direct match (case-insensitive)
  const matchedKey = Object.keys(TRENDYOL_STATUS_MAP).find(
    (key) => key.toLowerCase() === normalized.toLowerCase()
  );

  if (matchedKey) return matchedKey;

  // Handle common variations
  const variations: Record<string, string> = {
    "un_delivered": "UnDelivered",
    "undelivered": "UnDelivered",
    "un-delivered": "UnDelivered",
    "at_cargo_supplied": "AtCargoSupplied",
    "atcargosupplied": "AtCargoSupplied",
    "at-cargo-supplied": "AtCargoSupplied",
    "un_supplied": "UnSupplied",
    "unsupplied": "UnSupplied",
    "un-supplied": "UnSupplied",
  };

  const lowerNormalized = normalized.toLowerCase().replace(/[\s_-]+/g, "_");
  if (variations[lowerNormalized]) {
    return variations[lowerNormalized];
  }

  return normalized;
}

/**
 * Map Trendyol status to internal Order status (for orders linked to Shopify)
 */
export function mapTrendyolToInternalStatus(trendyolStatus: string): string {
  const statusMap: Record<string, string> = {
    Created: "PENDING",
    Picking: "PROCESSING",
    Invoiced: "INVOICE_GENERATED",
    AtCargoSupplied: "AWB_GENERATED",
    Shipped: "SHIPPED",
    Delivered: "DELIVERED",
    UnDelivered: "ON_HOLD",
    Cancelled: "CANCELLED",
    Returned: "RETURNED",
    Repack: "PROCESSING",
    UnSupplied: "CANCELLED",
  };

  return statusMap[trendyolStatus] || "PENDING";
}

/**
 * Get badge variant for status
 */
export function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  const info = getTrendyolStatusInfo(status);
  const colorMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
    default: "default",
    primary: "default",
    secondary: "secondary",
    success: "success",
    warning: "warning",
    destructive: "destructive",
  };
  return colorMap[info.color] || "default";
}
