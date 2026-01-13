import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Directorul pentru upload (poate fi configurat să folosească storage extern)
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Tipuri de fișiere permise
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Dimensiune maximă (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST - Upload imagine pentru comentariu AWB
 *
 * Body: FormData cu:
 * - file: Fișierul imagine
 * - awbId: ID-ul AWB-ului (pentru organizare în foldere)
 * - commentId: (opțional) ID-ul comentariului dacă există deja
 */
export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea
    const canEdit = await hasPermission(session.user.id, "awb.edit");
    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a încărca fișiere" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const awbId = formData.get("awbId") as string | null;
    const commentId = formData.get("commentId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Fișierul este obligatoriu" },
        { status: 400 }
      );
    }

    if (!awbId) {
      return NextResponse.json(
        { success: false, error: "ID-ul AWB este obligatoriu" },
        { status: 400 }
      );
    }

    // Verificăm tipul fișierului
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tip de fișier nepermis. Acceptăm: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Verificăm dimensiunea
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Fișierul este prea mare. Maxim 5MB." },
        { status: 400 }
      );
    }

    // Verificăm că AWB-ul există
    const awb = await prisma.aWB.findUnique({
      where: { id: awbId },
      select: { id: true, awbNumber: true },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Generăm un nume unic pentru fișier
    const fileExtension = file.name.split(".").pop() || "jpg";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;

    // Organizăm în foldere per AWB
    const folderPath = join(UPLOAD_DIR, "awb-comments", awbId);
    const filePath = join(folderPath, uniqueFilename);
    const storagePath = `/uploads/awb-comments/${awbId}/${uniqueFilename}`;

    // Creăm directorul dacă nu există
    await mkdir(folderPath, { recursive: true });

    // Salvăm fișierul
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Creăm înregistrarea în baza de date
    // Dacă nu avem commentId, imaginea va fi orfană temporar până la crearea comentariului
    const image = await prisma.aWBCommentImage.create({
      data: {
        commentId: commentId || undefined, // Temporar null până la legarea cu comentariul
        filename: file.name,
        storagePath,
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        filename: image.filename,
        storagePath: image.storagePath,
        mimeType: image.mimeType,
        size: image.size,
      },
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
