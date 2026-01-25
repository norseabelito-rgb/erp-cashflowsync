import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  generateIntercompanyInvoice,
  generateOblioIntercompanyInvoice,
} from "@/lib/intercompany-service";

/**
 * POST /api/intercompany/generate - Generează factură intercompany
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canGenerate = await hasPermission(session.user.id, "intercompany.generate");
    if (!canGenerate) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a genera decontări" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { companyId, orderIds, periodStart, periodEnd } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId este obligatoriu" },
        { status: 400 }
      );
    }

    const periodStartDate = periodStart ? new Date(periodStart) : undefined;
    const periodEndDate = periodEnd ? new Date(periodEnd) : undefined;

    // Generate the intercompany invoice (creates record + links orders)
    const result = await generateIntercompanyInvoice(companyId, periodStartDate, periodEndDate);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }

    // Try to generate Oblio invoice
    let oblioResult = null;
    if (result.invoiceId) {
      oblioResult = await generateOblioIntercompanyInvoice(result.invoiceId);
    }

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber,
      oblio: oblioResult
        ? {
            success: oblioResult.success,
            invoiceNumber: oblioResult.oblioInvoiceNumber,
            seriesName: oblioResult.oblioSeriesName,
            link: oblioResult.oblioLink,
            error: oblioResult.error,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error generating intercompany invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
