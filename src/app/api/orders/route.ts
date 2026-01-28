import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
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

    // Verificăm permisiunea de vizualizare comenzi
    const canView = await hasPermission(session.user.id, "orders.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza comenzi" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const storeId = searchParams.get("storeId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const containsSku = searchParams.get("containsSku"); // Filtru după SKU produs
    const containsBarcode = searchParams.get("containsBarcode"); // Filtru după barcode
    const hasAwb = searchParams.get("hasAwb"); // "true" sau "false"
    const awbStatus = searchParams.get("awbStatus"); // "tranzit" | "livrat" | "retur" | "pending" | "anulat"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (storeId && storeId !== "all") {
      where.storeId = storeId;
    }

    // Filtrare pe interval de date
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Adaugă 1 zi pentru a include și ziua finală complet
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    // Filtru după SKU - găsește comenzi care conțin un produs specific
    if (containsSku) {
      where.lineItems = {
        some: {
          sku: {
            contains: containsSku,
            mode: "insensitive",
          },
        },
      };
    }

    // Filtru după barcode
    if (containsBarcode) {
      where.lineItems = {
        some: {
          barcode: {
            contains: containsBarcode,
            mode: "insensitive",
          },
        },
      };
    }

    // Filtru după existența AWB
    if (hasAwb === "true") {
      // Sub-filtru după status AWB (doar când hasAwb=true)
      if (awbStatus && awbStatus !== "all") {
        where.awb = {
          currentStatus: {
            contains: awbStatus,
            mode: "insensitive",
          },
        };
      } else {
        where.awb = { isNot: null };
      }
    } else if (hasAwb === "false") {
      where.awb = { is: null };
    }

    if (search) {
      where.OR = [
        { shopifyOrderNumber: { contains: search, mode: "insensitive" } },
        { customerFirstName: { contains: search, mode: "insensitive" } },
        { customerLastName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { shippingCity: { contains: search, mode: "insensitive" } },
        // Căutare și în LineItems
        { lineItems: { some: { sku: { contains: search, mode: "insensitive" } } } },
        { lineItems: { some: { title: { contains: search, mode: "insensitive" } } } },
        { lineItems: { some: { barcode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // Obține numărul total pentru paginare
    const total = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceSeriesName: true,
            oblioId: true,
            status: true,
            errorMessage: true,
          },
        },
        awb: {
          select: {
            id: true,
            awbNumber: true,
            currentStatus: true,
            currentStatusDate: true,
            errorMessage: true,
          },
        },
        lineItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({ 
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      {
        error: "Eroare la încărcarea comenzilor",
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
