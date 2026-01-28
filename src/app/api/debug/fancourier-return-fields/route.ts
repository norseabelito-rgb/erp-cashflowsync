/**
 * DEBUG endpoint to check what fields FanCourier returns for AWBs
 * DELETE THIS FILE after testing
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createFanCourierClient } from "@/lib/fancourier";

export async function GET() {
  try {
    console.log("Checking FanCourier AWB response fields...\n");

    // Find an AWB with return status
    const returnAwb = await prisma.aWB.findFirst({
      where: {
        currentStatus: {
          in: [
            "returned",
            "RETURNED",
            "S6",
            "S7",
            "S43",
            "Retur",
            "Refuz primire",
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!returnAwb) {
      // Get any recent AWB to test
      const anyAwb = await prisma.aWB.findFirst({
        orderBy: { updatedAt: "desc" },
      });

      if (!anyAwb) {
        return NextResponse.json({ error: "No AWBs found" });
      }

      const fancourier = await createFanCourierClient();

      // Get tracking for any AWB
      const tracking = await fancourier.trackAWB(anyAwb.awbNumber);

      // Get reports/awb response
      const date = anyAwb.createdAt.toISOString().split("T")[0];
      const borderou = await fancourier.getAWBFromBorderou(
        anyAwb.awbNumber,
        date
      );

      return NextResponse.json({
        message: "No AWBs with return status found, testing with recent AWB",
        awb: anyAwb.awbNumber,
        status: anyAwb.currentStatus,
        tracking,
        borderou,
      });
    }

    console.log(`Found AWB: ${returnAwb.awbNumber}`);
    console.log(`Status: ${returnAwb.currentStatus}`);

    const fancourier = await createFanCourierClient();

    // 1. Check tracking response - all fields
    const tracking = await fancourier.trackAWB(returnAwb.awbNumber);

    // 2. Check reports/awb response for this date
    const date = returnAwb.createdAt.toISOString().split("T")[0];
    const borderou = await fancourier.getAWBFromBorderou(
      returnAwb.awbNumber,
      date
    );

    // 3. Get all AWBs for that date to see all fields
    const allAwbs = await fancourier.getAllAWBsForDate(date);

    return NextResponse.json({
      awb: returnAwb.awbNumber,
      status: returnAwb.currentStatus,
      created: returnAwb.createdAt,
      tracking,
      borderou,
      sampleAllFields: allAwbs.data?.[0] || null,
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
