import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createFanCourierClient } from "@/lib/fancourier";
import { logActivity } from "@/lib/activity-log";
import { hasPermission } from "@/lib/permissions";

// GET - Obține detalii AWB
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de vizualizare AWB
    const canView = await hasPermission(session.user.id, "awb.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza AWB-uri" },
        { status: 403 }
      );
    }

    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            store: true,
          },
        },
        statusHistory: {
          orderBy: { statusDate: "desc" },
          take: 50,
        },
      },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, awb });
  } catch (error: any) {
    console.error("Error fetching AWB:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge AWB din FanCourier și marchează ca șters local
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificăm autentificarea
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea de ștergere AWB
    const canDelete = await hasPermission(session.user.id, "awb.delete");
    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a șterge AWB-uri" },
        { status: 403 }
      );
    }

    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      include: {
        order: true,
      },
    });

    if (!awb) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit" },
        { status: 404 }
      );
    }

    if (!awb.awbNumber) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu are număr valid" },
        { status: 400 }
      );
    }

    // Verifică dacă AWB-ul e deja șters sau livrat
    const currentStatus = awb.currentStatus?.toLowerCase() || "";
    if (currentStatus.includes("livrat") || currentStatus.includes("delivered")) {
      return NextResponse.json(
        { success: false, error: "Nu se poate șterge un AWB livrat" },
        { status: 400 }
      );
    }

    let fanCourierDeleted = false;
    let fanCourierError = null;

    // Încearcă să ștergi din FanCourier
    try {
      const fancourier = await createFanCourierClient();
      const result = await fancourier.deleteAWB(awb.awbNumber);
      
      if (result.success) {
        fanCourierDeleted = true;
      } else {
        fanCourierError = result.error;
      }
    } catch (error: any) {
      fanCourierError = error.message;
      console.error("Error deleting from FanCourier:", error);
    }

    // Actualizează AWB-ul local ca șters
    await prisma.aWB.update({
      where: { id: params.id },
      data: {
        currentStatus: "ȘTERS DIN FANCOURIER",
        currentStatusDate: new Date(),
        errorMessage: fanCourierDeleted 
          ? null 
          : `Șters local. FanCourier: ${fanCourierError || "necunoscut"}`,
      },
    });

    // Adaugă în istoric
    await prisma.aWBStatusHistory.create({
      data: {
        awbId: params.id,
        status: "ȘTERS",
        statusDate: new Date(),
        description: fanCourierDeleted 
          ? "AWB șters din FanCourier și din sistem"
          : `AWB șters local (FanCourier: ${fanCourierError})`,
      },
    });

    // Actualizează statusul comenzii
    await prisma.order.update({
      where: { id: awb.orderId },
      data: {
        status: "VALIDATED", // Resetează pentru a permite crearea unui nou AWB
      },
    });

    // Loghează activitatea
    await logActivity({
      entityType: "AWB",
      entityId: awb.id,
      action: "DELETE_AWB",
      description: `AWB ${awb.awbNumber} șters pentru comanda #${awb.order.shopifyOrderNumber}${fanCourierDeleted ? " (șters și din FanCourier)" : ""}`,
      orderId: awb.orderId,
      orderNumber: awb.order.shopifyOrderNumber,
      awbNumber: awb.awbNumber,
      details: {
        fanCourierDeleted,
        fanCourierError,
      },
      source: "manual",
    });

    return NextResponse.json({
      success: true,
      message: fanCourierDeleted 
        ? "AWB șters cu succes din FanCourier și din sistem"
        : `AWB șters local. Atenție: ${fanCourierError || "Nu s-a putut șterge din FanCourier"}`,
      fanCourierDeleted,
    });

  } catch (error: any) {
    console.error("Error deleting AWB:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizează status AWB (refresh din FanCourier)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const awb = await prisma.aWB.findUnique({
      where: { id: params.id },
      include: {
        order: true,
      },
    });

    if (!awb || !awb.awbNumber) {
      return NextResponse.json(
        { success: false, error: "AWB-ul nu a fost găsit sau nu are număr valid" },
        { status: 404 }
      );
    }

    // Verifică statusul în FanCourier
    const fancourier = await createFanCourierClient();
    const tracking = await fancourier.trackAWB(awb.awbNumber);

    if (!tracking.success) {
      return NextResponse.json({
        success: false,
        error: tracking.error || "Nu s-a putut obține tracking-ul",
      });
    }

    // Actualizează statusul
    const events = tracking.events || [];
    const lastEvent = events[events.length - 1];

    if (lastEvent) {
      await prisma.aWB.update({
        where: { id: params.id },
        data: {
          currentStatus: lastEvent.name,
          currentStatusDate: new Date(lastEvent.date),
          errorMessage: null,
        },
      });

      // Adaugă evenimente noi în istoric
      for (const event of events) {
        const exists = await prisma.aWBStatusHistory.findFirst({
          where: {
            awbId: params.id,
            status: event.name,
            statusDate: new Date(event.date),
          },
        });

        if (!exists) {
          await prisma.aWBStatusHistory.create({
            data: {
              awbId: params.id,
              status: event.name,
              statusDate: new Date(event.date),
              location: event.location,
              description: `[${event.id}] ${event.name}`,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: lastEvent?.name || "Necunoscut",
      eventsCount: events.length,
    });

  } catch (error: any) {
    console.error("Error refreshing AWB:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
