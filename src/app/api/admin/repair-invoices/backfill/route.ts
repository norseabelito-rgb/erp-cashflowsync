import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/repair-invoices/backfill
 * One-time backfill: completeaza stornoNumber/stornoSeries pe audit entries vechi
 * care nu au aceste campuri in metadata.
 * Cauta in DB pe Invoice records (stornoNumber/stornoSeries).
 * Super admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Doar super admin poate rula backfill" },
        { status: 403 }
      );
    }

    // Find audit entries with action invoice.repaired
    const entries = await prisma.auditLog.findMany({
      where: { action: "invoice.repaired" },
    });

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const entry of entries) {
      const meta = (entry.metadata as Record<string, any>) || {};

      // Skip if already has storno info
      if (meta.stornoNumber) {
        skipped++;
        continue;
      }

      // Try to find storno info from Invoice record
      if (entry.entityId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: entry.entityId },
          select: { stornoNumber: true, stornoSeries: true },
        });

        if (invoice?.stornoNumber) {
          await prisma.auditLog.update({
            where: { id: entry.id },
            data: {
              metadata: {
                ...meta,
                stornoNumber: invoice.stornoNumber,
                stornoSeries: invoice.stornoSeries,
              },
            },
          });
          updated++;
          continue;
        }
      }

      notFound++;
    }

    return NextResponse.json({
      success: true,
      total: entries.length,
      updated,
      skipped,
      notFound,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/repair-invoices/backfill:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
