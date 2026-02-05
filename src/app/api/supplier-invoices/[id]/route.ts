import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { PaymentStatus } from "@prisma/client";

/**
 * GET /api/supplier-invoices/[id]
 *
 * Returns a single supplier invoice with full details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Query invoice with full includes
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            cif: true,
            address: true,
            city: true,
            county: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            documentNumber: true,
            status: true,
            totalValue: true,
            createdAt: true,
          },
        },
        receptionReports: {
          select: {
            id: true,
            documentNumber: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        goodsReceipts: {
          select: {
            id: true,
            receiptNumber: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error: unknown) {
    console.error("Error fetching supplier invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la citirea facturii",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/supplier-invoices/[id]
 *
 * Updates a supplier invoice.
 *
 * Body:
 * - invoiceNumber?: string
 * - invoiceSeries?: string
 * - invoiceDate?: ISO date string
 * - totalValue?: number
 * - vatValue?: number
 * - totalWithVat?: number
 * - paymentStatus?: NEPLATITA | PARTIAL_PLATITA | PLATITA
 * - paymentDueDate?: ISO date string
 * - paidAt?: ISO date string
 * - notes?: string
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify invoice exists
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const existingInvoice = await prisma.supplierInvoice.findUnique({
      where: { id },
      select: {
        id: true,
        supplierId: true,
        invoiceNumber: true,
        invoiceSeries: true,
        paymentStatus: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    const {
      invoiceNumber,
      invoiceSeries,
      invoiceDate,
      totalValue,
      vatValue,
      totalWithVat,
      paymentStatus,
      paymentDueDate,
      paidAt,
      notes,
    } = body;

    // Check unique constraint if invoice number/series is changing
    const isNumberChanging =
      invoiceNumber !== undefined && invoiceNumber !== existingInvoice.invoiceNumber;
    const isSeriesChanging =
      invoiceSeries !== undefined && invoiceSeries !== existingInvoice.invoiceSeries;

    if (isNumberChanging || isSeriesChanging) {
      const checkNumber = invoiceNumber ?? existingInvoice.invoiceNumber;
      const checkSeries = invoiceSeries ?? existingInvoice.invoiceSeries;

      // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
      const duplicate = await prisma.supplierInvoice.findFirst({
        where: {
          supplierId: existingInvoice.supplierId,
          invoiceNumber: checkNumber,
          invoiceSeries: checkSeries || null,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "Factura cu acest numar exista deja pentru acest furnizor",
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (invoiceNumber !== undefined) {
      updateData.invoiceNumber = invoiceNumber;
    }

    if (invoiceSeries !== undefined) {
      updateData.invoiceSeries = invoiceSeries || null;
    }

    if (invoiceDate !== undefined) {
      updateData.invoiceDate = new Date(invoiceDate);
    }

    if (totalValue !== undefined) {
      updateData.totalValue = parseFloat(totalValue);
    }

    if (vatValue !== undefined) {
      updateData.vatValue = vatValue !== null ? parseFloat(vatValue) : null;
    }

    if (totalWithVat !== undefined) {
      updateData.totalWithVat = totalWithVat !== null ? parseFloat(totalWithVat) : null;
    }

    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus as PaymentStatus;

      // Auto-set paidAt when status changes to PLATITA
      if (
        paymentStatus === "PLATITA" &&
        existingInvoice.paymentStatus !== "PLATITA" &&
        paidAt === undefined
      ) {
        updateData.paidAt = new Date();
      }
    }

    if (paymentDueDate !== undefined) {
      updateData.paymentDueDate = paymentDueDate ? new Date(paymentDueDate) : null;
    }

    if (paidAt !== undefined) {
      updateData.paidAt = paidAt ? new Date(paidAt) : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Update invoice
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const invoice = await prisma.supplierInvoice.update({
      where: { id },
      data: updateData,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            documentNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error: unknown) {
    console.error("Error updating supplier invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la actualizarea facturii",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/supplier-invoices/[id]
 *
 * Deletes a supplier invoice.
 * Only allowed if no receptionReports or goodsReceipts are linked.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Nu ai permisiunea necesara" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if invoice exists and has linked documents
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            receptionReports: true,
            goodsReceipts: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Factura nu a fost gasita" },
        { status: 404 }
      );
    }

    // Check for linked documents
    if (invoice._count.receptionReports > 0 || invoice._count.goodsReceipts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Factura este asociata cu documente de receptie",
        },
        { status: 400 }
      );
    }

    // Delete invoice
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    await prisma.supplierInvoice.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Factura a fost stearsa",
    });
  } catch (error: unknown) {
    console.error("Error deleting supplier invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la stergerea facturii",
      },
      { status: 500 }
    );
  }
}
