import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { issueInvoiceForOrder } from "@/lib/invoice-service";
import { createAWBForOrder } from "@/lib/fancourier";

// GET - Lista erorilor de procesare
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "processing.errors.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (type && type !== "all") {
      where.type = type;
    }

    const [errors, total] = await Promise.all([
      prisma.processingError.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true,
              customerFirstName: true,
              customerLastName: true,
              store: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.processingError.count({ where }),
    ]);

    // Statistici
    const stats = await prisma.processingError.groupBy({
      by: ["status"],
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    stats.forEach(s => {
      statsMap[s.status] = s._count;
    });

    return NextResponse.json({
      success: true,
      errors,
      stats: {
        total,
        pending: statsMap["PENDING"] || 0,
        retrying: statsMap["RETRYING"] || 0,
        resolved: statsMap["RESOLVED"] || 0,
        failed: statsMap["FAILED"] || 0,
        skipped: statsMap["SKIPPED"] || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching processing errors:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Retry sau Skip o eroare
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();
    const { errorId, action } = body; // action: "retry" | "skip"

    // Verificăm permisiunile
    if (action === "retry") {
      const canRetry = await hasPermission(session.user.id, "processing.errors.retry");
      if (!canRetry) {
        return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
      }
    } else if (action === "skip") {
      const canSkip = await hasPermission(session.user.id, "processing.errors.skip");
      if (!canSkip) {
        return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
    }

    // Obținem eroarea
    const error = await prisma.processingError.findUnique({
      where: { id: errorId },
      include: {
        order: {
          include: {
            invoice: true,
            awb: true,
          },
        },
      },
    });

    if (!error) {
      return NextResponse.json({ error: "Eroarea nu a fost găsită" }, { status: 404 });
    }

    if (error.status === "RESOLVED" || error.status === "SKIPPED") {
      return NextResponse.json({ error: "Eroarea a fost deja rezolvată" }, { status: 400 });
    }

    // Skip - marcăm ca sărit
    if (action === "skip") {
      await prisma.processingError.update({
        where: { id: errorId },
        data: {
          status: "SKIPPED",
          resolvedAt: new Date(),
          resolvedBy: session.user.id,
          resolvedByName: session.user.name || session.user.email,
          resolution: "skipped",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Eroarea a fost marcată ca sărită",
      });
    }

    // Retry - încercăm din nou
    await prisma.processingError.update({
      where: { id: errorId },
      data: {
        status: "RETRYING",
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    let retryResult: { success: boolean; error?: string; data?: any } = {
      success: false,
    };

    try {
      if (error.type === "INVOICE") {
        // Retry emitere factură
        if (error.order.invoice) {
          retryResult = { success: true, data: { message: "Factura există deja" } };
        } else {
          const invoiceResult = await issueInvoiceForOrder(error.orderId);
          retryResult = {
            success: invoiceResult.success,
            error: invoiceResult.error,
            data: invoiceResult,
          };
        }
      } else if (error.type === "AWB") {
        // Retry emitere AWB
        if (error.order.awb) {
          retryResult = { success: true, data: { message: "AWB-ul există deja" } };
        } else {
          const awbResult = await createAWBForOrder(error.orderId);
          retryResult = {
            success: awbResult.success,
            error: awbResult.error,
            data: awbResult,
          };

          // Dacă AWB-ul a fost creat, verificăm dacă trebuie adăugat la un picking list
          if (awbResult.success) {
            await addAWBToPickingList(error.orderId);
          }
        }
      }
    } catch (e: any) {
      retryResult = { success: false, error: e.message };
    }

    // Actualizăm statusul erorii
    if (retryResult.success) {
      await prisma.processingError.update({
        where: { id: errorId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: session.user.id,
          resolvedByName: session.user.name || session.user.email,
          resolution: "success",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Procesarea a reușit",
        data: retryResult.data,
      });
    } else {
      // Verificăm dacă am depășit numărul maxim de încercări
      const updatedError = await prisma.processingError.findUnique({
        where: { id: errorId },
      });

      const newStatus = (updatedError?.retryCount || 0) >= (updatedError?.maxRetries || 3)
        ? "FAILED"
        : "PENDING";

      await prisma.processingError.update({
        where: { id: errorId },
        data: {
          status: newStatus,
          errorMessage: retryResult.error || error.errorMessage,
        },
      });

      return NextResponse.json({
        success: false,
        error: retryResult.error || "Procesarea a eșuat din nou",
        retriesLeft: (updatedError?.maxRetries || 3) - (updatedError?.retryCount || 0),
      });
    }
  } catch (error: any) {
    console.error("Error processing retry:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper: Adaugă AWB la un picking list existent sau creează unul nou
async function addAWBToPickingList(orderId: string) {
  const awb = await prisma.aWB.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  if (!awb) return;

  // Verificăm dacă AWB-ul e deja într-un picking list
  const existingPLA = await prisma.pickingListAWB.findUnique({
    where: { awbId: awb.id },
  });

  if (existingPLA) return;

  // Căutăm un picking list PENDING din același batch (creat recent)
  const recentPickingList = await prisma.pickingList.findFirst({
    where: {
      status: "PENDING",
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ultimele 24 ore
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentPickingList) {
    // Adăugăm la picking list-ul existent
    await prisma.pickingListAWB.create({
      data: {
        pickingListId: recentPickingList.id,
        awbId: awb.id,
      },
    });

    // Actualizăm statisticile (simplificat - ar trebui recalculat din items)
    // Pentru moment, doar logăm
    console.log(`AWB ${awb.awbNumber} adăugat la picking list ${recentPickingList.code}`);
  } else {
    // TODO: Creăm un nou picking list (necesită acces la session pentru createdBy)
    console.log(`AWB ${awb.awbNumber} nu a fost adăugat la niciun picking list`);
  }
}
