import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/db";

/**
 * POST /api/awb/repair/manual
 *
 * Manually repair a specific AWB by providing the correct AWB number.
 * Use this when you know the correct AWB from FanCourier portal.
 *
 * Request body:
 * - awbId: string (database ID of the AWB to repair)
 * - correctAwbNumber: string (the correct AWB number from FanCourier)
 * - dryRun?: boolean (default: false)
 *
 * Response:
 * - success: boolean
 * - oldAwb: string
 * - newAwb: string
 * - message: string
 */
export async function POST(request: NextRequest) {
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
        { success: false, error: "Doar administratorii pot repara AWB-uri" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { awbId, correctAwbNumber, dryRun = false } = body;

    if (!awbId || !correctAwbNumber) {
      return NextResponse.json(
        { success: false, error: "awbId si correctAwbNumber sunt obligatorii" },
        { status: 400 }
      );
    }

    // Get the AWB from database
    const awb = await prisma.aWB.findUnique({
      where: { id: awbId },
      include: {
        order: {
          select: {
            shopifyOrderNumber: true,
          },
        },
      },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost gasit in baza de date" },
        { status: 404 }
      );
    }

    const oldAwb = awb.awbNumber || "";
    const orderNumber = awb.order?.shopifyOrderNumber || awb.orderId;

    console.log("\n" + "=".repeat(60));
    console.log("MANUAL AWB REPAIR");
    console.log("=".repeat(60));
    console.log(`User: ${session.user.email}`);
    console.log(`Order: ${orderNumber}`);
    console.log(`Old AWB: ${oldAwb}`);
    console.log(`New AWB: ${correctAwbNumber}`);
    console.log(`Dry Run: ${dryRun}`);
    console.log("=".repeat(60) + "\n");

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        awbId,
        orderNumber,
        oldAwb,
        newAwb: correctAwbNumber,
        message: `[DRY RUN] AWB ar fi actualizat: ${oldAwb} → ${correctAwbNumber}`,
      });
    }

    // Update the AWB
    await prisma.aWB.update({
      where: { id: awbId },
      data: { awbNumber: correctAwbNumber },
    });

    console.log(`✅ AWB updated successfully`);

    return NextResponse.json({
      success: true,
      dryRun: false,
      awbId,
      orderNumber,
      oldAwb,
      newAwb: correctAwbNumber,
      message: `AWB actualizat: ${oldAwb} → ${correctAwbNumber}`,
    });
  } catch (error: any) {
    console.error("Error in manual AWB repair:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
