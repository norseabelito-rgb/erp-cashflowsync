import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/db";
import { addInventoryStockForReturn } from "@/lib/inventory-stock";

/**
 * POST /api/returns/reprocess-stock
 * Re-procesează stocul pentru retururile mapate care nu au mișcări de stoc
 *
 * Body: { returnAwbId?: string } - optional, pentru un singur retur
 * Fără body: procesează toate retururile mapate fără mișcări
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    // Verificăm permisiunea
    const canProcess = await hasPermission(session.user.id, "handover.scan");
    if (!canProcess) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a procesa retururi" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { returnAwbId } = body;

    const results: Array<{
      returnAwbId: string;
      returnAwbNumber: string;
      orderId: string;
      orderNumber: string;
      processed: number;
      errors: string[];
      alreadyProcessed: boolean;
      skipped?: string;
    }> = [];

    if (returnAwbId) {
      // Procesează un singur retur
      const returnAwb = await prisma.returnAWB.findUnique({
        where: { id: returnAwbId },
        include: {
          order: { select: { id: true, shopifyOrderNumber: true } },
        },
      });

      if (!returnAwb) {
        return NextResponse.json({ error: "Return AWB nu a fost găsit" }, { status: 404 });
      }

      if (!returnAwb.orderId) {
        return NextResponse.json({ error: "Returul nu este mapat la o comandă" }, { status: 400 });
      }

      const stockResult = await addInventoryStockForReturn(returnAwb.orderId, returnAwbId);

      // Update status if processed
      if (stockResult.processed > 0) {
        await prisma.returnAWB.update({
          where: { id: returnAwbId },
          data: { status: "stock_returned" },
        });
      }

      results.push({
        returnAwbId,
        returnAwbNumber: returnAwb.returnAwbNumber,
        orderId: returnAwb.orderId,
        orderNumber: returnAwb.order?.shopifyOrderNumber || "-",
        processed: stockResult.processed,
        errors: stockResult.errors,
        alreadyProcessed: stockResult.alreadyProcessed || false,
      });
    } else {
      // Procesează toate retururile mapate
      const mappedReturns = await prisma.returnAWB.findMany({
        where: {
          orderId: { not: null },
          status: { not: "stock_returned" }, // Skip already processed
        },
        include: {
          order: { select: { id: true, shopifyOrderNumber: true } },
        },
      });

      console.log(`[ReprocessStock] Found ${mappedReturns.length} mapped returns to check`);

      for (const returnAwb of mappedReturns) {
        if (!returnAwb.orderId) continue;

        // Check if already has stock movements in NEW inventory system
        const existingMovement = await prisma.inventoryStockMovement.findFirst({
          where: {
            type: "RETURN",
            reason: { contains: returnAwb.id }
          },
        });

        if (existingMovement) {
          results.push({
            returnAwbId: returnAwb.id,
            returnAwbNumber: returnAwb.returnAwbNumber,
            orderId: returnAwb.orderId,
            orderNumber: returnAwb.order?.shopifyOrderNumber || "-",
            processed: 0,
            errors: [],
            alreadyProcessed: true,
          });
          continue;
        }

        // Process stock
        try {
          const stockResult = await addInventoryStockForReturn(returnAwb.orderId, returnAwb.id);

          // Update status if processed
          if (stockResult.processed > 0) {
            await prisma.returnAWB.update({
              where: { id: returnAwb.id },
              data: { status: "stock_returned" },
            });
          }

          results.push({
            returnAwbId: returnAwb.id,
            returnAwbNumber: returnAwb.returnAwbNumber,
            orderId: returnAwb.orderId,
            orderNumber: returnAwb.order?.shopifyOrderNumber || "-",
            processed: stockResult.processed,
            errors: stockResult.errors,
            alreadyProcessed: stockResult.alreadyProcessed || false,
          });
        } catch (error: any) {
          results.push({
            returnAwbId: returnAwb.id,
            returnAwbNumber: returnAwb.returnAwbNumber,
            orderId: returnAwb.orderId,
            orderNumber: returnAwb.order?.shopifyOrderNumber || "-",
            processed: 0,
            errors: [error.message],
            alreadyProcessed: false,
          });
        }
      }
    }

    // Summary stats
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const alreadyProcessedCount = results.filter(r => r.alreadyProcessed).length;
    const withErrorsCount = results.filter(r => r.errors.length > 0).length;
    const newlyProcessedCount = results.filter(r => r.processed > 0 && !r.alreadyProcessed).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalReturnsChecked: results.length,
        alreadyHadStock: alreadyProcessedCount,
        newlyProcessed: newlyProcessedCount,
        withErrors: withErrorsCount,
        totalStockMovements: totalProcessed,
      },
      details: results,
    });
  } catch (error: any) {
    console.error("Error in POST /api/returns/reprocess-stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la procesare" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/returns/reprocess-stock
 * Verifică retururile mapate care nu au mișcări de stoc
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "handover.scan");
    if (!canView) {
      return NextResponse.json(
        { error: "Nu ai permisiunea de a vizualiza retururile" },
        { status: 403 }
      );
    }

    // Get all mapped returns
    const mappedReturns = await prisma.returnAWB.findMany({
      where: { orderId: { not: null } },
      include: {
        order: {
          select: {
            id: true,
            shopifyOrderNumber: true,
            lineItems: {
              select: { sku: true, title: true, quantity: true },
            },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
    });

    const returnsWithoutStock: Array<{
      id: string;
      returnAwbNumber: string;
      status: string;
      orderId: string;
      orderNumber: string;
      lineItemsCount: number;
      lineItemsWithSku: number;
      lineItems: Array<{ sku: string | null; title: string; quantity: number }>;
    }> = [];

    const returnsWithStock: Array<{
      id: string;
      returnAwbNumber: string;
      status: string;
      orderNumber: string;
      movementsCount: number;
    }> = [];

    for (const ret of mappedReturns) {
      // Check for movements in NEW inventory system
      const movements = await prisma.inventoryStockMovement.findMany({
        where: {
          type: "RETURN",
          reason: { contains: ret.id }
        },
      });

      if (movements.length === 0) {
        const lineItems = ret.order?.lineItems || [];
        returnsWithoutStock.push({
          id: ret.id,
          returnAwbNumber: ret.returnAwbNumber,
          status: ret.status,
          orderId: ret.orderId!,
          orderNumber: ret.order?.shopifyOrderNumber || "-",
          lineItemsCount: lineItems.length,
          lineItemsWithSku: lineItems.filter(li => li.sku).length,
          lineItems: lineItems.map(li => ({
            sku: li.sku,
            title: li.title || "-",
            quantity: li.quantity,
          })),
        });
      } else {
        returnsWithStock.push({
          id: ret.id,
          returnAwbNumber: ret.returnAwbNumber,
          status: ret.status,
          orderNumber: ret.order?.shopifyOrderNumber || "-",
          movementsCount: movements.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalMappedReturns: mappedReturns.length,
        withStockMovements: returnsWithStock.length,
        withoutStockMovements: returnsWithoutStock.length,
      },
      returnsWithoutStock,
      returnsWithStock,
    });
  } catch (error: any) {
    console.error("Error in GET /api/returns/reprocess-stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare" },
      { status: 500 }
    );
  }
}
