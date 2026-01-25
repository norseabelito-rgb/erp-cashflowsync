import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createOblioClient } from "@/lib/oblio";

/**
 * GET /api/companies/[id]/oblio-series
 * Returnează seriile de facturare disponibile în Oblio pentru o firmă
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Trebuie să fii autentificat" },
        { status: 401 }
      );
    }

    const companyId = params.id;

    // Găsim firma
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Firma nu a fost găsită" },
        { status: 404 }
      );
    }

    // Verificăm credențialele Oblio
    if (!company.oblioEmail || !company.oblioSecretToken) {
      return NextResponse.json({
        success: false,
        error: "Configurația Oblio nu este completă pentru această firmă. Adaugă email și token secret.",
        series: [],
      });
    }

    // Creăm clientul Oblio
    const oblio = createOblioClient(company);
    if (!oblio) {
      return NextResponse.json({
        success: false,
        error: "Nu s-a putut crea clientul Oblio",
        series: [],
      });
    }

    // Obținem seriile
    const series = await oblio.getInvoiceSeries();

    console.log(`[Oblio] Serii găsite pentru ${company.name}:`, series);

    return NextResponse.json({
      success: true,
      series,
      companyName: company.name,
    });
  } catch (error: any) {
    console.error("Error fetching Oblio series:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Eroare la obținerea seriilor din Oblio",
        series: [],
      },
      { status: 500 }
    );
  }
}
