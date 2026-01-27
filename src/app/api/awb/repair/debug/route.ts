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

    // Extract AWB info for easier reading
    let awbList = allAwbs.map((item: any) => ({
      awbNumber: String(item.info?.awbNumber || ''),
      awbNumberLength: String(item.info?.awbNumber || '').length,
      recipient: item.info?.recipientName || '',
      address: item.info?.address || '',
      status: item.info?.status || '',
      rawAwbNumber: item.info?.awbNumber, // Show raw value for debugging
      rawType: typeof item.info?.awbNumber, // Show type for debugging
    }));

    // Apply search filter if provided
    if (search) {
      awbList = awbList.filter((awb: any) =>
        awb.awbNumber.includes(search)
      );
    }

    console.log(`Found ${allAwbs.length} total AWBs in borderou`);
    console.log(`Filtered to ${awbList.length} AWBs`);

    return NextResponse.json({
      success: true,
      date,
      totalInBorderou: allAwbs.length,
      count: awbList.length,
      searchFilter: search || null,
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
