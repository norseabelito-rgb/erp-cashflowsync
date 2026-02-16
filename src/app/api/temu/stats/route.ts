/**
 * Temu Stats API
 *
 * GET /api/temu/stats - Returns Temu dashboard statistics
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    // Check if there are any Temu stores configured
    const storesCount = await prisma.temuStore.count();
    const configured = storesCount > 0;

    if (!configured) {
      return NextResponse.json({
        totalOrders: 0,
        pendingInvoice: 0,
        pendingAwb: 0,
        syncedToday: 0,
        storesCount: 0,
        configured: false,
      });
    }

    // Get today's start timestamp
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all stats in parallel
    const [totalOrders, pendingInvoice, pendingAwb, syncedToday] = await Promise.all([
      // Total Temu orders
      prisma.order.count({
        where: { source: "temu" },
      }),

      // Orders pending invoice (no invoice, status VALIDATED or PENDING)
      prisma.order.count({
        where: {
          source: "temu",
          invoices: { none: {} },
          status: { in: ["VALIDATED", "PENDING"] },
        },
      }),

      // Orders pending AWB (has invoice but no AWB)
      prisma.order.count({
        where: {
          source: "temu",
          awb: null,
          invoices: { some: {} },
        },
      }),

      // Orders synced today
      prisma.order.count({
        where: {
          source: "temu",
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    return NextResponse.json({
      totalOrders,
      pendingInvoice,
      pendingAwb,
      syncedToday,
      storesCount,
      configured: true,
    });
  } catch (error: any) {
    console.error("[Temu Stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
