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
        company: {
          select: {
            id: true,
            name: true,
            code: true,
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

// POST /api/invoice-series - Creează o serie nouă
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
    const {
      name,
      prefix,
      description,
      type = "f",
      startNumber = 1,
      isDefault = false,
      syncToFacturis = false,
      facturisSeries,
      companyId,
    } = body;

    // Validări
    if (!name || !prefix) {
      return NextResponse.json({
        error: "Numele și prefixul sunt obligatorii",
      }, { status: 400 });
    }

    // Verifică dacă există deja
    const existingByName = await prisma.invoiceSeries.findUnique({
      where: { name },
    });

    if (existingByName) {
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
        prefix: prefix.toUpperCase(),
        description,
        type,
        startNumber: Math.max(1, startNumber),
        currentNumber: Math.max(1, startNumber),
        isDefault,
        syncToFacturis,
        facturisSeries: syncToFacturis ? (facturisSeries || prefix.toUpperCase()) : null,
        companyId: companyId || null,
      },
    });

    return NextResponse.json({ success: true, series });
  } catch (error: any) {
    console.error("Error creating invoice series:", error);
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
    const {
      id,
      name,
      prefix,
      description,
      type,
      startNumber,
      isDefault,
      isActive,
      syncToFacturis,
      facturisSeries,
      companyId,
      storeId,
      seriesId,
      trendyolSeries,
    } = body;

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

    // Actualizare serie existentă
    if (id) {
      const existingSeries = await prisma.invoiceSeries.findUnique({
        where: { id },
      });

      if (!existingSeries) {
        return NextResponse.json({ error: "Seria nu există" }, { status: 404 });
      }

      // Verifică dacă noul nume e unic (dacă se schimbă)
      if (name && name !== existingSeries.name) {
        const nameExists = await prisma.invoiceSeries.findUnique({
          where: { name },
        });
        if (nameExists) {
          return NextResponse.json({
            error: "O serie cu acest nume există deja",
          }, { status: 400 });
        }
      }

      // Dacă e setată ca default, dezactivează celelalte
      if (isDefault === true) {
        await prisma.invoiceSeries.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (prefix !== undefined) updateData.prefix = prefix.toUpperCase();
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (startNumber !== undefined) {
        updateData.startNumber = Math.max(1, startNumber);
        // Dacă noul startNumber e mai mare decât currentNumber, actualizează și currentNumber
        if (startNumber > existingSeries.currentNumber) {
          updateData.currentNumber = startNumber;
        }
      }
      if (isDefault !== undefined) updateData.isDefault = isDefault;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (syncToFacturis !== undefined) updateData.syncToFacturis = syncToFacturis;
      if (facturisSeries !== undefined) updateData.facturisSeries = facturisSeries || null;
      if (companyId !== undefined) updateData.companyId = companyId || null;

      // Fix: Always ensure currentNumber >= 1 (fix for legacy data with 0)
      if (existingSeries.currentNumber < 1) {
        updateData.currentNumber = Math.max(1, existingSeries.startNumber || 1);
      }

      const series = await prisma.invoiceSeries.update({
        where: { id },
        data: updateData,
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
