import prisma from "./db";
import { EntityType, ActionType } from "@prisma/client";

interface LogActivityParams {
  entityType: EntityType;
  entityId?: string;
  action: ActionType;
  description: string;
  details?: Record<string, any>;
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  invoiceSeries?: string;
  awbNumber?: string;
  productSku?: string;
  success?: boolean;
  errorMessage?: string;
  source?: string;
}

/**
 * Înregistrează o activitate în log
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        description: params.description,
        details: params.details || undefined,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        invoiceNumber: params.invoiceNumber,
        invoiceSeries: params.invoiceSeries,
        awbNumber: params.awbNumber,
        productSku: params.productSku,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
        source: params.source || "manual",
      },
    });
    
    console.log(`📝 Activity logged: ${params.action} - ${params.description}`);
    return log;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Nu aruncăm eroarea pentru a nu bloca operațiunea principală
    return null;
  }
}

/**
 * Obține istoricul pentru o entitate specifică
 */
export async function getEntityHistory(entityType: EntityType, entityId: string) {
  return prisma.activityLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Obține istoricul pentru o comandă (inclusiv facturi și AWB-uri asociate)
 */
export async function getOrderHistory(orderId: string) {
  return prisma.activityLog.findMany({
    where: {
      orderId,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Obține istoricul general cu paginare
 */
export async function getActivityHistory(params: {
  page?: number;
  limit?: number;
  entityType?: EntityType;
  action?: ActionType;
  startDate?: Date;
  endDate?: Date;
  orderId?: string;
  success?: boolean;
}) {
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.entityType) where.entityType = params.entityType;
  if (params.action) where.action = params.action;
  if (params.orderId) where.orderId = params.orderId;
  if (params.success !== undefined) where.success = params.success;
  
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Helper pentru logarea emiterii facturii
 */
export async function logInvoiceIssued(params: {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceSeries: string;
  total: number;
  dueDate?: Date;
}) {
  return logActivity({
    entityType: "INVOICE",
    entityId: params.orderId,
    action: "ISSUE_INVOICE",
    description: `Factură ${params.invoiceSeries}${params.invoiceNumber} emisă pentru comanda #${params.orderNumber} (${params.total} RON)${params.dueDate ? ` - Scadență: ${params.dueDate.toLocaleDateString("ro-RO")}` : ""}`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    invoiceNumber: params.invoiceNumber,
    invoiceSeries: params.invoiceSeries,
    details: {
      total: params.total,
      dueDate: params.dueDate?.toISOString(),
    },
    source: "manual",
  });
}

/**
 * Helper pentru logarea anulării facturii
 */
export async function logInvoiceCancelled(params: {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceSeries: string;
  stornoNumber?: string;
  stornoSeries?: string;
  reason?: string;
}) {
  return logActivity({
    entityType: "INVOICE",
    entityId: params.orderId,
    action: "CANCEL_INVOICE",
    description: `Factură ${params.invoiceSeries}${params.invoiceNumber} anulată pentru comanda #${params.orderNumber}${params.stornoNumber ? ` (stornare: ${params.stornoSeries}${params.stornoNumber})` : ""}${params.reason ? ` - Motiv: ${params.reason}` : ""}`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    invoiceNumber: params.invoiceNumber,
    invoiceSeries: params.invoiceSeries,
    details: {
      stornoNumber: params.stornoNumber,
      stornoSeries: params.stornoSeries,
      reason: params.reason,
    },
    source: "manual",
  });
}

/**
 * Helper pentru logarea creării AWB
 */
export async function logAWBCreated(params: {
  orderId: string;
  orderNumber: string;
  awbNumber: string;
  courier: string;
}) {
  return logActivity({
    entityType: "AWB",
    entityId: params.orderId,
    action: "CREATE_AWB",
    description: `AWB ${params.awbNumber} creat pentru comanda #${params.orderNumber} (${params.courier})`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    awbNumber: params.awbNumber,
    source: "manual",
  });
}

/**
 * Helper pentru logarea actualizării status AWB
 */
export async function logAWBStatusUpdate(params: {
  orderId: string;
  orderNumber: string;
  awbNumber: string;
  oldStatus: string;
  newStatus: string;
  statusText?: string;
}) {
  return logActivity({
    entityType: "AWB",
    entityId: params.orderId,
    action: "UPDATE_AWB_STATUS",
    description: `Status AWB ${params.awbNumber} actualizat: ${params.oldStatus} → ${params.newStatus}${params.statusText ? ` (${params.statusText})` : ""}`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    awbNumber: params.awbNumber,
    details: {
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      statusText: params.statusText,
    },
    source: "sync",
  });
}

/**
 * Helper pentru logarea mișcărilor de stoc
 */
export async function logStockMovement(params: {
  productSku: string;
  productName: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  oldQuantity: number;
  newQuantity: number;
  reason?: string;
  orderId?: string;
  orderNumber?: string;
}) {
  const actionMap = {
    IN: "STOCK_IN" as ActionType,
    OUT: "STOCK_OUT" as ActionType,
    ADJUST: "STOCK_ADJUST" as ActionType,
  };

  const typeText = {
    IN: "Intrare stoc",
    OUT: "Ieșire stoc",
    ADJUST: "Ajustare stoc",
  };

  return logActivity({
    entityType: "STOCK",
    entityId: params.productSku,
    action: actionMap[params.type],
    description: `${typeText[params.type]} pentru ${params.productName}: ${params.oldQuantity} → ${params.newQuantity} (${params.type === "OUT" ? "-" : "+"}${Math.abs(params.quantity)})${params.reason ? ` - ${params.reason}` : ""}`,
    productSku: params.productSku,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    details: {
      type: params.type,
      quantity: params.quantity,
      oldQuantity: params.oldQuantity,
      newQuantity: params.newQuantity,
      reason: params.reason,
    },
    source: params.orderId ? "auto" : "manual",
  });
}

/**
 * Helper pentru logarea sincronizării stocurilor
 */
export async function logStockSync(params: {
  direction: "smartbill_to_erp" | "erp_to_smartbill";
  productsUpdated: number;
  details?: Array<{ sku: string; oldQty: number; newQty: number }>;
  success: boolean;
  errorMessage?: string;
}) {
  const directionText = params.direction === "smartbill_to_erp" 
    ? "SmartBill → ERP" 
    : "ERP → SmartBill";

  return logActivity({
    entityType: "STOCK",
    action: "STOCK_SYNC",
    description: params.success 
      ? `Sincronizare stocuri ${directionText}: ${params.productsUpdated} produse actualizate`
      : `Sincronizare stocuri ${directionText} eșuată: ${params.errorMessage}`,
    details: {
      direction: params.direction,
      productsUpdated: params.productsUpdated,
      changes: params.details,
    },
    success: params.success,
    errorMessage: params.errorMessage,
    source: "sync",
  });
}

/**
 * Helper pentru logarea plății primite
 */
export async function logPaymentReceived(params: {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceSeries: string;
  amount: number;
  method?: string;
}) {
  return logActivity({
    entityType: "INVOICE",
    entityId: params.orderId,
    action: "PAYMENT_RECEIVED",
    description: `Plată ${params.amount} RON primită pentru factura ${params.invoiceSeries}${params.invoiceNumber} (comanda #${params.orderNumber})${params.method ? ` - ${params.method}` : ""}`,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    invoiceNumber: params.invoiceNumber,
    invoiceSeries: params.invoiceSeries,
    details: {
      amount: params.amount,
      method: params.method,
    },
    source: "manual",
  });
}
