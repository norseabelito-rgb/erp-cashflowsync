import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createExcel } from "@/lib/excel";

// GET /api/products/export - Export products to CSV or Excel
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
        channels: {
          where: { isPublished: true, externalId: { not: null } },
          include: {
            channel: {
              include: {
                store: { select: { shopifyDomain: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { sku: "asc" },
    });

    if (format === "json") {
      return NextResponse.json({ products });
    }

    // Column definitions for both CSV and Excel
    const columns = [
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Barcode" },
      { key: "title", label: "Titlu" },
      { key: "description", label: "Descriere" },
      { key: "price", label: "Pret" },
      { key: "compareAtPrice", label: "Pret_Comparat" },
      { key: "category", label: "Categorie" },
      { key: "tags", label: "Tags" },
      { key: "weight", label: "Greutate_kg" },
      { key: "warehouseLocation", label: "Locatie_Depozit" },
      { key: "stock", label: "Stoc" },
      { key: "isActive", label: "Activ" },
      { key: "inventorySku", label: "Inventar_SKU" },
      { key: "isComposite", label: "Este_Compus" },
      { key: "trendyolBarcode", label: "Trendyol_Barcode" },
      { key: "trendyolBrand", label: "Trendyol_Brand" },
      { key: "shopifyLink", label: "Link_Shopify" },
    ];

    // Transform products to flat data
    const data = products.map((p) => {
      const shopifyChannel = p.channels[0];
      const shopifyLink =
        shopifyChannel?.channel?.store?.shopifyDomain && shopifyChannel?.externalId
          ? `https://${shopifyChannel.channel.store.shopifyDomain}/admin/products/${shopifyChannel.externalId}`
          : "";

      return {
        sku: p.sku,
        barcode: p.barcode || "",
        title: p.title,
        description: p.description?.replace(/<[^>]*>/g, "") || "",
        price: p.price?.toString() || "0",
        compareAtPrice: p.compareAtPrice?.toString() || "",
        category: p.category?.name || "",
        tags: p.tags?.join(", ") || "",
        weight: p.weight?.toString() || "",
        warehouseLocation: p.warehouseLocation || "",
        stock: p.stock?.toString() || "0",
        isActive: p.isActive ? "Da" : "Nu",
        inventorySku: p.inventoryItem?.sku || "",
        isComposite: p.isComposite ? "Da" : "Nu",
        trendyolBarcode: p.trendyolBarcode || "",
        trendyolBrand: p.trendyolBrandName || "",
        shopifyLink,
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];

    // Excel export
    if (format === "xlsx" || format === "excel") {
      const buffer = createExcel(data, columns);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="produse_${dateStr}.xlsx"`,
        },
      });
    }

    // CSV export (default)
    const headers = columns.map((c) => c.label);
    const rows = data.map((row) =>
      columns.map((c) => escapeCsvField(String(row[c.key as keyof typeof row] || "")))
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="produse_${dateStr}.csv"`,
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
