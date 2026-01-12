import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

// GET - Lista furnizorilor
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
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { cif: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            items: true,
            receipts: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: suppliers,
    });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la citirea furnizorilor",
    }, { status: 500 });
  }
}

// POST - Creare furnizor nou
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      contactPerson,
      email,
      phone,
      address,
      city,
      county,
      postalCode,
      country,
      cif,
      regCom,
      bankAccount,
      bankName,
      notes,
    } = body;

    // Validare câmpuri obligatorii
    if (!name) {
      return NextResponse.json({
        success: false,
        error: "Numele furnizorului este obligatoriu",
      }, { status: 400 });
    }

    // Verifică dacă numele există deja
    const existingSupplier = await prisma.supplier.findUnique({
      where: { name },
    });

    if (existingSupplier) {
      return NextResponse.json({
        success: false,
        error: `Furnizorul "${name}" există deja`,
      }, { status: 400 });
    }

    // Verifică codul dacă e furnizat
    if (code) {
      const existingCode = await prisma.supplier.findUnique({
        where: { code },
      });

      if (existingCode) {
        return NextResponse.json({
          success: false,
          error: `Codul "${code}" este deja folosit`,
        }, { status: 400 });
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        code,
        contactPerson,
        email,
        phone,
        address,
        city,
        county,
        postalCode,
        country: country || "România",
        cif,
        regCom,
        bankAccount,
        bankName,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la crearea furnizorului",
    }, { status: 500 });
  }
}

// PUT - Actualizare furnizor
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      code,
      contactPerson,
      email,
      phone,
      address,
      city,
      county,
      postalCode,
      country,
      cif,
      regCom,
      bankAccount,
      bankName,
      notes,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul furnizorului este obligatoriu",
      }, { status: 400 });
    }

    // Verifică dacă furnizorul există
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json({
        success: false,
        error: "Furnizorul nu a fost găsit",
      }, { status: 404 });
    }

    // Verifică numele unic (dacă s-a schimbat)
    if (name && name !== existingSupplier.name) {
      const duplicateName = await prisma.supplier.findUnique({
        where: { name },
      });

      if (duplicateName) {
        return NextResponse.json({
          success: false,
          error: `Furnizorul "${name}" există deja`,
        }, { status: 400 });
      }
    }

    // Verifică codul unic (dacă s-a schimbat)
    if (code && code !== existingSupplier.code) {
      const duplicateCode = await prisma.supplier.findUnique({
        where: { code },
      });

      if (duplicateCode) {
        return NextResponse.json({
          success: false,
          error: `Codul "${code}" este deja folosit`,
        }, { status: 400 });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        code,
        contactPerson,
        email,
        phone,
        address,
        city,
        county,
        postalCode,
        country,
        cif,
        regCom,
        bankAccount,
        bankName,
        notes,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error: any) {
    console.error("Error updating supplier:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la actualizarea furnizorului",
    }, { status: 500 });
  }
}

// DELETE - Ștergere furnizor
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "inventory.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID-ul furnizorului este obligatoriu",
      }, { status: 400 });
    }

    // Verifică dacă furnizorul există și are articole/recepții
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
            receipts: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({
        success: false,
        error: "Furnizorul nu a fost găsit",
      }, { status: 404 });
    }

    if (supplier._count.items > 0 || supplier._count.receipts > 0) {
      // Soft delete
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Furnizorul a fost dezactivat (are articole sau recepții asociate)",
      });
    }

    // Hard delete dacă nu are dependențe
    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Furnizorul a fost șters",
    });
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la ștergerea furnizorului",
    }, { status: 500 });
  }
}
