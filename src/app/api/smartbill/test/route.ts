import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let email: string | null = null;
    let token: string | null = null;
    let cif: string | null = null;

    // Încearcă să parseze body-ul
    try {
      const body = await request.json();
      console.log("[SmartBill Test] Received body:", {
        hasEmail: !!body.email,
        hasToken: !!body.token,
        tokenValue: body.token === "••••••••" ? "MASKED" : (body.token ? `${body.token.length} chars` : "empty"),
        hasCif: !!body.cif,
      });
      
      email = body.email || null;
      token = body.token || null;
      cif = body.cif || null;
    } catch {
      console.log("[SmartBill Test] No body provided, will use DB settings");
    }

    // Dacă token-ul e mascat sau lipsește, citim din DB
    if (!token || token === "••••••••") {
      console.log("[SmartBill Test] Fetching credentials from DB...");
      const settings = await prisma.settings.findFirst();
      
      if (settings) {
        if (!email) email = settings.smartbillEmail;
        if (!token || token === "••••••••") token = settings.smartbillToken;
        if (!cif) cif = settings.smartbillCompanyCif;
        
        console.log("[SmartBill Test] DB credentials:", {
          hasEmail: !!email,
          hasToken: !!token,
          hasCif: !!cif,
        });
      }
    }

    // Validare
    if (!email || !token) {
      return NextResponse.json({
        success: false,
        error: "Credențialele SmartBill nu sunt complete. Verifică Email și Token.",
        debug: {
          hasEmail: !!email,
          hasToken: !!token,
          hasCif: !!cif,
        }
      }, { status: 400 });
    }

    if (!cif) {
      return NextResponse.json({
        success: false,
        error: "CIF-ul companiei nu este configurat",
      }, { status: 400 });
    }

    console.log("[SmartBill Test] Attempting connection with:", {
      email,
      tokenLength: token.length,
      cif,
    });

    // Testăm conexiunea prin obținerea seriilor
    const authString = Buffer.from(`${email}:${token}`).toString("base64");

    const response = await fetch(
      `https://ws.smartbill.ro/SBORO/api/series?cif=${encodeURIComponent(cif)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authString}`,
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();
    console.log("[SmartBill Test] API response:", {
      status: response.status,
      hasError: !!data.errorText,
      seriesCount: data.list?.length,
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.errorText || `Eroare SmartBill: ${response.status}`,
      });
    }

    // Verificăm dacă avem răspuns valid
    if (data.errorText) {
      return NextResponse.json({
        success: false,
        error: data.errorText,
      });
    }

    return NextResponse.json({
      success: true,
      company: cif,
      series: data.list?.length || 0,
      message: `Conectat cu succes! ${data.list?.length || 0} serii găsite.`,
    });
  } catch (error: any) {
    console.error("[SmartBill Test] Exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la conectare" },
      { status: 500 }
    );
  }
}
