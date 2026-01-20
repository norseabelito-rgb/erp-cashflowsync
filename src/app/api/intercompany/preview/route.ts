import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { generateSettlementPreview } from "@/lib/intercompany-service";

/**
 * GET /api/intercompany/preview - Preview decontare pentru o firmă
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "intercompany.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza decontările" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const periodStartStr = searchParams.get("periodStart");
    const periodEndStr = searchParams.get("periodEnd");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId este obligatoriu" },
        { status: 400 }
      );
    }

    const periodStart = periodStartStr ? new Date(periodStartStr) : undefined;
    const periodEnd = periodEndStr ? new Date(periodEndStr) : undefined;

    const preview = await generateSettlementPreview(companyId, periodStart, periodEnd);

    if (!preview) {
      return NextResponse.json({
        success: true,
        preview: null,
        message: "Nu există comenzi eligibile pentru decontare",
      });
    }

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    console.error("Error generating preview:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
