import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de emitere facturi
    const canIssue = await hasPermission(session.user.id, "invoices.create");
    if (!canIssue) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a emite facturi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin o comandă" },
        { status: 400 }
      );
    }

    let issued = 0;
    const errors: string[] = [];

    for (const orderId of orderIds) {
      try {
        const result = await issueInvoiceForOrder(orderId);
        if (result.success) {
          issued++;
        } else {
          errors.push(result.error || "Eroare necunoscută");
        }
      } catch (err: any) {
        errors.push(err.message || "Eroare la procesarea comenzii");
      }
    }

    if (issued === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        issued: 0,
        error: errors[0],
        errors,
      });
    }

    return NextResponse.json({
      success: issued > 0,
      issued,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error issuing invoices:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la emiterea facturilor" },
      { status: 500 }
    );
  }
}
