import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Obține o categorie
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria nu a fost găsită" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizează o categorie
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const updateData: any = {};
    
    // Câmpuri standard
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.shopifyCollectionIds !== undefined) updateData.shopifyCollectionIds = body.shopifyCollectionIds;
    
    // Câmpuri Trendyol
    if (body.trendyolCategoryId !== undefined) updateData.trendyolCategoryId = body.trendyolCategoryId;
    if (body.trendyolCategoryName !== undefined) updateData.trendyolCategoryName = body.trendyolCategoryName;
    if (body.trendyolAttributes !== undefined) updateData.trendyolAttributes = body.trendyolAttributes;

    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      category 
    });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge o categorie
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifică dacă are produse
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria nu a fost găsită" },
        { status: 404 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Nu poți șterge categoria. Are ${category._count.products} produse asociate.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true,
      message: "Categoria a fost ștearsă" 
    });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
