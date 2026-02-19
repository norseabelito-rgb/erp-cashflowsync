import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/repair-invoices/history
 * Returneaza istoricul facturilor reparate din audit log.
 * Super admin only.
 */
export async function GET(request: NextRequest) {
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
        { error: "Doar super admin poate accesa istoricul" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    const [total, entries] = await Promise.all([
      prisma.auditLog.count({
        where: { action: "invoice.repaired" },
      }),
      prisma.auditLog.findMany({
        where: { action: "invoice.repaired" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const history = entries.map((entry) => {
      const meta = (entry.metadata as Record<string, any>) || {};
      return {
        id: entry.id,
        date: entry.createdAt,
        user: entry.user?.name || entry.user?.email || "Sistem",
        orderNumber: meta.orderNumber || "-",
        oldInvoice: {
          series: meta.oldInvoiceSeries || null,
          number: meta.oldInvoiceNumber || null,
        },
        stornoInvoice: {
          series: meta.stornoSeries || null,
          number: meta.stornoNumber || null,
        },
        newInvoice: {
          series: meta.newInvoiceSeries || null,
          number: meta.newInvoiceNumber || null,
        },
        reason: meta.reason || null,
      };
    });

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/repair-invoices/history:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
