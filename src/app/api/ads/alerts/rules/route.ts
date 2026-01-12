import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Lista reguli de alertă
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

    const rules = await prisma.adsAlertRule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { alerts: true },
        },
      },
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error("Error fetching alert rules:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la încărcare" },
      { status: 500 }
    );
  }
}

// POST - Creează regulă nouă
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.alerts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      scopeType,
      scopePlatform,
      scopeSku,
      scopeCampaigns,
      conditions,
      conditionLogic,
      action,
      reducePct,
      autoRollback,
      rollbackAfterH,
      notifyEmail,
      notifyInApp,
      emailTo,
      cooldownHours,
    } = body;

    // Validări
    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json({ error: "Cel puțin o condiție este necesară" }, { status: 400 });
    }

    // Validează condițiile
    const validMetrics = ["spend", "cpa", "roas", "ctr", "cpm", "cpc", "frequency", "conversions"];
    const validOperators = [">", "<", ">=", "<=", "=="];
    const validTimeframes = ["3h", "6h", "12h", "24h", "48h", "7d"];

    for (const condition of conditions) {
      if (!validMetrics.includes(condition.metric)) {
        return NextResponse.json({ error: `Metrică invalidă: ${condition.metric}` }, { status: 400 });
      }
      if (!validOperators.includes(condition.operator)) {
        return NextResponse.json({ error: `Operator invalid: ${condition.operator}` }, { status: 400 });
      }
      if (condition.timeframe && !validTimeframes.includes(condition.timeframe)) {
        return NextResponse.json({ error: `Timeframe invalid: ${condition.timeframe}` }, { status: 400 });
      }
    }

    const rule = await prisma.adsAlertRule.create({
      data: {
        name,
        description,
        scopeType: scopeType || "ALL",
        scopePlatform: scopePlatform || null,
        scopeSku: scopeSku || null,
        scopeCampaigns: scopeCampaigns || null,
        conditions,
        conditionLogic: conditionLogic || "AND",
        action: action || "NOTIFY",
        reducePct: reducePct || null,
        autoRollback: autoRollback || false,
        rollbackAfterH: rollbackAfterH || null,
        notifyEmail: notifyEmail ?? true,
        notifyInApp: notifyInApp ?? true,
        emailTo: emailTo || null,
        cooldownHours: cooldownHours || 24,
      },
    });

    return NextResponse.json({
      success: true,
      rule,
      message: "Regula a fost creată",
    });
  } catch (error: any) {
    console.error("Error creating alert rule:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la creare" },
      { status: 500 }
    );
  }
}

// PATCH - Update regulă
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.alerts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID-ul este necesar" }, { status: 400 });
    }

    const existing = await prisma.adsAlertRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Regula nu există" }, { status: 404 });
    }

    const rule = await prisma.adsAlertRule.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      rule,
      message: "Regula a fost actualizată",
    });
  } catch (error: any) {
    console.error("Error updating alert rule:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la actualizare" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge regulă
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "ads.alerts");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID-ul este necesar" }, { status: 400 });
    }

    await prisma.adsAlertRule.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Regula a fost ștearsă",
    });
  } catch (error: any) {
    console.error("Error deleting alert rule:", error);
    return NextResponse.json(
      { error: error.message || "Eroare la ștergere" },
      { status: 500 }
    );
  }
}
