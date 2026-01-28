import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare facturi
    const canView = await hasPermission(session.user.id, "invoices.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza facturi" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const hasAwb = searchParams.get("hasAwb"); // "true" sau "false"
    const awbStatus = searchParams.get("awbStatus"); // "tranzit" | "livrat" | "retur" | "pending" | "anulat"

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      where.paymentStatus = paymentStatus;
    }

    // Filtru după existența AWB pe comanda asociată
    if (hasAwb === "true") {
      // Sub-filtru după status AWB
      if (awbStatus && awbStatus !== "all") {
        where.order = {
          ...where.order,
          awb: {
            currentStatus: {
              contains: awbStatus,
              mode: "insensitive",
            },
          },
        };
      } else {
        where.order = {
          ...where.order,
          awb: { isNot: null },
        };
      }
    } else if (hasAwb === "false") {
      where.order = {
        ...where.order,
        awb: { is: null },
      };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { invoiceSeriesName: { contains: search, mode: "insensitive" } },
        {
          order: {
            shopifyOrderNumber: { contains: search, mode: "insensitive" },
          },
        },
        {
          order: {
            customerFirstName: { contains: search, mode: "insensitive" },
          },
        },
        {
          order: {
            customerLastName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceSeriesName: true,
        oblioId: true,
        status: true,
        errorMessage: true,
        dueDate: true,
        paymentStatus: true,
        paidAmount: true,
        paidAt: true,
        cancelledAt: true,
        cancelReason: true,
        stornoNumber: true,
        stornoSeries: true,
        pdfUrl: true,
        issuedAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            customerFirstName: true,
            customerLastName: true,
            totalPrice: true,
            currency: true,
            financialStatus: true,
            store: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
