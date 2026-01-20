import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createFacturisClient } from "@/lib/facturis";

/**
 * POST /api/companies/[id]/test-facturis - Test conexiune Facturis
 */
export async function POST(
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

    // Obținem firma cu credențialele
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cif: true,
        facturisApiKey: true,
        facturisUsername: true,
        facturisPassword: true,
        facturisCompanyCif: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Verificăm credențialele
    if (!company.facturisApiKey || !company.facturisUsername || !company.facturisPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Credențialele Facturis nu sunt configurate complet. Setează API Key, Username și Password.",
        },
        { status: 400 }
      );
    }

    // Creăm clientul Facturis
    const facturis = createFacturisClient(company);

    if (!facturis) {
      return NextResponse.json(
        { success: false, error: "Nu s-a putut crea clientul Facturis" },
        { status: 500 }
      );
    }

    // Testăm conexiunea
    const result = await facturis.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Conexiune reușită cu Facturis pentru ${company.name}`,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Eroare la conexiunea cu Facturis",
    });
  } catch (error: any) {
    console.error("Error testing Facturis connection:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
