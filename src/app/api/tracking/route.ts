import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "awb.track");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      awbNumber: { not: null },
    };

    if (status && status !== "all") {
      where.currentStatus = status;
    }

    if (search) {
      where.OR = [
        { awbNumber: { contains: search, mode: "insensitive" } },
        {
          order: {
            shopifyOrderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const awbs = await prisma.aWB.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            customerFirstName: true,
            customerLastName: true,
            shippingCity: true,
            shippingProvince: true,
            store: {
              select: { name: true },
            },
          },
        },
        statusHistory: {
          orderBy: { statusDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ awbs });
  } catch (error: any) {
    console.error("Error fetching AWBs:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
