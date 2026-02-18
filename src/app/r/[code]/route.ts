import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Short link redirect: /r/{code} -> original URL
 * Public, no auth required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const link = await prisma.shortLink.findUnique({
    where: { code },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Increment clicks (fire-and-forget)
  prisma.shortLink.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.redirect(link.url, 302);
}
