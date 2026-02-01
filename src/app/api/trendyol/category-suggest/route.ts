import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { suggestTrendyolCategory } from "@/lib/trendyol-category-ai";
import { TrendyolClient, flattenCategories } from "@/lib/trendyol";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "trendyol.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId este obligatoriu" }, { status: 400 });
    }

    // Load product
    const product = await prisma.masterProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negasit" }, { status: 404 });
    }

    // Load Trendyol categories
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const client = new TrendyolClient({
      supplierId: "",
      apiKey: "",
      apiSecret: "",
    });

    const categoriesResult = await client.getCategories(settings?.trendyolStoreFrontCode || undefined);
    if (!categoriesResult.success) {
      return NextResponse.json({ error: "Nu s-au putut incarca categoriile" }, { status: 500 });
    }

    const flatCategories = flattenCategories(categoriesResult.data || []);

    // Get AI suggestion
    const suggestion = await suggestTrendyolCategory(
      product.title,
      product.description,
      flatCategories.map(c => ({
        id: c.id,
        name: c.name,
        fullPath: c.fullPath || c.name,
      }))
    );

    if (!suggestion) {
      return NextResponse.json({
        success: false,
        error: "Nu s-a putut genera sugestie. Verifica cheia API Claude in Setari.",
      });
    }

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error: any) {
    console.error("[Trendyol] Category suggest error:", error);
    return NextResponse.json({
      error: error.message || "Eroare la generarea sugestiei",
    }, { status: 500 });
  }
}
