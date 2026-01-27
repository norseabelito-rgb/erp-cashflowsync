import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { repairTruncatedAWBs } from "@/lib/fancourier";
import { hasPermission } from "@/lib/permissions";

/**
 * POST /api/awb/repair
 *
 * Repair truncated AWB numbers by fetching correct values from FanCourier.
 *
 * Request body:
 * - awbIds?: string[] (specific AWB IDs to repair - if provided, ignores date range and limit)
 * - startDate?: string (ISO date, default: 30 days ago)
 * - endDate?: string (ISO date, default: today)
 * - dryRun?: boolean (default: true - safe mode, just report what would be fixed)
 * - limit?: number (default: 10 - start small to verify fixes work)
 *
 * Response:
 * - success: boolean
 * - checked: number
 * - repaired: number
 * - skipped: number
 * - errors: number
 * - details: array of repair details
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

    // Require admin permission for repair operations
    const isAdmin = await hasPermission(session.user.id, "admin");
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Doar administratorii pot repara AWB-uri" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      awbIds, // Specific AWB IDs to repair
      startDate,
      endDate,
      dryRun = true, // Default to dry run for safety
      limit = 10, // Default to small batch for testing
      skipTracking = false, // Skip tracking check and go directly to borderou
    } = body;

    console.log("\n" + "=".repeat(60));
    console.log("API: /api/awb/repair");
    console.log("=".repeat(60));
    console.log(`User: ${session.user.email}`);
    console.log(`Dry Run: ${dryRun}`);
    console.log(`Skip Tracking: ${skipTracking}`);
    if (awbIds && awbIds.length > 0) {
      console.log(`AWB IDs: ${awbIds.join(', ')}`);
    } else {
      console.log(`Limit: ${limit}`);
      console.log(`Start Date: ${startDate || '30 days ago'}`);
      console.log(`End Date: ${endDate || 'today'}`);
    }
    console.log("=".repeat(60) + "\n");

    const result = await repairTruncatedAWBs({
      awbIds,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      dryRun,
      limit,
      skipTracking,
    });

    return NextResponse.json({
      success: true,
      dryRun,
      ...result,
    });
  } catch (error: any) {
    console.error("Error repairing AWBs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
