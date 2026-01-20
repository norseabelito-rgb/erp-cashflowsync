import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { lookupCompanyByCui, parseAnafAddress } from "@/lib/anaf";

/**
 * POST /api/companies/lookup-cui - Caută informații firmă după CUI în ANAF
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

    // Verificăm permisiunea (view e suficient pentru căutare)
    const canView = await hasPermission(session.user.id, "companies.view");
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Nu ai permisiunea de a căuta firme" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cui } = body;

    if (!cui) {
      return NextResponse.json(
        { success: false, error: "CUI-ul este obligatoriu" },
        { status: 400 }
      );
    }

    // Căutăm în ANAF
    const result = await lookupCompanyByCui(cui);

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.error || "Firma nu a fost găsită în baza de date ANAF",
      });
    }

    const anafData = result.data;

    // Parsăm adresa pentru a extrage componentele
    const addressParts = parseAnafAddress(anafData.adresa);

    // Formatăm datele pentru folosire în formular
    const companyData = {
      // Date de bază
      name: anafData.denumire,
      cif: anafData.cui,
      regCom: anafData.nrRegCom,

      // Adresa
      address: addressParts.street || anafData.adresa,
      city: addressParts.city,
      county: addressParts.county,
      postalCode: addressParts.postalCode || anafData.codPostal,
      country: "România",

      // Contact
      phone: anafData.telefon,
      email: null, // ANAF nu furnizează email

      // TVA
      vatPayer: anafData.scpTVA,
      vatStartDate: anafData.data_inceput_ScpTVA,

      // Stare firmă
      isActive: !anafData.statusInactivi && !anafData.dataRadiere,
      stateMessage: anafData.stare_inregistrare,

      // e-Factura
      usesEFactura: anafData.statusRO_e_Factura,
      eFacturaStartDate: anafData.dataInceputRO_e_Factura,

      // IBAN (dacă e public)
      bankAccount: anafData.iban,

      // Date brute pentru referință
      rawAnafData: anafData,
    };

    return NextResponse.json({
      success: true,
      company: companyData,
    });

  } catch (error: any) {
    console.error("Error looking up CUI:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
