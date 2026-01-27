import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createFanCourierClient } from "@/lib/fancourier";

/**
 * GET /api/awb/repair/debug
 *
 * Debug endpoint to check what the FanCourier borderou returns for a specific date.
 * Helps diagnose why automatic repair matching might not work.
 *
 * Query params:
 * - date: string (YYYY-MM-DD format, required)
 * - search?: string (optional - filter AWBs that contain this string)
 *
 * Response:
 * - success: boolean
 * - date: string
 * - count: number
 * - awbs: array of AWB info from borderou
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
        { success: false, error: "Doar administratorii pot accesa aceasta pagina" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const search = searchParams.get("search");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Parametrul date este obligatoriu (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("DEBUG: Fetching FanCourier borderou");
    console.log("=".repeat(60));
    console.log(`Date: ${date}`);
    console.log(`Search filter: ${search || 'none'}`);
    console.log("=".repeat(60) + "\n");

    const fancourier = await createFanCourierClient();
    const response = await fancourier.getAllAWBsForDate(date);

    if (!response.success) {
      return NextResponse.json({
        success: false,
        error: response.error || "Failed to fetch borderou",
        date,
      });
    }

    const allAwbs = response.data || [];

    // Log raw structure of first few items for debugging
    console.log("\n📋 RAW STRUCTURE OF FIRST 3 ITEMS:");
    for (let i = 0; i < Math.min(3, allAwbs.length); i++) {
      const item = allAwbs[i];
      console.log(`\n--- Item ${i + 1} ---`);
      console.log("Top-level keys:", Object.keys(item));
      console.log("item.info exists:", !!item.info);
      console.log("item.info keys:", item.info ? Object.keys(item.info) : "N/A");
      // Check alternative field paths
      console.log("item.awbNumber:", item.awbNumber);
      console.log("item.info?.awbNumber:", item.info?.awbNumber);
      console.log("item.awb:", item.awb);
      console.log("item.info?.awb:", item.info?.awb);
      // Log the full item structure
      console.log("Full item (truncated):", JSON.stringify(item).substring(0, 500));
    }
    console.log("\n");

    // Extract AWB info for easier reading
    // KEY INSIGHT: barcodes[0] contains the full 21-char barcode that's printed on labels
    // awbNumber is just the 13-digit numeric identifier
    let awbList = allAwbs.map((item: any) => {
      const awbNumber = item.info?.awbNumber;
      const barcode = item.info?.barcodes?.[0];

      return {
        // The barcode is what's scanned - this is the "correct" AWB for matching
        barcode: barcode ? String(barcode) : null,
        barcodeLength: barcode ? String(barcode).length : 0,
        // awbNumber is the numeric ID (13 digits)
        awbNumber: awbNumber ? String(awbNumber) : null,
        awbNumberLength: awbNumber ? String(awbNumber).length : 0,
        // Other useful info
        recipient: item.recipient?.name || '',
        content: item.info?.content || '',
        date: item.info?.date || '',
        // Show if barcode matches expected pattern
        barcodeStartsWithAwb: barcode && awbNumber ? String(barcode).startsWith(String(awbNumber)) : false,
      };
    });

    // Apply search filter if provided (searches both barcode and awbNumber)
    if (search) {
      awbList = awbList.filter((awb: any) =>
        (awb.barcode && awb.barcode.includes(search)) ||
        (awb.awbNumber && awb.awbNumber.includes(search))
      );
    }

    console.log(`Found ${allAwbs.length} total AWBs in borderou`);
    console.log(`Filtered to ${awbList.length} AWBs`);

    // Include raw sample in response for debugging
    const rawSample = allAwbs.length > 0 ? {
      firstItemKeys: Object.keys(allAwbs[0]),
      firstItemInfoKeys: allAwbs[0].info ? Object.keys(allAwbs[0].info) : null,
      firstItemRaw: allAwbs[0],
    } : null;

    return NextResponse.json({
      success: true,
      date,
      totalInBorderou: allAwbs.length,
      count: awbList.length,
      searchFilter: search || null,
      rawSample, // Include raw structure for debugging
      awbs: awbList,
    });
  } catch (error: any) {
    console.error("Error fetching borderou:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
