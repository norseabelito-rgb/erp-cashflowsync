import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { StockMovementType } from "@prisma/client";

// GET - Lista mișcări de stoc
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type") as StockMovementType | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ movements });
  } catch (error: any) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Creează mișcare de stoc manuală
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      type,
      quantity,
      reference,
      notes,
    } = body;

    if (!productId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: "productId, type și quantity sunt obligatorii" },
        { status: 400 }
      );
    }

    // Validează tipul
    if (!Object.values(StockMovementType).includes(type)) {
      return NextResponse.json(
        { error: `Tipul "${type}" nu este valid` },
        { status: 400 }
      );
    }

    // Obține produsul
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produsul nu a fost găsit" },
        { status: 404 }
      );
    }

    const previousStock = product.stockQuantity;
    let quantityChange = Math.abs(quantity);

    // Ajustează semnul în funcție de tip
    if (type === StockMovementType.OUT) {
      quantityChange = -quantityChange;
    } else if (type === StockMovementType.ADJUSTMENT) {
      // Pentru ajustări, quantity poate fi pozitiv sau negativ
      quantityChange = quantity;
    }

    const newStock = previousStock + quantityChange;

    // Verifică dacă avem stoc suficient pentru ieșiri
    if (newStock < 0 && type === StockMovementType.OUT) {
      return NextResponse.json(
        { 
          error: `Stoc insuficient. Stoc curent: ${previousStock}, încerci să scoți: ${Math.abs(quantity)}`,
        },
        { status: 400 }
      );
    }

    // Creează mișcarea
    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: quantityChange,
        previousStock,
        newStock,
        reference,
        notes,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    // Actualizează stocul produsului
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock },
    });

    return NextResponse.json({ movement });
  } catch (error: any) {
    console.error("Error creating stock movement:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
