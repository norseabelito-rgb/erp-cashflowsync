import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { TrendyolClient } from "@/lib/trendyol";

export const dynamic = 'force-dynamic';

// GET - Get product's attribute values and category attributes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "products.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: "productId is required",
      }, { status: 400 });
    }

    // Get product with category
    const product = await prisma.masterProduct.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Produsul nu a fost gasit",
      }, { status: 404 });
    }

    // Use product's trendyolCategoryId, or fall back to category's trendyolCategoryId
    const categoryId = product.trendyolCategoryId || product.category?.trendyolCategoryId;

    if (!categoryId) {
      return NextResponse.json({
        success: true,
        product: {
          id: product.id,
          sku: product.sku,
          title: product.title,
        },
        categoryId: null,
        attributes: [],
        savedValues: product.trendyolAttributeValues || {},
        message: "Produsul nu are o categorie Trendyol mapata",
      });
    }

    // Get settings for storeFrontCode
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    // Fetch category attributes from Trendyol API
    const client = new TrendyolClient({
      supplierId: "",
      apiKey: "",
      apiSecret: "",
    });

    const storeFrontCode = settings?.trendyolStoreFrontCode || undefined;
    const attrResult = await client.getCategoryAttributes(categoryId, storeFrontCode);

    if (!attrResult.success) {
      return NextResponse.json({
        success: false,
        error: attrResult.error || "Nu s-au putut obtine atributele categoriei",
      });
    }

    // Parse raw API response - Trendyol returns categoryAttributes array
    const rawData = attrResult.data as any;
    const categoryAttributes = rawData?.categoryAttributes || rawData || [];

    // Transform attributes to a more usable format
    const attributes = categoryAttributes.map((attr: any) => ({
      id: attr.attribute?.id || attr.id,
      name: attr.attribute?.name || attr.name,
      required: attr.required || false,
      allowCustom: attr.allowCustom || false,
      varianter: attr.varianter || false,
      slipiasice: attr.slipiasice || false,
      attributeValues: (attr.attributeValues || []).map((val: any) => ({
        id: val.id,
        name: val.name,
      })),
    }));

    const savedValues = product.trendyolAttributeValues as Record<string, any> || {};

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        title: product.title,
      },
      categoryId,
      categoryName: product.category?.trendyolCategoryName || null,
      attributes,
      savedValues,
      requiredCount: attributes.filter((a: any) => a.required).length,
      savedCount: Object.keys(savedValues).length,
    });

  } catch (error: any) {
    console.error("Get Trendyol attributes error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

// POST - Save attribute values for a product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, attributeValues, categoryId } = body;

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: "productId is required",
      }, { status: 400 });
    }

    // Verify product exists
    const product = await prisma.masterProduct.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: "Produsul nu a fost gasit",
      }, { status: 404 });
    }

    // If categoryId is provided, update the product's trendyolCategoryId
    const updateData: any = {
      trendyolAttributeValues: attributeValues || {},
    };

    if (categoryId !== undefined) {
      updateData.trendyolCategoryId = categoryId;
    }

    // Update product with attribute values
    const updatedProduct = await prisma.masterProduct.update({
      where: { id: productId },
      data: updateData,
    });

    // Get the effective categoryId for validation
    const effectiveCategoryId = categoryId || product.trendyolCategoryId || product.category?.trendyolCategoryId;

    // Validate that required attributes are filled (optional - just a warning)
    let missingRequired: string[] = [];
    if (effectiveCategoryId) {
      try {
        const settings = await prisma.settings.findUnique({
          where: { id: "default" },
        });

        const client = new TrendyolClient({
          supplierId: "",
          apiKey: "",
          apiSecret: "",
        });

        const attrResult = await client.getCategoryAttributes(effectiveCategoryId, settings?.trendyolStoreFrontCode || undefined);

        if (attrResult.success && attrResult.data) {
          const rawData = attrResult.data as any;
          const categoryAttributes = rawData?.categoryAttributes || rawData || [];
          const requiredAttrs = categoryAttributes.filter((a: any) => a.required);
          const savedAttrs = attributeValues || {};

          for (const attr of requiredAttrs) {
            const attrId = (attr.attribute?.id || attr.id).toString();
            if (!savedAttrs[attrId] || (!savedAttrs[attrId].attributeValueId && !savedAttrs[attrId].customValue)) {
              missingRequired.push(attr.attribute?.name || attr.name);
            }
          }
        }
      } catch (e) {
        // Ignore validation errors - we still saved the values
        console.warn("Attribute validation error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct.id,
        sku: updatedProduct.sku,
        title: updatedProduct.title,
        trendyolCategoryId: updatedProduct.trendyolCategoryId,
        trendyolAttributeValues: updatedProduct.trendyolAttributeValues,
      },
      missingRequired,
      allRequiredFilled: missingRequired.length === 0,
    });

  } catch (error: any) {
    console.error("Save Trendyol attributes error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}

// Bulk save attributes for multiple products
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "products.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesara" }, { status: 403 });
    }

    const body = await request.json();
    const { productIds, attributeValues, categoryId } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "productIds array is required",
      }, { status: 400 });
    }

    // Update all products with the same attribute values
    const updateData: any = {
      trendyolAttributeValues: attributeValues || {},
    };

    if (categoryId !== undefined) {
      updateData.trendyolCategoryId = categoryId;
    }

    const result = await prisma.masterProduct.updateMany({
      where: { id: { in: productIds } },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `${result.count} produse actualizate`,
    });

  } catch (error: any) {
    console.error("Bulk save Trendyol attributes error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error",
    }, { status: 500 });
  }
}
