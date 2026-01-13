import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";
import {
  parseProductExcel,
  createExcelTemplate,
  PRODUCT_TEMPLATE_HEADERS,
  ProductImportRow,
} from "@/lib/excel";

// POST /api/products/import - Import products from Excel
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

    let rows: ProductImportRow[] = [];
    let mode: "create" | "update" | "upsert" = "upsert";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File;
      mode = (formData.get("mode") as "create" | "update" | "upsert") || "upsert";

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
      rows = parseProductExcel(buffer);
    } else {
      // Handle JSON payload for preview
      const body = await request.json();
      rows = body.rows || [];
      mode = body.mode || "upsert";
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nu există date de importat. Verifică că fișierul Excel conține date." }, { status: 400 });
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
    console.error("Error importing products:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Eroare la import"
    }, { status: 500 });
  }
}

// GET /api/products/import - Download template
export async function GET() {
  try {
    const buffer = createExcelTemplate(PRODUCT_TEMPLATE_HEADERS, "Produse");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=template_produse.xlsx",
      },
    });
  } catch (error: unknown) {
    console.error("Error generating template:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Eroare la generare template"
    }, { status: 500 });
  }
}
