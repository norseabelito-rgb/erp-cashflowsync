import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { google } from "googleapis";
import { extractFolderId } from "@/lib/google-drive";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron Job: Automatic Backup
 *
 * Checks if backup is enabled and if it's the right time to run.
 * Should be called every hour by external scheduler.
 *
 * Usage:
 *   GET /api/cron/backup
 *   Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (MANDATORY)
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET) {
      console.error("[Backup Cron] CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error: CRON_SECRET not set" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Backup Cron] Called without valid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get settings
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({
        skipped: true,
        reason: "Setările nu sunt configurate",
      });
    }

    // Check if auto backup is enabled
    if (!settings.backupAutoEnabled) {
      return NextResponse.json({
        skipped: true,
        reason: "Backup automat este dezactivat",
      });
    }

    // Check if it's time to run
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Parse configured time (format: "HH:MM")
    const [configuredHour, configuredMinute] = (settings.backupAutoTime || "03:00")
      .split(":")
      .map(Number);

    // Only run if current hour matches and we're within the first 15 minutes
    if (currentHour !== configuredHour || currentMinute > 15) {
      return NextResponse.json({
        skipped: true,
        reason: `Nu este ora programată. Ora curentă: ${currentHour}:${String(currentMinute).padStart(2, '0')}, Ora programată: ${configuredHour}:${String(configuredMinute).padStart(2, '0')}`,
      });
    }

    // Check if we already ran today
    if (settings.backupLastAt) {
      const lastRun = new Date(settings.backupLastAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastRun >= today) {
        return NextResponse.json({
          skipped: true,
          reason: "Backup-ul a fost deja creat azi",
          lastRun: lastRun.toISOString(),
        });
      }
    }

    // Validate backup configuration
    if (!settings.backupFolderUrl) {
      return NextResponse.json({
        skipped: true,
        reason: "Folderul Google Drive pentru backup nu este configurat",
      });
    }

    const folderId = extractFolderId(settings.backupFolderUrl);
    if (!folderId) {
      return NextResponse.json({
        skipped: true,
        reason: "URL-ul folderului Google Drive este invalid",
      });
    }

    if (!settings.googleDriveCredentials) {
      return NextResponse.json({
        skipped: true,
        reason: "Credențialele Google Drive nu sunt configurate",
      });
    }

    let credentials;
    try {
      credentials = JSON.parse(settings.googleDriveCredentials);
    } catch {
      return NextResponse.json({
        skipped: true,
        reason: "Credențialele Google Drive sunt invalide",
      });
    }

    console.log(`[Backup Cron] Starting automatic backup at ${now.toISOString()}`);

    // Export all tables
    const backupData = await exportDatabase();

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-auto-${timestamp}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Initialize Google Drive client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Upload to Google Drive
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      mimeType: "application/json",
    };

    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: "application/json",
        body: require("stream").Readable.from([fileContent]),
      },
      fields: "id, name, size, createdTime, webViewLink",
      supportsAllDrives: true,
    });

    // Update last backup time
    await prisma.settings.update({
      where: { id: settings.id },
      data: { backupLastAt: new Date() },
    });

    console.log(`[Backup Cron] Automatic backup completed: ${fileName}`);

    return NextResponse.json({
      success: true,
      data: {
        id: driveFile.data.id,
        name: driveFile.data.name,
        size: driveFile.data.size,
        createdTime: driveFile.data.createdTime,
      },
      message: `Backup automat creat: ${fileName}`,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la backup automat";
    console.error("[Backup Cron] Error:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// Helper function to export all database tables
async function exportDatabase() {
  const [
    users,
    roles,
    permissions,
    rolePermissions,
    userRoleAssignments,
    invitations,
    settings,
    stores,
    companies,
    masterProducts,
    masterProductImages,
    masterProductChannels,
    orders,
    lineItems,
    invoices,
    awbs,
    invoiceSeries,
    inventoryItems,
    inventoryRecipeComponents,
    inventoryStockMovements,
    suppliers,
    goodsReceipts,
    goodsReceiptItems,
    warehouses,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.rolePermission.findMany(),
    prisma.userRoleAssignment.findMany(),
    prisma.invitation.findMany(),
    prisma.settings.findMany({
      select: {
        id: true,
        defaultWeight: true,
        defaultServiceType: true,
        defaultPaymentType: true,
        defaultPackages: true,
        senderName: true,
        senderPhone: true,
        senderEmail: true,
        senderCounty: true,
        senderCity: true,
        senderStreet: true,
        senderNumber: true,
        senderPostalCode: true,
        handoverAutoCloseTime: true,
        handoverTimezone: true,
        aiModel: true,
        aiDailyAnalysisEnabled: true,
        aiDailyAnalysisTime: true,
        backupFolderUrl: true,
        backupAutoEnabled: true,
        backupAutoTime: true,
        backupLastAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.store.findMany(),
    prisma.company.findMany(),
    prisma.masterProduct.findMany(),
    prisma.masterProductImage.findMany(),
    prisma.masterProductChannel.findMany(),
    prisma.order.findMany(),
    prisma.lineItem.findMany(),
    prisma.invoice.findMany(),
    prisma.aWB.findMany(),
    prisma.invoiceSeries.findMany(),
    prisma.inventoryItem.findMany(),
    prisma.inventoryRecipeComponent.findMany(),
    prisma.inventoryStockMovement.findMany(),
    prisma.supplier.findMany(),
    prisma.goodsReceipt.findMany(),
    prisma.goodsReceiptItem.findMany(),
    prisma.warehouse.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: "1.1",
    type: "automatic",
    tables: {
      users,
      roles,
      permissions,
      rolePermissions,
      userRoleAssignments,
      invitations,
      settings,
      stores,
      companies,
      masterProducts,
      masterProductImages,
      masterProductChannels,
      orders,
      lineItems,
      invoices,
      awbs,
      invoiceSeries,
      inventoryItems,
      inventoryRecipeComponents,
      inventoryStockMovements,
      suppliers,
      goodsReceipts,
      goodsReceiptItems,
      warehouses,
    },
    counts: {
      users: users.length,
      roles: roles.length,
      stores: stores.length,
      companies: companies.length,
      masterProducts: masterProducts.length,
      orders: orders.length,
      invoices: invoices.length,
      awbs: awbs.length,
      inventoryItems: inventoryItems.length,
      warehouses: warehouses.length,
    },
  };
}

export async function POST(request: NextRequest) {
  return GET(request);
}
