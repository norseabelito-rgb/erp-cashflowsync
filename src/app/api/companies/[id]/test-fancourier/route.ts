import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

/**
 * POST /api/companies/[id]/test-fancourier - Test conexiune FanCourier
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
        fancourierClientId: true,
        fancourierUsername: true,
        fancourierPassword: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Folosim credențialele din body dacă sunt trimise, altfel cele din DB
    // Ignorăm valorile "********" care sunt placeholder pentru parole mascate
    const testCredentials = {
      fancourierClientId: bodyCredentials.fancourierClientId || company.fancourierClientId,
      fancourierUsername: bodyCredentials.fancourierUsername || company.fancourierUsername,
      fancourierPassword: (bodyCredentials.fancourierPassword && bodyCredentials.fancourierPassword !== "********")
        ? bodyCredentials.fancourierPassword
        : company.fancourierPassword,
    };

    // Verificăm credențialele
    if (!testCredentials.fancourierClientId || !testCredentials.fancourierUsername || !testCredentials.fancourierPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Credențialele FanCourier nu sunt complete. Completează Client ID, Username și Password, apoi încearcă din nou.",
        },
        { status: 400 }
      );
    }

    // Testăm conexiunea FanCourier
    try {
      const FAN_COURIER_API_URL = "https://api.fancourier.ro/reports/awb";

      const response = await fetch(FAN_COURIER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: testCredentials.fancourierClientId,
          username: testCredentials.fancourierUsername,
          password: testCredentials.fancourierPassword,
          // Request AWB status cu un AWB inexistent doar pentru a testa autentificarea
          awb: ["TEST123"],
        }),
      });

      // Dacă primim 401 sau 403, credențialele sunt greșite
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          success: false,
          error: "Credențiale FanCourier invalide",
        });
      }

      // Orice alt răspuns (chiar și eroare de AWB negăsit) înseamnă că autentificarea a mers
      const data = await response.json().catch(() => ({}));

      // FanCourier returnează eroare dacă AWB-ul nu există, dar autentificarea e OK
      if (data.error && data.error.includes("autentificare")) {
        return NextResponse.json({
          success: false,
          error: data.error || "Eroare la autentificare FanCourier",
        });
      }

      return NextResponse.json({
        success: true,
        message: `Conexiune reușită cu FanCourier pentru ${company.name}`,
      });

    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        error: `Eroare la conectarea cu FanCourier: ${fetchError.message}`,
      });
    }

  } catch (error: any) {
    console.error("Error testing FanCourier connection:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
