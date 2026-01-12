import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    let username: string | null = null;
    let password: string | null = null;
    let clientId: string | null = null;

    // Parse body
    let body: any = {};
    try {
      body = await request.json();
      console.log("[FanCourier Test] Received body keys:", Object.keys(body));
      console.log("[FanCourier Test] Body values:", {
        username: body.username ? `"${body.username}"` : null,
        password: body.password ? (body.password === "••••••••" ? "MASKED" : `${body.password.length} chars`) : null,
        clientId: body.clientId ? `"${body.clientId}"` : null,
      });
      
      username = body.username || null;
      password = body.password || null;
      clientId = body.clientId || null;
    } catch (e) {
      console.log("[FanCourier Test] No body or parse error:", e);
    }

    // Dacă parola este mascată SAU lipsește, citește din baza de date
    if (!password || password === "••••••••") {
      console.log("[FanCourier Test] Password missing or masked, fetching from DB...");
      const settings = await prisma.settings.findUnique({
        where: { id: "default" },
      });
      if (settings?.fancourierPassword) {
        password = settings.fancourierPassword;
        console.log("[FanCourier Test] Got password from DB:", password ? `${password.length} chars` : "null");
      } else {
        console.log("[FanCourier Test] No password in DB either");
      }
      // Completează și celelalte câmpuri dacă lipsesc
      if (!username && settings?.fancourierUsername) {
        username = settings.fancourierUsername;
        console.log("[FanCourier Test] Got username from DB:", username);
      }
      if (!clientId && settings?.fancourierClientId) {
        clientId = settings.fancourierClientId;
        console.log("[FanCourier Test] Got clientId from DB:", clientId);
      }
    }

    // Validare finală
    console.log("[FanCourier Test] Final credentials:", {
      username: username || "MISSING",
      password: password ? `${password.length} chars` : "MISSING",
      clientId: clientId || "not provided",
    });

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: "Completează username-ul și parola FanCourier pentru a testa conexiunea",
        debug: {
          hasUsername: !!username,
          hasPassword: !!password,
          receivedFields: Object.keys(body),
        }
      });
    }

    // Construim URL-ul cu parametrii în query string
    const loginUrl = `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    console.log("[FanCourier Test] Login URL:", `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=***`);

    const loginResponse = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const loginData = await loginResponse.json();
    console.log("[FanCourier Test] API Response:", {
      status: loginResponse.status,
      data: loginData,
    });

    if (!loginResponse.ok) {
      return NextResponse.json({
        success: false,
        error: loginData?.message || loginData?.error || `Eroare HTTP ${loginResponse.status}`,
        debug: { apiStatus: loginResponse.status, apiResponse: loginData }
      });
    }

    if (!loginData?.data?.token) {
      return NextResponse.json({
        success: false,
        error: "Credențiale invalide - nu s-a putut obține token",
        debug: { apiResponse: loginData }
      });
    }

    const token = loginData.data.token;

    // Verificăm că putem accesa serviciile
    const servicesResponse = await fetch(
      "https://api.fancourier.ro/reports/services",
      {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const servicesData = await servicesResponse.json();
    console.log("[FanCourier Test] Services response:", servicesData?.status);

    if (servicesData?.status === "success") {
      return NextResponse.json({
        success: true,
        message: "Conexiune reușită la FanCourier API v2.0",
      });
    }

    return NextResponse.json({
      success: false,
      error: servicesData?.message || "Eroare la verificarea conexiunii",
    });
  } catch (error: any) {
    console.error("[FanCourier Test] Exception:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message || "Eroare la conectare - verifică credențialele",
    });
  }
}
