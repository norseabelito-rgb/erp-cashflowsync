import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createAWBForOrder } from "@/lib/awb-service";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de creare AWB
    const canCreate = await hasPermission(session.user.id, "awb.create");
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a genera AWB-uri" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderIds, options, createPickingList, pickingListName, assignedTo, createdBy } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selectează cel puțin o comandă" },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      errors: [] as string[],
      awbIds: [] as string[],
    };

    for (const orderId of orderIds) {
      const result = await createAWBForOrder(orderId, options);
      if (result.success) {
        results.created++;
        // Găsim AWB-ul creat pentru această comandă
        const awb = await prisma.aWB.findFirst({
          where: { orderId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });
        if (awb) {
          results.awbIds.push(awb.id);
        }
      } else {
        results.errors.push(`${orderId}: ${result.error}`);
      }
    }

    // Creează picking list automat dacă e cerut și avem AWB-uri create
    let pickingList = null;
    if (createPickingList && results.awbIds.length > 0) {
      try {
        pickingList = await createPickingListFromAWBs({
          awbIds: results.awbIds,
          name: pickingListName,
          assignedTo,
          createdBy,
        });
      } catch (plError: any) {
        console.error("Error creating picking list:", plError);
        // Nu returnăm eroare - AWB-urile au fost create cu succes
      }
    }

    return NextResponse.json({
      success: results.created > 0,
      created: results.created,
      errors: results.errors,
      pickingList: pickingList ? {
        id: pickingList.id,
        code: pickingList.code,
        totalItems: pickingList.totalItems,
        totalQuantity: pickingList.totalQuantity,
      } : null,
    });
  } catch (error: any) {
    console.error("Error creating AWB:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Funcție helper pentru a crea picking list din AWB-uri
async function createPickingListFromAWBs(params: {
  awbIds: string[];
  name?: string;
  assignedTo?: string;
  createdBy?: string;
}) {
  const { awbIds, name, assignedTo, createdBy } = params;

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
    throw new Error("Nu s-au găsit AWB-uri valide");
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
        awbs: true,
      },
    });

    return pl;
  });

  console.log(`📋 Picking list creat automat: ${code} cu ${totalItems} produse (${totalQuantity} bucăți)`);

  return pickingList;
}
