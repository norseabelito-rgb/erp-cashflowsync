import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Listează picking lists
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

    // Verificăm permisiunea de vizualizare picking
    const canView = await hasPermission(session.user.id, "picking.view");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza picking lists" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const assignedTo = searchParams.get("assignedTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        // Căutare după AWB
        { awbs: { some: { awb: { awbNumber: { contains: search, mode: "insensitive" } } } } },
        // Căutare după număr comandă
        { awbs: { some: { awb: { order: { shopifyOrderNumber: { contains: search, mode: "insensitive" } } } } } },
      ];
    }

    const total = await prisma.pickingList.count({ where });

    const pickingLists = await prisma.pickingList.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            sku: true,
            title: true,
            quantityRequired: true,
            quantityPicked: true,
            isComplete: true,
          },
        },
        awbs: {
          include: {
            awb: {
              select: {
                id: true,
                awbNumber: true,
                currentStatus: true,
                order: {
                  select: {
                    shopifyOrderNumber: true,
                    customerFirstName: true,
                    customerLastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
            awbs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Calculăm statistici
    const stats = await prisma.pickingList.groupBy({
      by: ["status"],
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    stats.forEach((s) => {
      statsMap[s.status] = s._count;
    });

    return NextResponse.json({
      pickingLists,
      stats: {
        total,
        pending: statsMap["PENDING"] || 0,
        inProgress: statsMap["IN_PROGRESS"] || 0,
        completed: statsMap["COMPLETED"] || 0,
        cancelled: statsMap["CANCELLED"] || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching picking lists:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Creează picking list din AWB-uri selectate
export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de creare picking
    const canCreate = await hasPermission(session.user.id, "picking.create");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a crea picking lists" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { awbIds, name, assignedTo, createdBy } = body;

    if (!awbIds || !Array.isArray(awbIds) || awbIds.length === 0) {
      return NextResponse.json(
        { error: "Selectează cel puțin un AWB" },
        { status: 400 }
      );
    }

    // Obținem AWB-urile cu LineItems
    const awbs = await prisma.aWB.findMany({
      where: {
        id: { in: awbIds },
      },
      include: {
        order: {
          include: {
            lineItems: {
              select: {
                sku: true,
                barcode: true,
                title: true,
                variantTitle: true,
                quantity: true,
                imageUrl: true,
                location: true,
                masterProductId: true,
              },
            },
          },
        },
      },
    });

    if (awbs.length === 0) {
      return NextResponse.json(
        { error: "Nu s-au găsit AWB-uri valide" },
        { status: 404 }
      );
    }

    // Agregăm produsele din toate comenzile
    const productMap = new Map<string, {
      sku: string;
      barcode: string | null;
      title: string;
      variantTitle: string | null;
      quantity: number;
      imageUrl: string | null;
      location: string | null;
      masterProductId: string | null;
    }>();

    for (const awb of awbs) {
      for (const item of awb.order.lineItems) {
        // Folosim SKU + variantTitle ca key unic
        const key = `${item.sku}|${item.variantTitle || ""}`;
        
        if (productMap.has(key)) {
          const existing = productMap.get(key)!;
          existing.quantity += item.quantity;
        } else {
          productMap.set(key, {
            sku: item.sku || `UNKNOWN-${Date.now()}`,
            barcode: item.barcode,
            title: item.title,
            variantTitle: item.variantTitle,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            location: item.location,
            masterProductId: item.masterProductId,
          });
        }
      }
    }

    // Calculăm totaluri
    const totalItems = productMap.size;
    const totalQuantity = Array.from(productMap.values()).reduce((sum, p) => sum + p.quantity, 0);

    // Generăm un cod unic pentru picking list
    const code = `PL-${Date.now().toString(36).toUpperCase()}`;

    // Creăm picking list cu items și awbs într-o tranzacție
    const pickingList = await prisma.$transaction(async (tx) => {
      // Creăm picking list-ul
      const pl = await tx.pickingList.create({
        data: {
          code,
          name: name || `Picking ${new Date().toLocaleDateString("ro-RO")} - ${awbs.length} AWB-uri`,
          createdBy,
          assignedTo,
          totalItems,
          totalQuantity,
          items: {
            create: Array.from(productMap.values()).map((p) => ({
              sku: p.sku,
              barcode: p.barcode,
              title: p.title,
              variantTitle: p.variantTitle,
              quantityRequired: p.quantity,
              imageUrl: p.imageUrl,
              location: p.location,
              masterProductId: p.masterProductId,
            })),
          },
          awbs: {
            create: awbIds.map((awbId: string) => ({
              awbId,
            })),
          },
        },
        include: {
          items: true,
          awbs: {
            include: {
              awb: {
                select: {
                  awbNumber: true,
                },
              },
            },
          },
        },
      });

      return pl;
    });

    return NextResponse.json({
      success: true,
      pickingList,
      message: `Picking list creat cu ${totalItems} produse (${totalQuantity} bucăți) din ${awbs.length} AWB-uri`,
    });
  } catch (error: any) {
    console.error("Error creating picking list:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
