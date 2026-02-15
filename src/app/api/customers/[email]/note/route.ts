import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { validateEmbedToken } from "@/lib/embed-auth";

// POST /api/customers/[email]/note - Save or update customer note
// Note: The [email] param is now a customerKey (email, phone, or name:First Last)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Check if this is an embed request (token-based auth for iframe access)
    const isEmbedRequest = validateEmbedToken(request);

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

    const { email: encodedKey } = await params;
    // Use customerKey as the note identifier (email for email-based, full key for others)
    const customerKey = decodeURIComponent(encodedKey).toLowerCase();
    const body = await request.json();
    const { note } = body;

    if (typeof note !== "string") {
      return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
    }

    // Upsert the note using customerKey as the unique identifier
    const customerNote = await prisma.customerNote.upsert({
      where: { email: customerKey },
      update: {
        note,
        updatedBy: userId,
      },
      create: {
        email: customerKey,
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
// Note: The [email] param is now a customerKey (email, phone, or name:First Last)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Check if this is an embed request (token-based auth for iframe access)
    const isEmbedRequest = validateEmbedToken(request);

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

    const { email: encodedKey } = await params;
    const customerKey = decodeURIComponent(encodedKey).toLowerCase();

    const customerNote = await prisma.customerNote.findUnique({
      where: { email: customerKey },
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
