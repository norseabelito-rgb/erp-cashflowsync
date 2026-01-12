import { NextResponse } from "next/server";
import { updateAllAWBStatuses } from "@/lib/fancourier";

export async function POST() {
  try {
    const result = await updateAllAWBStatuses();
    return NextResponse.json({
      success: true,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("Error refreshing AWB statuses:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
