import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { FANCOURIER_STATUSES, formatStatusForDisplay } from "@/lib/fancourier-statuses";

interface StatusStat {
  code: string;
  name: string;
  description: string;
  color: string;
  count: number;
  isFinal: boolean;
}

export async function GET() {
  try {
    // Verificam autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Verificam permisiunea de vizualizare AWB
    const canView = await hasPermission(session.user.id, "awb.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza AWB-uri" },
        { status: 403 }
      );
    }

    // Get counts grouped by fanCourierStatusCode
    const statusCounts = await prisma.aWB.groupBy({
      by: ["fanCourierStatusCode"],
      _count: { id: true },
    });

    // Get total count
    const total = await prisma.aWB.count();

    // Transform into structured response
    const statusStats: StatusStat[] = [];

    let unknownCount = 0;

    for (const item of statusCounts) {
      const code = item.fanCourierStatusCode;
      const count = item._count.id;

      if (!code) {
        // AWBs without status code - count as unknown/pending
        unknownCount += count;
        continue;
      }

      const statusInfo = FANCOURIER_STATUSES[code];
      if (statusInfo) {
        const display = formatStatusForDisplay(code);
        statusStats.push({
          code,
          name: statusInfo.name,
          description: statusInfo.description,
          color: display.color,
          count,
          isFinal: statusInfo.isFinal,
        });
      } else {
        // Unknown status code
        unknownCount += count;
      }
    }

    // Sort by count descending (most common first)
    statusStats.sort((a, b) => b.count - a.count);

    // Add unknown card if there are any
    if (unknownCount > 0) {
      statusStats.push({
        code: "UNKNOWN",
        name: "Necunoscut",
        description: "Statusuri care nu au fost inca mapate",
        color: "#9ca3af",
        count: unknownCount,
        isFinal: false,
      });
    }

    // Verify sum equals total (for debugging)
    const sumOfCounts = statusStats.reduce((sum, s) => sum + s.count, 0);
    if (sumOfCounts !== total) {
      console.warn(`[AWB Stats] Count mismatch: sum=${sumOfCounts}, total=${total}`);
    }

    return NextResponse.json({
      total,
      statusStats,
      sumVerified: sumOfCounts === total,
    });
  } catch (error: unknown) {
    console.error("Error fetching AWB stats:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
