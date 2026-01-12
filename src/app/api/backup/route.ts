import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { google } from "googleapis";
import { extractFolderId } from "@/lib/google-drive";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max 60 seconds for backup

// POST - Create backup
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

    // Get settings
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({
        success: false,
        error: "Setările nu au fost configurate",
      }, { status: 400 });
    }

    if (!settings.backupFolderUrl) {
      return NextResponse.json({
        success: false,
        error: "Folderul Google Drive pentru backup nu este configurat",
      }, { status: 400 });
    }

    // Extract folder ID
    const folderId = extractFolderId(settings.backupFolderUrl);
    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: "URL-ul folderului Google Drive este invalid",
      }, { status: 400 });
    }

    // Check Google Drive credentials
    if (!settings.googleDriveCredentials) {
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

    // Export all tables
    const backupData = await exportDatabase();

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;
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

    const media = {
      mimeType: "application/json",
      body: fileContent,
    };

    // Use resumable upload for large files
    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: "application/json",
        body: require("stream").Readable.from([fileContent]),
      },
      fields: "id, name, size, createdTime, webViewLink",
    });

    // Update last backup time
    await prisma.settings.update({
      where: { id: settings.id },
      data: { backupLastAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: driveFile.data.id,
        name: driveFile.data.name,
        size: driveFile.data.size,
        createdTime: driveFile.data.createdTime,
        webViewLink: driveFile.data.webViewLink,
      },
      message: `Backup creat cu succes: ${fileName}`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la creare backup";
    console.error("Error creating backup:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

// GET - List backups from Google Drive
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "settings.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    // Get settings
    const settings = await prisma.settings.findFirst();
    if (!settings?.backupFolderUrl || !settings?.googleDriveCredentials) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Backup-ul nu este configurat",
      });
    }

    const folderId = extractFolderId(settings.backupFolderUrl);
    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: "URL-ul folderului este invalid",
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

    // List backup files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'backup-' and mimeType = 'application/json' and trashed = false`,
      fields: "files(id, name, size, createdTime, webViewLink)",
      orderBy: "createdTime desc",
      pageSize: 50,
    });

    const backups = (response.data.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size ? parseInt(file.size) : 0,
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
    }));

    return NextResponse.json({
      success: true,
      data: backups,
      lastBackup: settings.backupLastAt,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Eroare la listare backup-uri";
    console.error("Error listing backups:", error);
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
    masterProducts,
    masterProductImages,
    masterProductChannels,
    orders,
    lineItems,
    invoices,
    awbs,
    inventoryItems,
    inventoryRecipeComponents,
    inventoryStockMovements,
    suppliers,
    goodsReceipts,
    goodsReceiptItems,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password hash for security
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
        shopifyDomain: true,
        shopifyApiVersion: true,
        smartbillApiUrl: true,
        smartbillEmail: true,
        smartbillCompanyVatCode: true,
        smartbillCompanyName: true,
        smartbillSeriesName: true,
        smartbillWarehouseName: true,
        trendyolSupplierId: true,
        trendyolApiBaseUrl: true,
        googleDriveFolderId: true,
        defaultDeliveryDays: true,
        defaultShippingCost: true,
        backupFolderUrl: true,
        backupAutoEnabled: true,
        backupAutoTime: true,
        backupLastAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive keys/tokens
      },
    }),
    prisma.store.findMany(),
    prisma.masterProduct.findMany(),
    prisma.masterProductImage.findMany(),
    prisma.masterProductChannel.findMany(),
    prisma.order.findMany(),
    prisma.lineItem.findMany(),
    prisma.invoice.findMany(),
    prisma.aWB.findMany(),
    prisma.inventoryItem.findMany(),
    prisma.inventoryRecipeComponent.findMany(),
    prisma.inventoryStockMovement.findMany(),
    prisma.supplier.findMany(),
    prisma.goodsReceipt.findMany(),
    prisma.goodsReceiptItem.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    tables: {
      users,
      roles,
      permissions,
      rolePermissions,
      userRoleAssignments,
      invitations,
      settings,
      stores,
      masterProducts,
      masterProductImages,
      masterProductChannels,
      orders,
      lineItems,
      invoices,
      awbs,
      inventoryItems,
      inventoryRecipeComponents,
      inventoryStockMovements,
      suppliers,
      goodsReceipts,
      goodsReceiptItems,
    },
    counts: {
      users: users.length,
      roles: roles.length,
      permissions: permissions.length,
      stores: stores.length,
      masterProducts: masterProducts.length,
      orders: orders.length,
      invoices: invoices.length,
      inventoryItems: inventoryItems.length,
      suppliers: suppliers.length,
    },
  };
}
