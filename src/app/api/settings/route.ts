import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canView = await hasPermission(session.user.id, "settings.view");
    if (!canView) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canEdit = await hasPermission(session.user.id, "settings.edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

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
    // DEPRECATED: SmartBill fields - replaced by Facturis per-company credentials
    // Keeping for backward compatibility with existing DB records
    if (updateData.smartbillTaxPercent !== undefined) {
      updateData.smartbillTaxPercent = parseInt(updateData.smartbillTaxPercent) || 21;
    }
    if (updateData.smartbillDueDays !== undefined) {
      updateData.smartbillDueDays = parseInt(updateData.smartbillDueDays) || 0;
    }

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
