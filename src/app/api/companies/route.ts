import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/companies - Lista firmelor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea
    const canView = await hasPermission(session.user.id, "companies.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a vizualiza firmele" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const companies = await prisma.company.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: {
            stores: true,
            orders: true,
            invoices: true,
            invoiceSeries: true,
          },
        },
      },
      orderBy: [
        { isPrimary: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      companies,
    });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies - Creare firmă nouă
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    // Verificăm permisiunea
    const canManage = await hasPermission(session.user.id, "companies.manage");
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a gestiona firmele" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      cif,
      regCom,
      address,
      city,
      county,
      postalCode,
      country,
      bankName,
      bankAccount,
      email,
      phone,
      facturisApiKey,
      facturisUsername,
      facturisPassword,
      facturisCompanyCif,
      fancourierClientId,
      fancourierUsername,
      fancourierPassword,
      senderName,
      senderPhone,
      senderEmail,
      senderCounty,
      senderCity,
      senderStreet,
      senderNumber,
      senderPostalCode,
      isPrimary,
      intercompanyMarkup,
      defaultVatRate,
      vatPayer,
    } = body;

    // Validări
    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Numele și codul firmei sunt obligatorii" },
        { status: 400 }
      );
    }

    // Verificăm unicitatea codului
    const existingCode = await prisma.company.findUnique({
      where: { code },
    });
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Codul "${code}" este deja folosit` },
        { status: 400 }
      );
    }

    // Verificăm unicitatea numelui
    const existingName = await prisma.company.findUnique({
      where: { name },
    });
    if (existingName) {
      return NextResponse.json(
        { success: false, error: `Numele "${name}" este deja folosit` },
        { status: 400 }
      );
    }

    // Dacă această firmă va fi primară, dezactivăm celelalte
    if (isPrimary) {
      await prisma.company.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const company = await prisma.company.create({
      data: {
        name,
        code,
        cif,
        regCom,
        address,
        city,
        county,
        postalCode,
        country: country || "România",
        bankName,
        bankAccount,
        email,
        phone,
        facturisApiKey,
        facturisUsername,
        facturisPassword,
        facturisCompanyCif,
        fancourierClientId,
        fancourierUsername,
        fancourierPassword,
        senderName,
        senderPhone,
        senderEmail,
        senderCounty,
        senderCity,
        senderStreet,
        senderNumber,
        senderPostalCode,
        isPrimary: isPrimary || false,
        intercompanyMarkup: intercompanyMarkup || 10,
        defaultVatRate: defaultVatRate || 19,
        vatPayer: vatPayer !== false,
      },
    });

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (error: any) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
