/**
 * TEMPORARY DEBUG ENDPOINT - DELETE AFTER INVESTIGATION
 * Investigates SMS delivery issue: wrong SMS sent to wrong phone number
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Super admin only
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const INVESTIGATE_PHONE = "773716325"; // Stefan's phone (without prefix)

  try {
    // 1. Orders with Stefan's phone number (but possibly wrong customer name)
    const ordersWithPhone = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, "shopifyOrderNumber", "customerFirstName", "customerLastName",
             "customerPhone", "customerEmail", "status", "createdAt", "storeId"
      FROM orders
      WHERE "customerPhone" LIKE '%${INVESTIGATE_PHONE}%'
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    // 2. Recent scheduled SMS (last 50)
    const recentScheduledSMS = await prisma.$queryRawUnsafe<any[]>(`
      SELECT s.id, s.phone, s.text, s."scheduledAt", s."sentAt", s."awbNumber",
             s."orderId", s.type, s.error,
             o."shopifyOrderNumber", o."customerFirstName", o."customerLastName",
             o."customerPhone"
      FROM "ScheduledSMS" s
      LEFT JOIN orders o ON o.id = s."orderId"
      ORDER BY s."scheduledAt" DESC
      LIMIT 50
    `);

    // 3. Scheduled SMS sent to Stefan's phone specifically
    const smsToPhone = await prisma.$queryRawUnsafe<any[]>(`
      SELECT s.id, s.phone, s.text, s."scheduledAt", s."sentAt", s."awbNumber",
             s."orderId", s.type,
             o."shopifyOrderNumber", o."customerFirstName", o."customerLastName",
             o."customerPhone"
      FROM "ScheduledSMS" s
      LEFT JOIN orders o ON o.id = s."orderId"
      WHERE s.phone LIKE '%${INVESTIGATE_PHONE}%'
      ORDER BY s."scheduledAt" DESC
      LIMIT 20
    `);

    // 4. Recent orders (last 48h) to check for phone mixups
    const recentOrders = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "shopifyOrderNumber", "customerFirstName", "customerLastName",
             "customerPhone", "customerEmail", "status", "createdAt"
      FROM orders
      WHERE "createdAt" > NOW() - INTERVAL '48 hours'
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);

    // 5. Check for duplicate phone numbers with different customer names
    const phoneDuplicates = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "customerPhone",
             COUNT(DISTINCT CONCAT("customerFirstName", ' ', "customerLastName")) as distinct_names,
             COUNT(*) as order_count,
             ARRAY_AGG(DISTINCT CONCAT("customerFirstName", ' ', "customerLastName")) as names,
             ARRAY_AGG(DISTINCT "shopifyOrderNumber" ORDER BY "shopifyOrderNumber" DESC) as order_numbers
      FROM orders
      WHERE "customerPhone" IS NOT NULL AND "customerPhone" != ''
        AND "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY "customerPhone"
      HAVING COUNT(DISTINCT CONCAT("customerFirstName", ' ', "customerLastName")) > 1
      ORDER BY order_count DESC
      LIMIT 20
    `);

    // 6. Check AWBs that triggered SMS recently (handover scans from last 48h)
    const recentHandovers = await prisma.$queryRawUnsafe<any[]>(`
      SELECT a."awbNumber", a."handedOverAt", a."orderId",
             o."shopifyOrderNumber", o."customerFirstName", o."customerLastName",
             o."customerPhone"
      FROM "AWB" a
      JOIN orders o ON o.id = a."orderId"
      WHERE a."handedOverAt" > NOW() - INTERVAL '48 hours'
      ORDER BY a."handedOverAt" DESC
      LIMIT 30
    `);

    return NextResponse.json({
      _note: "TEMPORARY DEBUG - DELETE AFTER INVESTIGATION",
      _phone: `Investigating phone: *${INVESTIGATE_PHONE}`,
      ordersWithStefansPhone: {
        count: ordersWithPhone.length,
        data: ordersWithPhone,
      },
      scheduledSMSToStefansPhone: {
        count: smsToPhone.length,
        data: smsToPhone,
      },
      recentScheduledSMS: {
        count: recentScheduledSMS.length,
        data: recentScheduledSMS,
      },
      recentOrders48h: {
        count: recentOrders.length,
        data: recentOrders,
      },
      phoneDuplicatesLast7Days: {
        _desc: "Same phone number, different customer names in last 7 days",
        count: phoneDuplicates.length,
        data: phoneDuplicates,
      },
      recentHandoverScans: {
        count: recentHandovers.length,
        data: recentHandovers,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DEBUG-SMS] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
