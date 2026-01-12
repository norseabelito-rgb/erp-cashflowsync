import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const activities = await prisma.activityLog.findMany({
      where: {
        orderId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      activities,
    });

  } catch (error: any) {
    console.error("Order activity error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
