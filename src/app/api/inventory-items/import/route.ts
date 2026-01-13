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
      errors: [] as { row: number; sku: string; error: string }[],
    };

    // Get all suppliers for lookup
    const suppliers = await prisma.supplier.findMany();
    const supplierMap = new Map<string, string>(
      suppliers.map((s) => [s.name.toLowerCase(), s.id])
    );

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

        // For stock_only mode, we only need SKU and currentStock
        if (mode === "stock_only") {
          if (row.currentStock === undefined || row.currentStock === null) {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Stocul curent este obligatoriu pentru modul 'doar stoc'" });
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

          // Calculate stock difference and create movement
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
                  type: difference > 0 ? "IN" : "OUT",
                  quantity: new Decimal(Math.abs(difference)),
                  reason: "ADJUSTMENT",
                  notes: `Import stoc din Excel - ajustare de la ${oldStock} la ${newStock}`,
                  performedById: session.user.id,
                },
              }),
            ]);
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
        if (row.currentStock !== undefined) itemData.currentStock = new Decimal(row.currentStock);
        if (row.minStock !== undefined) itemData.minStock = row.minStock ? new Decimal(row.minStock) : null;
        if (row.unit) itemData.unit = row.unit;
        if (row.unitsPerBox !== undefined) itemData.unitsPerBox = row.unitsPerBox || null;
        if (row.boxUnit !== undefined) itemData.boxUnit = row.boxUnit || null;
        if (row.costPrice !== undefined) itemData.costPrice = row.costPrice ? new Decimal(row.costPrice) : null;
        if (supplierId) itemData.supplierId = supplierId;
        if (row.isComposite !== undefined) itemData.isComposite = row.isComposite;
        if (row.isActive !== undefined) itemData.isActive = row.isActive;

        if (existing) {
          if (mode === "create") {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Articolul există deja (mod: doar creare)" });
            results.skipped++;
            continue;
          }

          // Track stock change for movement
          if (row.currentStock !== undefined) {
            const oldStock = Number(existing.currentStock);
            const newStock = row.currentStock;
            const difference = newStock - oldStock;

            if (difference !== 0) {
              await prisma.inventoryStockMovement.create({
                data: {
                  itemId: existing.id,
                  type: difference > 0 ? "IN" : "OUT",
                  quantity: new Decimal(Math.abs(difference)),
                  reason: "ADJUSTMENT",
                  notes: `Import din Excel - ajustare de la ${oldStock} la ${newStock}`,
                  performedById: session.user.id,
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

          await prisma.inventoryItem.create({
            data: {
              sku: row.sku.trim(),
              name: row.name?.trim() || row.sku.trim(),
              ...itemData,
            },
          });
          results.created++;
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

    return NextResponse.json({
      success: true,
      message: `Import finalizat: ${results.created} create, ${results.updated} actualizate, ${results.skipped} omise`,
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
