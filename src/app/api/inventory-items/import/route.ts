import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";
import {
  parseInventoryExcel,
  createExcelTemplate,
  INVENTORY_TEMPLATE_HEADERS,
  InventoryImportRow,
} from "@/lib/excel";

// Helper function to update warehouse stocks for an item
async function updateWarehouseStocks(
  itemId: string,
  warehouseStocks: Record<string, number>,
  warehouseMap: Map<string, string>,
  userId: string
): Promise<{ updated: number; errors: string[] }> {
  const result = { updated: 0, errors: [] as string[] };

  for (const [warehouseName, newStock] of Object.entries(warehouseStocks)) {
    const warehouseId = warehouseMap.get(warehouseName.toLowerCase());
    if (!warehouseId) {
      result.errors.push(`Depozit negăsit: "${warehouseName}"`);
      continue;
    }

    // Get existing warehouse stock
    const existingStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId,
        },
      },
    });

    const oldStock = existingStock ? Number(existingStock.currentStock) : 0;
    const difference = newStock - oldStock;

    if (difference !== 0 || !existingStock) {
      await prisma.$transaction(async (tx) => {
        // Upsert warehouse stock
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_itemId: {
              warehouseId,
              itemId,
            },
          },
          update: {
            currentStock: new Decimal(newStock),
          },
          create: {
            warehouseId,
            itemId,
            currentStock: new Decimal(newStock),
          },
        });

        // Create stock movement if there's a change
        if (difference !== 0) {
          await tx.inventoryStockMovement.create({
            data: {
              itemId,
              warehouseId,
              type: difference > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
              quantity: new Decimal(Math.abs(difference)),
              previousStock: new Decimal(oldStock),
              newStock: new Decimal(newStock),
              reason: "Import Excel",
              notes: `Import stoc din Excel pentru depozit "${warehouseName}" - de la ${oldStock} la ${newStock}`,
              userId: userId,
            },
          });
        }
      });

      result.updated++;
    }
  }

  return result;
}

// Helper to recalculate total stock from all warehouses
async function recalculateTotalStock(itemId: string): Promise<number> {
  const aggregate = await prisma.warehouseStock.aggregate({
    where: { itemId },
    _sum: { currentStock: true },
  });

  const total = Number(aggregate._sum.currentStock || 0);

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { currentStock: new Decimal(total) },
  });

  return total;
}

