import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/companies/[id] - Detalii firmă
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canView = await hasPermission(session.user.id, "companies.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza firmele" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        invoiceSeries: {
          select: {
            id: true,
            name: true,
            prefix: true,
            currentNumber: true,
            isActive: true,
            isDefault: true,
          },
        },
        _count: {
          select: {
            orders: true,
            invoices: true,
            awbs: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Ascundem credențialele sensibile (doar indică dacă sunt setate)
    const safeCompany = {
      ...company,
      facturisApiKey: company.facturisApiKey ? "********" : null,
      facturisPassword: company.facturisPassword ? "********" : null,
      fancourierPassword: company.fancourierPassword ? "********" : null,
      hasFacturisCredentials: !!(company.facturisApiKey && company.facturisUsername && company.facturisPassword),
      hasFancourierCredentials: !!(company.fancourierClientId && company.fancourierUsername && company.fancourierPassword),
    };

    return NextResponse.json({
      success: true,
      company: safeCompany,
    });
  } catch (error: any) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/companies/[id] - Actualizare firmă
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canManage = await hasPermission(session.user.id, "companies.manage");
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a gestiona firmele" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificăm că firma există
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Verificăm unicitatea codului (dacă se schimbă)
    if (body.code && body.code !== existingCompany.code) {
      const existingCode = await prisma.company.findUnique({
        where: { code: body.code },
      });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: `Codul "${body.code}" este deja folosit` },
          { status: 400 }
        );
      }
    }

    // Verificăm unicitatea numelui (dacă se schimbă)
    if (body.name && body.name !== existingCompany.name) {
      const existingName = await prisma.company.findUnique({
        where: { name: body.name },
      });
      if (existingName) {
        return NextResponse.json(
          { success: false, error: `Numele "${body.name}" este deja folosit` },
          { status: 400 }
        );
      }
    }

    // Dacă această firmă devine primară, dezactivăm celelalte
    if (body.isPrimary && !existingCompany.isPrimary) {
      await prisma.company.updateMany({
        where: {
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      });
    }

    // Excludem câmpurile care nu trebuie actualizate direct
    const {
      id: _id,
      createdAt,
      updatedAt,
      _count,
      stores,
      invoiceSeries,
      ...updateData
    } = body;

    // Dacă parolele sunt "********", le ignorăm (nu actualizăm)
    if (updateData.facturisApiKey === "********") delete updateData.facturisApiKey;
    if (updateData.facturisPassword === "********") delete updateData.facturisPassword;
    if (updateData.fancourierPassword === "********") delete updateData.fancourierPassword;

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (error: any) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id] - Ștergere firmă
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const canManage = await hasPermission(session.user.id, "companies.manage");
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a gestiona firmele" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificăm că firma există
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            invoices: true,
            awbs: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Nu permitem ștergerea dacă are date asociate
    if (company._count.orders > 0 || company._count.invoices > 0 || company._count.awbs > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nu poți șterge o firmă care are comenzi, facturi sau AWB-uri asociate. Dezactiveaz-o în schimb.",
        },
        { status: 400 }
      );
    }

    // Nu permitem ștergerea firmei primare
    if (company.isPrimary) {
      return NextResponse.json(
        { success: false, error: "Nu poți șterge firma primară" },
        { status: 400 }
      );
    }

    await prisma.company.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Firma a fost ștearsă",
    });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
