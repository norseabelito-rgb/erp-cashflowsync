import { NextRequest, NextResponse } from "next/server";
import { getTrendyolStats } from "@/lib/trendyol";

// GET - Statistici Trendyol
export async function GET(request: NextRequest) {
  try {
    const stats = await getTrendyolStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching Trendyol stats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
