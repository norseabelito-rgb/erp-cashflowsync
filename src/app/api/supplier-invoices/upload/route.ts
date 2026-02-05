import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Upload directory (can be configured for external storage)
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// File constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];

/**
 * POST /api/supplier-invoices/upload
 *
 * Upload invoice document scan (PDF, JPG, PNG, WEBP).
 *
 * Body: FormData with:
 * - file: File (required) - The document scan
 * - supplierInvoiceId: string (required) - ID of the invoice to attach to
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const supplierInvoiceId = formData.get("supplierInvoiceId") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: "Fisierul este obligatoriu" },
        { status: 400 }
      );
    }

    if (!supplierInvoiceId) {
      return NextResponse.json(
        { success: false, error: "ID-ul facturii este obligatoriu" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tip de fisier invalid. Acceptat: PDF, JPG, PNG, WEBP",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Fisierul este prea mare. Maximum 10MB" },
        { status: 400 }
      );
    }

    // Verify invoice exists and get supplier ID for folder structure
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: supplierInvoiceId },
      select: {
        id: true,
        supplierId: true,
        documentPath: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    // Generate unique filename with safe extension
    const rawExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const fileExtension = ALLOWED_EXTENSIONS.includes(rawExtension)
      ? rawExtension
      : "pdf";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;

    // Organize in folders: /uploads/facturi-furnizori/{supplierId}/{invoiceId}/{filename}
    const folderPath = join(
      UPLOAD_DIR,
      "facturi-furnizori",
      invoice.supplierId,
      supplierInvoiceId
    );
    const filePath = join(folderPath, uniqueFilename);
    const storagePath = `/uploads/facturi-furnizori/${invoice.supplierId}/${supplierInvoiceId}/${uniqueFilename}`;

    // Create directory if it doesn't exist
    await mkdir(folderPath, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update invoice with document path
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    await prisma.supplierInvoice.update({
      where: { id: supplierInvoiceId },
      data: {
        documentPath: storagePath,
      },
    });

    return NextResponse.json({
      success: true,
      documentPath: storagePath,
      filename: uniqueFilename,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error: unknown) {
    console.error("Error uploading supplier invoice document:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la incarcarea documentului",
      },
      { status: 500 }
    );
  }
}
