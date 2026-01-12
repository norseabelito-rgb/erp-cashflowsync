import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "picking.logs");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const pickingListId = searchParams.get("pickingListId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (action && action !== "all") {
      where.action = action;
    }

    if (pickingListId) {
      where.pickingListId = pickingListId;
    }

    if (search) {
      where.OR = [
        { itemSku: { contains: search, mode: "insensitive" } },
        { itemTitle: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { pickingList: { code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.pickingLog.findMany({
        where,
        include: {
          pickingList: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pickingLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching picking logs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
