import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import { hasPermission } from "@/lib/permissions";

interface TransferWarning {
  orderId: string;
  warning: {
    orderNumber: string;
    transferNumber: string;
    transferStatus: string;
    message: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verificam autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie sa fii autentificat" },
        { status: 401 }
      );
    }

    // Verificam permisiunea de emitere facturi
    const canIssue = await hasPermission(session.user.id, "invoices.create");
    if (!canIssue) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a emite facturi" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds, acknowledgeTransferWarning } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selecteaza cel putin o comanda" },
        { status: 400 }
      );
    }

    let issued = 0;
    const errors: string[] = [];
    const warnings: TransferWarning[] = [];

    // Determine the user identifier for audit logging
    const warningAcknowledgedBy = session.user.name || session.user.email || session.user.id;

    for (const orderId of orderIds) {
      try {
        const result = await issueInvoiceForOrder(orderId, {
          acknowledgeTransferWarning: !!acknowledgeTransferWarning,
          warningAcknowledgedBy,
        });

        if (result.success) {
          issued++;
        } else if (result.needsConfirmation && result.warning) {
          // Collect orders needing confirmation
          warnings.push({
            orderId,
            warning: {
              orderNumber: result.warning.transferNumber ? orderId : orderId, // We'll populate this from the order
              transferNumber: result.warning.transferNumber,
              transferStatus: result.warning.transferStatus,
              message: result.warning.message,
            },
          });
        } else {
          errors.push(result.error || "Eroare necunoscuta");
        }
      } catch (err: any) {
        errors.push(err.message || "Eroare la procesarea comenzii");
      }
    }

    // If we have warnings and no acknowledgment was provided, return them
    if (warnings.length > 0 && !acknowledgeTransferWarning) {
      return NextResponse.json({
        success: false,
        needsConfirmation: true,
        warnings,
        issued: 0,
      });
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
