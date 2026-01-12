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

    // Verificăm permisiunea de vizualizare AWB
    const canView = await hasPermission(session.user.id, "awb.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza AWB-uri" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const showAll = searchParams.get("showAll") !== "false"; // Default: arată toate
    const containsSku = searchParams.get("containsSku"); // Filtru după SKU produs
    const containsBarcode = searchParams.get("containsBarcode"); // Filtru după barcode
    
    // Paginare
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;
    const noPagination = searchParams.get("noPagination") === "true"; // Pentru compatibilitate

    const where: any = {};

    // Dacă nu vrem toate, excludem cele livrate/finalizate
    if (!showAll) {
      where.NOT = {
        currentStatus: {
          in: ["Livrat", "delivered", "DELIVERED"]
        }
      };
    }

    // Filtru după status
    if (status && status !== "all") {
      where.currentStatus = {
        contains: status,
        mode: "insensitive",
      };
    }

    // Căutare generală
    if (search) {
      where.OR = [
        { awbNumber: { contains: search, mode: "insensitive" } },
        { order: { shopifyOrderNumber: { contains: search, mode: "insensitive" } } },
        { order: { customerFirstName: { contains: search, mode: "insensitive" } } },
        { order: { customerLastName: { contains: search, mode: "insensitive" } } },
        // Căutare și în LineItems
        { order: { lineItems: { some: { sku: { contains: search, mode: "insensitive" } } } } },
        { order: { lineItems: { some: { title: { contains: search, mode: "insensitive" } } } } },
      ];
    }

    // Filtru după SKU - găsește AWB-uri care conțin un produs specific
    if (containsSku) {
      where.order = {
        ...where.order,
        lineItems: {
          some: {
            sku: {
              contains: containsSku,
              mode: "insensitive",
            },
          },
        },
      };
    }

    // Filtru după barcode
    if (containsBarcode) {
      where.order = {
        ...where.order,
        lineItems: {
          some: {
            barcode: {
              contains: containsBarcode,
              mode: "insensitive",
            },
          },
        },
      };
    }

    // Obține numărul total pentru paginare
    const total = await prisma.aWB.count({ where });

    // Query principal
    const awbs = await prisma.aWB.findMany({
      where,
      select: {
        id: true,
        awbNumber: true,
        orderId: true,
        serviceType: true,
        paymentType: true,
        currentStatus: true,
        currentStatusDate: true,
        cashOnDelivery: true,
        errorMessage: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            customerFirstName: true,
            customerLastName: true,
            customerPhone: true,
            shippingCity: true,
            shippingProvince: true,
            shippingAddress1: true,
            totalPrice: true,
            currency: true,
            status: true,
            store: {
              select: {
                name: true,
              },
            },
            // Includem LineItems pentru picking și filtrare
            lineItems: {
              select: {
                id: true,
                sku: true,
                barcode: true,
                title: true,
                variantTitle: true,
                quantity: true,
                price: true,
                imageUrl: true,
                location: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            statusDate: "desc",
          },
          take: 20, // Ultimele 20 de evenimente
        },
      },
      orderBy: [
        { currentStatusDate: "desc" },
        { createdAt: "desc" },
      ],
      // Paginare (doar dacă nu e dezactivată)
      ...(noPagination ? {} : { skip, take: limit }),
    });

    // Calculăm statistici (pe toate, nu doar pe pagina curentă)
    const allAwbsForStats = noPagination ? awbs : await prisma.aWB.findMany({
      where,
      select: {
        currentStatus: true,
        errorMessage: true,
      },
    });

    const stats = {
      total,
      inTransit: allAwbsForStats.filter(a => 
        a.currentStatus?.toLowerCase().includes("tranzit") || 
        a.currentStatus?.toLowerCase().includes("livrare") ||
        a.currentStatus === "in_transit"
      ).length,
      delivered: allAwbsForStats.filter(a => 
        a.currentStatus?.toLowerCase().includes("livrat") ||
        a.currentStatus === "delivered"
      ).length,
      returned: allAwbsForStats.filter(a => 
        a.currentStatus?.toLowerCase().includes("retur") ||
        a.currentStatus?.toLowerCase().includes("refuz") ||
        a.currentStatus === "returned"
      ).length,
      cancelled: allAwbsForStats.filter(a => 
        a.currentStatus?.toLowerCase().includes("anulat") ||
        a.currentStatus?.toLowerCase().includes("șters") ||
        a.currentStatus === "cancelled"
      ).length,
      pending: allAwbsForStats.filter(a => 
        a.currentStatus?.toLowerCase().includes("așteptare") ||
        a.currentStatus === "pending" ||
        !a.currentStatus
      ).length,
      errors: allAwbsForStats.filter(a => 
        a.errorMessage || a.currentStatus === "error"
      ).length,
    };

    return NextResponse.json({ 
      awbs, 
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching AWBs:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
