import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

/**
 * GET - Servește fișierele încărcate
 *
 * Path: /api/upload/awb-comments/{awbId}/{filename}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construim calea către fișier
    const filePath = join(UPLOAD_DIR, ...params.path);

    // Verificăm că fișierul există
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "Fișierul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Citim fișierul
    const fileBuffer = await readFile(filePath);

    // Determinăm MIME type din extensie
    const filename = params.path[params.path.length - 1];
    const extension = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const mimeType = mimeTypes[extension || ""] || "application/octet-stream";

    // Returnăm fișierul cu headers corecte
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Eroare la citirea fișierului" },
      { status: 500 }
    );
  }
}
