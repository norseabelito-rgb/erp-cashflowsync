import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/supplier-invoices
 *
 * List supplier invoices with pagination, filters, and stats.
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 * - supplierId: string (filter by supplier)
 * - purchaseOrderId: string (filter by purchase order)
 * - paymentStatus: NEPLATITA | PARTIAL_PLATITA | PLATITA
 * - dateFrom: ISO date string (invoiceDate >= dateFrom)
 * - dateTo: ISO date string (invoiceDate <= dateTo)
 * - search: string (searches invoiceNumber, invoiceSeries, supplier.name)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Filters
    const supplierId = searchParams.get("supplierId");
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const paymentStatus = searchParams.get("paymentStatus") as PaymentStatus | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.invoiceDate = {};
      if (dateFrom) {
        where.invoiceDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.invoiceDate.lte = new Date(dateTo);
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { invoiceSeries: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Query invoices with pagination
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const [invoices, total] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where,
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
        orderBy: { invoiceDate: "desc" },
        skip,
        take: limit,
      }),
      // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
      prisma.supplierInvoice.count({ where }),
    ]);

    // Get stats by payment status
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const statsRaw = await prisma.supplierInvoice.groupBy({
      by: ["paymentStatus"],
      _count: { id: true },
      _sum: { totalWithVat: true },
      where: supplierId ? { supplierId } : undefined,
    });

    // Format stats
    const stats = {
      NEPLATITA: { count: 0, total: 0 },
      PARTIAL_PLATITA: { count: 0, total: 0 },
      PLATITA: { count: 0, total: 0 },
    };

    for (const row of statsRaw) {
      const status = row.paymentStatus as keyof typeof stats;
      stats[status] = {
        count: row._count.id,
        total: parseFloat(row._sum.totalWithVat?.toString() || "0"),
      };
    }

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error: unknown) {
    console.error("Error fetching supplier invoices:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la citirea facturilor furnizor",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/supplier-invoices
 *
 * Create a new supplier invoice.
 *
 * Body:
 * - supplierId: string (required)
 * - purchaseOrderId?: string (optional, link to PO)
 * - invoiceNumber: string (required)
 * - invoiceSeries?: string (optional)
 * - invoiceDate: ISO date string (required)
 * - totalValue: number (required)
 * - vatValue?: number (optional)
 * - totalWithVat?: number (optional, auto-calc if vatValue provided)
 * - paymentDueDate?: ISO date string (optional)
 * - notes?: string (optional)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      supplierId,
      purchaseOrderId,
      invoiceNumber,
      invoiceSeries,
      invoiceDate,
      totalValue,
      vatValue,
      totalWithVat: providedTotalWithVat,
      paymentDueDate,
      notes,
    } = body;

    // Validate required fields
    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "Furnizorul este obligatoriu" },
        { status: 400 }
      );
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        { success: false, error: "Numarul facturii este obligatoriu" },
        { status: 400 }
      );
    }

    if (!invoiceDate) {
      return NextResponse.json(
        { success: false, error: "Data facturii este obligatorie" },
        { status: 400 }
      );
    }

    if (totalValue === undefined || totalValue === null) {
      return NextResponse.json(
        { success: false, error: "Valoarea facturii este obligatorie" },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Furnizorul nu a fost gasit" },
        { status: 404 }
      );
    }

    // If purchaseOrderId provided, verify PO exists and supplier matches
    if (purchaseOrderId) {
      // @ts-expect-error - prisma.purchaseOrder exists after prisma generate (model added in 07.9-01)
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { id: true, supplierId: true },
      });

      if (!purchaseOrder) {
        return NextResponse.json(
          { success: false, error: "Precomanda nu a fost gasita" },
          { status: 404 }
        );
      }

      if (purchaseOrder.supplierId !== supplierId) {
        return NextResponse.json(
          {
            success: false,
            error: "Furnizorul de pe factura nu corespunde cu precomanda",
          },
          { status: 400 }
        );
      }
    }

    // Check unique constraint: supplierId + invoiceNumber + invoiceSeries
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const existingInvoice = await prisma.supplierInvoice.findFirst({
      where: {
        supplierId,
        invoiceNumber,
        invoiceSeries: invoiceSeries || null,
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Factura cu acest numar exista deja pentru acest furnizor",
        },
        { status: 400 }
      );
    }

    // Calculate totalWithVat if vatValue is provided and totalWithVat is not
    let calculatedTotalWithVat = providedTotalWithVat;
    if (vatValue !== undefined && vatValue !== null && !providedTotalWithVat) {
      calculatedTotalWithVat = parseFloat(totalValue) + parseFloat(vatValue);
    }

    // Create invoice
    // @ts-expect-error - prisma.supplierInvoice exists after prisma generate (model added in 07.9-01)
    const invoice = await prisma.supplierInvoice.create({
      data: {
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        invoiceNumber,
        invoiceSeries: invoiceSeries || null,
        invoiceDate: new Date(invoiceDate),
        totalValue: parseFloat(totalValue),
        vatValue: vatValue !== undefined && vatValue !== null ? parseFloat(vatValue) : null,
        totalWithVat: calculatedTotalWithVat ? parseFloat(calculatedTotalWithVat) : null,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        notes: notes || null,
        paymentStatus: "NEPLATITA",
      },
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
    console.error("Error creating supplier invoice:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Eroare la crearea facturii furnizor",
      },
      { status: 500 }
    );
  }
}
