import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { EntityType, ActionType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const entityType = searchParams.get("entityType") as EntityType | null;
    const action = searchParams.get("action") as ActionType | null;
    const orderId = searchParams.get("orderId");
    const success = searchParams.get("success");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (orderId) where.orderId = orderId;
    if (success !== null && success !== undefined) {
      where.success = success === "true";
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { orderNumber: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { awbNumber: { contains: search, mode: "insensitive" } },
        { productSku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Formatăm datele pentru frontend
    const formattedLogs = logs.map(log => ({
      ...log,
      details: log.details || null,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error: any) {
    console.error("Activity log error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea istoricului",
    });
  }
}

// Obține statistici pentru dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === "stats") {
      // Statistici pentru ultimele 24 ore
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const [
        totalActions,
        successActions,
        failedActions,
        invoiceCount,
        awbCount,
        stockCount,
      ] = await Promise.all([
        prisma.activityLog.count({
          where: { createdAt: { gte: since } },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: since }, success: true },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: since }, success: false },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: since }, entityType: "INVOICE" },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: since }, entityType: "AWB" },
        }),
        prisma.activityLog.count({
          where: { createdAt: { gte: since }, entityType: "STOCK" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          last24h: {
            total: totalActions,
            success: successActions,
            failed: failedActions,
            invoices: invoiceCount,
            awbs: awbCount,
            stock: stockCount,
          },
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: "Tip de request invalid",
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
