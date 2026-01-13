import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

interface ImportRow {
  sku: string;
  barcode?: string;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category?: string;
  tags?: string[];
  weight?: number;
  warehouseLocation?: string;
  stock?: number;
  isActive?: boolean;
  isComposite?: boolean;
  trendyolBarcode?: string;
  trendyolBrandName?: string;
}

// POST /api/products/import - Import products from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canCreate = await hasPermission(session.user.id, "products.create");
    if (!canCreate) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";

    let rows: ImportRow[] = [];
    let mode: "create" | "update" | "upsert" = "upsert";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      mode = (formData.get("mode") as "create" | "update" | "upsert") || "upsert";

      if (!file) {
        return NextResponse.json({ error: "Fișierul este obligatoriu" }, { status: 400 });
      }

      const text = await file.text();
      rows = parseCsv(text);
    } else {
      // Handle JSON payload for preview
      const body = await request.json();
      rows = body.rows || [];
      mode = body.mode || "upsert";
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nu există date de importat" }, { status: 400 });
    }

    // Validate and process
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; sku: string; error: string }[],
    };

    // Get all categories for lookup
    const categories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>(categories.map((c) => [c.name.toLowerCase(), c.id]));

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Validate required fields
        if (!row.sku?.trim()) {
          results.errors.push({ row: rowNum, sku: row.sku || "", error: "SKU este obligatoriu" });
          results.skipped++;
          continue;
        }

        if (!row.title?.trim()) {
          results.errors.push({ row: rowNum, sku: row.sku, error: "Titlul este obligatoriu" });
          results.skipped++;
          continue;
        }

        if (row.price === undefined || row.price === null || isNaN(row.price)) {
          results.errors.push({ row: rowNum, sku: row.sku, error: "Prețul este obligatoriu și trebuie să fie un număr" });
          results.skipped++;
          continue;
        }

        // Look up category
        let categoryId: string | null = null;
        if (row.category) {
          categoryId = categoryMap.get(row.category.toLowerCase()) ?? null;
          // Create category if not exists
          if (!categoryId) {
            const newCategory = await prisma.category.create({
              data: { name: row.category },
            });
            categoryId = newCategory.id;
            categoryMap.set(row.category.toLowerCase(), categoryId);
          }
        }

        // Check if product exists
        const existing = await prisma.masterProduct.findUnique({
          where: { sku: row.sku.trim() },
        });

        const productData = {
          title: row.title.trim(),
          description: row.description || null,
          price: new Decimal(row.price),
          compareAtPrice: row.compareAtPrice ? new Decimal(row.compareAtPrice) : null,
          categoryId,
          tags: row.tags || [],
          weight: row.weight ? new Decimal(row.weight) : null,
          warehouseLocation: row.warehouseLocation || null,
          stock: row.stock ?? 0,
          isActive: row.isActive ?? true,
          isComposite: row.isComposite ?? false,
          barcode: row.barcode || null,
          trendyolBarcode: row.trendyolBarcode || null,
          trendyolBrandName: row.trendyolBrandName || null,
        };

        if (existing) {
          if (mode === "create") {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Produsul există deja (mod: doar creare)" });
            results.skipped++;
            continue;
          }

          await prisma.masterProduct.update({
            where: { id: existing.id },
            data: productData,
          });
          results.updated++;
        } else {
          if (mode === "update") {
            results.errors.push({ row: rowNum, sku: row.sku, error: "Produsul nu există (mod: doar actualizare)" });
            results.skipped++;
            continue;
          }

          await prisma.masterProduct.create({
            data: {
              sku: row.sku.trim(),
              ...productData,
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
    console.error("Error importing products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseCsv(text: string): ImportRow[] {
  // Remove BOM if present
  const cleanText = text.replace(/^\uFEFF/, "");

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());

  // Column mapping (Romanian to field names)
  const columnMap: Record<string, keyof ImportRow> = {
    "sku": "sku",
    "barcode": "barcode",
    "titlu": "title",
    "title": "title",
    "descriere": "description",
    "description": "description",
    "pret": "price",
    "price": "price",
    "pret_comparat": "compareAtPrice",
    "compareatprice": "compareAtPrice",
    "categorie": "category",
    "category": "category",
    "tags": "tags",
    "greutate_kg": "weight",
    "weight": "weight",
    "locatie_depozit": "warehouseLocation",
    "warehouselocation": "warehouseLocation",
    "stoc": "stock",
    "stock": "stock",
    "activ": "isActive",
    "isactive": "isActive",
    "este_compus": "isComposite",
    "iscomposite": "isComposite",
    "trendyol_barcode": "trendyolBarcode",
    "trendyolbarcode": "trendyolBarcode",
    "trendyol_brand": "trendyolBrandName",
    "trendyolbrandname": "trendyolBrandName",
  };

  // Map header indices
  const headerIndices: Partial<Record<keyof ImportRow, number>> = {};
  headers.forEach((h, i) => {
    const field = columnMap[h.replace(/[_\s]/g, "").toLowerCase()];
    if (field) {
      headerIndices[field] = i;
    }
  });

  // Parse rows
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue; // Skip empty rows

    const row: ImportRow = {
      sku: values[headerIndices.sku ?? -1] || "",
      title: values[headerIndices.title ?? -1] || "",
      price: 0,
    };

    // Optional fields
    if (headerIndices.barcode !== undefined) {
      row.barcode = values[headerIndices.barcode] || undefined;
    }
    if (headerIndices.description !== undefined) {
      row.description = values[headerIndices.description] || undefined;
    }
    if (headerIndices.price !== undefined) {
      const priceStr = values[headerIndices.price]?.replace(",", ".").trim();
      row.price = parseFloat(priceStr) || 0;
    }
    if (headerIndices.compareAtPrice !== undefined) {
      const compareStr = values[headerIndices.compareAtPrice]?.replace(",", ".").trim();
      row.compareAtPrice = compareStr ? parseFloat(compareStr) || undefined : undefined;
    }
    if (headerIndices.category !== undefined) {
      row.category = values[headerIndices.category] || undefined;
    }
    if (headerIndices.tags !== undefined) {
      const tagsStr = values[headerIndices.tags] || "";
      row.tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
    }
    if (headerIndices.weight !== undefined) {
      const weightStr = values[headerIndices.weight]?.replace(",", ".").trim();
      row.weight = weightStr ? parseFloat(weightStr) || undefined : undefined;
    }
    if (headerIndices.warehouseLocation !== undefined) {
      row.warehouseLocation = values[headerIndices.warehouseLocation] || undefined;
    }
    if (headerIndices.stock !== undefined) {
      const stockStr = values[headerIndices.stock]?.trim();
      row.stock = stockStr ? parseInt(stockStr, 10) || 0 : 0;
    }
    if (headerIndices.isActive !== undefined) {
      const activeStr = values[headerIndices.isActive]?.toLowerCase().trim();
      row.isActive = activeStr === "da" || activeStr === "true" || activeStr === "1";
    }
    if (headerIndices.isComposite !== undefined) {
      const compositeStr = values[headerIndices.isComposite]?.toLowerCase().trim();
      row.isComposite = compositeStr === "da" || compositeStr === "true" || compositeStr === "1";
    }
    if (headerIndices.trendyolBarcode !== undefined) {
      row.trendyolBarcode = values[headerIndices.trendyolBarcode] || undefined;
    }
    if (headerIndices.trendyolBrandName !== undefined) {
      row.trendyolBrandName = values[headerIndices.trendyolBrandName] || undefined;
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
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
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
