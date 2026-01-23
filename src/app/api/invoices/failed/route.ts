import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { issueInvoiceForOrder } from "@/lib/invoice-service";

/**
 * GET /api/invoices/failed
 * List all failed invoice attempts with pagination and status filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where = status === "all" ? {} : { status };

    const [attempts, total] = await Promise.all([
      prisma.failedInvoiceAttempt.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true,
              customerEmail: true,
              totalPrice: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.failedInvoiceAttempt.count({ where }),
    ]);

    return NextResponse.json({
      attempts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching failed attempts:", error);
    return NextResponse.json(
      { error: "Eroare la incarcarea facturilor esuate" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/failed
 * Retry a failed invoice attempt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: "ID-ul incercarii este obligatoriu" },
        { status: 400 }
      );
    }

    // Get the failed attempt
    const attempt = await prisma.failedInvoiceAttempt.findUnique({
      where: { id: attemptId },
      include: { order: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Incercarea nu a fost gasita" },
        { status: 404 }
      );
    }

    if (attempt.status !== "pending") {
      return NextResponse.json(
        { error: "Aceasta incercare a fost deja procesata" },
        { status: 400 }
      );
    }

    // Retry invoice generation
    const result = await issueInvoiceForOrder(attempt.orderId);

    if (result.success) {
      // Mark as resolved
      await prisma.failedInvoiceAttempt.update({
        where: { id: attemptId },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          retriedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Factura a fost emisa cu succes",
        invoice: {
          number: result.invoiceNumber,
          series: result.invoiceSeries,
        },
      });
    } else {
      // Update attempt with new error and increment counter
      await prisma.failedInvoiceAttempt.update({
        where: { id: attemptId },
        data: {
          errorCode: result.errorCode || "UNKNOWN",
          errorMessage: result.error || "Eroare necunoscuta",
          attemptNumber: { increment: 1 },
          retriedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      });
    }
  } catch (error: unknown) {
    console.error("Error retrying invoice:", error);
    return NextResponse.json(
      { error: "Eroare la reincercarea facturii" },
      { status: 500 }
    );
  }
}
