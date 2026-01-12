import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }

    // Mascăm credențialele dar arătăm că există
    let maskedDriveCredentials = "";
    if (settings.googleDriveCredentials) {
      try {
        const creds = JSON.parse(settings.googleDriveCredentials);
        // Arătăm doar project_id și client_email pentru identificare
        maskedDriveCredentials = JSON.stringify({
          type: creds.type,
          project_id: creds.project_id,
          client_email: creds.client_email,
          _masked: true,
        }, null, 2);
      } catch {
        maskedDriveCredentials = "••••••••";
      }
    }

    // Mascăm AI API Key dar arătăm că există
    let maskedAiApiKey = "";
    if (settings.aiApiKey) {
      // Arătăm doar primele și ultimele caractere
      const key = settings.aiApiKey;
      if (key.length > 20) {
        maskedAiApiKey = key.substring(0, 10) + "••••••••" + key.substring(key.length - 4);
      } else {
        maskedAiApiKey = "••••••••";
      }
    }

    return NextResponse.json({
      settings: {
        ...settings,
        // Mascăm token-urile dar arătăm că există
        smartbillToken: settings.smartbillToken ? "••••••••" : "",
        fancourierPassword: settings.fancourierPassword ? "••••••••" : "",
        googleDriveCredentials: maskedDriveCredentials,
        trendyolApiSecret: settings.trendyolApiSecret ? "••••••••" : "",
        aiApiKey: maskedAiApiKey,
      },
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Curățăm câmpurile care nu trebuie actualizate dacă sunt mascate
    const updateData: any = { ...body };
    
    // Nu actualizăm token-urile dacă sunt mascate
    if (updateData.smartbillToken === "••••••••") {
      delete updateData.smartbillToken;
    }
    if (updateData.fancourierPassword === "••••••••") {
      delete updateData.fancourierPassword;
    }
    if (updateData.trendyolApiSecret === "••••••••") {
      delete updateData.trendyolApiSecret;
    }
    // Nu actualizăm AI API Key dacă e mascat
    if (updateData.aiApiKey && updateData.aiApiKey.includes("••••••••")) {
      delete updateData.aiApiKey;
    }
    // Nu actualizăm credențialele Drive dacă sunt mascate
    if (updateData.googleDriveCredentials) {
      try {
        const parsed = JSON.parse(updateData.googleDriveCredentials);
        if (parsed._masked) {
          delete updateData.googleDriveCredentials;
        }
      } catch {
        // Nu e JSON valid, probabil e nou - îl păstrăm
      }
    }
    
    // Eliminăm câmpurile sistem
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Convertim numerele
    if (updateData.defaultWeight) {
      updateData.defaultWeight = parseFloat(updateData.defaultWeight) || 1;
    }
    if (updateData.defaultPackages) {
      updateData.defaultPackages = parseInt(updateData.defaultPackages) || 1;
    }
    if (updateData.trendyolCurrencyRate) {
      updateData.trendyolCurrencyRate = parseFloat(updateData.trendyolCurrencyRate) || 5.0;
    }
    // SmartBill numeric fields
    if (updateData.smartbillTaxPercent !== undefined) {
      updateData.smartbillTaxPercent = parseInt(updateData.smartbillTaxPercent) || 21;
    }
    if (updateData.smartbillDueDays !== undefined) {
      updateData.smartbillDueDays = parseInt(updateData.smartbillDueDays) || 0;
    }

    // Debug logging pentru SmartBill
    console.log("\n" + "=".repeat(60));
    console.log("💾 SETTINGS API - SALVARE");
    console.log("=".repeat(60));
    console.log("SmartBill fields being saved:");
    console.log("  - smartbillTaxName:", updateData.smartbillTaxName);
    console.log("  - smartbillTaxPercent:", updateData.smartbillTaxPercent);
    console.log("  - smartbillSeriesName:", updateData.smartbillSeriesName);
    console.log("  - smartbillWarehouseName:", updateData.smartbillWarehouseName);
    console.log("  - smartbillUseStock:", updateData.smartbillUseStock);
    if (updateData.aiApiKey) {
      console.log("AI API Key:", updateData.aiApiKey ? "SET (length: " + updateData.aiApiKey.length + ")" : "NOT SET");
    }
    console.log("=".repeat(60) + "\n");

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...updateData,
      },
      update: updateData,
    });

    // Mascăm AI API Key în răspuns
    let maskedAiApiKey = "";
    if (settings.aiApiKey) {
      const key = settings.aiApiKey;
      if (key.length > 20) {
        maskedAiApiKey = key.substring(0, 10) + "••••••••" + key.substring(key.length - 4);
      } else {
        maskedAiApiKey = "••••••••";
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        smartbillToken: settings.smartbillToken ? "••••••••" : "",
        fancourierPassword: settings.fancourierPassword ? "••••••••" : "",
        googleDriveCredentials: settings.googleDriveCredentials ? "••••••••" : "",
        trendyolApiSecret: settings.trendyolApiSecret ? "••••••••" : "",
        aiApiKey: maskedAiApiKey,
      },
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}
