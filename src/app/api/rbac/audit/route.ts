import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET /api/rbac/audit - Lista audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verifică permisiunea
    const canView = await hasPermission(session.user.id, "admin.audit");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!canView && !user?.isSuperAdmin) {
      return NextResponse.json({ error: "Nu ai permisiunea de a vizualiza audit log" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (action) {
      whereClause.action = { contains: action };
    }

    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = new Date(from);
      if (to) whereClause.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rbac/audit/stats - Statistici audit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === "getStats") {
      // Verifică permisiunea
      const canView = await hasPermission(session.user.id, "admin.audit");
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true },
      });

      if (!canView && !user?.isSuperAdmin) {
        return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
      }

      // Statistici pe ultimele 30 de zile
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await prisma.auditLog.groupBy({
        by: ["action"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      const entityStats = await prisma.auditLog.groupBy({
        by: ["entityType"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      const userStats = await prisma.auditLog.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          userId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      // Obține numele utilizatorilor
      const userIds = userStats.map(s => s.userId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });

      const userStatsWithNames = userStats.map(s => ({
        ...s,
        user: users.find(u => u.id === s.userId),
      }));

      return NextResponse.json({
        actionStats: stats,
        entityStats,
        userStats: userStatsWithNames,
      });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
