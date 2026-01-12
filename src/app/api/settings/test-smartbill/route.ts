import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let email: string | null = null;
    let token: string | null = null;
    let cif: string | null = null;

    try {
      const body = await request.json();
      email = body.email || null;
      token = body.token || null;
      cif = body.cif || null;
    } catch {
      // Body gol
    }

    // Dacă token-ul este mascat, citește din baza de date
    if (token === "••••••••") {
      const settings = await prisma.settings.findUnique({
        where: { id: "default" },
      });
      if (settings?.smartbillToken) {
        token = settings.smartbillToken;
      }
    }

    // Dacă email/cif lipsesc, citește din DB
    if (!email || !cif) {
      const settings = await prisma.settings.findUnique({
        where: { id: "default" },
      });
      if (settings) {
        if (!email) email = settings.smartbillEmail;
        if (!cif) cif = settings.smartbillCompanyCif;
      }
    }

    // Validare - acum acceptăm credențiale direct din body
    if (!email || !token) {
      return NextResponse.json({
        success: false,
        error: "Completează email-ul și token-ul SmartBill pentru a testa conexiunea",
      });
    }

    if (!cif) {
      return NextResponse.json({
        success: false,
        error: "Completează CIF-ul companiei",
      });
    }

    // Autentificare Basic Auth: email:token în Base64
    const auth = Buffer.from(`${email}:${token}`).toString("base64");

    // Folosim endpoint-ul /series pentru a testa conexiunea
    const url = `https://ws.smartbill.ro/SBORO/api/series?cif=${encodeURIComponent(cif)}`;
    
    console.log("SmartBill test URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("SmartBill response:", response.status, data);

    // Verificăm răspunsul
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: "Credențiale invalide. Verifică email-ul și token-ul API.",
        });
      }
      if (response.status === 403) {
        return NextResponse.json({
          success: false,
          error: "Acces blocat. Ai depășit limita de apeluri.",
        });
      }
      return NextResponse.json({
        success: false,
        error: data?.errorText || data?.message || `Eroare HTTP ${response.status}`,
      });
    }

    // Verificăm dacă avem eroare în răspuns
    if (data?.errorText) {
      return NextResponse.json({
        success: false,
        error: data.errorText,
      });
    }

    // Conexiune reușită
    const seriesCount = data?.list?.length || 0;
    return NextResponse.json({
      success: true,
      message: `Conexiune reușită la SmartBill. ${seriesCount > 0 ? `Am găsit ${seriesCount} serii de documente.` : ""}`,
    });
  } catch (error: any) {
    console.error("SmartBill test error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la conectare",
    });
  }
}
