import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getIntercompanyInvoices } from "@/lib/intercompany-service";

/**
 * GET /api/intercompany/invoices - Lista facturilor intercompany
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
    const companyId = searchParams.get("companyId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { invoices, total } = await getIntercompanyInvoices({
      companyId,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      invoices,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error fetching intercompany invoices:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
