import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET /api/products/export - Export products to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const categoryId = searchParams.get("categoryId");
    const channelId = searchParams.get("channelId");
    const isActive = searchParams.get("isActive");

    // Build filter
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    if (channelId) {
      where.channels = { some: { channelId, isPublished: true } };
    }

    // Fetch products with related data
    const products = await prisma.masterProduct.findMany({
      where,
      include: {
        category: { select: { name: true } },
        inventoryItem: { select: { sku: true, name: true } },
      },
      orderBy: { sku: "asc" },
    });

    if (format === "json") {
      return NextResponse.json({ products });
    }

    // Generate CSV
    const headers = [
      "SKU",
      "Barcode",
      "Titlu",
      "Descriere",
      "Pret",
      "Pret_Comparat",
      "Categorie",
      "Tags",
      "Greutate_kg",
      "Locatie_Depozit",
      "Stoc",
      "Activ",
      "Inventar_SKU",
      "Este_Compus",
      "Trendyol_Barcode",
      "Trendyol_Brand",
    ];

    const rows = products.map((p) => [
      escapeCsvField(p.sku),
      escapeCsvField(p.barcode || ""),
      escapeCsvField(p.title),
      escapeCsvField(p.description?.replace(/<[^>]*>/g, "") || ""), // Strip HTML
      p.price?.toString() || "0",
      p.compareAtPrice?.toString() || "",
      escapeCsvField(p.category?.name || ""),
      escapeCsvField(p.tags?.join(", ") || ""),
      p.weight?.toString() || "",
      escapeCsvField(p.warehouseLocation || ""),
      p.stock?.toString() || "0",
      p.isActive ? "Da" : "Nu",
      escapeCsvField(p.inventoryItem?.sku || ""),
      p.isComposite ? "Da" : "Nu",
      escapeCsvField(p.trendyolBarcode || ""),
      escapeCsvField(p.trendyolBrandName || ""),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="produse_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeCsvField(field: string): string {
  if (!field) return "";
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
