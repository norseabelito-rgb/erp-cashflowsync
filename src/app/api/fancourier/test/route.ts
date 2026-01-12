import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  console.log("\n========== FANCOURIER TEST START ==========");
  
  try {
    let username: string | null = null;
    let password: string | null = null;
    let clientId: string | null = null;

    // Încearcă să parseze body-ul
    let rawBody = "";
    try {
      rawBody = await request.text();
      console.log("[FanCourier] Raw body received:", rawBody);
      
      if (rawBody) {
        const body = JSON.parse(rawBody);
        console.log("[FanCourier] Parsed body:", {
          clientId: body.clientId || "(empty)",
          username: body.username || "(empty)",
          password: body.password ? (body.password === "••••••••" ? "MASKED" : `"${body.password}" (${body.password.length} chars)`) : "(empty)",
        });
        
        username = body.username || null;
        password = body.password || null;
        clientId = body.clientId || null;
      } else {
        console.log("[FanCourier] Empty body received");
      }
    } catch (e) {
      console.log("[FanCourier] Body parse error:", e);
      console.log("[FanCourier] Raw body was:", rawBody);
    }

    // Dacă parola e mascată sau lipsește, citim din DB
    if (!password || password === "••••••••") {
      console.log("[FanCourier] Password missing or masked, fetching from DB...");
      const settings = await prisma.settings.findFirst();
      
      console.log("[FanCourier] DB settings found:", settings ? "YES" : "NO");
      
      if (settings) {
        console.log("[FanCourier] DB values:", {
          clientId: settings.fancourierClientId || "(empty)",
          username: settings.fancourierUsername || "(empty)", 
          hasPassword: !!settings.fancourierPassword,
          passwordLength: settings.fancourierPassword?.length || 0,
        });
        
        if (!username) username = settings.fancourierUsername;
        if (!password || password === "••••••••") password = settings.fancourierPassword;
        if (!clientId) clientId = settings.fancourierClientId;
      }
    }

    // Log final credentials
    console.log("[FanCourier] FINAL CREDENTIALS:");
    console.log("  - clientId:", clientId || "MISSING");
    console.log("  - username:", username || "MISSING");
    console.log("  - password:", password ? `${password.length} chars` : "MISSING");

    // Validare
    if (!clientId || !username || !password) {
      console.log("[FanCourier] VALIDATION FAILED - missing credentials");
      return NextResponse.json({
        success: false,
        error: "Credențialele FanCourier nu sunt complete. Verifică Client ID, Username și Parola.",
        debug: {
          hasClientId: !!clientId,
          hasUsername: !!username,
          hasPassword: !!password,
          receivedBody: rawBody ? "yes" : "no",
        }
      }, { status: 400 });
    }

    // FanCourier API v2.0 - parametrii în query string!
    const loginUrl = `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    console.log("[FanCourier] Calling API:");
    console.log("  - URL:", `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=***`);

    const authResponse = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await authResponse.text();
    console.log("[FanCourier] API Response status:", authResponse.status);
    console.log("[FanCourier] API Response body:", responseText);

    let authData;
    try {
      authData = JSON.parse(responseText);
    } catch {
      console.log("[FanCourier] Could not parse response as JSON");
      return NextResponse.json({
        success: false,
        error: `Răspuns invalid de la API: ${responseText.substring(0, 200)}`,
      });
    }

    if (!authResponse.ok) {
      console.log("[FanCourier] API returned error status");
      return NextResponse.json({
        success: false,
        error: authData?.message || authData?.error || `Autentificare eșuată: ${authResponse.status}`,
      });
    }

    if (!authData?.data?.token) {
      console.log("[FanCourier] No token in response");
      return NextResponse.json({
        success: false,
        error: authData?.message || "Credențiale invalide - verifică username-ul și parola",
      });
    }

    // Obținem informații despre client
    const token = authData.data.token;
    console.log("[FanCourier] Got token, fetching client info...");
    
    let clientName = "Conectat";

    try {
      const clientResponse = await fetch("https://api.fancourier.ro/reports/client/info", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (clientResponse.ok) {
        const clientData = await clientResponse.json();
        console.log("[FanCourier] Client info:", clientData);
        if (clientData?.data?.name) {
          clientName = clientData.data.name;
        }
      }
    } catch (e) {
      console.log("[FanCourier] Could not fetch client info:", e);
    }

    console.log("[FanCourier] SUCCESS! Client:", clientName);
    console.log("========== FANCOURIER TEST END ==========\n");

    return NextResponse.json({
      success: true,
      clientName,
      clientId,
      message: `Conectat cu succes la FanCourier ca "${clientName}"`,
    });
  } catch (error: any) {
    console.error("[FanCourier] EXCEPTION:", error);
    console.log("========== FANCOURIER TEST END (ERROR) ==========\n");
    
    return NextResponse.json(
      { success: false, error: error.message || "Eroare la conectare" },
      { status: 500 }
    );
  }
}
