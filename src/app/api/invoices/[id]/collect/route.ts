import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canMarkInvoicePaid, executeWithPINApproval } from "@/lib/manifest/operation-guard";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";
import { PaymentSource, PINApprovalType } from "@prisma/client";
import { logPaymentReceived } from "@/lib/activity-log";

/**
 * POST /api/invoices/[id]/collect
 * Mark an invoice as paid with manifest/PIN guard
 *
 * Body: { pin?: string, reason?: string, collectType?: string }
 * If invoice not in manifest, requires PIN approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "invoices.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a modifica facturi" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { pin, reason, collectType = "Ramburs" } = body;

    // Get invoice with company and order
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        order: {
          include: {
            store: {
              include: {
                company: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    if (invoice.paymentStatus === "paid" || invoice.paidAt) {
      return NextResponse.json(
        { error: "Factura este deja incasata" },
        { status: 400 }
      );
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Nu se poate incasa o factura stornata" },
        { status: 400 }
      );
    }

    // Check if operation is allowed
    const check = await canMarkInvoicePaid(id);

    if (!check.allowed && check.requiresPIN) {
      // Not in manifest - require PIN
      if (!pin) {
        return NextResponse.json(
          {
            success: false,
            blocked: true,
            reason: check.reason,
            requiresPIN: true
          },
          { status: 403 }
        );
      }

      // Verify PIN
      const pinResult = await executeWithPINApproval(
        id,
        PINApprovalType.INCASARE,
        pin,
        session.user.id,
        reason || "Incasare manuala fara manifest"
      );

      if (!pinResult.success) {
        return NextResponse.json(
          { success: false, error: pinResult.error },
          { status: 400 }
        );
      }
    }

    // Get company for Oblio
    const company = invoice.company || invoice.order?.store?.company;

    if (!company) {
      return NextResponse.json(
        { error: "Factura nu are o firma asociata" },
        { status: 400 }
      );
    }

    const oblioClient = createOblioClient(company);
    if (!oblioClient) {
      return NextResponse.json(
        { error: "Credentiale Oblio neconfigurate" },
        { status: 400 }
      );
    }

    // Only call Oblio if we have valid invoice number
    if (invoice.invoiceSeriesName && invoice.invoiceNumber) {
      const collectResult = await oblioClient.collectInvoice(
        invoice.invoiceSeriesName,
        invoice.invoiceNumber,
        collectType
      );

      if (!collectResult.success) {
        return NextResponse.json(
          { success: false, error: collectResult.error },
          { status: 400 }
        );
      }
    }

    // Update invoice
    const source = check.allowed
      ? PaymentSource.MANIFEST_DELIVERY
      : PaymentSource.PIN_APPROVAL;

    const paidAmount = invoice.order?.totalPrice || 0;

    await prisma.invoice.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        paidAt: new Date(),
        paidAmount,
        paymentSource: source,
        paidFromManifestId: check.manifestId || null
      }
    });

    // Log the activity
    await logPaymentReceived({
      orderId: invoice.orderId,
      orderNumber: invoice.order?.shopifyOrderNumber || "",
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceSeries: invoice.invoiceSeriesName || "",
      amount: Number(paidAmount),
      method: collectType
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.paid",
        entityType: "Invoice",
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceSeries: invoice.invoiceSeriesName,
          source,
          reason,
          collectType,
          manifestId: check.manifestId || null
        }
      }
    });

    return NextResponse.json({ success: true, source });
  } catch (error: unknown) {
    console.error("Error in POST /api/invoices/[id]/collect:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
