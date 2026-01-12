import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Lista alerte declanșate
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "ads.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // NEW, SEEN, RESOLVED, DISMISSED
    const ruleId = searchParams.get("ruleId");
    const campaignId = searchParams.get("campaignId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (status) {
      where.status = status;
    }
    if (ruleId) {
      where.ruleId = ruleId;
    }
    if (campaignId) {
      where.campaignId = campaignId;
    }

    const alerts = await prisma.adsAlert.findMany({
      where,
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            action: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            account: {
              select: {
                platform: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Count per status
    const counts = await prisma.adsAlert.groupBy({
      by: ["status"],
      _count: true,
    });

    const countMap = counts.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = c._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      alerts,
      counts: {
        new: countMap.NEW || 0,
        seen: countMap.SEEN || 0,
        resolved: countMap.RESOLVED || 0,
        dismissed: countMap.DISMISSED || 0,
        total: alerts.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}

// PATCH - Update status alertă
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "ads.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { alertId, action, resolution } = body;

    if (!alertId || !action) {
      return NextResponse.json({ error: "Alert ID și acțiune necesare" }, { status: 400 });
    }

    const alert = await prisma.adsAlert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return NextResponse.json({ error: "Alerta nu există" }, { status: 404 });
    }

    const updateData: any = {};

    switch (action) {
      case "markSeen":
        updateData.status = "SEEN";
        updateData.seenAt = new Date();
        updateData.seenBy = session.user.id;
        break;
      
      case "resolve":
        updateData.status = "RESOLVED";
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session.user.id;
        updateData.resolution = resolution || null;
        break;
      
      case "dismiss":
        updateData.status = "DISMISSED";
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session.user.id;
        updateData.resolution = resolution || "Dismissed by user";
        break;
      
      default:
        return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
    }

    await prisma.adsAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Alerta a fost actualizată",
    });
  } catch (error: any) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizare" },
      { status: 500 }
    );
  }
}
