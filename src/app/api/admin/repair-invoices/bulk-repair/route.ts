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
 * Body: { invoiceIds: string[] }
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
    const { invoiceIds } = body as { invoiceIds: string[] };

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "invoiceIds este obligatoriu si trebuie sa fie un array nevid" },
        { status: 400 }
      );
    }

    if (invoiceIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 de facturi per batch" },
        { status: 400 }
      );
    }

    const results: Array<{
      invoiceId: string;
      success: boolean;
      oldInvoice?: string;
      newInvoice?: string;
      orderNumber?: string;
      error?: string;
    }> = [];

    for (const invoiceId of invoiceIds) {
      try {
        // Gaseste factura
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
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
          results.push({ invoiceId, success: false, error: "Factura nu exista" });
          continue;
        }

        if (invoice.status === "cancelled") {
          results.push({ invoiceId, success: false, error: "Deja stornata" });
          continue;
        }

        const order = invoice.order;
        if (!order) {
          results.push({ invoiceId, success: false, error: "Comanda negasita" });
          continue;
        }

        // Storneaza in Oblio
        const company = invoice.company || order.store?.company;
        if (!company) {
          results.push({ invoiceId, success: false, error: "Firma negasita" });
          continue;
        }

        const oblioClient = createOblioClient(company);
        if (!oblioClient) {
          results.push({ invoiceId, success: false, error: "Credentiale Oblio lipsa" });
          continue;
        }

        if (invoice.invoiceSeriesName && invoice.invoiceNumber) {
          const stornoResult = await oblioClient.stornoInvoice(
            invoice.invoiceSeriesName,
            invoice.invoiceNumber
          );

          if (!stornoResult.success) {
            results.push({
              invoiceId,
              success: false,
              error: `Stornare Oblio: ${stornoResult.error}`,
            });
            continue;
          }
        }

        // Marcheaza cancelled
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: "Reparare auto-facturare bulk: client gresit",
          },
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
          results.push({
            invoiceId,
            success: false,
            oldInvoice: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
            orderNumber: order.shopifyOrderNumber,
            error: `Re-emitere esuata: ${reissueResult.error}`,
          });
          continue;
        }

        results.push({
          invoiceId,
          success: true,
          oldInvoice: `${invoice.invoiceSeriesName} ${invoice.invoiceNumber}`,
          newInvoice: `${reissueResult.invoiceSeries} ${reissueResult.invoiceNumber}`,
          orderNumber: order.shopifyOrderNumber,
        });

        // Pauza 500ms intre facturi ca sa nu supraincarcam Oblio
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Eroare necunoscuta";
        results.push({ invoiceId, success: false, error: msg });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "invoice.bulk_repaired",
        entityType: "Invoice",
        entityId: "bulk",
        metadata: {
          totalAttempted: invoiceIds.length,
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
