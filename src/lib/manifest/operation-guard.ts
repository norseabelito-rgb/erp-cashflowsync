/**
 * Operation Guard Service
 *
 * Checks whether manual invoice operations (cancel/mark paid) are allowed.
 * Operations are blocked unless:
 * 1. Invoice exists in appropriate manifest (return manifest for cancel, delivery manifest for payment)
 * 2. User provides valid PIN approval
 *
 * This enforces the manifest-based workflow while allowing authorized exceptions.
 */

import prisma from "../db";
import { ManifestType, ManifestStatus, PINApprovalStatus, PINApprovalType } from "@prisma/client";
import { verifyPIN } from "../pin-service";

export interface OperationCheckResult {
  allowed: boolean;
  reason?: string;
  requiresPIN: boolean;
  manifestId?: string;
  manifestType?: ManifestType;
}

/**
 * Check if an invoice can be manually cancelled
 *
 * Allowed if:
 * - Invoice is in a CONFIRMED or PROCESSED return manifest
 * - OR user provides valid PIN
 */
export async function canCancelInvoice(invoiceId: string): Promise<OperationCheckResult> {
  // Check if invoice exists in a return manifest
  const manifestItem = await prisma.manifestItem.findFirst({
    where: {
      invoiceId,
      manifest: {
        type: ManifestType.RETURN,
        status: { in: [ManifestStatus.CONFIRMED, ManifestStatus.PROCESSED] }
      }
    },
    include: {
      manifest: true
    }
  });

  if (manifestItem) {
    return {
      allowed: true,
      requiresPIN: false,
      manifestId: manifestItem.manifestId,
      manifestType: ManifestType.RETURN
    };
  }

  // Not in manifest - requires PIN
  return {
    allowed: false,
    reason: "Factura nu exista intr-un manifest de retururi confirmat",
    requiresPIN: true
  };
}

/**
 * Check if an invoice can be manually marked as paid
 *
 * Allowed if:
 * - Invoice is in a CONFIRMED or PROCESSED delivery manifest
 * - OR user provides valid PIN
 */
export async function canMarkInvoicePaid(invoiceId: string): Promise<OperationCheckResult> {
  // Check if invoice exists in a delivery manifest
  const manifestItem = await prisma.manifestItem.findFirst({
    where: {
      invoiceId,
      manifest: {
        type: ManifestType.DELIVERY,
        status: { in: [ManifestStatus.CONFIRMED, ManifestStatus.PROCESSED] }
      }
    },
    include: {
      manifest: true
    }
  });

  if (manifestItem) {
    return {
      allowed: true,
      requiresPIN: false,
      manifestId: manifestItem.manifestId,
      manifestType: ManifestType.DELIVERY
    };
  }

  // Not in manifest - requires PIN
  return {
    allowed: false,
    reason: "Factura nu exista intr-un manifest de livrari confirmat",
    requiresPIN: true
  };
}

/**
 * Execute operation with PIN override
 * Creates audit trail and returns success/failure
 */
export async function executeWithPINApproval(
  invoiceId: string,
  operationType: PINApprovalType,
  pin: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  // Verify PIN
  const pinResult = await verifyPIN(pin, userId);

  if (!pinResult.valid) {
    return { success: false, error: pinResult.error || "PIN invalid" };
  }

  // Create approval request record
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.pINApprovalRequest.create({
    data: {
      type: operationType,
      status: PINApprovalStatus.APPROVED,
      invoiceId,
      requestedById: userId,
      reason,
      expiresAt,
      resolvedAt: new Date(),
      resolvedById: userId
    }
  });

  // Log the approval
  await prisma.auditLog.create({
    data: {
      userId,
      action: operationType === PINApprovalType.STORNARE
        ? "invoice.cancel_manual_approved"
        : "invoice.payment_manual_approved",
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: {
        reason,
        approvedAt: new Date().toISOString(),
        source: "pin_approval"
      }
    }
  });

  return { success: true };
}

/**
 * Check the combined status of an invoice for all operations
 */
export async function getInvoiceOperationStatus(invoiceId: string): Promise<{
  canCancel: OperationCheckResult;
  canMarkPaid: OperationCheckResult;
  invoice: {
    status: string;
    paymentStatus: string;
    cancelledAt: Date | null;
    paidAt: Date | null;
  } | null;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      status: true,
      paymentStatus: true,
      cancelledAt: true,
      paidAt: true
    }
  });

  const [canCancel, canMarkPaid] = await Promise.all([
    canCancelInvoice(invoiceId),
    canMarkInvoicePaid(invoiceId)
  ]);

  return {
    canCancel,
    canMarkPaid,
    invoice
  };
}
