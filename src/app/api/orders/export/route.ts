import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { OrderStatus } from "@/types/prisma-enums";
import ExcelJS from "exceljs";

// GET /api/orders/export - Export orders to CSV or Excel
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status") as OrderStatus | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const hasInvoice = searchParams.get("hasInvoice");
    const hasAwb = searchParams.get("hasAwb");

    // Build filter
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    }
    if (hasInvoice === "true") where.invoice = { isNot: null };
    if (hasInvoice === "false") where.invoice = null;
    if (hasAwb === "true") where.awb = { isNot: null };
    if (hasAwb === "false") where.awb = null;

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        store: { select: { name: true } },
        invoice: { select: { invoiceNumber: true, invoiceSeriesName: true, status: true } },
        awb: { select: { awbNumber: true, currentStatus: true, serviceType: true } },
        lineItems: {
          select: {
            title: true,
            sku: true,
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      return NextResponse.json({ orders });
    }

    const headers = [
      "Nr_Comanda",
      "Data",
      "Magazin",
      "Status",
      "Client_Email",
      "Client_Telefon",
      "Client_Nume",
      "Client_Prenume",
      "Adresa",
      "Oras",
      "Judet",
      "Tara",
      "Cod_Postal",
      "Total",
      "Subtotal",
      "Transport",
      "TVA",
      "Moneda",
      "Status_Plata",
      "Status_Livrare",
      "Nr_Factura",
      "Status_Factura",
      "AWB",
      "Curier",
      "Status_AWB",
      "Produse",
    ];

    const buildRow = (o: (typeof orders)[0]) => {
      const productsStr = o.lineItems
        .map((li) => `${li.sku || "-"}: ${li.title} x${li.quantity}`)
        .join("; ");

      const invoiceNumber = o.invoice?.invoiceNumber
        ? `${o.invoice.invoiceSeriesName || ""}${o.invoice.invoiceNumber}`
        : "";

      return [
        o.shopifyOrderNumber,
        formatDate(o.createdAt),
        o.store.name,
        getStatusLabel(o.status),
        o.customerEmail || "",
        o.customerPhone || "",
        o.customerLastName || "",
        o.customerFirstName || "",
        [o.shippingAddress1, o.shippingAddress2].filter(Boolean).join(", "),
        o.shippingCity || "",
        o.shippingProvince || "",
        o.shippingCountry || "",
        o.shippingZip || "",
        o.totalPrice?.toString() || "0",
        o.subtotalPrice?.toString() || "0",
        o.totalShipping?.toString() || "0",
        o.totalTax?.toString() || "0",
        o.currency,
        o.financialStatus || "",
        o.fulfillmentStatus || "",
        invoiceNumber,
        o.invoice?.status || "",
        o.awb?.awbNumber || "",
        o.awb?.serviceType || "",
        o.awb?.currentStatus || "",
        productsStr,
      ];
    };

    const dateStr = new Date().toISOString().split("T")[0];

    // Excel format
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ERP CashFlow";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Comenzi");

      // Header row with styling
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.alignment = { horizontal: "center" };
      });

      // Data rows
      for (const o of orders) {
        sheet.addRow(buildRow(o));
      }

      // Auto-fit column widths
      sheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: false }, (cell) => {
          const len = cell.value?.toString().length || 0;
          if (len > maxLength) maxLength = len;
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      // Freeze header row
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      // Auto-filter
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="comenzi_${dateStr}.xlsx"`,
        },
      });
    }

    // CSV format
    const rows = orders.map((o) => buildRow(o).map(escapeCsvField));

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="comenzi_${dateStr}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeCsvField(field: string): string {
  if (!field) return "";
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING: "În așteptare",
    VALIDATED: "Validată",
    VALIDATION_FAILED: "Validare eșuată",
    INVOICE_PENDING: "Așteaptă factură",
    INVOICE_ERROR: "Eroare factură",
    INVOICED: "Facturată",
    PICKING: "În picking",
    PACKED: "Împachetată",
    AWB_PENDING: "Așteaptă AWB",
    AWB_ERROR: "Eroare AWB",
    SHIPPED: "Expediată",
    DELIVERED: "Livrată",
    RETURNED: "Returnată",
    CANCELLED: "Anulată",
  };
  return labels[status] || status;
}
