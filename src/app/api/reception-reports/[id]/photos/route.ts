import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { PhotoCategory, ReceptionReportStatus } from "@prisma/client";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Directorul pentru upload
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Tipuri de fisiere permise
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Extensii permise
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

// Dimensiune maxima (10MB pentru poze de receptie)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Categorii valide
const VALID_CATEGORIES = Object.values(PhotoCategory);

/**
 * GET - Lista poze receptie, grupate pe categorie
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificam raportul
    const report = await prisma.receptionReport.findUnique({
      where: { id },
      select: { id: true, purchaseOrderId: true },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    const photos = await prisma.receptionPhoto.findMany({
      where: { receptionReportId: id },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });

    // Grupam pe categorie
    const photosByCategory: Record<string, typeof photos> = {};
    for (const category of VALID_CATEGORIES) {
      photosByCategory[category] = photos.filter((p) => p.category === category);
    }

    return NextResponse.json({
      success: true,
      data: {
        photos,
        byCategory: photosByCategory,
        counts: {
          total: photos.length,
          overview: photosByCategory.OVERVIEW?.length || 0,
          etichete: photosByCategory.ETICHETE?.length || 0,
          deteriorari: photosByCategory.DETERIORARI?.length || 0,
          factura: photosByCategory.FACTURA?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching reception photos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la citirea pozelor",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Upload poza receptie
 * FormData: file, category (OVERVIEW, ETICHETE, DETERIORARI, FACTURA)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificam raportul
    const report = await prisma.receptionReport.findUnique({
      where: { id },
      select: { id: true, purchaseOrderId: true, status: true },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Doar DESCHIS sau IN_COMPLETARE pot primi poze
    if (
      report.status !== ReceptionReportStatus.DESCHIS &&
      report.status !== ReceptionReportStatus.IN_COMPLETARE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Nu se pot adauga poze in status ${report.status}`,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoryStr = formData.get("category") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Fisierul este obligatoriu" },
        { status: 400 }
      );
    }

    if (!categoryStr) {
      return NextResponse.json(
        { success: false, error: "Categoria este obligatorie" },
        { status: 400 }
      );
    }

    // Validam categoria
    const category = categoryStr.toUpperCase() as PhotoCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Categorie invalida: ${categoryStr}. Valori acceptate: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validam tipul fisierului
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tip de fisier nepermis. Acceptam: JPEG, PNG, WebP, HEIC",
        },
        { status: 400 }
      );
    }

    // Validam dimensiunea
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Fisierul este prea mare. Maxim 10MB." },
        { status: 400 }
      );
    }

    // Generam nume unic
    const rawExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const fileExtension = ALLOWED_EXTENSIONS.includes(rawExtension)
      ? rawExtension
      : "jpg";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;

    // Path: /uploads/receptii/{purchaseOrderId}/{receptionReportId}/{filename}
    const folderPath = join(
      UPLOAD_DIR,
      "receptii",
      report.purchaseOrderId,
      id
    );
    const filePath = join(folderPath, uniqueFilename);
    const storagePath = `/uploads/receptii/${report.purchaseOrderId}/${id}/${uniqueFilename}`;

    // Cream directorul
    await mkdir(folderPath, { recursive: true });

    // Salvam fisierul
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Cream inregistrarea in DB
    const photo = await prisma.receptionPhoto.create({
      data: {
        receptionReportId: id,
        category,
        filename: file.name,
        storagePath,
        mimeType: file.type,
        size: file.size,
      },
    });

    // Actualizam statusul la IN_COMPLETARE daca era DESCHIS
    if (report.status === ReceptionReportStatus.DESCHIS) {
      await prisma.receptionReport.update({
        where: { id },
        data: { status: ReceptionReportStatus.IN_COMPLETARE },
      });
    }

    return NextResponse.json({
      success: true,
      data: photo,
      message: `Poza ${category.toLowerCase()} incarcata cu succes`,
    });
  } catch (error: any) {
    console.error("Error uploading reception photo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la incarcarea pozei",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Sterge poza receptie
 * Query param: photoId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: "ID-ul pozei este obligatoriu" },
        { status: 400 }
      );
    }

    // Verificam raportul
    const report = await prisma.receptionReport.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Raportul de receptie nu a fost gasit" },
        { status: 404 }
      );
    }

    // Doar DESCHIS sau IN_COMPLETARE permit stergerea
    if (
      report.status !== ReceptionReportStatus.DESCHIS &&
      report.status !== ReceptionReportStatus.IN_COMPLETARE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Nu se pot sterge poze in status ${report.status}`,
        },
        { status: 400 }
      );
    }

    // Gasim poza
    const photo = await prisma.receptionPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Poza nu a fost gasita" },
        { status: 404 }
      );
    }

    // Verificam ca poza apartine raportului
    if (photo.receptionReportId !== id) {
      return NextResponse.json(
        { success: false, error: "Poza nu apartine acestui raport" },
        { status: 400 }
      );
    }

    // Stergem fisierul fizic
    try {
      const filePath = join(UPLOAD_DIR, photo.storagePath.replace("/uploads/", ""));
      await unlink(filePath);
    } catch (fileError) {
      // Log dar continuam - poate fisierul nu exista
      console.warn("Could not delete file:", fileError);
    }

    // Stergem din DB
    await prisma.receptionPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({
      success: true,
      message: "Poza a fost stearsa",
    });
  } catch (error: any) {
    console.error("Error deleting reception photo:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la stergerea pozei",
      },
      { status: 500 }
    );
  }
}
