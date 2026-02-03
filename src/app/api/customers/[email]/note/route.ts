import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

// POST /api/customers/[email]/note - Save or update customer note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Check if this is an embed request (skip auth for whitelisted domains)
    const origin = request.headers.get("origin") || "";
    const allowedDomains = process.env.EMBED_ALLOWED_DOMAINS?.split(",").map(d => d.trim()) || [];
    const isEmbedRequest = allowedDomains.some(domain => origin.startsWith(domain));

    let userId: string | null = null;

    if (!isEmbedRequest) {
      // Normal auth check
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const canView = await hasPermission(session.user.id, "orders.view");
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = session.user.id;
    }

    const { email: encodedEmail } = await params;
    const email = decodeURIComponent(encodedEmail).toLowerCase();
    const body = await request.json();
    const { note } = body;

    if (typeof note !== "string") {
      return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
    }

    // Upsert the note
    const customerNote = await prisma.customerNote.upsert({
      where: { email },
      update: {
        note,
        updatedBy: userId,
      },
      create: {
        email,
        note,
        updatedBy: userId,
      },
    });

    return NextResponse.json({ success: true, note: customerNote });
  } catch (error) {
    console.error("Error saving customer note:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}

// GET /api/customers/[email]/note - Get customer note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Check if this is an embed request
    const origin = request.headers.get("origin") || "";
    const allowedDomains = process.env.EMBED_ALLOWED_DOMAINS?.split(",").map(d => d.trim()) || [];
    const isEmbedRequest = allowedDomains.some(domain => origin.startsWith(domain));

    if (!isEmbedRequest) {
      // Normal auth check
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const canView = await hasPermission(session.user.id, "orders.view");
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { email: encodedEmail } = await params;
    const email = decodeURIComponent(encodedEmail).toLowerCase();

    const customerNote = await prisma.customerNote.findUnique({
      where: { email },
    });

    return NextResponse.json({ note: customerNote?.note || "" });
  } catch (error) {
    console.error("Error fetching customer note:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}
