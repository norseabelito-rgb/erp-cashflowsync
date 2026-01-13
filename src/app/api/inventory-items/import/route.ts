import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

interface ImportRow {
  sku: string;
  name: string;
  description?: string;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  unitsPerBox?: number;
  boxUnit?: string;
  costPrice?: number;
  supplier?: string;
  isComposite?: boolean;
  isActive?: boolean;
}

// POST /api/inventory-items/import - Import inventory from CSV
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

    let rows: ImportRow[] = [];
    let mode: "create" | "update" | "upsert" | "stock_only" = "upsert";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      mode = (formData.get("mode") as typeof mode) || "upsert";

      if (!file) {
        return NextResponse.json({ error: "Fișierul este obligatoriu" }, { status: 400 });
      }

      const text = await file.text();
      rows = parseCsv(text);
    } else {
      const body = await request.json();
      rows = body.rows || [];
      mode = body.mode || "upsert";
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nu există date de importat" }, { status: 400 });
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
      const rowNum = i + 2;

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
                  notes: `Import stoc din CSV - ajustare de la ${oldStock} la ${newStock}`,
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

        const itemData: any = {};

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
                  notes: `Import din CSV - ajustare de la ${oldStock} la ${newStock}`,
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
      } catch (error: any) {
        results.errors.push({
          row: rowNum,
          sku: row.sku || "",
          error: error.message || "Eroare necunoscută",
        });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import finalizat: ${results.created} create, ${results.updated} actualizate, ${results.skipped} omise`,
      results,
    });
  } catch (error: any) {
    console.error("Error importing inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseCsv(text: string): ImportRow[] {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

  const columnMap: Record<string, keyof ImportRow> = {
    "sku": "sku",
    "nume": "name",
    "name": "name",
    "descriere": "description",
    "description": "description",
    "stoc_curent": "currentStock",
    "stoc": "currentStock",
    "currentstock": "currentStock",
    "stock": "currentStock",
    "stoc_minim": "minStock",
    "minstock": "minStock",
    "unitate": "unit",
    "unit": "unit",
    "buc_per_bax": "unitsPerBox",
    "unitsperbox": "unitsPerBox",
    "unitate_bax": "boxUnit",
    "boxunit": "boxUnit",
    "pret_cost": "costPrice",
    "costprice": "costPrice",
    "furnizor": "supplier",
    "supplier": "supplier",
    "este_compus": "isComposite",
    "iscomposite": "isComposite",
    "activ": "isActive",
    "isactive": "isActive",
  };

  const headerIndices: Partial<Record<keyof ImportRow, number>> = {};
  headers.forEach((h, i) => {
    const normalizedHeader = h.replace(/[_\s]/g, "").toLowerCase();
    const field = columnMap[normalizedHeader] || columnMap[h];
    if (field) {
      headerIndices[field] = i;
    }
  });

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;

    const row: ImportRow = {
      sku: values[headerIndices.sku ?? -1] || "",
      name: values[headerIndices.name ?? -1] || "",
    };

    if (headerIndices.description !== undefined) {
      row.description = values[headerIndices.description] || undefined;
    }
    if (headerIndices.currentStock !== undefined) {
      const stockStr = values[headerIndices.currentStock]?.replace(",", ".").trim();
      row.currentStock = stockStr ? parseFloat(stockStr) : undefined;
    }
    if (headerIndices.minStock !== undefined) {
      const minStr = values[headerIndices.minStock]?.replace(",", ".").trim();
      row.minStock = minStr ? parseFloat(minStr) : undefined;
    }
    if (headerIndices.unit !== undefined) {
      row.unit = values[headerIndices.unit] || undefined;
    }
    if (headerIndices.unitsPerBox !== undefined) {
      const upbStr = values[headerIndices.unitsPerBox]?.trim();
      row.unitsPerBox = upbStr ? parseInt(upbStr, 10) : undefined;
    }
    if (headerIndices.boxUnit !== undefined) {
      row.boxUnit = values[headerIndices.boxUnit] || undefined;
    }
    if (headerIndices.costPrice !== undefined) {
      const cpStr = values[headerIndices.costPrice]?.replace(",", ".").trim();
      row.costPrice = cpStr ? parseFloat(cpStr) : undefined;
    }
    if (headerIndices.supplier !== undefined) {
      row.supplier = values[headerIndices.supplier] || undefined;
    }
    if (headerIndices.isComposite !== undefined) {
      const compStr = values[headerIndices.isComposite]?.toLowerCase().trim();
      row.isComposite = compStr === "da" || compStr === "true" || compStr === "1";
    }
    if (headerIndices.isActive !== undefined) {
      const activeStr = values[headerIndices.isActive]?.toLowerCase().trim();
      row.isActive = activeStr === "da" || activeStr === "true" || activeStr === "1" || activeStr === "";
    }

    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
