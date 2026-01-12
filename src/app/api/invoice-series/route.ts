import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET /api/invoice-series - Lista seriilor de facturare
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const series = await prisma.invoiceSeries.findMany({
      include: {
        stores: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch și seria pentru Trendyol din Settings
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { trendyolInvoiceSeries: true },
    });

    return NextResponse.json({
      series,
      trendyolSeries: settings?.trendyolInvoiceSeries || null,
    });
  } catch (error: any) {
    console.error("Error fetching invoice series:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/invoice-series - Sincronizează seriile din SmartBill sau creează manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "invoices.series");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { action, name, type, isDefault } = body;

    // Acțiune de sincronizare din SmartBill
    if (action === "sync") {
      // Citim setările SmartBill
      const settings = await prisma.settings.findUnique({
        where: { id: "default" },
      });

      if (!settings?.smartbillEmail || !settings?.smartbillToken || !settings?.smartbillCompanyCif) {
        return NextResponse.json({
          error: "Configurează SmartBill în setări înainte de a sincroniza seriile",
        }, { status: 400 });
      }

      const auth = Buffer.from(`${settings.smartbillEmail}:${settings.smartbillToken}`).toString("base64");
      const cif = settings.smartbillCompanyCif;

      // Fetch serii din SmartBill
      const seriesResponse = await fetch(
        `https://ws.smartbill.ro/SBORO/api/series?cif=${encodeURIComponent(cif)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Accept": "application/json",
          },
        }
      );

      if (!seriesResponse.ok) {
        return NextResponse.json({
          error: "Eroare la conectarea cu SmartBill",
        }, { status: 500 });
      }

      const seriesData = await seriesResponse.json();
      
      if (!seriesData?.list || !Array.isArray(seriesData.list)) {
        return NextResponse.json({
          error: "Nu s-au găsit serii în SmartBill",
        }, { status: 404 });
      }

      // Filtrăm doar seriile de factură (type === "f")
      const invoiceSeries = seriesData.list.filter((s: any) => 
        s.type === "f" || s.type === "factura" || !s.type
      );

      // Upsert pentru fiecare serie
      let created = 0;
      let updated = 0;

      for (const s of invoiceSeries) {
        const existing = await prisma.invoiceSeries.findUnique({
          where: { name: s.name },
        });

        if (existing) {
          await prisma.invoiceSeries.update({
            where: { name: s.name },
            data: {
              nextNumber: s.nextNumber?.toString() || null,
              type: "f",
            },
          });
          updated++;
        } else {
          await prisma.invoiceSeries.create({
            data: {
              name: s.name,
              nextNumber: s.nextNumber?.toString() || null,
              type: "f",
            },
          });
          created++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sincronizare completă: ${created} serii noi, ${updated} actualizate`,
        total: invoiceSeries.length,
      });
    }

    // Creare manuală a unei serii
    if (name) {
      // Verifică dacă există deja
      const existing = await prisma.invoiceSeries.findUnique({
        where: { name },
      });

      if (existing) {
        return NextResponse.json({
          error: "O serie cu acest nume există deja",
        }, { status: 400 });
      }

      // Dacă e setată ca default, dezactivează celelalte
      if (isDefault) {
        await prisma.invoiceSeries.updateMany({
          data: { isDefault: false },
        });
      }

      const series = await prisma.invoiceSeries.create({
        data: {
          name,
          type: type || "f",
          isDefault: isDefault || false,
        },
      });

      return NextResponse.json({ success: true, series });
    }

    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing invoice series:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/invoice-series - Actualizează o serie sau asociază cu un store
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "invoices.series");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const body = await request.json();
    const { id, isDefault, isActive, storeId, seriesId, trendyolSeries } = body;

    // Actualizare serie pentru Trendyol în Settings
    if (trendyolSeries !== undefined) {
      await prisma.settings.upsert({
        where: { id: "default" },
        update: { trendyolInvoiceSeries: trendyolSeries || null },
        create: { id: "default", trendyolInvoiceSeries: trendyolSeries || null },
      });

      return NextResponse.json({ success: true, message: "Seria Trendyol actualizată" });
    }

    // Asociere Store -> Serie
    if (storeId) {
      await prisma.store.update({
        where: { id: storeId },
        data: { invoiceSeriesId: seriesId || null },
      });

      return NextResponse.json({ success: true, message: "Store actualizat" });
    }

    // Actualizare serie
    if (id) {
      // Dacă e setată ca default, dezactivează celelalte
      if (isDefault) {
        await prisma.invoiceSeries.updateMany({
          data: { isDefault: false },
        });
      }

      const series = await prisma.invoiceSeries.update({
        where: { id },
        data: {
          ...(isDefault !== undefined && { isDefault }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return NextResponse.json({ success: true, series });
    }

    return NextResponse.json({ error: "ID sau storeId necesar" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating invoice series:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/invoice-series - Șterge o serie
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }

    const canManage = await hasPermission(session.user.id, "invoices.series");
    if (!canManage) {
      return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID necesar" }, { status: 400 });
    }

    // Verifică dacă seria e folosită
    const series = await prisma.invoiceSeries.findUnique({
      where: { id },
      include: { stores: true },
    });

    if (!series) {
      return NextResponse.json({ error: "Seria nu există" }, { status: 404 });
    }

    if (series.stores.length > 0) {
      return NextResponse.json({
        error: `Seria este folosită de ${series.stores.length} magazine. Dezasociază-le mai întâi.`,
      }, { status: 400 });
    }

    await prisma.invoiceSeries.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Serie ștearsă" });
  } catch (error: any) {
    console.error("Error deleting invoice series:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
