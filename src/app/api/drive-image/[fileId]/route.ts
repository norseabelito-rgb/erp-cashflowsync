import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getDriveClient } from "@/lib/google-drive";

// Cache pentru imagini (în memorie - pentru development)
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 oră

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    // Verifică cache
    const cached = imageCache.get(fileId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(cached.data, {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Obține credențialele
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.googleDriveCredentials) {
      return NextResponse.json({ error: "Google Drive not configured" }, { status: 500 });
    }

    let credentials;
    try {
      credentials = JSON.parse(settings.googleDriveCredentials);
    } catch {
      return NextResponse.json({ error: "Invalid Google Drive credentials" }, { status: 500 });
    }

    // Descarcă imaginea
    const drive = getDriveClient(credentials);
    
    // Obține metadata pentru content type
    const metadata = await drive.files.get({
      fileId,
      fields: "mimeType, name",
    });

    const mimeType = metadata.data.mimeType || "image/jpeg";

    // Descarcă conținutul
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const imageData = response.data as ArrayBuffer;

    // Salvează în cache
    imageCache.set(fileId, {
      data: imageData,
      contentType: mimeType,
      timestamp: Date.now(),
    });

    // Curăță cache-ul vechi (păstrează max 100 imagini)
    if (imageCache.size > 100) {
      const entries = Array.from(imageCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < entries.length - 100; i++) {
        imageCache.delete(entries[i][0]);
      }
    }

    return new Response(imageData, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Error fetching drive image:", error);
    
    // Returnează o imagine placeholder în caz de eroare
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect fill="#1a1a2e" width="200" height="200"/>
        <text x="100" y="100" fill="#666" text-anchor="middle" font-family="sans-serif" font-size="12">
          Image Error
        </text>
      </svg>`;
    
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}
