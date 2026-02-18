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
 * 5. Actualizeaza RepairInvoice record cu status=repaired
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

    // Gaseste RepairInvoice record
    const repairRecord = await prisma.repairInvoice.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!repairRecord) {
      return NextResponse.json({ error: "Inregistrarea de reparare nu a fost gasita" }, { status: 404 });
    }

    if (repairRecord.status === "repaired") {
      return NextResponse.json({ error: "Factura este deja reparata" }, { status: 400 });
    }

    // Gaseste factura in DB dupa serie + numar + company
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceSeriesName: repairRecord.invoiceSeriesName,
        invoiceNumber: repairRecord.invoiceNumber,
        companyId: repairRecord.companyId,
        status: "issued",
      },
      include: {
        company: true,
        order: {
          include: {
            store: { include: { company: true } },
            billingCompany: true,
          },
        },
      },
    });

    if (invoice?.status === "cancelled") {
      await prisma.repairInvoice.update({
        where: { id },
        data: { status: "error", errorMessage: "Factura este deja stornata" },
      });
      return NextResponse.json({ error: "Factura este deja stornata" }, { status: 400 });
    }

    // Gaseste comanda - din factura DB sau din RepairInvoice.orderId
    let order = invoice?.order ?? null;
    if (!order && repairRecord.orderId) {
      order = await prisma.order.findUnique({
        where: { id: repairRecord.orderId },
        include: {
          store: { include: { company: true } },
          billingCompany: true,
        },
      });
    }

    // Fallback: cauta comanda dupa orderNumber din RepairInvoice
    if (!order && repairRecord.orderNumber && repairRecord.orderNumber !== "-") {
      order = await prisma.order.findFirst({
        where: { shopifyOrderNumber: repairRecord.orderNumber },
        include: {
          store: { include: { company: true } },
          billingCompany: true,
        },
      });
    }

    if (!order) {
      await prisma.repairInvoice.update({
        where: { id },
        data: { status: "error", errorMessage: "Comanda nu a fost gasita" },
      });
      return NextResponse.json({ error: "Comanda nu a fost gasita" }, { status: 400 });
    }

    // 1. Storneaza in Oblio
    const company = invoice?.company || order.store?.company || repairRecord.company;
    if (!company) {
      await prisma.repairInvoice.update({
        where: { id },
        data: { status: "error", errorMessage: "Firma nu a fost gasita" },
      });
      return NextResponse.json({ error: "Firma nu a fost gasita" }, { status: 400 });
    }

    const oblioClient = createOblioClient(company);
    if (!oblioClient) {
      await prisma.repairInvoice.update({
        where: { id },
        data: { status: "error", errorMessage: "Credentiale Oblio neconfigurate" },
      });
      return NextResponse.json({ error: "Credentiale Oblio neconfigurate" }, { status: 400 });
    }

    // Storneaza folosind datele din RepairInvoice (functioneaza si fara factura in DB)
    // Skip storno daca a fost deja facut (retry dupa eroare la re-emitere)
    const stornoSeries = invoice?.invoiceSeriesName || repairRecord.invoiceSeriesName;
    const stornoNumber = invoice?.invoiceNumber || repairRecord.invoiceNumber;
    const stornoAlreadyDone = repairRecord.errorMessage?.startsWith("Stornarea a reusit");

    if (!stornoAlreadyDone && stornoSeries && stornoNumber) {
      const stornoResult = await oblioClient.stornoInvoice(
        stornoSeries,
        stornoNumber
      );

      if (!stornoResult.success) {
        await prisma.repairInvoice.update({
          where: { id },
          data: { status: "error", errorMessage: `Eroare la stornare Oblio: ${stornoResult.error}` },
        });
        return NextResponse.json(
          {
            success: false,
            error: `Eroare la stornare Oblio: ${stornoResult.error}`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Sterge TOATE facturile "issued" ale comenzii din DB
    //    (nu doar cea gasita dupa serie+numar - poate fi salvata cu format diferit)
    await prisma.invoice.deleteMany({
      where: { orderId: order.id, status: "issued" },
    });

    // 3. Reseteaza billingCompanyId pe order (doar daca e egal cu store.companyId)
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

    const oldInvoiceLabel = `${stornoSeries} ${stornoNumber}`;

    if (!reissueResult.success) {
      await prisma.repairInvoice.update({
        where: { id },
        data: {
          status: "error",
          errorMessage: `Stornarea a reusit, dar re-emiterea a esuat: ${reissueResult.error}`,
        },
      });
      return NextResponse.json({
        success: false,
        error: `Stornarea a reusit, dar re-emiterea a esuat: ${reissueResult.error}`,
        oldInvoiceCancelled: true,
        oldInvoiceNumber: oldInvoiceLabel,
      }, { status: 400 });
    }

    // 5. Actualizeaza RepairInvoice record
    await prisma.repairInvoice.update({
      where: { id },
      data: {
        status: "repaired",
        newInvoiceNumber: reissueResult.invoiceNumber,
        newInvoiceSeries: reissueResult.invoiceSeries,
        repairedAt: new Date(),
        repairedBy: session.user.id,
      },
    });

    // Log in audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.repaired",
        entityType: "Invoice",
        entityId: invoice?.id || repairRecord.id,
        metadata: {
          oldInvoiceNumber: stornoNumber,
          oldInvoiceSeries: stornoSeries,
          newInvoiceNumber: reissueResult.invoiceNumber,
          newInvoiceSeries: reissueResult.invoiceSeries,
          orderNumber: order.shopifyOrderNumber,
          repairInvoiceId: id,
          reason: "Reparare auto-facturare bug",
        },
      },
    });

    return NextResponse.json({
      success: true,
      oldInvoice: oldInvoiceLabel,
      newInvoice: `${reissueResult.invoiceSeries} ${reissueResult.invoiceNumber}`,
      orderNumber: order.shopifyOrderNumber,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/repair-invoices/[id]/repair:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
