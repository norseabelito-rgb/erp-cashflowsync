import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/repair-invoices/[id]/repair
 * Repara o factura emisa gresit:
 * 1. Storneaza factura veche in Oblio
 * 2. Marcheaza factura veche ca cancelled in DB
 * 3. Reseteaza billingCompanyId pe order la null (daca == store.companyId)
 * 4. Re-emite factura cu issueInvoiceForOrder (acum cu fix-ul)
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Doar super admin poate repara facturi" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Gaseste factura cu toate relatiile
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        order: {
          include: {
            store: {
              include: {
                company: true,
              },
            },
            billingCompany: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Factura nu a fost gasita" }, { status: 404 });
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json({ error: "Factura este deja stornata" }, { status: 400 });
    }

    const order = invoice.order;
    if (!order) {
      return NextResponse.json({ error: "Comanda nu a fost gasita" }, { status: 400 });
    }

    // 1. Storneaza in Oblio
    const company = invoice.company || order.store?.company;
    if (!company) {
      return NextResponse.json({ error: "Firma nu a fost gasita" }, { status: 400 });
    }

    const oblioClient = createOblioClient(company);
    if (!oblioClient) {
      return NextResponse.json({ error: "Credentiale Oblio neconfigurate" }, { status: 400 });
    }

    if (invoice.invoiceSeriesName && invoice.invoiceNumber) {
      const stornoResult = await oblioClient.stornoInvoice(
        invoice.invoiceSeriesName,
        invoice.invoiceNumber
      );

      if (!stornoResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Eroare la stornare Oblio: ${stornoResult.error}`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Sterge factura veche din DB (stornoul e deja in Oblio, audit log-ul pastreaza istoricul)
    // Trebuie stearsa complet (nu doar cancelled) pt ca exista unique constraint pe orderId
    await prisma.invoice.delete({
      where: { id },
    });

    // 3. Reseteaza billingCompanyId pe order (doar daca e egal cu store.companyId - nu e B2B real)
    const resetBilling = order.billingCompanyId && order.billingCompanyId === order.store?.companyId;
    await prisma.order.update({
      where: { id: order.id },
      data: {
        ...(resetBilling ? { billingCompanyId: null } : {}),
        status: "INVOICE_PENDING",
      },
    });

    // 4. Re-emite factura
    const reissueResult = await issueInvoiceForOrder(order.id);

    if (!reissueResult.success) {
      return NextResponse.json({
        success: false,
        error: `Stornarea a reusit, dar re-emiterea a esuat: ${reissueResult.error}`,
        oldInvoiceCancelled: true,
        oldInvoiceNumber: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
      }, { status: 400 });
    }

    // Log in audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.repaired",
        entityType: "Invoice",
        entityId: id,
        metadata: {
          oldInvoiceNumber: invoice.invoiceNumber,
          oldInvoiceSeries: invoice.invoiceSeriesName,
          newInvoiceNumber: reissueResult.invoiceNumber,
          newInvoiceSeries: reissueResult.invoiceSeries,
          orderNumber: order.shopifyOrderNumber,
          reason: "Reparare auto-facturare bug",
        },
      },
    });

    return NextResponse.json({
      success: true,
      oldInvoice: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
      newInvoice: `${reissueResult.invoiceSeries} ${reissueResult.invoiceNumber}`,
      orderNumber: order.shopifyOrderNumber,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/repair-invoices/[id]/repair:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
