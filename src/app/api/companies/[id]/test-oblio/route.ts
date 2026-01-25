import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  createOblioClient,
  hasOblioCredentials,
  OblioValidationError,
  OblioAuthError,
  OblioAPI,
} from "@/lib/oblio";

/**
 * POST /api/companies/[id]/test-oblio - Test conexiune Oblio
 *
 * Acceptă credențiale în body pentru testare live (fără salvare)
 * sau folosește credențialele din DB dacă nu sunt trimise în body.
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

    // Parsăm body-ul pentru credențiale trimise din formular
    let bodyCredentials: any = {};
    try {
      const body = await request.json();
      bodyCredentials = body || {};
    } catch {
      // Body gol sau invalid - e OK, vom folosi credențialele din DB
    }

    // Obținem firma cu credențialele din DB
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cif: true,
        oblioEmail: true,
        oblioSecretToken: true,
        oblioCif: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Folosim credențialele din body dacă sunt trimise, altfel cele din DB
    // Ignorăm valorile "********" care sunt placeholder pentru token-uri mascate
    const testCredentials = {
      ...company,
      oblioEmail: bodyCredentials.oblioEmail || company.oblioEmail,
      oblioSecretToken: (bodyCredentials.oblioSecretToken && bodyCredentials.oblioSecretToken !== "********")
        ? bodyCredentials.oblioSecretToken
        : company.oblioSecretToken,
      oblioCif: bodyCredentials.oblioCif || company.oblioCif || company.cif,
    };

    // Verificăm credențialele folosind funcția helper
    if (!hasOblioCredentials(testCredentials)) {
      return NextResponse.json(
        {
          success: false,
          error: "Credențialele Oblio nu sunt complete. Completează Email și Token Secret, apoi încearcă din nou.",
        },
        { status: 400 }
      );
    }

    // Creăm clientul Oblio cu credențialele de test
    const oblio = createOblioClient(testCredentials);

    if (!oblio) {
      return NextResponse.json(
        { success: false, error: "Nu s-a putut crea clientul Oblio. Verifică credențialele." },
        { status: 500 }
      );
    }

    // Testăm conexiunea
    const result = await oblio.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Conexiune reușită cu Oblio pentru ${company.name}`,
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Eroare la conexiunea cu Oblio",
    });

  } catch (error: any) {
    console.error("[test-oblio] Error:", error);

    // Erori specifice Oblio
    if (error instanceof OblioValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof OblioAuthError) {
      return NextResponse.json(
        { success: false, error: "Autentificare eșuată. Verifică: 1) Email-ul să fie corect (cel cu care te loghezi în Oblio), 2) Token-ul Secret din Setări > Date Cont în Oblio." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Eroare internă" },
      { status: 500 }
    );
  }
}
