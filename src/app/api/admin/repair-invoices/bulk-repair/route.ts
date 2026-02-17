import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOblioClient } from "@/lib/oblio";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minute max pentru bulk

/**
 * POST /api/admin/repair-invoices/bulk-repair
 * Repara bulk facturile afectate de bug-ul de auto-facturare.
 * Proceseaza secvential cu pauza intre facturi.
 * Body: { repairIds: string[] } - RepairInvoice IDs
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { repairIds } = body as { repairIds: string[] };

    if (!repairIds || !Array.isArray(repairIds) || repairIds.length === 0) {
      return NextResponse.json(
        { error: "repairIds este obligatoriu si trebuie sa fie un array nevid" },
        { status: 400 }
      );
    }

    if (repairIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 de facturi per batch" },
        { status: 400 }
      );
    }

    const results: Array<{
      repairId: string;
      success: boolean;
      oldInvoice?: string;
      newInvoice?: string;
      orderNumber?: string;
      error?: string;
    }> = [];

    for (const repairId of repairIds) {
      try {
        // Gaseste RepairInvoice record
        const repairRecord = await prisma.repairInvoice.findUnique({
          where: { id: repairId },
        });

        if (!repairRecord) {
          results.push({ repairId, success: false, error: "Inregistrare negasita" });
          continue;
        }

        if (repairRecord.status === "repaired") {
          results.push({ repairId, success: false, error: "Deja reparata" });
          continue;
        }

        // Gaseste factura in DB
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

        if (!invoice) {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: { status: "error", errorMessage: "Factura nu exista in DB" },
          });
          results.push({ repairId, success: false, error: "Factura nu exista in DB" });
          continue;
        }

        if (invoice.status === "cancelled") {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: { status: "error", errorMessage: "Deja stornata" },
          });
          results.push({ repairId, success: false, error: "Deja stornata" });
          continue;
        }

        const order = invoice.order;
        if (!order) {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: { status: "error", errorMessage: "Comanda negasita" },
          });
          results.push({ repairId, success: false, error: "Comanda negasita" });
          continue;
        }

        // Storneaza in Oblio
        const company = invoice.company || order.store?.company;
        if (!company) {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: { status: "error", errorMessage: "Firma negasita" },
          });
          results.push({ repairId, success: false, error: "Firma negasita" });
          continue;
        }

        const oblioClient = createOblioClient(company);
        if (!oblioClient) {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: { status: "error", errorMessage: "Credentiale Oblio lipsa" },
          });
          results.push({ repairId, success: false, error: "Credentiale Oblio lipsa" });
          continue;
        }

        if (invoice.invoiceSeriesName && invoice.invoiceNumber) {
          const stornoResult = await oblioClient.stornoInvoice(
            invoice.invoiceSeriesName,
            invoice.invoiceNumber
          );

          if (!stornoResult.success) {
            await prisma.repairInvoice.update({
              where: { id: repairId },
              data: { status: "error", errorMessage: `Stornare Oblio: ${stornoResult.error}` },
            });
            results.push({
              repairId,
              success: false,
              error: `Stornare Oblio: ${stornoResult.error}`,
            });
            continue;
          }
        }

        // Sterge factura veche din DB
        await prisma.invoice.delete({
          where: { id: invoice.id },
        });

        // Reseteaza billingCompanyId (doar daca e egal cu store.companyId)
        const resetBilling = order.billingCompanyId && order.billingCompanyId === order.store?.companyId;
        await prisma.order.update({
          where: { id: order.id },
          data: {
            ...(resetBilling ? { billingCompanyId: null } : {}),
            status: "INVOICE_PENDING",
          },
        });

        // Re-emite factura
        const reissueResult = await issueInvoiceForOrder(order.id);

        if (!reissueResult.success) {
          await prisma.repairInvoice.update({
            where: { id: repairId },
            data: {
              status: "error",
              errorMessage: `Re-emitere esuata: ${reissueResult.error}`,
            },
          });
          results.push({
            repairId,
            success: false,
            oldInvoice: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
            orderNumber: order.shopifyOrderNumber,
            error: `Re-emitere esuata: ${reissueResult.error}`,
          });
          continue;
        }

        // Actualizeaza RepairInvoice
        await prisma.repairInvoice.update({
          where: { id: repairId },
          data: {
            status: "repaired",
            newInvoiceNumber: reissueResult.invoiceNumber,
            newInvoiceSeries: reissueResult.invoiceSeries,
            repairedAt: new Date(),
            repairedBy: session.user.id,
          },
        });

        results.push({
          repairId,
          success: true,
          oldInvoice: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
          newInvoice: `${reissueResult.invoiceSeries} ${reissueResult.invoiceNumber}`,
          orderNumber: order.shopifyOrderNumber,
        });

        // Pauza 500ms intre facturi ca sa nu supraincarcam Oblio
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Eroare necunoscuta";
        await prisma.repairInvoice.update({
          where: { id: repairId },
          data: { status: "error", errorMessage: msg },
        }).catch(() => {}); // best effort
        results.push({ repairId, success: false, error: msg });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.bulk_repaired",
        entityType: "RepairInvoice",
        entityId: "bulk",
        metadata: {
          totalAttempted: repairIds.length,
          totalSuccess: results.filter((r) => r.success).length,
          totalFailed: results.filter((r) => !r.success).length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/admin/repair-invoices/bulk-repair:", error);
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
