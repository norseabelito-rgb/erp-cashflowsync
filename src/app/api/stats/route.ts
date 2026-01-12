import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today"; // today, week, month, year

    // Calculează intervalul de date
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Statistici stoc
    const products = await prisma.product.findMany({
      where: { isActive: true },
    });

    const stockStats = {
      totalProducts: products.length,
      totalValue: products.reduce(
        (sum, p) => sum + Number(p.stockQuantity) * Number(p.costPrice),
        0
      ),
      totalRetailValue: products.reduce(
        (sum, p) => sum + Number(p.stockQuantity) * Number(p.price),
        0
      ),
      lowStockCount: products.filter(
        (p) => p.stockQuantity <= p.lowStockAlert && p.stockQuantity > 0
      ).length,
      outOfStockCount: products.filter((p) => p.stockQuantity <= 0).length,
    };

    // Produse cu stoc scăzut
    const lowStockProducts = products
      .filter((p) => p.stockQuantity <= p.lowStockAlert)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stockQuantity: p.stockQuantity,
        lowStockAlert: p.lowStockAlert,
      }));

    // Statistici vânzări din perioada selectată
    const dailySales = await prisma.dailySales.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    const salesStats = {
      totalSales: dailySales.reduce((sum, d) => sum + Number(d.totalSales), 0),
      totalOrders: dailySales.reduce((sum, d) => sum + d.totalOrders, 0),
      totalInvoices: dailySales.reduce((sum, d) => sum + d.totalInvoices, 0),
      totalItems: dailySales.reduce((sum, d) => sum + d.totalItems, 0),
      totalCost: dailySales.reduce((sum, d) => sum + Number(d.totalCost), 0),
      totalProfit: dailySales.reduce((sum, d) => sum + Number(d.totalProfit), 0),
      totalAWBs: dailySales.reduce((sum, d) => sum + d.totalAWBs, 0),
      totalDelivered: dailySales.reduce((sum, d) => sum + d.totalDelivered, 0),
      totalReturned: dailySales.reduce((sum, d) => sum + d.totalReturned, 0),
    };

    // Date pentru grafic (ultimele 7 zile)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = dailySales.find(
        (d) => new Date(d.date).toDateString() === date.toDateString()
      );
      
      chartData.push({
        date: date.toISOString().split("T")[0],
        sales: dayData ? Number(dayData.totalSales) : 0,
        orders: dayData ? dayData.totalOrders : 0,
        invoices: dayData ? dayData.totalInvoices : 0,
        profit: dayData ? Number(dayData.totalProfit) : 0,
      });
    }

    // Statistici din facturi (dacă nu avem dailySales populat)
    const invoicesInPeriod = await prisma.invoice.findMany({
      where: {
        status: "issued",
        issuedAt: { gte: startDate },
      },
      include: {
        order: true,
      },
    });

    const invoiceStats = {
      count: invoicesInPeriod.length,
      totalValue: invoicesInPeriod.reduce(
        (sum, inv) => sum + (inv.order ? Number(inv.order.totalPrice) : 0),
        0
      ),
    };

    // Ultimele mișcări de stoc
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      stockStats,
      lowStockProducts,
      salesStats,
      chartData,
      invoiceStats,
      recentMovements,
      period,
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
