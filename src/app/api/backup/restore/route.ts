import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { google } from "googleapis";

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Max 2 minutes for restore

// POST - Restore from backup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "settings.edit");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json({
        success: false,
        error: "ID-ul backup-ului este obligatoriu",
      }, { status: 400 });
    }

    // Get settings
    const settings = await prisma.settings.findFirst();
    if (!settings?.googleDriveCredentials) {
      return NextResponse.json({
        success: false,
        error: "Credențialele Google Drive nu sunt configurate",
      }, { status: 400 });
    }

    let credentials;
    try {
      credentials = JSON.parse(settings.googleDriveCredentials);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Credențialele Google Drive sunt invalide",
      }, { status: 400 });
    }

    // Initialize Google Drive client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Download backup file
    const response = await drive.files.get(
      { fileId: backupId, alt: "media" },
      { responseType: "text" }
    );

    let backupData;
    try {
      backupData = JSON.parse(response.data as string);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Fișierul backup este corupt sau invalid",
      }, { status: 400 });
    }

    // Validate backup structure
    if (!backupData.tables || !backupData.version) {
      return NextResponse.json({
        success: false,
        error: "Structura backup-ului este invalidă",
      }, { status: 400 });
    }

    // Restore data in transaction
    await restoreDatabase(backupData.tables, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Restore efectuat cu succes. Date restaurate din backup-ul creat la ${backupData.exportedAt}`,
      data: {
        restoredAt: new Date().toISOString(),
        backupDate: backupData.exportedAt,
        counts: backupData.counts,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la restore";
    console.error("Error restoring backup:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// Helper function to restore database tables
async function restoreDatabase(tables: Record<string, any[]>, currentUserId: string) {
  // Important: We restore in a specific order due to foreign key constraints
  // Also, we preserve the current user and settings to avoid being locked out

  await prisma.$transaction(async (tx) => {
    // 1. Clear dependent tables first (in reverse dependency order)
    await tx.goodsReceiptItem.deleteMany({});
    await tx.goodsReceipt.deleteMany({});
    await tx.stockMovement.deleteMany({});
    await tx.recipeComponent.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.storeProduct.deleteMany({});
    await tx.productImage.deleteMany({});
    await tx.awbEntry.deleteMany({});
    await tx.invoice.deleteMany({});
    await tx.order.deleteMany({});
    await tx.masterProduct.deleteMany({});
    await tx.inventoryItem.deleteMany({});
    await tx.supplier.deleteMany({});
    await tx.store.deleteMany({});
    await tx.invitation.deleteMany({});
    await tx.userRole.deleteMany({});
    await tx.rolePermission.deleteMany({});

    // Don't delete users, roles, permissions, settings - we'll update them instead
    // This prevents locking out the current user

    // 2. Restore independent tables first
    if (tables.permissions?.length > 0) {
      for (const permission of tables.permissions) {
        await tx.permission.upsert({
          where: { id: permission.id },
          update: permission,
          create: permission,
        });
      }
    }

    if (tables.roles?.length > 0) {
      for (const role of tables.roles) {
        await tx.role.upsert({
          where: { id: role.id },
          update: role,
          create: role,
        });
      }
    }

    if (tables.rolePermissions?.length > 0) {
      for (const rp of tables.rolePermissions) {
        await tx.rolePermission.create({ data: rp });
      }
    }

    // Restore users (but keep current user's password intact)
    if (tables.users?.length > 0) {
      for (const user of tables.users) {
        // Skip updating password - the backup doesn't include it for security
        const existingUser = await tx.user.findUnique({ where: { id: user.id } });
        if (existingUser) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              name: user.name,
              email: user.email,
              // Keep existing password
            },
          });
        }
        // Don't create new users from backup (security)
      }
    }

    if (tables.userRoles?.length > 0) {
      for (const ur of tables.userRoles) {
        await tx.userRole.create({ data: ur });
      }
    }

    if (tables.invitations?.length > 0) {
      for (const inv of tables.invitations) {
        await tx.invitation.create({ data: inv });
      }
    }

    // 3. Restore business data tables
    if (tables.suppliers?.length > 0) {
      for (const supplier of tables.suppliers) {
        await tx.supplier.create({ data: supplier });
      }
    }

    if (tables.stores?.length > 0) {
      for (const store of tables.stores) {
        await tx.store.create({ data: store });
      }
    }

    if (tables.inventoryItems?.length > 0) {
      for (const item of tables.inventoryItems) {
        await tx.inventoryItem.create({ data: item });
      }
    }

    if (tables.recipeComponents?.length > 0) {
      for (const comp of tables.recipeComponents) {
        await tx.recipeComponent.create({ data: comp });
      }
    }

    if (tables.stockMovements?.length > 0) {
      for (const movement of tables.stockMovements) {
        await tx.stockMovement.create({ data: movement });
      }
    }

    if (tables.masterProducts?.length > 0) {
      for (const product of tables.masterProducts) {
        await tx.masterProduct.create({ data: product });
      }
    }

    if (tables.productImages?.length > 0) {
      for (const image of tables.productImages) {
        await tx.productImage.create({ data: image });
      }
    }

    if (tables.storeProducts?.length > 0) {
      for (const sp of tables.storeProducts) {
        await tx.storeProduct.create({ data: sp });
      }
    }

    if (tables.orders?.length > 0) {
      for (const order of tables.orders) {
        await tx.order.create({ data: order });
      }
    }

    if (tables.orderItems?.length > 0) {
      for (const item of tables.orderItems) {
        await tx.orderItem.create({ data: item });
      }
    }

    if (tables.invoices?.length > 0) {
      for (const invoice of tables.invoices) {
        await tx.invoice.create({ data: invoice });
      }
    }

    if (tables.awbEntries?.length > 0) {
      for (const awb of tables.awbEntries) {
        await tx.awbEntry.create({ data: awb });
      }
    }

    if (tables.goodsReceipts?.length > 0) {
      for (const receipt of tables.goodsReceipts) {
        await tx.goodsReceipt.create({ data: receipt });
      }
    }

    if (tables.goodsReceiptItems?.length > 0) {
      for (const item of tables.goodsReceiptItems) {
        await tx.goodsReceiptItem.create({ data: item });
      }
    }

    // Note: Settings are NOT restored to prevent breaking the current configuration
    // (API keys, credentials, etc.)
  });
}
