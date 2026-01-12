import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET - Lista categoriilor
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Crează categorie nouă
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Numele categoriei este obligatoriu" },
        { status: 400 }
      );
    }

    // Verifică dacă există deja
    const existing = await prisma.category.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Există deja o categorie cu acest nume" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      category,
      message: "Categorie creată cu succes",
    });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizează categorie
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul categoriei este obligatoriu" },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Numele categoriei este obligatoriu" },
        { status: 400 }
      );
    }

    // Verifică dacă există altă categorie cu același nume
    const existing = await prisma.category.findFirst({
      where: { 
        name: name.trim(),
        NOT: { id }
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Există deja o categorie cu acest nume" },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      category,
      message: "Categorie actualizată cu succes",
    });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Șterge categorie
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID-ul categoriei este obligatoriu" },
        { status: 400 }
      );
    }

    // Verifică dacă are produse
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Categoria nu există" },
        { status: 404 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Nu poți șterge categoria. Are ${category._count.products} produse asociate.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Categorie ștearsă cu succes",
    });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
