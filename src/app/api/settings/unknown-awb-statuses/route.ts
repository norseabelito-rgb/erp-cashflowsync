import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Type for UnknownAWBStatus - matches Prisma model
// Note: Prisma client may need regeneration after migration
interface UnknownAWBStatus {
  id: string;
  statusCode: string;
  statusName: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  seenCount: number;
  sampleAwbNumber: string | null;
  mappedCategory: string | null;
  mappedName: string | null;
  notes: string | null;
}

// Helper to access unknownAWBStatus model (handles Prisma regeneration timing)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getUnknownAWBStatusModel = () => (prisma as any).unknownAWBStatus;

/**
 * GET: List all unknown AWB statuses
 * Returns statuses sorted by seenCount (most frequent first), then lastSeenAt
 */
export async function GET() {
  try {
    const model = getUnknownAWBStatusModel();
    if (!model) {
      return NextResponse.json(
        { error: "UnknownAWBStatus model not available - run prisma generate" },
        { status: 503 }
      );
    }

    const unknownStatuses: UnknownAWBStatus[] = await model.findMany({
      orderBy: [
        { seenCount: "desc" },
        { lastSeenAt: "desc" },
      ],
    });

    return NextResponse.json({ unknownStatuses });
  } catch (error) {
    console.error("[Unknown AWB Statuses API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unknown statuses" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update an unknown status (add mapping or notes)
 * Body: { id, mappedCategory?, mappedName?, notes? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, mappedCategory, mappedName, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const model = getUnknownAWBStatusModel();
    if (!model) {
      return NextResponse.json(
        { error: "UnknownAWBStatus model not available - run prisma generate" },
        { status: 503 }
      );
    }

    const updated: UnknownAWBStatus = await model.update({
      where: { id },
      data: {
        mappedCategory: mappedCategory ?? undefined,
        mappedName: mappedName ?? undefined,
        notes: notes ?? undefined,
      },
    });

    return NextResponse.json({ unknownStatus: updated });
  } catch (error) {
    console.error("[Unknown AWB Statuses API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update unknown status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove an unknown status entry
 * Query param: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const model = getUnknownAWBStatusModel();
    if (!model) {
      return NextResponse.json(
        { error: "UnknownAWBStatus model not available - run prisma generate" },
        { status: 503 }
      );
    }

    await model.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Unknown AWB Statuses API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete unknown status" },
      { status: 500 }
    );
  }
}
