import prisma from "./db";
import { Prisma, GoodsReceiptStatus } from "@prisma/client";

// NIR status type for the workflow
// Note: Uses GoodsReceiptStatus enum values from Prisma
type NIRWorkflowStatus = 'GENERAT' | 'TRIMIS_OFFICE' | 'VERIFICAT' | 'APROBAT' | 'IN_STOC' | 'RESPINS';

export interface TransitionContext {
  userId: string;
  userName: string;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  nir?: any;
  hasDifferences?: boolean;
}

interface TransitionConfig {
  validFrom: NIRWorkflowStatus[];
  guard: (nir: any, context?: TransitionContext) => Promise<{ valid: boolean; error?: string }>;
  postAction?: (nir: any, tx: Prisma.TransactionClient, context?: TransitionContext) => Promise<void>;
}

/**
 * NIR workflow transition definitions
 *
 * Flow: GENERAT -> TRIMIS_OFFICE -> VERIFICAT -> APROBAT -> IN_STOC
 *                                           \-> RESPINS (rejection path)
 *
 * If hasDifferences = true at VERIFICAT, manager must approve differences before APROBAT
 */
export const NIR_TRANSITIONS: Record<NIRWorkflowStatus, TransitionConfig> = {
  GENERAT: {
    // Initial state - no transition TO this state (created by system)
    validFrom: [],
    guard: async () => ({ valid: false, error: 'Status initial - nu se poate tranzitiona' })
  },
  TRIMIS_OFFICE: {
    validFrom: ['GENERAT'],
    guard: async (nir) => {
      // Require supplier invoice before sending to office
      if (!nir.supplierInvoiceId) {
        return { valid: false, error: 'Factura furnizor este obligatorie' };
      }
      return { valid: true };
    },
    postAction: async (nir, tx) => {
      await tx.goodsReceipt.update({
        where: { id: nir.id },
        data: { sentToOfficeAt: new Date() }
      });
    }
  },
  VERIFICAT: {
    validFrom: ['TRIMIS_OFFICE'],
    guard: async () => ({ valid: true }),
    postAction: async (nir, tx, context) => {
      await tx.goodsReceipt.update({
        where: { id: nir.id },
        data: {
          verifiedAt: new Date(),
          verifiedBy: context?.userId,
          verifiedByName: context?.userName
        }
      });
    }
  },
  APROBAT: {
    validFrom: ['VERIFICAT'],
    guard: async (nir) => {
      // If has differences, must have differences approved by manager
      if (nir.hasDifferences && !nir.differencesApprovedBy) {
        return { valid: false, error: 'Diferentele trebuie aprobate de manager' };
      }
      return { valid: true };
    }
  },
  IN_STOC: {
    validFrom: ['APROBAT'],
    guard: async () => ({ valid: true }),
    postAction: async (nir, tx) => {
      await tx.goodsReceipt.update({
        where: { id: nir.id },
        data: { transferredToStockAt: new Date() }
      });
      // Note: Actual stock transfer happens in transfer-stock/route.ts
      // This postAction only records the timestamp
    }
  },
  RESPINS: {
    validFrom: ['VERIFICAT'],
    guard: async () => ({ valid: true })
  }
};

/**
 * Transition NIR to a new status with validation guards
 *
 * @param nirId - The GoodsReceipt ID to transition
 * @param targetStatus - The target workflow status
 * @param context - User context for audit trail
 * @returns TransitionResult with success status and optional error/nir data
 */
export async function transitionNIR(
  nirId: string,
  targetStatus: NIRWorkflowStatus,
  context: TransitionContext
): Promise<TransitionResult> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId },
    include: {
      items: { include: { item: true } },
      supplier: true
    }
  });

  if (!nir) {
    return { success: false, error: 'NIR nu a fost gasit' };
  }

  const transition = NIR_TRANSITIONS[targetStatus];
  if (!transition) {
    return { success: false, error: `Status invalid: ${targetStatus}` };
  }

  // Check if transition is valid from current status
  const currentStatus = nir.status as NIRWorkflowStatus;
  if (!transition.validFrom.includes(currentStatus)) {
    return {
      success: false,
      error: `Tranzitie invalida: ${currentStatus} -> ${targetStatus}`
    };
  }

  // Run guard
  const guardResult = await transition.guard(nir, context);
  if (!guardResult.valid) {
    return { success: false, error: guardResult.error };
  }

  // Execute transition in transaction
  const updatedNir = await prisma.$transaction(async (tx) => {
    const updated = await tx.goodsReceipt.update({
      where: { id: nirId },
      data: { status: targetStatus as GoodsReceiptStatus }
    });

    if (transition.postAction) {
      await transition.postAction(nir, tx, context);
    }

    return updated;
  });

  return {
    success: true,
    nir: updatedNir,
    hasDifferences: nir.hasDifferences ?? false
  };
}

/**
 * Approve differences on a NIR (manager action)
 * Only available when status = VERIFICAT and hasDifferences = true
 *
 * @param nirId - The GoodsReceipt ID
 * @param context - User context (manager who approves)
 * @returns TransitionResult with success status
 */
export async function approveDifferences(
  nirId: string,
  context: TransitionContext
): Promise<TransitionResult> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId }
  });

  if (!nir) {
    return { success: false, error: 'NIR nu a fost gasit' };
  }

  if (nir.status !== 'VERIFICAT') {
    return { success: false, error: 'NIR-ul trebuie sa fie in status VERIFICAT' };
  }

  if (!nir.hasDifferences) {
    return { success: false, error: 'NIR-ul nu are diferente de aprobat' };
  }

  const updated = await prisma.goodsReceipt.update({
    where: { id: nirId },
    data: {
      differencesApprovedBy: context.userId,
      differencesApprovedByName: context.userName,
      differencesApprovedAt: new Date()
    }
  });

  return { success: true, nir: updated };
}

/**
 * Get available transitions for a NIR based on current status
 *
 * @param nirId - The GoodsReceipt ID
 * @returns List of valid target statuses
 */
export async function getAvailableTransitions(nirId: string): Promise<{
  currentStatus: string;
  availableTransitions: NIRWorkflowStatus[];
  requiresDifferenceApproval: boolean;
}> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId },
    select: { status: true, hasDifferences: true, differencesApprovedBy: true }
  });

  if (!nir) {
    return { currentStatus: 'UNKNOWN', availableTransitions: [], requiresDifferenceApproval: false };
  }

  const currentStatus = nir.status as NIRWorkflowStatus;
  const availableTransitions: NIRWorkflowStatus[] = [];

  // Find all transitions that can be made from current status
  for (const [targetStatus, config] of Object.entries(NIR_TRANSITIONS)) {
    if (config.validFrom.includes(currentStatus)) {
      availableTransitions.push(targetStatus as NIRWorkflowStatus);
    }
  }

  // Check if difference approval is required
  const requiresDifferenceApproval =
    currentStatus === 'VERIFICAT' &&
    nir.hasDifferences === true &&
    !nir.differencesApprovedBy;

  return {
    currentStatus,
    availableTransitions,
    requiresDifferenceApproval
  };
}