// POST /api/inventory-items/import - Import inventory from Excel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "inventory.manage");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    let rows: InventoryImportRow[] = [];
    let mode: "create" | "update" | "upsert" | "stock_only" = "upsert";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      mode = (formData.get("mode") as typeof mode) || "upsert";

      if (!file) {
        return NextResponse.json({ error: "Fișierul este obligatoriu" }, { status: 400 });
      }

      // Check file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
        return NextResponse.json({
          error: "Tip fișier invalid. Încarcă un fișier Excel (.xlsx sau .xls)"
        }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      rows = parseInventoryExcel(buffer);
    } else {
      const body = await request.json();
      rows = body.rows || [];
      mode = body.mode || "upsert";
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nu există date de importat. Verifică că fișierul Excel conține date." }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      warehouseStocksUpdated: 0,
      errors: [] as { row: number; sku: string; error: string }[],
    };

    // Get all suppliers for lookup
    const suppliers = await prisma.supplier.findMany();
    const supplierMap = new Map<string, string>(
      suppliers.map((s) => [s.name.toLowerCase(), s.id])
    );

    // Get all warehouses for lookup (by name, case-insensitive)
    const warehouses = await prisma.warehouse.findMany();
    const warehouseMap = new Map<string, string>(
      warehouses.map((w) => [w.name.toLowerCase(), w.id])
    );

    // Check if any row has warehouse stocks
    const hasWarehouseStocks = rows.some((r) => r.warehouseStocks && Object.keys(r.warehouseStocks).length > 0);

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        if (!row.sku?.trim()) {
          results.errors.push({ row: rowNum, sku: row.sku || "", error: "SKU este obligatoriu" });
          results.skipped++;
          continue;
        }

        // For stock_only mode, we only need SKU and (currentStock OR warehouseStocks)
        if (mode === "stock_only") {
          const hasAnyStock = row.currentStock !== undefined ||
            (row.warehouseStocks && Object.keys(row.warehouseStocks).length > 0);

          if (!hasAnyStock) {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Stocul este obligatoriu pentru modul 'doar stoc'" });
            results.skipped++;
            continue;
          }

          const existing = await prisma.inventoryItem.findUnique({
            where: { sku: row.sku.trim() },
          });

          if (!existing) {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Articolul nu există în inventar" });
            results.skipped++;
            continue;
          }

          // If we have warehouse stocks, update them
          if (row.warehouseStocks && Object.keys(row.warehouseStocks).length > 0) {
            const wsResult = await updateWarehouseStocks(
              existing.id,
              row.warehouseStocks,
              warehouseMap,
              session.user.id
            );
            results.warehouseStocksUpdated += wsResult.updated;

            for (const err of wsResult.errors) {
              results.errors.push({ row: rowNum, sku: row.sku, error: err });
            }

            // Recalculate total stock from warehouses
            await recalculateTotalStock(existing.id);
          } else if (row.currentStock !== undefined) {
            // Fallback to simple stock update if no warehouse stocks
            const oldStock = Number(existing.currentStock);
            const newStock = row.currentStock;
            const difference = newStock - oldStock;

            if (difference !== 0) {
              await prisma.$transaction([
                prisma.inventoryItem.update({
                  where: { id: existing.id },
                  data: { currentStock: new Decimal(newStock) },
                }),
                prisma.inventoryStockMovement.create({
                  data: {
                    itemId: existing.id,
                    type: difference > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
                    quantity: new Decimal(Math.abs(difference)),
                    previousStock: new Decimal(oldStock),
                    newStock: new Decimal(newStock),
                    reason: "Import Excel",
                    notes: `Import stoc din Excel - ajustare de la ${oldStock} la ${newStock}`,
                    userId: session.user.id,
                  },
                }),
              ]);
            }
          }

          results.updated++;
          continue;
        }

        // For other modes, name is required
        if (!row.name?.trim() && mode !== "update") {
          results.errors.push({ row: rowNum, sku: row.sku, error: "Numele este obligatoriu" });
          results.skipped++;
          continue;
        }

        // Look up supplier
        let supplierId: string | null = null;
        if (row.supplier) {
          supplierId = supplierMap.get(row.supplier.toLowerCase()) ?? null;
        }

        const existing = await prisma.inventoryItem.findUnique({
          where: { sku: row.sku.trim() },
        });

        const itemData: Record<string, unknown> = {};

        if (row.name) itemData.name = row.name.trim();
        if (row.description !== undefined) itemData.description = row.description || null;
        // Only set currentStock directly if we don't have warehouse stocks
        if (row.currentStock !== undefined && !hasWarehouseStocks) {
          itemData.currentStock = new Decimal(row.currentStock);
        }
        if (row.minStock !== undefined) itemData.minStock = row.minStock ? new Decimal(row.minStock) : null;
        if (row.unit) itemData.unit = row.unit;
        if (row.unitsPerBox !== undefined) itemData.unitsPerBox = row.unitsPerBox || null;
        if (row.boxUnit !== undefined) itemData.boxUnit = row.boxUnit || null;
        if (row.costPrice !== undefined) itemData.costPrice = row.costPrice ? new Decimal(row.costPrice) : null;
        if (supplierId) itemData.supplierId = supplierId;
        if (row.isComposite !== undefined) itemData.isComposite = row.isComposite;
        if (row.isActive !== undefined) itemData.isActive = row.isActive;

        let itemId: string;

        if (existing) {
          if (mode === "create") {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Articolul există deja (mod: doar creare)" });
            results.skipped++;
            continue;
          }

          itemId = existing.id;

          // Track stock change for movement (only if no warehouse stocks)
          if (row.currentStock !== undefined && !hasWarehouseStocks) {
            const oldStock = Number(existing.currentStock);
            const newStock = row.currentStock;
            const difference = newStock - oldStock;

            if (difference !== 0) {
              await prisma.inventoryStockMovement.create({
                data: {
                  itemId: existing.id,
                  type: difference > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
                  quantity: new Decimal(Math.abs(difference)),
                  previousStock: new Decimal(oldStock),
                  newStock: new Decimal(newStock),
                  reason: "Import Excel",
                  notes: `Import din Excel - ajustare de la ${oldStock} la ${newStock}`,
                  userId: session.user.id,
                },
              });
            }
          }

          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: itemData,
          });
          results.updated++;
        } else {
          if (mode === "update") {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Articolul nu există (mod: doar actualizare)" });
            results.skipped++;
            continue;
          }

          const newItem = await prisma.inventoryItem.create({
            data: {
              sku: row.sku.trim(),
              name: row.name?.trim() || row.sku.trim(),
              ...itemData,
            },
          });
          itemId = newItem.id;
          results.created++;
        }

        // Process warehouse stocks if present
        if (row.warehouseStocks && Object.keys(row.warehouseStocks).length > 0) {
          const wsResult = await updateWarehouseStocks(
            itemId,
            row.warehouseStocks,
            warehouseMap,
            session.user.id
          );
          results.warehouseStocksUpdated += wsResult.updated;

          for (const err of wsResult.errors) {
            results.errors.push({ row: rowNum, sku: row.sku, error: err });
          }

          // Recalculate total stock from warehouses
          await recalculateTotalStock(itemId);
        }
      } catch (error: unknown) {
        results.errors.push({
          row: rowNum,
          sku: row.sku || "",
          error: error instanceof Error ? error.message : "Eroare necunoscută",
        });
        results.skipped++;
      }
    }

    const warehouseMsg = results.warehouseStocksUpdated > 0
      ? `, ${results.warehouseStocksUpdated} stocuri depozit actualizate`
      : "";

    return NextResponse.json({
      success: true,
      message: `Import finalizat: ${results.created} create, ${results.updated} actualizate, ${results.skipped} omise${warehouseMsg}`,
      results,
    });
  } catch (error: unknown) {
    console.error("Error importing inventory:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Eroare la import"
    }, { status: 500 });
  }
}

// GET /api/inventory-items/import - Download template
export async function GET() {
  try {
    const buffer = createExcelTemplate(INVENTORY_TEMPLATE_HEADERS, "Articole Inventar");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=template_inventar.xlsx",
      },
    });
  } catch (error: unknown) {
    console.error("Error generating template:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Eroare la generare template"
    }, { status: 500 });
  }
}
