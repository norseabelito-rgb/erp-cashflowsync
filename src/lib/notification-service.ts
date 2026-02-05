import prisma from "./db";

interface NotificationData {
  nirId: string;
  receiptNumber: string;
  supplierId?: string | null;
  hasDifferences?: boolean;
  [key: string]: any;
}

/**
 * Notify Office users that NIR is ready for verification
 * Called when NIR transitions to TRIMIS_OFFICE
 */
export async function notifyOfficeNIRReady(nirId: string): Promise<void> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId },
    include: { supplier: true }
  });

  if (!nir) return;

  // Find users with reception.verify permission via roles
  // First, find the permission
  const permission = await prisma.permission.findUnique({
    where: { code: 'reception.verify' }
  });

  if (!permission) {
    console.warn('Permission reception.verify not found in database');
    return;
  }

  // Find active users with this permission through their roles
  const usersWithPermission = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        // SuperAdmin has all permissions
        { isSuperAdmin: true },
        // Users with direct role containing this permission
        {
          roles: {
            some: {
              role: {
                permissions: {
                  some: {
                    permissionId: permission.id
                  }
                }
              }
            }
          }
        },
        // Users in groups with roles containing this permission
        {
          groups: {
            some: {
              group: {
                roles: {
                  some: {
                    role: {
                      permissions: {
                        some: {
                          permissionId: permission.id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  if (usersWithPermission.length === 0) {
    console.warn('No users with reception.verify permission found for notification');
    return;
  }

  const differenceWarning = nir.hasDifferences ? ' - DIFERENTE' : '';

  const notifications = usersWithPermission.map(user => ({
    userId: user.id,
    type: 'nir_ready_verification',
    title: `NIR ${nir.receiptNumber} - Verificare`,
    message: `NIR de la ${nir.supplier?.name || 'furnizor necunoscut'} asteapta verificare.${differenceWarning}`,
    data: {
      nirId: nir.id,
      receiptNumber: nir.receiptNumber,
      supplierId: nir.supplierId,
      hasDifferences: nir.hasDifferences
    } as NotificationData,
    actionUrl: `/inventory/receipts/${nir.id}`
  }));

  await prisma.notification.createMany({ data: notifications });

  console.log(`[Notification] NIR ${nir.receiptNumber} ready for verification - notified ${usersWithPermission.length} users`);
}

/**
 * Notify Manager (George) that NIR has differences needing approval
 * Called when NIR with differences transitions to VERIFICAT
 */
export async function notifyGeorgeApprovalNeeded(nirId: string): Promise<void> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId },
    include: { supplier: true }
  });

  if (!nir || !nir.hasDifferences) return;

  // Find users with reception.approve_differences permission
  const permission = await prisma.permission.findUnique({
    where: { code: 'reception.approve_differences' }
  });

  if (!permission) {
    console.warn('Permission reception.approve_differences not found in database');
    return;
  }

  // Find active users with this permission through their roles
  const approvers = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        // SuperAdmin has all permissions
        { isSuperAdmin: true },
        // Users with direct role containing this permission
        {
          roles: {
            some: {
              role: {
                permissions: {
                  some: {
                    permissionId: permission.id
                  }
                }
              }
            }
          }
        },
        // Users in groups with roles containing this permission
        {
          groups: {
            some: {
              group: {
                roles: {
                  some: {
                    role: {
                      permissions: {
                        some: {
                          permissionId: permission.id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  if (approvers.length === 0) {
    console.warn('No users with reception.approve_differences permission found');
    return;
  }

  const notifications = approvers.map(user => ({
    userId: user.id,
    type: 'nir_differences_approval',
    title: `NIR ${nir.receiptNumber} - Diferente`,
    message: `NIR de la ${nir.supplier?.name || 'furnizor'} are diferente si necesita aprobare.`,
    data: {
      nirId: nir.id,
      receiptNumber: nir.receiptNumber,
      hasDifferences: true
    } as NotificationData,
    actionUrl: `/inventory/receipts/pending-approval`
  }));

  await prisma.notification.createMany({ data: notifications });

  console.log(`[Notification] NIR ${nir.receiptNumber} differences need approval - notified ${approvers.length} users`);
}

/**
 * Notify warehouse user that NIR was approved and stock transferred
 * Optional - for visibility
 */
export async function notifyNIRStockTransferred(nirId: string): Promise<void> {
  const nir = await prisma.goodsReceipt.findUnique({
    where: { id: nirId },
    include: {
      receptionReport: true
    }
  });

  if (!nir) return;

  // If there's a reception report, notify the warehouse user who created it
  // Otherwise, skip (can't notify if we don't know who to notify)
  if (!nir.receptionReport?.warehouseUserId) {
    console.log(`[Notification] NIR ${nir.receiptNumber} stock transferred - no warehouse user to notify`);
    return;
  }

  await prisma.notification.create({
    data: {
      userId: nir.receptionReport.warehouseUserId,
      type: 'nir_stock_transferred',
      title: `NIR ${nir.receiptNumber} - Stoc transferat`,
      message: `Stocul din NIR ${nir.receiptNumber} a fost adaugat in inventar.`,
      data: {
        nirId: nir.id,
        receiptNumber: nir.receiptNumber
      },
      actionUrl: `/inventory/receipts/${nir.id}`
    }
  });

  console.log(`[Notification] NIR ${nir.receiptNumber} stock transferred - notified warehouse user`);
}
