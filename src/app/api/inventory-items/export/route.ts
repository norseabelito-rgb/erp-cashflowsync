import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET /api/inventory-items/export - Export inventory to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "inventory.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build filter
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    // Fetch inventory items with supplier
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { sku: "asc" },
    });

    if (format === "json") {
      return NextResponse.json({ items });
    }

    // Generate CSV
    const headers = [
      "SKU",
      "Nume",
      "Descriere",
      "Stoc_Curent",
      "Stoc_Minim",
      "Unitate",
      "Buc_Per_Bax",
      "Unitate_Bax",
      "Pret_Cost",
      "Furnizor",
      "Este_Compus",
      "Activ",
    ];

    const rows = items.map((item) => [
      escapeCsvField(item.sku),
      escapeCsvField(item.name),
      escapeCsvField(item.description || ""),
      item.currentStock?.toString() || "0",
      item.minStock?.toString() || "",
      escapeCsvField(item.unit),
      item.unitsPerBox?.toString() || "",
      escapeCsvField(item.boxUnit || ""),
      item.costPrice?.toString() || "",
      escapeCsvField(item.supplier?.name || ""),
      item.isComposite ? "Da" : "Nu",
      item.isActive ? "Da" : "Nu",
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
        "Content-Disposition": `attachment; filename="inventar_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeCsvField(field: string): string {
  if (!field) return "";
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
