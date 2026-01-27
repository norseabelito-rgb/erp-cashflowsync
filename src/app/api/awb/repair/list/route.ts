import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/db";

/**
 * GET /api/awb/repair/list
 *
 * List AWBs that might need repair (truncated AWB numbers).
 *
 * Query params:
 * - startDate?: string (ISO date, default: 30 days ago)
 * - endDate?: string (ISO date, default: today)
 * - limit?: number (default: 50)
 *
 * Response:
 * - success: boolean
 * - awbs: array of AWB details
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Require admin permission
    const isAdmin = await hasPermission(session.user.id, "admin");
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Doar administratorii pot vedea aceasta lista" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limitParam = searchParams.get("limit");

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all FanCourier AWBs in the date range
    const awbs = await prisma.aWB.findMany({
      where: {
        awbNumber: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: {
          select: {
            shopifyOrderNumber: true,
            customerName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const awbList = awbs.map((awb) => ({
      id: awb.id,
      awbNumber: awb.awbNumber,
      awbLength: awb.awbNumber?.length || 0,
      orderId: awb.orderId,
      orderNumber: awb.order?.shopifyOrderNumber || awb.orderId,
      customerName: awb.order?.customerName || "N/A",
      createdAt: awb.createdAt.toISOString(),
      // Flag AWBs that might be truncated (less than 13 chars is suspicious for FanCourier)
      possiblyTruncated: (awb.awbNumber?.length || 0) < 13,
    }));

    return NextResponse.json({
      success: true,
      count: awbList.length,
      awbs: awbList,
    });
  } catch (error: any) {
    console.error("Error listing AWBs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
