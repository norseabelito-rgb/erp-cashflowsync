import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canCancelInvoice, executeWithPINApproval } from "@/lib/manifest/operation-guard";
import { createOblioClient } from "@/lib/oblio";
import prisma from "@/lib/db";
import { CancellationSource, PINApprovalType } from "@prisma/client";
import { logInvoiceCancelled } from "@/lib/activity-log";

/**
 * POST /api/invoices/[id]/cancel
 * Cancel an invoice (stornare) with manifest/PIN guard
 *
 * Body: { pin?: string, reason?: string }
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

    const canCancel = await hasPermission(session.user.id, "invoices.cancel");
    if (!canCancel) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a storna facturi" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { pin, reason } = body;

    // Get invoice with company
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

    if (invoice.status === "cancelled" || invoice.cancelledAt) {
      return NextResponse.json(
        { error: "Factura este deja stornata" },
        { status: 400 }
      );
    }

    // Check if operation is allowed
    const check = await canCancelInvoice(id);

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
        PINApprovalType.STORNARE,
        pin,
        session.user.id,
        reason || "Stornare manuala fara manifest"
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

    // Stornare în Oblio (emite factură inversă)
    let stornoNumber: string | null = null;
    let stornoSeries: string | null = null;

    if (invoice.invoiceSeriesName && invoice.invoiceNumber) {
      const stornoResult = await oblioClient.stornoInvoice(
        invoice.invoiceSeriesName,
        invoice.invoiceNumber
      );

      if (!stornoResult.success) {
        return NextResponse.json(
          { success: false, error: stornoResult.error },
          { status: 400 }
        );
      }

      stornoNumber = stornoResult.invoiceNumber || null;
      stornoSeries = stornoResult.invoiceSeries || null;
    }

    // Update invoice
    const source = check.allowed
      ? CancellationSource.MANIFEST_RETURN
      : CancellationSource.PIN_APPROVAL;

    await prisma.invoice.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || (check.allowed ? "Return manifest" : "PIN approval"),
        cancellationSource: source,
        cancelledFromManifestId: check.manifestId || null,
        stornoNumber,
        stornoSeries,
      }
    });

    // Update order status
    if (invoice.orderId) {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: { status: "INVOICE_PENDING" }
      });
    }

    // Log the activity
    await logInvoiceCancelled({
      orderId: invoice.orderId,
      orderNumber: invoice.order?.shopifyOrderNumber || "",
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceSeries: invoice.invoiceSeriesName || "",
      reason: reason || ""
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.cancelled",
        entityType: "Invoice",
        entityId: id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceSeries: invoice.invoiceSeriesName,
          source,
          reason,
          manifestId: check.manifestId || null
        }
      }
    });

    return NextResponse.json({ success: true, source });
  } catch (error: unknown) {
    console.error("Error in POST /api/invoices/[id]/cancel:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
